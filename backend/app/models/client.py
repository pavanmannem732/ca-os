from typing import Optional, List, TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.firm import Firm
    from app.models.compliance_task import ComplianceTask
from uuid import UUID as PyUUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, ARRAY, SMALLINT, NUMERIC, DateTime, Text, UUID as SqlUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, AuditMixin
import enum
from datetime import datetime

class ClientType(str, enum.Enum):
    COMPANY_PRIVATE = "company_private"
    COMPANY_PUBLIC = "company_public"
    LLP = "llp"
    PARTNERSHIP_FIRM = "partnership_firm"
    PROPRIETORSHIP = "proprietorship"
    HUF = "huf"
    TRUST = "trust"
    INDIVIDUAL = "individual"

class Client(Base, TimestampMixin, AuditMixin):
    __tablename__ = "clients"

    id: Mapped[PyUUID] = mapped_column(SqlUUID, primary_key=True, default=uuid4)
    firm_id: Mapped[PyUUID] = mapped_column(SqlUUID, ForeignKey("firms.id"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    client_type: Mapped[ClientType] = mapped_column(nullable=False)
    
    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    additional_gstins: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    tan: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    cin: Mapped[Optional[str]] = mapped_column(String(21), nullable=True)
    
    primary_contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    primary_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    address_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    portal_access_enabled: Mapped[bool] = mapped_column(default=True)
    
    compliance_services: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    gst_filing_frequency: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    itr_form_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    audit_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    compliance_health_score: Mapped[int] = mapped_column(SMALLINT, default=10)
    penalty_risk_score: Mapped[int] = mapped_column(SMALLINT, default=5)
    churn_risk: Mapped[str] = mapped_column(String(10), default="low")
    
    retainer_fee_monthly: Mapped[Optional[float]] = mapped_column(NUMERIC(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    
    assigned_primary_staff_id: Mapped[Optional[PyUUID]] = mapped_column(SqlUUID, ForeignKey("users.uuid_id"), nullable=True)
    assigned_staff_ids: Mapped[Optional[List[PyUUID]]] = mapped_column(ARRAY(SqlUUID), nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    onboarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    firm: Mapped["Firm"] = relationship("Firm", back_populates="clients")
    tasks: Mapped[List["ComplianceTask"]] = relationship("ComplianceTask", back_populates="client")
