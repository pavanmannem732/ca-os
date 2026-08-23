"""Compliance router — tasks and calendar."""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_firm_id, get_current_user_id, require_ca_staff
from app.models.compliance_task import ComplianceTask, TaskStatus
from datetime import date

router = APIRouter()


import json
from app.core.redis import cache_get, cache_set, cache_delete

@router.get("/tasks", status_code=status.HTTP_200_OK)
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="filter[status]"),
    client_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_ca_staff),
):
    # Unique cache key based on filters and pagination
    cache_key = f"compliance:tasks:{firm_id}:{status_filter}:{client_id}:{page}:{limit}"
    
    try:
        cached_data = await cache_get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception:
        pass

    query = select(ComplianceTask).where(
        ComplianceTask.firm_id == firm_id,
        ComplianceTask.deleted_at.is_(None),
    )
    if status_filter:
        try:
            query = query.where(ComplianceTask.status == TaskStatus(status_filter))
        except ValueError:
            pass
    if client_id:
        query = query.where(ComplianceTask.client_id == client_id)

    query = query.order_by(ComplianceTask.due_date).offset((page - 1) * limit).limit(limit)
    tasks = (await db.execute(query)).scalars().all()

    response_data = {"data": [
        {
            "id": str(t.id),
            "client_id": str(t.client_id),
            "task_type": t.task_type,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "period_month": t.period_month,
            "period_year": t.period_year,
            "assigned_to_id": str(t.assigned_to_id) if t.assigned_to_id else None,
            "documents_ready": t.documents_ready,
        }
        for t in tasks
    ]}

    # Cache for 60 seconds
    try:
        await cache_set(cache_key, json.dumps(response_data), expire_seconds=60)
    except Exception:
        pass

    return response_data


@router.get("/calendar", status_code=status.HTTP_200_OK)
async def get_calendar(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_ca_staff),
):
    from calendar import monthrange
    _first_day, last_day = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)
    query = select(ComplianceTask).where(
        ComplianceTask.firm_id == firm_id,
        ComplianceTask.due_date >= start,
        ComplianceTask.due_date <= end,
    ).order_by(ComplianceTask.due_date)
    tasks = (await db.execute(query)).scalars().all()
    calendar_data: dict = {}
    for t in tasks:
        key = t.due_date.isoformat()
        calendar_data.setdefault(key, []).append({
            "id": str(t.id),
            "client_id": str(t.client_id),
            "task_type": t.task_type,
            "status": t.status,
        })
    return {"data": calendar_data}


class TaskStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    filing_reference: Optional[str] = None


class BulkTaskUpdate(BaseModel):
    task_ids: List[UUID]
    status: str
    notes: Optional[str] = None
    filing_reference: Optional[str] = None


@router.post("/tasks/bulk-update-status", status_code=status.HTTP_200_OK)
async def bulk_update_tasks(
    body: BulkTaskUpdate,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_ca_staff),
):
    from sqlalchemy import update
    from datetime import datetime, timezone
    
    from typing import Any
    update_data: dict[str, Any] = {"status": TaskStatus(body.status)}
    if body.notes:
        update_data["notes"] = body.notes
    if body.filing_reference:
        update_data["filing_reference"] = body.filing_reference
    if body.status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)

    # Bulk update tasks belonging to this firm
    stmt = (
        update(ComplianceTask)
        .where(
            ComplianceTask.id.in_(body.task_ids),
            ComplianceTask.firm_id == firm_id
        )
        .values(**update_data)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    # Recalculate health scores for affected clients (Simplified version for now)
    # In a real enterprise app, this would be a background Celery task
    from app.services.compliance_service import recalculate_firm_health_scores
    await recalculate_firm_health_scores(firm_id, db)
    
    return {"data": {"updated_count": result.rowcount}}


@router.patch("/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def update_task_status(
    task_id: UUID,
    body: TaskStatusUpdate,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_ca_staff),
):
    from app.core.exceptions import NotFoundError
    result = await db.execute(
        select(ComplianceTask).where(
            ComplianceTask.id == task_id, ComplianceTask.firm_id == firm_id
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", str(task_id))
    task.status = TaskStatus(body.status)
    if body.notes:
        task.notes = body.notes
    if body.filing_reference:
        task.filing_reference = body.filing_reference
    if body.status == "completed":
        from datetime import datetime, timezone
        task.completed_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    # Recalculate health scores
    from app.services.compliance_service import recalculate_firm_health_scores
    await recalculate_firm_health_scores(firm_id, db)

    # Automated Billing Trigger: Log work on completion
    if body.status == "completed":
        from app.services.billing_service import billing_service
        await billing_service.log_task_work(
            db=db,
            firm_id=firm_id,
            client_id=task.client_id,
            task_id=task.id,
            task_type=task.task_type,
            staff_user_id=user_id
        )
        await db.commit()
    
    return {"data": {"id": str(task.id), "status": task.status}}

@router.post("/generate-calendar/{client_id}")
async def generate_client_calendar(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    firm_id: UUID = Depends(get_current_firm_id)
):
    """
    Triggers automated compliance calendar generation for a client (Section 47.3).
    """
    from app.services.calendar_service import calendar_service
    await calendar_service.generate_annual_calendar(db, firm_id, client_id)
    await db.commit()
    return {"message": "Compliance calendar generated successfully for the next 12 months."}
