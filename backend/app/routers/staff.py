"""Staff router — team management."""
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.dependencies import get_db, get_current_firm_id, get_current_user_id, require_firm_owner
from app.models.user import User, UserRole

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_staff(
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    result = await db.execute(
        select(User).where(User.firm_id == firm_id, User.deleted_at.is_(None))
    )
    users = result.scalars().all()
    return {"data": [
        {"id": str(u.id), "full_name": u.full_name, "email": u.email,
         "mobile": u.mobile, "role": u.role, "is_active": u.is_active}
        for u in users
    ]}


class InviteStaffSchema(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    role: str

    def validate_role(self):
        allowed = {UserRole.CA_STAFF_SENIOR, UserRole.CA_STAFF_JUNIOR, UserRole.ARTICLESHIP}
        if UserRole(self.role) not in allowed:
            from app.core.exceptions import ValidationError
            raise ValidationError("Role must be ca_staff_senior, ca_staff_junior, or articleship")


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_staff(
    body: InviteStaffSchema,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    user = User(
        firm_id=firm_id,
        full_name=body.full_name,
        email=str(body.email),
        mobile=body.mobile,
        role=UserRole(body.role),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return {"data": {"id": str(user.id), "email": user.email}, "message": "Staff member invited"}


@router.get("/capacity/{staff_id}", status_code=status.HTTP_200_OK)
async def get_staff_capacity(
    staff_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    from app.services.staff_service import StaffService
    capacity = await StaffService.get_staff_capacity(db, staff_id)
    return {"data": capacity}


@router.get("/suggest-assignee", status_code=status.HTTP_200_OK)
async def suggest_assignee(
    task_type: str,
    client_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_firm_owner),
):
    from app.services.staff_service import StaffService
    suggested_id = await StaffService.suggest_task_assignee(db, firm_id, task_type, client_id)
    return {"data": {"suggested_staff_id": str(suggested_id) if suggested_id else None}}
