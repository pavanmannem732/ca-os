from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select, text
from datetime import datetime, timedelta, timezone
from app.models.compliance_task import ComplianceTask
from app.models.billing import Invoice
from app.models.user import User
from app.models.ai import AIDraft
from app.models.client import Client
import logging
import json
from app.core.redis import cache_get, cache_set

logger = logging.getLogger(__name__)

class AnalyticsService:
    @staticmethod
    async def get_firm_stats(db: AsyncSession, firm_id: UUID):
        cache_key = f"analytics:stats:{firm_id}"
        
        # 1. Try to fetch from Redis Cache
        try:
            cached_data = await cache_get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache miss or error: {e}")

        try:
            # 1. Compliance Health (Average of all clients)
            health_stmt = select(func.avg(Client.compliance_health_score)).filter(Client.firm_id == firm_id)
            health_result = await db.execute(health_stmt)
            avg_health = health_result.scalar() or 0.0
            
            # 2. Task Distribution
            tasks_stmt = select(ComplianceTask.status, func.count(ComplianceTask.id))\
                .join(Client).filter(Client.firm_id == firm_id).group_by(ComplianceTask.status)
            tasks_result = await db.execute(tasks_stmt)
            task_dist = {str(row[0]): int(row[1]) for row in tasks_result.all()}
            
            # 3. Revenue Insights (Aggregated Totals)
            billed_stmt = select(func.sum(Invoice.total_amount)).filter(Invoice.firm_id == firm_id)
            total_billed = (await db.execute(billed_stmt)).scalar() or 0.0
            
            paid_stmt = select(func.sum(Invoice.total_amount)).filter(and_(Invoice.firm_id == firm_id, Invoice.status == "paid"))
            total_paid = (await db.execute(paid_stmt)).scalar() or 0.0
            
            recovery_rate = (float(total_paid) / float(total_billed) * 100) if float(total_billed) > 0 else 0

            # 4. Real Revenue Trend (Last 6 Months)
            # Optimized for PostgreSQL date_trunc
            trend_stmt = text("""
                SELECT 
                    date_trunc('month', created_at) as month,
                    SUM(total_amount) as amount
                FROM invoices
                WHERE firm_id = :firm_id 
                AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY month
                ORDER BY month ASC
            """)
            trend_result = await db.execute(trend_stmt, {"firm_id": firm_id})
            revenue_trend = [
                {"month": row[0].strftime("%b"), "amount": float(row[1])}
                for row in trend_result.all()
            ]
            
            # 5. AI Savings
            ai_stmt = select(func.count(AIDraft.id)).filter(and_(AIDraft.firm_id == firm_id, AIDraft.was_used == True))
            ai_drafts_used = (await db.execute(ai_stmt)).scalar() or 0
            hours_saved = round((ai_drafts_used * 15) / 60, 1)
            
            # 6. Staff Performance (Tasks completed in last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            staff_stmt = select(
                User.full_name,
                func.count(ComplianceTask.id).label("completed_tasks")
            ).join(ComplianceTask, ComplianceTask.assigned_to_id == User.id)\
             .filter(and_(User.firm_id == firm_id, ComplianceTask.status == "completed", ComplianceTask.updated_at >= thirty_days_ago))\
             .group_by(User.full_name)
            
            staff_result = await db.execute(staff_stmt)
            staff_performance = [{"name": str(row[0]), "tasks": int(row[1])} for row in staff_result.all()]
            
            result = {
                "compliance_health": round(float(avg_health), 1),
                "task_distribution": task_dist,
                "revenue": {
                    "total_billed": float(total_billed),
                    "total_paid": float(total_paid),
                    "recovery_rate": round(recovery_rate, 1),
                    "trend": revenue_trend
                },
                "ai_savings": {
                    "drafts_used": ai_drafts_used,
                    "hours_saved": hours_saved
                },
                "staff_performance": staff_performance
            }

            # Cache the result for 5 minutes (300 seconds)
            try:
                await cache_set(cache_key, json.dumps(result), expire_seconds=300)
            except Exception as e:
                logger.error(f"Failed to set cache: {e}")

            return result

        except Exception as e:
            logger.error(f"Error in AnalyticsService.get_firm_stats: {str(e)}")
            raise e
