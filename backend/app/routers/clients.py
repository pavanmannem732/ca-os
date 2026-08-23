"""Clients router — full CRUD with auth and validation."""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_db, get_current_user_id, get_current_firm_id,
    require_firm_owner, require_ca_staff,
)
from app.services.client_service import ClientService

router = APIRouter()


from pydantic import BaseModel, Field


class ClientCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=500)
    client_type: str
    gstin: Optional[str] = Field(None, min_length=15, max_length=15, pattern=r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$")
    pan: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^[A-Z]{5}\d{4}[A-Z]$")
    tan: Optional[str] = Field(None, min_length=10, max_length=10)
    cin: Optional[str] = Field(None, min_length=21, max_length=21)
    primary_contact_name: str = Field(..., min_length=2, max_length=255)
    primary_mobile: str = Field(..., min_length=10, max_length=10, pattern=r"^[6-9]\d{9}$")
    primary_email: Optional[str] = None
    compliance_services: List[str] = []
    gst_filing_frequency: Optional[str] = None
    itr_form_type: Optional[str] = None
    audit_type: Optional[str] = None
    retainer_fee_monthly: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


@router.get("/", status_code=status.HTTP_200_OK)
async def list_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=100),
    compliance_service: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    result = await ClientService.list_clients(
        firm_id=firm_id, db=db, page=page, limit=limit,
        search=search, compliance_service=compliance_service,
        include_archived=include_archived
    )
    return {"data": result["items"], "meta": {k: v for k, v in result.items() if k != "items"}}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    client = await ClientService.create_client(firm_id, user_id, body.model_dump(), db)
    return {"data": ClientService._to_summary(client), "message": "Client created successfully"}


@router.get("/{client_id}", status_code=status.HTTP_200_OK)
async def get_client(
    client_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    client = await ClientService.get_client(client_id, firm_id, db)
    return {"data": {
        "id": str(client.id),
        "name": client.name,
        "slug": client.slug,
        "client_type": client.client_type,
        "gstin": client.gstin,
        "pan": client.pan,
        "tan": client.tan,
        "cin": client.cin,
        "primary_contact_name": client.primary_contact_name,
        "primary_mobile": client.primary_mobile,
        "primary_email": client.primary_email,
        "compliance_services": client.compliance_services or [],
        "gst_filing_frequency": client.gst_filing_frequency,
        "itr_form_type": client.itr_form_type,
        "audit_type": client.audit_type,
        "compliance_health_score": client.compliance_health_score,
        "penalty_risk_score": client.penalty_risk_score,
        "churn_risk": client.churn_risk,
        "retainer_fee_monthly": client.retainer_fee_monthly,
        "notes": client.notes,
        "tags": client.tags or [],
        "portal_access_enabled": client.portal_access_enabled,
        "onboarded_at": client.onboarded_at.isoformat() if client.onboarded_at else None,
        "created_at": client.created_at.isoformat() if client.created_at else None,
    }}


class ClientUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=500)
    client_type: Optional[str] = None
    gstin: Optional[str] = Field(None, min_length=15, max_length=15, pattern=r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$")
    pan: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^[A-Z]{5}\d{4}[A-Z]$")
    tan: Optional[str] = Field(None, min_length=10, max_length=10)
    cin: Optional[str] = Field(None, min_length=21, max_length=21)
    primary_contact_name: Optional[str] = Field(None, min_length=2, max_length=255)
    primary_mobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^[6-9]\d{9}$")
    primary_email: Optional[str] = None
    compliance_services: Optional[List[str]] = None
    gst_filing_frequency: Optional[str] = None
    itr_form_type: Optional[str] = None
    audit_type: Optional[str] = None
    retainer_fee_monthly: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


@router.patch("/{client_id}", status_code=status.HTTP_200_OK)
async def update_client(
    client_id: UUID,
    body: ClientUpdateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    client = await ClientService.update_client(
        client_id, firm_id, user_id, body.model_dump(exclude_unset=True), db
    )
    return {"data": ClientService._to_summary(client), "message": "Client updated successfully"}


@router.post("/{client_id}/restore", status_code=status.HTTP_200_OK)
async def restore_client(
    client_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    client = await ClientService.restore_client(client_id, firm_id, user_id, db)
    return {"data": ClientService._to_summary(client), "message": "Client restored successfully"}


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_client(
    client_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Archiving client {client_id} for firm {firm_id} by user {user_id}")
    try:
        await ClientService.archive_client(client_id, firm_id, user_id, db)
        logger.info(f"Successfully archived client {client_id}")
    except Exception as e:
        logger.error(f"Failed to archive client {client_id}: {str(e)}")
        raise
