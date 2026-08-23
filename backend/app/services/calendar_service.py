import logging
from datetime import date, timedelta
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.compliance_task import ComplianceTask, TaskStatus
from app.models.client import Client

logger = logging.getLogger(__name__)

class CalendarService:
    async def generate_annual_calendar(self, db: AsyncSession, firm_id: UUID, client_id: UUID):
        """
        Generates standard compliance tasks for a client for the next 12 months.
        Section 47.3 - Automated Compliance Calendar Generation.
        """
        client = await db.get(Client, client_id)
        if not client:
            return
            
        services = client.compliance_services or []
        today = date.today()
        
        # Start of next month
        start_date = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
        
        tasks_to_create = []
        
        # Standard frequencies:
        # GSTR-1: Monthly (11th)
        # GSTR-3B: Monthly (20th)
        # TDS: Quarterly (7th of next month, except Q4 which is 30th April)
        
        for i in range(12):
            month_date = (start_date + timedelta(days=31 * i)).replace(day=1)
            year = month_date.year
            month = month_date.month
            
            # GST Monthly
            if "gst_filing" in services:
                # GSTR-1
                tasks_to_create.append(ComplianceTask(
                    firm_id=firm_id,
                    client_id=client_id,
                    task_type="gstr_1",
                    due_date=date(year, month, 11),
                    status=TaskStatus.NOT_STARTED,
                    priority="high" if i < 3 else "medium", # Nearer are high
                    assigned_to=None # Auto-assignment handled by StaffService later
                ))
                # GSTR-3B
                tasks_to_create.append(ComplianceTask(
                    firm_id=firm_id,
                    client_id=client_id,
                    task_type="gstr_3b",
                    due_date=date(year, month, 20),
                    status=TaskStatus.NOT_STARTED,
                    priority="high" if i < 3 else "medium"
                ))
            
            # TDS Quarterly
            if "tds_filing" in services and month in [4, 7, 10, 1]:
                q_month = 4 if month == 1 else month + 3
                q_year = year if month != 1 else year + 1
                
                tasks_to_create.append(ComplianceTask(
                    firm_id=firm_id,
                    client_id=client_id,
                    task_type=f"tds_q{(month-1)//3 + 1}",
                    due_date=date(q_year, q_month, 7 if q_month != 4 else 30),
                    status=TaskStatus.NOT_STARTED,
                    priority="medium"
                ))

        for task in tasks_to_create:
            db.add(task)
            
        await db.flush()
        logger.info(f"Generated {len(tasks_to_create)} compliance tasks for client {client_id}")

calendar_service = CalendarService()
