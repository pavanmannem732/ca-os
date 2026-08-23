from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_firm_id, require_any_firm_user
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/stats")
async def get_firm_stats(
    db: AsyncSession = Depends(get_db),
    firm_id: UUID = Depends(get_current_firm_id),
    _auth: None = Depends(require_any_firm_user)
):
    try:
        return await AnalyticsService.get_firm_stats(db, firm_id)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail={"error": str(e), "traceback": error_details}
        )

@router.get("/revenue-trend")
async def get_revenue_trend(
    db: AsyncSession = Depends(get_db),
    firm_id: UUID = Depends(get_current_firm_id),
    _auth: None = Depends(require_any_firm_user)
):
    # This currently returns mock data but is fully integrated with auth and session
    return [
        {"month": "Apr", "revenue": 8.5},
        {"month": "May", "revenue": 9.2},
        {"month": "Jun", "revenue": 8.8},
        {"month": "Jul", "revenue": 10.5},
        {"month": "Aug", "revenue": 11.2},
        {"month": "Sep", "revenue": 12.4},
    ]
