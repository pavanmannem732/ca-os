"""Authentication service — OTP send, verify, JWT issue."""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_otp, hash_otp, verify_otp,
    create_access_token, create_refresh_token, slugify, generate_unique_suffix,
)
from app.core.redis import (
    store_otp, get_stored_otp, delete_otp,
    increment_otp_attempts, check_otp_request_limit, store_session,
)
from app.core.exceptions import (
    NotFoundError, OTPError, RateLimitError, ValidationError, ConflictError, ForbiddenError
)
from app.models.user import User, UserRole
from app.models.firm import Firm, FirmType, PlanType, PlanStatus

logger = logging.getLogger(__name__)


class AuthService:

    @staticmethod
    async def request_otp(mobile: str, db: AsyncSession) -> dict:
        """Send OTP to mobile. Validates mobile exists for login."""
        # Rate limit: 10 requests per 10 mins in dev, 3 in prod
        limit = 100 if settings.DEBUG else 3
        allowed = await check_otp_request_limit(mobile, limit=limit, window_seconds=600)
        if not allowed:
            raise RateLimitError(retry_after=600)

        otp = generate_otp()
        hashed = hash_otp(otp)
        await store_otp(mobile, hashed, expire_seconds=settings.OTP_EXPIRE_SECONDS)

        # In production, send via MSG91; in dev, log it
        masked = f"{mobile[:2]}{'*' * 6}{mobile[-2:]}"
        if settings.DEBUG:
            logger.warning(f"[DEV] OTP for {mobile}: {otp}")
        else:
            await AuthService._send_sms_otp(mobile, otp)

        return {"expires_in": settings.OTP_EXPIRE_SECONDS, "masked_mobile": masked}

    @staticmethod
    async def verify_otp_and_login(mobile: str, otp: str, db: AsyncSession) -> dict:
        """Verify OTP, find user, issue tokens."""
        hashed_otp = await get_stored_otp(mobile)
        if not hashed_otp:
            raise OTPError("OTP has expired. Please request a new one.")

        attempts = await increment_otp_attempts(mobile)
        if attempts > settings.OTP_MAX_ATTEMPTS:
            raise OTPError("Too many attempts. Request a new OTP.", attempts_remaining=0)

        if not verify_otp(otp, hashed_otp):
            remaining = settings.OTP_MAX_ATTEMPTS - attempts
            raise OTPError("Incorrect OTP.", attempts_remaining=max(0, remaining))

        await delete_otp(mobile)

        # Load user
        result = await db.execute(
            select(User).where(User.mobile == mobile, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", mobile)
        if not user.is_active:
            raise ValidationError("Your account has been deactivated. Contact support.")

        # Update login stats
        user.last_login_at = datetime.now(timezone.utc)
        user.login_count = (user.login_count or 0) + 1
        await db.flush()

        access_token = create_access_token(
            subject=str(user.id),
            firm_id=str(user.firm_id) if user.firm_id else None,
            role=user.role.value,
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        await store_session(str(user.id), {
            "user_id": str(user.id),
            "firm_id": str(user.firm_id) if user.firm_id else None,
            "role": user.role.value,
        })

        logger.info(f"User {user.id} logged in successfully")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "mobile": user.mobile,
                "role": user.role.value,
                "firm_id": str(user.firm_id) if user.firm_id else None,
            },
        }

    @staticmethod
    async def register_firm(
        mobile: str,
        full_name: str,
        email: str,
        firm_name: str,
        firm_type: str,
        city: Optional[str],
        state: Optional[str],
        db: AsyncSession,
    ) -> dict:
        """Register a new CA firm and its owner."""
        # Check duplicates
        existing_user = await db.execute(
            select(User).where(User.mobile == mobile, User.deleted_at.is_(None))
        )
        if existing_user.scalar_one_or_none():
            raise ConflictError("An account with this mobile number already exists.")

        existing_email = await db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        if existing_email.scalar_one_or_none():
            raise ConflictError("An account with this email already exists.")

        # Create firm slug
        base_slug = slugify(firm_name)
        slug = f"{base_slug}-{generate_unique_suffix()}"

        firm = Firm(
            name=firm_name,
            slug=slug,
            type=FirmType(firm_type),
            primary_mobile=mobile,
            primary_email=email,
            city=city,
            state=state,
            plan=PlanType.STARTER,
            plan_status=PlanStatus.TRIAL,
        )
        db.add(firm)
        await db.flush()

        user = User(
            firm_id=firm.id,
            full_name=full_name,
            email=email,
            mobile=mobile,
            role=UserRole.FIRM_OWNER,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        logger.info(f"New firm '{firm_name}' registered with id {firm.id}")
        return {"firm_id": str(firm.id), "user_id": str(user.id), "slug": slug}

    @staticmethod
    async def refresh_access_token(refresh_token: str, db: AsyncSession) -> dict:
        """Verify refresh token and issue new access token."""
        from app.core.security import decode_token, create_access_token
        from jose import JWTError
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise ValidationError("Invalid token type")
            
            user_id = payload.get("sub")
            if not user_id:
                raise ValidationError("Invalid token payload")
            
            result = await db.execute(
                select(User).where(User.id == UUID(user_id), User.deleted_at.is_(None))
            )
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                raise ForbiddenError("User not found or inactive")
            
            new_access_token = create_access_token(
                subject=str(user.id),
                firm_id=str(user.firm_id) if user.firm_id else None,
                role=user.role.value,
            )
            
            return {
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            }
        except JWTError:
            raise ForbiddenError("Invalid or expired refresh token")

    @staticmethod
    async def _send_sms_otp(mobile: str, otp: str) -> None:
        """Send OTP via MSG91 — production only."""
        if not settings.MSG91_API_KEY:
            logger.warning("MSG91_API_KEY not configured — OTP not sent")
            return
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    "https://api.msg91.com/api/v5/otp",
                    json={
                        "template_id": settings.MSG91_TEMPLATE_ID_OTP,
                        "mobile": f"91{mobile}",
                        "authkey": settings.MSG91_API_KEY,
                        "otp": otp,
                    },
                )
        except Exception as e:
            logger.error(f"Failed to send OTP via MSG91: {e}")
