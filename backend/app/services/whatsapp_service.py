import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.config import settings
from app.models.whatsapp import WhatsAppConversation, WhatsAppMessage, ConversationStatus, MessageDirection, MessageType, MessageStatus
from app.models.client import Client

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.api_url = f"https://graph.facebook.com/v17.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        self.headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
            "Content-Type": "application/json"
        }

    async def send_text_message(self, db: AsyncSession, firm_id: UUID, client_id: UUID, body: str) -> Optional[UUID]:
        """Sends a text message via WhatsApp Cloud API."""
        # Find or create conversation
        conversation = await self.get_or_create_conversation(db, firm_id, client_id)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": await self._get_client_mobile(db, client_id),
            "type": "text",
            "text": {"body": body}
        }
        
        return await self._send_and_record(db, firm_id, client_id, conversation.id, payload, MessageType.TEXT, body)

    async def send_template_message(
        self, 
        db: AsyncSession, 
        firm_id: UUID, 
        client_id: UUID, 
        template_name: str, 
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[UUID]:
        """Sends a Meta-approved template message."""
        conversation = await self.get_or_create_conversation(db, firm_id, client_id)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": await self._get_client_mobile(db, client_id),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components or []
            }
        }
        
        return await self._send_and_record(
            db, firm_id, client_id, conversation.id, payload, MessageType.TEMPLATE, 
            f"[TEMPLATE: {template_name}]", template_name=template_name
        )

    async def handle_inbound_webhook(self, db: AsyncSession, payload: Dict[str, Any]):
        """Processes inbound messages from WhatsApp Webhook."""
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                if "messages" in value:
                    for msg in value["messages"]:
                        await self._process_message(db, value.get("metadata", {}), msg)
                elif "statuses" in value:
                    for status in value["statuses"]:
                        await self._process_status_update(db, status)

    async def _process_message(self, db: AsyncSession, metadata: Dict[str, Any], msg: Dict[str, Any]):
        """Internal logic for processing a single inbound message."""
        from_number = msg.get("from")
        meta_message_id = msg.get("id")
        timestamp_raw = msg.get("timestamp")
        timestamp = datetime.fromtimestamp(int(timestamp_raw)) if timestamp_raw else datetime.now(timezone.utc)
        msg_type = msg.get("type")
        
        # Resolve client by mobile
        if not from_number:
            logger.warning("Message received without from number")
            return

        client = await self._find_client_by_mobile(db, str(from_number))
        if not client:
            return

        # Find or create conversation
        conversation = await self.get_or_create_conversation(db, client.firm_id, client.id)
        
        # Save message
        body = None
        if msg_type == "text":
            body = msg.get("text", {}).get("body")
        elif msg_type == "document":
            body = f"[DOCUMENT: {msg.get('document', {}).get('filename')}]"
        
        new_msg = WhatsAppMessage(
            conversation_id=conversation.id,
            firm_id=client.firm_id,
            client_id=client.id,
            meta_message_id=meta_message_id,
            direction=MessageDirection.INBOUND,
            sender_type="client",
            message_type=MessageType(msg_type) if msg_type in [m.value for m in MessageType] else MessageType.TEXT,
            body=body,
            status=MessageStatus.DELIVERED,
            meta_timestamp=timestamp
        )
        db.add(new_msg)
        
        # Update conversation
        conversation.last_message_at = timestamp
        conversation.unread_count += 1
        
        # Real-time update via WebSocket
        from app.core.socket_manager import socket_manager
        await socket_manager.broadcast_to_firm(str(client.firm_id), {
            "type": "new_whatsapp_message",
            "conversation_id": str(conversation.id),
            "message": {
                "id": str(new_msg.id),
                "body": body,
                "direction": "inbound",
                "timestamp": timestamp.isoformat()
            }
        })
        
        # State Machine Logic
        await self._run_state_machine(db, conversation, new_msg)
        
        await db.commit()

    async def _run_state_machine(self, db: AsyncSession, conversation: WhatsAppConversation, message: WhatsAppMessage, user_id: Optional[UUID] = None):
        """Implements the logic from SRD Section 31."""
        if conversation.status == ConversationStatus.HUMAN_ACTIVE:
            # Bot is silent
            return

        if conversation.status == ConversationStatus.BOT_IDLE:
            # New message in idle state -> classify and route
            await self._classify_and_respond(db, conversation, message, user_id)
            
        elif conversation.status == ConversationStatus.BOT_ACTIVE:
            # Bot is in a flow (e.g. document collection)
            await self._handle_active_bot_flow(db, conversation, message, user_id)

    async def _classify_and_respond(self, db: AsyncSession, conversation: WhatsAppConversation, message: WhatsAppMessage, user_id: Optional[UUID] = None):
        """Calls AI Service to classify intent and generate response."""
        from app.services.ai_service import ai_service
        from app.models.ai import AIDraft, AIDraftType
        
        # 1. Classify Intent
        classification = await ai_service.classify_intent(message.body or "")
        intent = classification.get("intent", "other")
        
        # 2. Route based on intent
        if intent == "human_request":
            conversation.status = ConversationStatus.HUMAN_REQUESTED
            await self.send_text_message(db, conversation.firm_id, conversation.client_id, 
                "I've notified a team member to assist you. They will be with you shortly. 🙏")
        
        elif intent == "greeting":
            await self.send_text_message(db, conversation.firm_id, conversation.client_id, 
                "Hello! How can CA-OS help you today? You can ask about your GST status, invoices, or upload documents.")
        
        elif intent == "document_submission":
            # Transition to BOT_ACTIVE for document collection
            conversation.status = ConversationStatus.BOT_ACTIVE
            if message.message_type == MessageType.TEXT:
                await self.send_text_message(db, conversation.firm_id, conversation.client_id, 
                    "Great! Please upload the document(s) here. I'll automatically file them and notify the team.")
            else:
                # If they already sent a document, handle it immediately
                await self._handle_active_bot_flow(db, conversation, message, user_id)
            
        elif intent in ["technical_query", "notice_received", "billing_query"]:
            # Generate AI Draft for CA to review
            draft_type = AIDraftType.CLIENT_QUERY_RESPONSE
            if intent == "notice_received":
                draft_type = AIDraftType.GST_NOTICE_RESPONSE
            
            # Get client name for context
            client = await db.get(Client, conversation.client_id)
            
            # Call AI service to generate actual content
            draft_text = await ai_service.generate_draft(
                draft_type=draft_type.value,
                context={"query_text": message.body, "notice_text": message.body if intent == "notice_received" else None},
                client_name=client.name if client else "Client",
                firm_name="Your CA Firm" # In production, fetch from firm record
            )
            
            # Save AIDraft
            new_draft = AIDraft(
                firm_id=conversation.firm_id,
                client_id=conversation.client_id,
                created_by=user_id, # Use provided user_id
                draft_type=draft_type,
                input_context_json={"whatsapp_message_id": str(message.id), "query": message.body},
                system_prompt_version="1.0",
                llm_model=settings.MISTRAL_MODEL,
                prompt_tokens=0, # In production, track these
                completion_tokens=0,
                total_cost_usd=0.0,
                output_text=draft_text
            )
            db.add(new_draft)
            
            # SIMULATOR: Send the actual AI generated response immediately
            await self.send_text_message(db, conversation.firm_id, conversation.client_id, draft_text)
        else:
            await self.send_text_message(db, conversation.firm_id, conversation.client_id, 
                "I've received your message and shared it with the team. Is there anything else I can help with?")
            
    async def _handle_active_bot_flow(self, db: AsyncSession, conversation: WhatsAppConversation, message: WhatsAppMessage, user_id: Optional[UUID] = None):
        """Logic for bot while in a specific flow (Section 31.3)."""
        from app.models.whatsapp import MessageType
        
        if message.message_type == MessageType.DOCUMENT:
            # 1. Process document via DocumentService
            from app.services.document_service import document_service
            
            doc = await document_service.create_document_record(
                db=db,
                firm_id=conversation.firm_id,
                client_id=conversation.client_id,
                file_name=message.body or "whatsapp_upload.pdf",
                s3_key=f"whatsapp/{message.meta_message_id}.pdf",
                file_size_bytes=1024, # Mocked
                file_type="application/pdf", # Mocked
                upload_source="whatsapp",
                uploaded_by_client=True
            )
            
            # 2. Acknowledge and notify
            await self.send_text_message(
                db, conversation.firm_id, conversation.client_id, 
                f"✅ Document Received: {doc.file_name}. I've filed this in your secure portal and notified your CA."
            )
            
            # 3. Transition back to IDLE
            conversation.status = ConversationStatus.BOT_IDLE
            
        else:
            # If they send text instead of a document while we expect a document
            if "cancel" in (message.body or "").lower() or "human" in (message.body or "").lower():
                conversation.status = ConversationStatus.HUMAN_REQUESTED
                await self.send_text_message(db, conversation.firm_id, conversation.client_id, 
                    "Understood. I'm connecting you to our team now.")
            else:
                await self.send_text_message(
                    db, conversation.firm_id, conversation.client_id, 
                    "I'm currently expecting a document upload. Please share the file, or say 'cancel' to speak with someone."
                )

    async def get_or_create_conversation(self, db: AsyncSession, firm_id: UUID, client_id: UUID) -> WhatsAppConversation:
        result = await db.execute(
            select(WhatsAppConversation).where(
                WhatsAppConversation.firm_id == firm_id,
                WhatsAppConversation.client_id == client_id
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            conversation = WhatsAppConversation(
                firm_id=firm_id,
                client_id=client_id,
                status=ConversationStatus.BOT_IDLE
            )
            db.add(conversation)
            await db.flush()
        
        return conversation

    async def _get_client_mobile(self, db: AsyncSession, client_id: UUID) -> str:
        client = await db.get(Client, client_id)
        if not client:
            raise ValueError(f"Client with id {client_id} not found")
            
        # Clean mobile number for WhatsApp (needs country code, remove spaces/hyphens)
        mobile = client.primary_mobile.replace(" ", "").replace("-", "")
        if not mobile.startswith("+"):
            mobile = f"+91{mobile}" if len(mobile) == 10 else mobile # Default to India
        return mobile

    async def _find_client_by_mobile(self, db: AsyncSession, mobile: str) -> Optional[Client]:
        # Strip country code for lookup if needed
        clean_mobile = mobile[-10:] if len(mobile) >= 10 else mobile
        result = await db.execute(
            select(Client).where(Client.primary_mobile.ilike(f"%{clean_mobile}%"))
        )
        return result.scalar_one_or_none()

    async def _send_and_record(
        self, 
        db: AsyncSession, 
        firm_id: UUID, 
        client_id: UUID, 
        conversation_id: UUID,
        payload: Dict[str, Any],
        msg_type: MessageType,
        body: str,
        template_name: Optional[str] = None
    ) -> Optional[UUID]:
        # SIMULATOR MODE: If no token is provided, we simulate a successful send
        if not settings.WHATSAPP_API_TOKEN:
            logger.info(f"[SIMULATOR] Outbound {msg_type.value}: {body}")
            meta_message_id = f"sim_{uuid4().hex}"
            
            new_msg = WhatsAppMessage(
                conversation_id=conversation_id,
                firm_id=firm_id,
                client_id=client_id,
                meta_message_id=meta_message_id,
                direction=MessageDirection.OUTBOUND,
                sender_type="bot",
                message_type=msg_type,
                body=body,
                template_name=template_name,
                status=MessageStatus.SENT
            )
            db.add(new_msg)
            await db.flush()
            
            # Simulate a "Delivered" status update after a short delay
            # In a real app, we'd use a background task
            return new_msg.id

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.api_url, headers=self.headers, json=payload, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                meta_message_id = data.get("messages", [{}])[0].get("id")
                
                new_msg = WhatsAppMessage(
                    conversation_id=conversation_id,
                    firm_id=firm_id,
                    client_id=client_id,
                    meta_message_id=meta_message_id,
                    direction=MessageDirection.OUTBOUND,
                    sender_type="bot",
                    message_type=msg_type,
                    body=body,
                    template_name=template_name,
                    status=MessageStatus.SENT
                )
                db.add(new_msg)
                await db.flush()
                return new_msg.id
        except Exception as e:
            logger.error(f"WhatsApp API Error: {str(e)}")
            return None

    async def _process_status_update(self, db: AsyncSession, status_update: Dict[str, Any]):
        """Handles delivery/read receipts."""
        meta_message_id = status_update.get("id")
        status_val = status_update.get("status")
        
        new_status = MessageStatus.SENT
        if status_val == "delivered":
            new_status = MessageStatus.DELIVERED
        elif status_val == "read":
            new_status = MessageStatus.READ
        elif status_val == "failed":
            new_status = MessageStatus.FAILED
            
        await db.execute(
            update(WhatsAppMessage)
            .where(WhatsAppMessage.meta_message_id == meta_message_id)
            .values(status=new_status, updated_at=datetime.now(timezone.utc))
        )
        await db.commit()

whatsapp_service = WhatsAppService()
