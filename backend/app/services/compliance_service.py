"""Compliance service — health scores and bulk logic."""
import logging
from uuid import UUID
from sqlalchemy import select, func, update, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.compliance_task import ComplianceTask, TaskStatus
from app.models.client import Client
from datetime import date
from app.core.redis import cache_delete

logger = logging.getLogger(__name__)

async def recalculate_firm_health_scores(firm_id: UUID, db: AsyncSession):
    """
    Optimized bulk recalculation of compliance health scores using single SQL aggregation.
    Formula: (Completed Tasks / Total Tasks Due) * 10
    """
    try:
        today = date.today()
        
        # Optimized Bulk Query: Calculate counts for all clients at once
        # Using conditional aggregation for performance
        stats_stmt = select(
            ComplianceTask.client_id,
            func.count(ComplianceTask.id).label("total_due"),
            func.count(case(
                (ComplianceTask.status.in_([TaskStatus.COMPLETED, TaskStatus.FILED]), 1),
                else_=None
            )).label("total_done")
        ).where(
            ComplianceTask.firm_id == firm_id,
            ComplianceTask.due_date <= today,
            ComplianceTask.status != TaskStatus.WAIVED
        ).group_by(ComplianceTask.client_id)
        
        stats_result = await db.execute(stats_stmt)
        stats_map = {row[0]: (row[1], row[2]) for row in stats_result.all()}
        
        # Fetch all clients to update
        clients_result = await db.execute(select(Client).where(Client.firm_id == firm_id))
        clients = clients_result.scalars().all()
        
        for client in clients:
            total_due, total_done = stats_map.get(client.id, (0, 0))
            
            if total_due == 0:
                client.compliance_health_score = 10
            else:
                new_score = round((total_done / total_due) * 10)
                client.compliance_health_score = max(1, min(10, new_score))
            
            # Risk profiling
            if client.compliance_health_score <= 4:
                client.penalty_risk_score = 9
                client.churn_risk = "high"
            elif client.compliance_health_score <= 7:
                client.penalty_risk_score = 5
                client.churn_risk = "medium"
            else:
                client.penalty_risk_score = 2
                client.churn_risk = "low"
        
        await db.flush()
        
        # Invalidate Analytics Cache as health scores affect dashboard
        await cache_delete(f"analytics:stats:{firm_id}")
        
        # Invalidate all compliance task list variations for this firm
        from app.core.redis import cache_delete_pattern
        await cache_delete_pattern(f"compliance:tasks:{firm_id}:*")
        
        logger.info(f"🚀 Optimized health score recalculation complete for firm {firm_id}")
        
    except Exception as e:
        logger.error(f"Error recalculating health scores: {str(e)}")
