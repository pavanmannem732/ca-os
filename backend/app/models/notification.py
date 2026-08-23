"""Notification model — all outbound notifications, all channels."""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
import enum
from sqlalchemy import String, ForeignKey, SmallInteger, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class NotificationChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"
    PUSH = "push"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_type: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    recipient_client_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        SQLEnum(NotificationChannel, name="notif_channel_enum"), nullable=False
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[NotificationStatus] = mapped_column(
        SQLEnum(NotificationStatus, name="notif_status_enum"),
        default=NotificationStatus.PENDING, nullable=False
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
