"""WhatsApp conversation and message models."""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
import enum
from sqlalchemy import String, ForeignKey, SmallInteger, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class ConversationStatus(str, enum.Enum):
    BOT_IDLE = "BOT_HANDLING"
    BOT_ACTIVE = "BOT_HANDLING"
    HUMAN_REQUESTED = "HUMAN_HANDLING"
    HUMAN_ACTIVE = "HUMAN_HANDLING"
    RESOLVED = "RESOLVED"
    ACTIVE = "ACTIVE"


class MessageDirection(str, enum.Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"


class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    DOCUMENT = "DOCUMENT"
    IMAGE = "IMAGE"
    TEMPLATE = "TEMPLATE"


class MessageStatus(str, enum.Enum):
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"


class WhatsAppConversation(Base, TimestampMixin):
    __tablename__ = "whatsapp_conversations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    meta_conversation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[ConversationStatus] = mapped_column(
        SQLEnum(ConversationStatus, name="conversation_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=ConversationStatus.BOT_IDLE, nullable=False
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    unread_count: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)


class WhatsAppMessage(Base, TimestampMixin):
    __tablename__ = "whatsapp_messages"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    conversation_id: Mapped[UUID] = mapped_column(ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    meta_message_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    direction: Mapped[MessageDirection] = mapped_column(SQLEnum(MessageDirection, name="msg_direction_enum", values_callable=lambda x: [e.value for e in x]), nullable=False)
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)
    sender_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    message_type: Mapped[MessageType] = mapped_column(SQLEnum(MessageType, name="msg_type_enum", values_callable=lambda x: [e.value for e in x]), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    document_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("documents.id"), nullable=True)
    template_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[MessageStatus] = mapped_column(SQLEnum(MessageStatus, name="msg_status_enum", values_callable=lambda x: [e.value for e in x]), default=MessageStatus.SENT)
    meta_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
