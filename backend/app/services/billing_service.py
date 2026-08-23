import logging
import json
import razorpay
from typing import Optional, List, Dict, Any
from uuid import UUID
from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.models.billing import Invoice, InvoiceStatus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
 
logger = logging.getLogger(__name__)

class BillingService:
    def __init__(self):
        self.rzp = None
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            self.rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    async def create_payment_link(self, db: AsyncSession, invoice_id: UUID) -> Optional[str]:
        """Generates a Razorpay payment link for an invoice."""
        if not self.rzp:
            return "https://example.com/mock-payment-link"

        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        invoice = result.scalar_one_or_none()
        if not invoice:
            return None

        try:
            # Create link via Razorpay API
            # Note: Amount in Razorpay is in paise (1 INR = 100 paise)
            link_data = {
                "amount": int(invoice.total_amount * 100),
                "currency": "INR",
                "accept_partial": False,
                "description": f"Payment for Invoice {invoice.invoice_number}",
                "customer": {
                    "name": "Client", # We can fetch real client name here
                    "email": "client@example.com",
                    "contact": "+919876543210"
                },
                "notify": {"sms": True, "email": True},
                "reminder_enable": True,
                "notes": {"invoice_id": str(invoice.id)},
                "callback_url": f"{settings.FRONTEND_URL}/payment/callback",
                "callback_method": "get"
            }
            
            response = self.rzp.payment_link.create(link_data)
            
            # Store link and update status
            invoice.razorpay_payment_link_id = response['id']
            invoice.status = InvoiceStatus.SENT
            await db.flush()
            
            return response['short_url']
            
        except Exception as e:
            print(f"Razorpay Error: {e}")
            raise ServiceUnavailableError("Payment Gateway")

    async def detect_billing_opportunities(self, db: AsyncSession, firm_id: UUID, client_id: UUID) -> List[Dict[str, Any]]:
        """
        Uses AI to detect work that hasn't been logged or billed yet.
        Implements Source C from SRD Section 24.1.
        """
        from app.services.ai_service import ai_service
        from app.models.whatsapp import WhatsAppMessage
        from app.models.compliance_task import ComplianceTask
        
        # 1. Gather context (recent messages and completed tasks)
        # In a real scenario, we'd filter by date range
        msg_result = await db.execute(
            select(WhatsAppMessage).where(WhatsAppMessage.client_id == client_id).limit(20)
        )
        messages = msg_result.scalars().all()
        msg_summary = "\n".join([f"{m.direction}: {m.body}" for m in messages if m.body])
        
        task_result = await db.execute(
            select(ComplianceTask).where(ComplianceTask.client_id == client_id, ComplianceTask.status == "completed").limit(10)
        )
        tasks = task_result.scalars().all()
        task_summary = "\n".join([f"{t.task_type} completed on {t.updated_at}" for t in tasks])
        
        # 2. Call AI Service (using Mistral as requested)
        # Note: We'd need to add this method to AIService or use a general generate_draft
        # For now, let's assume AIService has a method for this or we use generate_draft with custom type
        opportunities_json = await ai_service.generate_draft(
            draft_type="billing_opportunity_detection",
            context={
                "conversation_summary": msg_summary,
                "completed_tasks_json": task_summary,
                "logged_work_json": "[]", # We should fetch existing billing logs here
                "retainer_fee": 5000,
                "period_start": "2026-04-01",
                "period_end": "2026-04-30"
            },
            client_name="Client",
            firm_name="Firm"
        )
        
        try:
            # Mistral might return text around JSON, so we clean it
            if "```json" in opportunities_json:
                opportunities_json = opportunities_json.split("```json")[1].split("```")[0].strip()
            return json.loads(opportunities_json)
        except:
            logger.error("Failed to parse billing opportunities JSON")
            return []

    async def log_task_work(
        self, 
        db: AsyncSession, 
        firm_id: UUID, 
        client_id: UUID, 
        task_id: UUID, 
        task_type: str,
        staff_user_id: UUID
    ):
        """
        Automatically logs billable work upon task completion (Section 44.1).
        """
        from app.models.billing import BillingLog
        from datetime import date
        
        # Fee mapping from Section 44.1
        FEE_MAPPING = {
            "gstr_1": 500.0,
            "gstr_3b": 1000.0,
            "tds_q1": 2500.0,
            "tds_q2": 2500.0,
            "tds_q3": 2500.0,
            "tds_q4": 2500.0,
            "itr_1": 1500.0,
            "itr_4": 3500.0,
            "statutory_audit": 15000.0,
            "tax_audit": 10000.0
        }
        
        amount = FEE_MAPPING.get(task_type.lower(), 500.0) # Default to 500
        
        log = BillingLog(
            firm_id=firm_id,
            client_id=client_id,
            task_id=task_id,
            staff_user_id=staff_user_id,
            work_date=date.today(),
            hours=0.5, # Base effort
            description=f"Automated Billing: {task_type.replace('_', ' ').upper()}",
            work_category="compliance",
            billable_amount=amount,
            is_billable=True
        )
        db.add(log)
        await db.flush()
        logger.info(f"Logged billable work for task {task_id}: ₹{amount}")

billing_service = BillingService()
