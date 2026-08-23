import asyncio
import logging
from datetime import date, timedelta, datetime, timezone
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.models.compliance_task import ComplianceTask, TaskStatus
from app.models.client import Client
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

async def run_deadline_sentinel():
    """
    Agent 1: Deadline Sentinel Agent (Section 9.4)
    Continuously monitors all client compliance calendars, identifies upcoming deadlines,
    and autonomously sends personalized reminders via WhatsApp.
    """
    logger.info("Starting Deadline Sentinel Agent run...")
    
    async with SessionLocal() as db:
        try:
            today = date.today()
            # Reminders for 1, 3, and 7 days out
            intervals = [1, 3, 7]
            target_dates = [today + timedelta(days=i) for i in intervals]
            
            # Find tasks due on target dates that haven't been filed/completed
            # and haven't had a reminder in the last 48 hours
            forty_eight_hours_ago = datetime.now(timezone.utc) - timedelta(hours=48)
            
            stmt = select(ComplianceTask).where(
                ComplianceTask.due_date.in_(target_dates),
                ComplianceTask.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
                ComplianceTask.deleted_at.is_(None),
                or_(
                    ComplianceTask.last_reminder_sent_at.is_(None),
                    ComplianceTask.last_reminder_sent_at < forty_eight_hours_ago
                ),
                ComplianceTask.reminder_sent_count < 5 # Max 5 reminders
            )
            
            result = await db.execute(stmt)
            tasks = result.scalars().all()
            
            logger.info(f"Found {len(tasks)} tasks requiring reminders.")
            
            whatsapp_service = WhatsAppService()
            
            for task in tasks:
                # Get client details
                client_stmt = select(Client).where(Client.id == task.client_id)
                client_res = await db.execute(client_stmt)
                client = client_res.scalar_one_or_none()
                
                if not client or not client.mobile:
                    continue
                
                # Check if documents are ready (skip if they are)
                if task.documents_ready:
                    logger.info(f"Skipping reminder for task {task.id} as documents are ready.")
                    continue
                
                # Construct personalized message
                days_left = (task.due_date - today).days
                message = (
                    f"Hello {client.name}, this is a reminder from your CA firm. "
                    f"Your {task.task_type.replace('_', ' ').upper()} is due in {days_left} days "
                    f"({task.due_date.strftime('%d %b')}). "
                    f"Please ensure all required documents are uploaded to your portal or sent here."
                )
                
                # Send WhatsApp (template-based in production, text for now)
                try:
                    # Note: In a real implementation, we'd use a Meta-approved template
                    await whatsapp_service.send_message(
                        client.mobile, 
                        message, 
                        firm_id=task.firm_id,
                        client_id=task.client_id
                    )
                    
                    # Update task record
                    task.last_reminder_sent_at = datetime.now(timezone.utc)
                    task.reminder_sent_count += 1
                    logger.info(f"Reminder sent to {client.name} for {task.task_type}")
                    
                except Exception as e:
                    logger.error(f"Failed to send reminder for task {task.id}: {e}")
            
            await db.commit()
            logger.info("Deadline Sentinel Agent run completed successfully.")
            
        except Exception as e:
            logger.error(f"Error in Deadline Sentinel Agent: {e}")
            await db.rollback()

if __name__ == "__main__":
    # Setup logging and run for testing
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_deadline_sentinel())
