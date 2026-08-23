from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
import enum
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    firm_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("firms.id"), nullable=True)
    actor_id: Mapped[UUID] = mapped_column(nullable=False)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)
    
    changes_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)
    
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
