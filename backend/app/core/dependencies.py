"""FastAPI dependency injection — auth, DB session, firm context."""
from typing import Optional, AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import verify_access_token
from app.core.exceptions import UnauthorizedError, ForbiddenError, NotFoundError
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)


# ─── DB Session ─────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ─── Auth Dependencies ───────────────────────────────────────────────────────

async def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Validates Bearer JWT and returns the decoded payload."""
    if not credentials:
        raise UnauthorizedError("No authentication token provided")
    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")
    return payload


async def get_current_user_id(
    payload: dict = Depends(get_current_user_payload),
) -> UUID:
    return UUID(payload["sub"])


async def get_current_firm_id(
    payload: dict = Depends(get_current_user_payload),
) -> UUID:
    firm_id = payload.get("firm_id")
    if not firm_id:
        raise ForbiddenError("No firm context in token")
    return UUID(firm_id)


async def get_current_role(
    payload: dict = Depends(get_current_user_payload),
) -> UserRole:
    return UserRole(payload.get("role", ""))


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise UnauthorizedError("User not found")
    return user


# ─── Role Guards ─────────────────────────────────────────────────────────────

def require_roles(*roles: UserRole):
    """Factory: returns a dependency that enforces one of the given roles."""
    async def _check(current_role: UserRole = Depends(get_current_role)):
        if current_role not in roles:
            raise ForbiddenError(
                f"This action requires one of: {', '.join(r.value for r in roles)}"
            )
        return current_role
    return _check


# ─── Convenience role guards ─────────────────────────────────────────────────

require_firm_owner = require_roles(UserRole.FIRM_OWNER, UserRole.SUPER_ADMIN)
require_ca_staff = require_roles(
    UserRole.FIRM_OWNER, UserRole.CA_STAFF_SENIOR, UserRole.SUPER_ADMIN
)
require_any_firm_user = require_roles(
    UserRole.FIRM_OWNER, UserRole.CA_STAFF_SENIOR,
    UserRole.CA_STAFF_JUNIOR, UserRole.ARTICLESHIP, UserRole.SUPER_ADMIN
)
require_super_admin = require_roles(UserRole.SUPER_ADMIN)

async def get_current_portal_client_id(
    payload: dict = Depends(get_current_user_payload),
) -> UUID:
    if payload.get("role") != "client":
        raise ForbiddenError("This endpoint is for portal clients only")
    return UUID(payload["sub"])

require_portal_client = require_roles(UserRole.CLIENT)
