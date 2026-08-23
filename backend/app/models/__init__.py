"""Central models package — imports all models so Alembic finds them."""
from app.models.base import Base, TimestampMixin, AuditMixin
from app.models.firm import Firm, FirmType, PlanType, PlanStatus
from app.models.user import User, UserRole
from app.models.client import Client, ClientType
from app.models.compliance_task import ComplianceTask, TaskStatus, TaskPriority
from app.models.document import Document, DocumentCategory
from app.models.billing import Invoice, BillingLog, InvoiceStatus
from app.models.ai import AIDraft, AIDraftType
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.whatsapp import WhatsAppConversation, WhatsAppMessage

__all__ = [
    "Base", "TimestampMixin", "AuditMixin",
    "Firm", "FirmType", "PlanType", "PlanStatus",
    "User", "UserRole",
    "Client", "ClientType",
    "ComplianceTask", "TaskStatus", "TaskPriority",
    "Document", "DocumentCategory",
    "Invoice", "BillingLog", "InvoiceStatus",
    "AIDraft", "AIDraftType",
    "AuditLog",
    "Notification",
    "WhatsAppConversation", "WhatsAppMessage",
]
