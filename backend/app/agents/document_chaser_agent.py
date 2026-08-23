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

async def run_document_chaser():
    """
    Agent 2: Document Chaser Agent (Section 9.4)
    Requests pending documents for tasks due within 10 days.
    """
    logger.info("Starting Document Chaser Agent run...")
    
    async with SessionLocal() as db:
        try:
            today = date.today()
            ten_days_out = today + timedelta(days=10)
            
            # Find tasks due within 10 days where documents are NOT ready
            # and haven't reached the max reminder count
            stmt = select(ComplianceTask).where(
                ComplianceTask.due_date <= ten_days_out,
                ComplianceTask.due_date >= today,
                ComplianceTask.documents_ready == False,
                ComplianceTask.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
                ComplianceTask.deleted_at.is_(None),
                ComplianceTask.reminder_sent_count < 3 # Limit to 3 chaser reminders
            )
            
            result = await db.execute(stmt)
            tasks = result.scalars().all()
            
            logger.info(f"Found {len(tasks)} tasks requiring document chasing.")
            
            whatsapp_service = WhatsAppService()
            
            for task in tasks:
                # Get client details
                client_stmt = select(Client).where(Client.id == task.client_id)
                client_res = await db.execute(client_stmt)
                client = client_res.scalar_one_or_none()
                
                if not client or not client.mobile:
                    continue
                
                # Identify missing documents (simplified check)
                missing_docs = task.documents_required
                if not missing_docs:
                    # If none specified, assume standard set based on task_type
                    missing_docs = ["Bank Statement", "Sales Register"]
                
                doc_list_str = "\n- " + "\n- ".join(missing_docs)
                
                # Construct message
                message = (
                    f"Hi {client.name}, we are preparing your {task.task_type.replace('_', ' ').upper()} "
                    f"due on {task.due_date.strftime('%d %b')}. "
                    f"We are still missing the following documents:{doc_list_str}\n\n"
                    f"Please upload them to your portal or share them here so we can finish on time."
                )
                
                # Send WhatsApp
                try:
                    await whatsapp_service.send_message(
                        client.mobile, 
                        message,
                        firm_id=task.firm_id,
                        client_id=task.client_id
                    )
                    
                    # Update task record
                    task.last_reminder_sent_at = datetime.now(timezone.utc)
                    task.reminder_sent_count += 1
                    logger.info(f"Document chaser sent to {client.name}")
                    
                except Exception as e:
                    logger.error(f"Failed to send chaser for task {task.id}: {e}")
            
            await db.commit()
            logger.info("Document Chaser Agent run completed.")
            
        except Exception as e:
            logger.error(f"Error in Document Chaser Agent: {e}")
            await db.rollback()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_document_chaser())
