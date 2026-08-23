"""Portal router — client-facing endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.core.dependencies import get_db, get_current_portal_client_id, get_current_firm_id, require_portal_client
from app.models.compliance_task import ComplianceTask

router = APIRouter()

@router.post("/auth/request-otp")
async def portal_request_otp(mobile: str, firm_slug: str, db: AsyncSession = Depends(get_db)):
    from app.services.auth_service import AuthService
    result = await AuthService.request_otp(mobile, db)
    return {"data": result}

@router.get("/compliance", status_code=status.HTTP_200_OK)
async def get_my_compliance(
    client_id: UUID = Depends(get_current_portal_client_id),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_portal_client)
):
    """Returns compliance status overview for the logged-in portal client."""
    query = select(ComplianceTask).where(
        ComplianceTask.client_id == client_id,
        ComplianceTask.firm_id == firm_id
    ).order_by(ComplianceTask.due_date)
    
    tasks = (await db.execute(query)).scalars().all()
    
    return {"data": [
        {
            "id": str(t.id),
            "task_type": t.task_type,
            "status": t.status,
            "due_date": t.due_date.isoformat(),
            "name": t.custom_task_name or t.task_type
        }
        for t in tasks
    ]}


@router.post("/documents/upload-url", status_code=status.HTTP_200_OK)
async def get_portal_upload_url(
    file_name: str,
    file_type: str,
    task_id: Optional[UUID] = None,
    client_id: UUID = Depends(get_current_portal_client_id),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_portal_client)
):
    from app.services.portal_service import portal_service
    result = await portal_service.get_upload_url(client_id, firm_id, file_name, file_type, task_id)
    return {"data": result}


@router.get("/invoices", status_code=status.HTTP_200_OK)
async def get_portal_invoices(
    client_id: UUID = Depends(get_current_portal_client_id),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_portal_client)
):
    from app.services.portal_service import portal_service
    invoices = await portal_service.get_client_invoices(db, client_id, firm_id)
    return {"data": invoices}
