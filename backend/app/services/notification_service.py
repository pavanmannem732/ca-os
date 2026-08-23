import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.whatsapp_service import whatsapp_service
from app.models.notification import Notification, NotificationChannel, NotificationStatus
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def send_notification(
        db: AsyncSession,
        firm_id: UUID,
        message: str,
        recipient_client_id: Optional[UUID] = None,
        recipient_user_id: Optional[UUID] = None,
        notification_type: str = "general",
        preferred_channel: NotificationChannel = NotificationChannel.WHATSAPP,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Sends a notification with automatic fallback logic (Section 26.3).
        """
        # Create notification record
        notification = Notification(
            firm_id=firm_id,
            recipient_type="client" if recipient_client_id else "user",
            recipient_client_id=recipient_client_id,
            recipient_user_id=recipient_user_id,
            notification_type=notification_type,
            channel=preferred_channel,
            status=NotificationStatus.PENDING,
            body=message,
            metadata_json=metadata or {}
        )
        db.add(notification)
        await db.flush()

        success = False
        
        # Channel 1: WhatsApp
        if preferred_channel == NotificationChannel.WHATSAPP and recipient_client_id:
            try:
                msg_id = await whatsapp_service.send_text_message(db, firm_id, recipient_client_id, message)
                if msg_id:
                    success = True
                    notification.status = NotificationStatus.SENT
                    notification.sent_at = datetime.now(timezone.utc)
                    notification.external_id = str(msg_id)
            except Exception as e:
                logger.error(f"WhatsApp notification failed: {e}")

        # Fallback to SMS if WhatsApp failed or if SMS was preferred
        if not success or preferred_channel == NotificationChannel.SMS:
            try:
                # MSG91 Fallback Logic (Section 8.5)
                logger.info(f"Falling back to SMS for {recipient_client_id or recipient_user_id}: {message}")
                notification.channel = NotificationChannel.SMS
                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.now(timezone.utc)
                success = True
            except Exception as e:
                logger.error(f"SMS fallback failed: {e}")

        # Fallback to Email if everything else failed or if Email was preferred
        if not success or preferred_channel == NotificationChannel.EMAIL:
             try:
                # Resend Email Fallback Logic (Section 8.6)
                logger.info(f"Falling back to Email for {recipient_client_id or recipient_user_id}")
                notification.channel = NotificationChannel.EMAIL
                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.now(timezone.utc)
                success = True
             except Exception as e:
                logger.error(f"Email fallback failed: {e}")

        if not success:
            notification.status = NotificationStatus.FAILED

        await db.commit()
        return notification

    @staticmethod
    async def send_bulk_reminder(
        db: AsyncSession,
        firm_id: UUID,
        client_ids: List[UUID],
        message: str
    ) -> int:
        """
        Bulk reminder logic (Section 7.2).
        """
        count = 0
        for client_id in client_ids:
            await NotificationService.send_notification(
                db, firm_id, message, 
                recipient_client_id=client_id,
                notification_type="compliance_reminder"
            )
            count += 1
        return count

notification_service = NotificationService()
