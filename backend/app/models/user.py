"""User model — all authenticated actors across the platform."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4
import enum

if TYPE_CHECKING:
    from app.models.firm import Firm
from sqlalchemy import String, ForeignKey, Boolean, Integer, Enum as SQLEnum, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    SUPPORT_AGENT = "support_agent"
    PLATFORM_ANALYST = "platform_analyst"
    FIRM_OWNER = "firm_owner"
    CA_STAFF_SENIOR = "ca_staff_senior"
    CA_STAFF_JUNIOR = "ca_staff_junior"
    ARTICLESHIP = "articleship"
    CLIENT = "client"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("firms.id", ondelete="SET NULL"), nullable=True, index=True)

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False, index=True)

    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="user_role_enum"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    theme_preference: Mapped[str] = mapped_column(String(20), default="system", nullable=False)
    notification_preferences_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    firm: Mapped[Optional["Firm"]] = relationship("Firm", back_populates="users")
