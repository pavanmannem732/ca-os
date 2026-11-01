from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, NUMERIC, DateTime, Text, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, AuditMixin
import enum
from datetime import date, datetime

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class Invoice(Base, TimestampMixin, AuditMixin):
    __tablename__ = "invoices"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id"), nullable=False)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"), nullable=False)
    
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    billing_period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    line_items_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    subtotal: Mapped[float] = mapped_column(NUMERIC(12, 2), nullable=False)
    gst_amount: Mapped[float] = mapped_column(NUMERIC(12, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(NUMERIC(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    
    status: Mapped[InvoiceStatus] = mapped_column(default=InvoiceStatus.DRAFT)
    
    razorpay_payment_link_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_payment_link_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_amount: Mapped[Optional[float]] = mapped_column(NUMERIC(12, 2), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class BillingLog(Base, TimestampMixin):
    __tablename__ = "billing_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id"), nullable=False)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"), nullable=False)
    task_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("compliance_tasks.id"), nullable=True)
    staff_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.uuid_id"), nullable=False)
    
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[float] = mapped_column(NUMERIC(5, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    work_category: Mapped[str] = mapped_column(String(50), nullable=False)
    
    billable_amount: Mapped[float] = mapped_column(NUMERIC(12, 2), nullable=False)
    is_billable: Mapped[bool] = mapped_column(default=True)
    invoice_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    
    approved_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.uuid_id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
