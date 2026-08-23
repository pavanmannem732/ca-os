from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import String, ForeignKey, JSON, NUMERIC, DateTime, Text, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin
import enum

class AIDraftType(str, enum.Enum):
    GST_NOTICE_RESPONSE = "GST_NOTICE_RESPONSE"
    IT_NOTICE_RESPONSE = "IT_NOTICE_RESPONSE"
    CLIENT_QUERY_RESPONSE = "CLIENT_QUERY_RESPONSE"
    ENGAGEMENT_LETTER = "ENGAGEMENT_LETTER"
    PENALTY_WAIVER = "PENALTY_WAIVER"
    CUSTOM = "CUSTOM"

class AIDraft(Base, TimestampMixin):
    __tablename__ = "ai_drafts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    firm_id: Mapped[UUID] = mapped_column(ForeignKey("firms.id"), nullable=False, index=True)
    client_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("clients.id"), nullable=True)
    created_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    draft_type: Mapped[AIDraftType] = mapped_column(
        SQLEnum(AIDraftType, name="aidrafttype", values_callable=lambda x: [e.value for e in x], create_type=False),
        nullable=False
    )
    input_context_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    system_prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
    llm_model: Mapped[str] = mapped_column(String(50), nullable=False)
    
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    total_cost_usd: Mapped[float] = mapped_column(NUMERIC(10, 6), nullable=False)
    
    output_text: Mapped[str] = mapped_column(Text, nullable=False)
    edited_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    was_used: Mapped[bool] = mapped_column(default=False)
    sent_via: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_rating: Mapped[Optional[int]] = mapped_column(nullable=True)
