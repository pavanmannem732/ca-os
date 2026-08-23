from typing import Optional, List, TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.user import User
from uuid import UUID as PyUUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, ARRAY, SMALLINT, DateTime, Text, Date, UUID as SqlUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, AuditMixin
import enum
from datetime import date, datetime

class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    FILED = "filed"
    OVERDUE = "overdue"
    WAIVED = "waived"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceTask(Base, TimestampMixin, AuditMixin):
    __tablename__ = "compliance_tasks"

    id: Mapped[PyUUID] = mapped_column(SqlUUID, primary_key=True, default=uuid4)
    firm_id: Mapped[PyUUID] = mapped_column(SqlUUID, ForeignKey("firms.id"), nullable=False, index=True)
    client_id: Mapped[PyUUID] = mapped_column(SqlUUID, ForeignKey("clients.id"), nullable=False, index=True)
    
    task_type: Mapped[str] = mapped_column(String(50), nullable=False)
    custom_task_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    period_month: Mapped[Optional[int]] = mapped_column(SMALLINT, nullable=True)
    period_year: Mapped[Optional[int]] = mapped_column(SMALLINT, nullable=True)
    period_quarter: Mapped[Optional[int]] = mapped_column(SMALLINT, nullable=True)
    
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[TaskStatus] = mapped_column(default=TaskStatus.NOT_STARTED, index=True)
    priority: Mapped[TaskPriority] = mapped_column(default=TaskPriority.MEDIUM)
    
    assigned_to_id: Mapped[Optional[PyUUID]] = mapped_column(SqlUUID, ForeignKey("users.id"), nullable=True)
    assigned_by_id: Mapped[Optional[PyUUID]] = mapped_column(SqlUUID, ForeignKey("users.id"), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    documents_required: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    documents_received_ids: Mapped[List[PyUUID]] = mapped_column(ARRAY(SqlUUID), default=list)
    documents_ready: Mapped[bool] = mapped_column(default=False)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    filed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    filing_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    reminder_sent_count: Mapped[int] = mapped_column(SMALLINT, default=0)
    last_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="tasks")
