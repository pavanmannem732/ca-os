from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from datetime import datetime, timezone
import logging

from app.core.dependencies import get_db, get_current_user
from app.core.exceptions import UnauthorizedError
from app.models.user import User
from app.models.client import Client
from app.models.whatsapp import WhatsAppConversation, WhatsAppMessage, MessageDirection, MessageStatus, MessageType
from app.services.whatsapp_service import whatsapp_service
from app.core.socket_manager import socket_manager

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all WhatsApp/Internal conversations for the firm."""
    if not current_user.firm_id:
        raise UnauthorizedError("User not associated with a firm")

    # Select conversations joined with clients
    stmt = (
        select(WhatsAppConversation, Client.name)
        .join(Client, WhatsAppConversation.client_id == Client.id)
        .where(WhatsAppConversation.firm_id == current_user.firm_id)
        .order_by(desc(WhatsAppConversation.last_message_at))
    )
    result = await db.execute(stmt)
    
    data = []
    for convo, client_name in result:
        data.append({
            "id": str(convo.id),
            "client_id": str(convo.client_id),
            "status": convo.status.value,
            "last_message_at": convo.last_message_at.isoformat() if convo.last_message_at else None,
            "unread_count": convo.unread_count,
            "client": {"name": client_name, "status": "active"} # Simplified status for now
        })
    
    return {"data": data}

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches message history for a specific conversation."""
    if not current_user.firm_id:
        raise UnauthorizedError("User not associated with a firm")

    stmt = (
        select(WhatsAppMessage)
        .where(WhatsAppMessage.conversation_id == conversation_id)
        .where(WhatsAppMessage.firm_id == current_user.firm_id)
        .order_by(WhatsAppMessage.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    return {
        "data": [
            {
                "id": str(m.id),
                "body": m.body,
                "direction": m.direction.value,
                "timestamp": m.created_at.isoformat(),
                "status": m.status.value
            }
            for m in messages
        ]
    }

@router.post("/send")
async def send_internal_message(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    body: str = Body(..., embed=True),
    client_id: UUID = Body(..., embed=True)
):
    """
    Simulates an inbound message from a client to the TaxFlow AI bot.
    Used for in-app chat when WhatsApp API is not available.
    """
    if not current_user.firm_id:
        from app.core.exceptions import UnauthorizedError
        raise UnauthorizedError("User is not associated with a firm")
    
    firm_id = current_user.firm_id
        
    try:
        # 1. Get or create conversation
        conversation = await whatsapp_service.get_or_create_conversation(db, firm_id, client_id)
        
        # 2. Save the inbound message (from client)
        new_msg = WhatsAppMessage(
            conversation_id=conversation.id,
            firm_id=firm_id,
            client_id=client_id,
            meta_message_id=f"internal_{datetime.now(timezone.utc).timestamp()}",
            direction=MessageDirection.INBOUND,
            sender_type="client",
            message_type=MessageType.TEXT,
            body=body,
            status=MessageStatus.READ
        )
        db.add(new_msg)
        
        # 3. Update conversation metadata
        now = datetime.now(timezone.utc)
        conversation.last_message_at = now
        conversation.unread_count += 1
        
        # 4. Trigger the AI/State Machine (behaving exactly like WhatsApp)
        await whatsapp_service._run_state_machine(db, conversation, new_msg, user_id=current_user.id)
        
        await db.commit()
        await db.refresh(new_msg)

        # 5. Broadcast via WebSocket (so staff UI updates)
        await socket_manager.broadcast_to_firm(str(firm_id), {
            "type": "new_whatsapp_message",
            "conversation_id": str(conversation.id),
            "message": {
                "id": str(new_msg.id),
                "body": body,
                "direction": "inbound",
                "timestamp": now.isoformat()
            }
        })
        
        return {"status": "success", "message_id": str(new_msg.id)}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in send_internal_message: {str(e)}", exc_info=True)
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}, 500
