from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, BIGINT, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, AuditMixin
import enum
from datetime import datetime

class DocumentCategory(str, enum.Enum):
    BANK_STATEMENT = "bank_statement"
    INVOICE = "invoice"
    PURCHASE_REGISTER = "purchase_register"
    GST_RETURN = "gst_return"
    TDS_CERTIFICATE = "tds_certificate"
    AUDIT_REPORT = "audit_report"
    GOVERNMENT_NOTICE = "government_notice"
    OTHER = "other"

class Folder(Base, TimestampMixin, AuditMixin):
    __tablename__ = "folders"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id"), nullable=False, index=True)
    client_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True, index=True)
    parent_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("folders.id"), nullable=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class Document(Base, TimestampMixin, AuditMixin):
    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id"), nullable=False, index=True)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    folder_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("folders.id"), nullable=True, index=True)
    task_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("compliance_tasks.id"), nullable=True)
    
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BIGINT, nullable=False)
    file_type: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    s3_bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    
    document_category: Mapped[DocumentCategory] = mapped_column(nullable=False)
    document_period: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    upload_source: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.uuid_id"), nullable=True)
    uploaded_by_client: Mapped[bool] = mapped_column(default=False)
    
    virus_scan_status: Mapped[str] = mapped_column(String(20), default="pending")
    virus_scan_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    ocr_status: Mapped[str] = mapped_column(String(20), default="pending")
    ocr_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    extracted_data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(default=False)
