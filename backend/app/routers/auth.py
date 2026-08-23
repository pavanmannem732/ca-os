"""Auth router — OTP login and firm registration."""
import re
from typing import Optional
from fastapi import APIRouter, Depends, status, Response, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.services.auth_service import AuthService

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

INDIAN_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


class OTPRequestSchema(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().lstrip("+91").lstrip("91")
        if not INDIAN_MOBILE_RE.match(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number starting with 6-9")
        return v


class OTPVerifySchema(BaseModel):
    mobile: str
    otp: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().lstrip("+91").lstrip("91")
        if not INDIAN_MOBILE_RE.match(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v


class FirmRegistrationSchema(BaseModel):
    mobile: str
    full_name: str
    email: EmailStr
    firm_name: str
    firm_type: str
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip().lstrip("+91").lstrip("91")
        if not INDIAN_MOBILE_RE.match(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v

    @field_validator("firm_type")
    @classmethod
    def validate_firm_type(cls, v: str) -> str:
        allowed = {"sole_proprietor", "partnership", "llp", "company"}
        if v not in allowed:
            raise ValueError(f"firm_type must be one of: {', '.join(allowed)}")
        return v

    @field_validator("firm_name")
    @classmethod
    def validate_firm_name(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("Firm name must be at least 3 characters")
        return v.strip()


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.post("/request-otp", status_code=status.HTTP_200_OK)
async def request_otp(
    body: OTPRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    result = await AuthService.request_otp(body.mobile, db)
    return {"data": result}


@router.post("/verify-otp", status_code=status.HTTP_200_OK)
async def verify_otp(
    body: OTPVerifySchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await AuthService.verify_otp_and_login(body.mobile, body.otp, db)
    # Set refresh token as HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 3600,
        path="/api/v1/auth",
    )
    return {"data": {k: v for k, v in result.items() if k != "refresh_token"}}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_firm(
    body: FirmRegistrationSchema,
    db: AsyncSession = Depends(get_db),
):
    result = await AuthService.register_firm(
        mobile=body.mobile,
        full_name=body.full_name,
        email=body.email,
        firm_name=body.firm_name,
        firm_type=body.firm_type,
        city=body.city,
        state=body.state,
        db=db,
    )
    return {"data": result, "message": "Account created. Please verify your mobile number."}


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        from app.core.exceptions import ForbiddenError
        raise ForbiddenError("Refresh token missing")
    
    result = await AuthService.refresh_access_token(refresh_token, db)
    return {"data": result}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
