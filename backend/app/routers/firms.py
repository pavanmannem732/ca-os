"""Firms router — firm profile and settings."""
from uuid import UUID
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_firm_id, require_firm_owner, require_super_admin
from app.models.firm import Firm
from app.core.exceptions import NotFoundError

router = APIRouter()

@router.get("/all", status_code=status.HTTP_200_OK)
async def list_all_firms(
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_super_admin),
):
    """Platform-level endpoint for Super Admins to oversee all tenants."""
    result = await db.execute(select(Firm).order_by(Firm.created_at.desc()))
    firms = result.scalars().all()
    return {"data": [
        {"id": str(f.id), "name": f.name, "plan": f.plan, "status": f.plan_status}
        for f in firms
    ]}


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_firm(
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    result = await db.execute(select(Firm).where(Firm.id == firm_id))
    firm = result.scalar_one_or_none()
    if not firm:
        raise NotFoundError("Firm")
    return {"data": {
        "id": str(firm.id),
        "name": firm.name,
        "slug": firm.slug,
        "type": firm.type,
        "gstin": firm.gstin,
        "pan": firm.pan,
        "city": firm.city,
        "state": firm.state,
        "primary_mobile": firm.primary_mobile,
        "primary_email": firm.primary_email,
        "plan": firm.plan,
        "plan_status": firm.plan_status,
        "monthly_ai_draft_limit": firm.monthly_ai_draft_limit,
        "api_secret_key": getattr(firm, "api_secret_key", None),
        "key_last_rotated_at": firm.key_last_rotated_at.isoformat() if getattr(firm, "key_last_rotated_at", None) else None,
    }}


class FirmUpdateSchema(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    icai_membership_number: Optional[str] = None


@router.patch("/me", status_code=status.HTTP_200_OK)
async def update_firm(
    body: FirmUpdateSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    result = await db.execute(select(Firm).where(Firm.id == firm_id))
    firm = result.scalar_one_or_none()
    if not firm:
        raise NotFoundError("Firm")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(firm, field, value)
    return {"data": {"id": str(firm.id), "name": firm.name}}

@router.post("/me/rotate-key", status_code=status.HTTP_200_OK)
async def rotate_firm_key(
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    import secrets
    from datetime import datetime, timezone
    
    result = await db.execute(select(Firm).where(Firm.id == firm_id))
    firm = result.scalar_one_or_none()
    if not firm:
        raise NotFoundError("Firm")
    
    new_key = f"caos_sk_{secrets.token_urlsafe(32)}"
    now = datetime.now(timezone.utc)
    firm.api_secret_key = new_key
    firm.key_last_rotated_at = now
    
    await db.commit()
    await db.refresh(firm)
    
    return {
        "data": {
            "api_secret_key": new_key,
            "last_rotated_at": now.isoformat()
        },
        "message": "Firm secret key rotated successfully"
    }
