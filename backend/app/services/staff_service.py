from typing import List, Dict, Optional
from uuid import UUID
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.compliance_task import ComplianceTask, TaskStatus, TaskPriority
from app.models.user import User

# Priority weights from Section 46.1
TASK_WEIGHTS = {
    TaskPriority.CRITICAL: 5,
    TaskPriority.HIGH: 3,
    TaskPriority.MEDIUM: 2,
    TaskPriority.LOW: 1
}

def urgency_multiplier(due_date: date) -> float:
    """Calculates urgency multiplier based on days until due."""
    days_until_due = (due_date - date.today()).days
    if days_until_due < 0:
        return 3.0  # Overdue
    if days_until_due <= 2:
        return 2.0  # Due very soon
    if days_until_due <= 7:
        return 1.5  # Due this week
    return 1.0      # Due later

class StaffService:
    @staticmethod
    async def get_staff_capacity(
        db: AsyncSession,
        staff_id: UUID,
        time_period_days: int = 7
    ) -> Dict:
        """
        Calculates capacity metrics for a staff member based on Section 46.1.
        """
        # Query active tasks for the staff member
        stmt = select(ComplianceTask).where(
            ComplianceTask.assigned_to_id == staff_id,
            ComplianceTask.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW])
        )
        result = await db.execute(stmt)
        active_tasks = result.scalars().all()

        # Weight tasks by priority and urgency
        weighted_task_count = sum(
            TASK_WEIGHTS.get(task.priority, 2) * urgency_multiplier(task.due_date)
            for task in active_tasks
        )

        # Capacity thresholds from Section 46.1
        CAPACITY_GREEN = 40   # <= 40 weighted units: healthy
        CAPACITY_AMBER = 70   # 41–70: near capacity, watch
        # CAPACITY_RED = 71     # > 70: overloaded

        if weighted_task_count <= CAPACITY_GREEN:
            status = "healthy"
            color = "green"
        elif weighted_task_count <= CAPACITY_AMBER:
            status = "near_capacity"
            color = "amber"
        else:
            status = "overloaded"
            color = "red"

        today = date.today()
        week_end = today + timedelta(days=7)

        return {
            "staff_id": staff_id,
            "weighted_task_count": weighted_task_count,
            "raw_task_count": len(active_tasks),
            "capacity_status": status,
            "capacity_color": color,
            "overdue_task_count": len([t for t in active_tasks if t.status == TaskStatus.OVERDUE or (t.due_date < today)]),
            "tasks_due_this_week": len([t for t in active_tasks if t.due_date <= week_end])
        }

    @staticmethod
    async def suggest_task_assignee(
        db: AsyncSession,
        firm_id: UUID,
        task_type: str,
        client_id: UUID
    ) -> Optional[UUID]:
        """
        Suggests the best staff member for a new task based on Section 46.2.
        """
        # 1. Get all active staff in the firm
        stmt = select(User).where(
            User.firm_id == firm_id,
            User.is_active == True,
            User.role.in_(["ca_staff_senior", "ca_staff_junior", "articleship"])
        )
        result = await db.execute(stmt)
        staff_list = result.scalars().all()

        if not staff_list:
            return None

        # 2. Get capacity data for each staff
        staff_scores = {}
        for staff in staff_list:
            capacity = await StaffService.get_staff_capacity(db, staff.id)
            
            # Skip overloaded staff
            if capacity["capacity_status"] == "overloaded":
                continue

            # Base score: lower workload = higher score (Max 100)
            score = max(0, 100 - capacity["weighted_task_count"])

            # 3. Check historical assignment (prefer staff who handles this client regularly)
            # Find how many tasks this staff has handled for this client
            history_stmt = select(func.count(ComplianceTask.id)).where(
                ComplianceTask.assigned_to_id == staff.id,
                ComplianceTask.client_id == client_id
            )
            history_result = await db.execute(history_stmt)
            client_task_count = history_result.scalar() or 0
            if client_task_count > 0:
                score += 30

            # 4. Specialization (prefer staff with this task type experience)
            spec_stmt = select(func.count(ComplianceTask.id)).where(
                ComplianceTask.assigned_to_id == staff.id,
                ComplianceTask.task_type == task_type,
                ComplianceTask.status == TaskStatus.FILED
            )
            spec_result = await db.execute(spec_stmt)
            task_type_count = spec_result.scalar() or 0
            if task_type_count > 5:  # Arbitrary threshold for "experience"
                score += 20

            staff_scores[staff.id] = score

        if not staff_scores:
            return None

        # Return highest-scoring staff member
        return max(staff_scores, key=staff_scores.get)
