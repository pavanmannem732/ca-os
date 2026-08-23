"""Firm model — root tenant entity."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4
import enum
from sqlalchemy import String, JSON, Enum as SQLEnum, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.client import Client


class FirmType(str, enum.Enum):
    SOLE_PROPRIETOR = "sole_proprietor"
    PARTNERSHIP = "partnership"
    LLP = "llp"
    COMPANY = "company"


class PlanType(str, enum.Enum):
    STARTER = "starter"
    GROWTH = "growth"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class PlanStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Firm(Base, TimestampMixin):
    __tablename__ = "firms"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    type: Mapped[FirmType] = mapped_column(SQLEnum(FirmType, name="firm_type_enum"), nullable=False)

    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    address_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)

    primary_mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    primary_email: Mapped[str] = mapped_column(String(255), nullable=False)
    icai_membership_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    whatsapp_account_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    plan: Mapped[PlanType] = mapped_column(SQLEnum(PlanType, name="plan_type_enum"), default=PlanType.STARTER)
    plan_status: Mapped[PlanStatus] = mapped_column(SQLEnum(PlanStatus, name="plan_status_enum"), default=PlanStatus.TRIAL)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    plan_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    monthly_ai_draft_limit: Mapped[int] = mapped_column(Integer, default=50)
    monthly_whatsapp_limit: Mapped[int] = mapped_column(Integer, default=1000)
    
    api_secret_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    key_last_rotated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    settings_json: Mapped[dict] = mapped_column(JSON, default=dict)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="firm", lazy="select")
    clients: Mapped[List["Client"]] = relationship("Client", back_populates="firm", lazy="select")
