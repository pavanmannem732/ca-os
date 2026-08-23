"""AI router — draft generation via Mistral AI."""
import logging
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_firm_id, get_current_user_id, require_ca_staff
from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError, ValidationError
from app.models.ai import AIDraft, AIDraftType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/drafts", status_code=status.HTTP_200_OK)
async def list_drafts(
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    """List all AI drafts for the current firm, newest first."""
    result = await db.execute(
        select(AIDraft)
        .where(AIDraft.firm_id == firm_id, AIDraft.deleted_at.is_(None))
        .order_by(AIDraft.created_at.desc())
        .limit(50)
    )
    drafts = result.scalars().all()
    return {"data": [
        {
            "id": str(d.id),
            "draft_type": d.draft_type,
            "status": "Approved" if d.was_used else ("Sent" if d.sent_via else "Ready"),
            "output_text": d.output_text,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "client_id": str(d.client_id) if d.client_id else None,
        }
        for d in drafts
    ]}

DRAFT_TYPE_PROMPTS = {
    "gst_notice_response": "You are a senior Chartered Accountant in India specializing in GST law. Draft a professional, legally sound response to the following GST department notice. Use formal Indian English. Include relevant GST Act sections.",
    "it_notice_response": "You are a senior Chartered Accountant in India specializing in Income Tax. Draft a professional response to the following Income Tax notice.",
    "engagement_letter": "Draft a professional CA engagement letter for a new client. Use formal Indian English and include standard ICAI engagement terms.",
    "penalty_waiver": "Draft a professional penalty waiver request to the GST/IT department. Be respectful, cite relevant provisions, and explain mitigating circumstances.",
    "custom": "You are a senior Chartered Accountant in India. Respond professionally to the following query.",
}


class DraftRequest(BaseModel):
    draft_type: str
    client_id: Optional[UUID] = None
    context: dict


@router.post("/draft", status_code=status.HTTP_202_ACCEPTED)
async def generate_draft(
    body: DraftRequest,
    firm_id: UUID = Depends(get_current_firm_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    if body.draft_type not in DRAFT_TYPE_PROMPTS:
        raise ValidationError(f"draft_type must be one of: {', '.join(DRAFT_TYPE_PROMPTS.keys())}")

    if not settings.MISTRAL_API_KEY:
        # Dev mode: return mock response
        draft = AIDraft(
            firm_id=firm_id,
            client_id=body.client_id,
            created_by=user_id,
            draft_type=AIDraftType(body.draft_type),
            input_context_json=body.context,
            system_prompt_version="dev-mock",
            llm_model="mock",
            prompt_tokens=0,
            completion_tokens=0,
            total_cost_usd=0,
            output_text="[DEV MODE] AI draft generation requires MISTRAL_API_KEY to be configured.",
        )
        db.add(draft)
        await db.flush()
        return {"data": {"draft_id": str(draft.id), "status": "completed", "output": draft.output_text}}

    try:
        system_prompt = DRAFT_TYPE_PROMPTS[body.draft_type]
        user_message = f"Context:\n{body.context}"
        output_text = ""
        
        try:
            # Mistral v1.x SDK (Speakeasy generated)
            try:
                from mistralai import Mistral
            except ImportError:
                from mistralai.client import Mistral
                
            client = Mistral(api_key=settings.MISTRAL_API_KEY)
            response = client.chat.complete(
                model=settings.MISTRAL_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=2048,
                top_p=1
            )
            output_text = response.choices[0].message.content if hasattr(response, 'choices') else str(response)
        except ImportError as ie:
            # If v1 fails, try v0, but capture the error if it fails
            try:
                from mistralai.client import MistralClient
                from mistralai.models.chat_completion import ChatMessage
                client = MistralClient(api_key=settings.MISTRAL_API_KEY)
                response = client.chat(
                    model=settings.MISTRAL_MODEL,
                    messages=[
                        ChatMessage(role="system", content=system_prompt),
                        ChatMessage(role="user", content=user_message)
                    ],
                    temperature=0.7,
                    max_tokens=2048,
                    top_p=1
                )
                output_text = response.choices[0].message.content
            except Exception as e2:
                # Raise the ORIGINAL error to see why Mistral failed
                raise Exception(f"Failed to import Mistral v1.x: {str(ie)} | Failed v0.x: {str(e2)}")

        
        draft = AIDraft(
            firm_id=firm_id,
            client_id=body.client_id,
            created_by=user_id,
            draft_type=AIDraftType(body.draft_type),
            input_context_json=body.context,
            system_prompt_version="1.0",
            llm_model=settings.MISTRAL_MODEL,
            prompt_tokens=getattr(response.usage, 'prompt_tokens', 0) if hasattr(response, 'usage') else 0,
            completion_tokens=getattr(response.usage, 'completion_tokens', 0) if hasattr(response, 'usage') else 0,
            total_cost_usd=0, # Optional: Add specific Mistral pricing if needed
            output_text=output_text,
        )
        db.add(draft)
        await db.flush()
        return {"data": {"draft_id": str(draft.id), "status": "completed", "output": output_text}}
    except Exception as e:
        logger.error(f"Mistral AI error: {e}")
        # If it's an auth error, give a very specific message
        if "401" in str(e) or "Unauthorized" in str(e):
            error_msg = "[AUTHENTICATION ERROR] Your Mistral API Key is invalid or unauthorized. Please check your .env file."
        else:
            error_msg = f"[AI ERROR] The AI service encountered a problem: {str(e)}"
            
        # Create a failed draft entry so the user sees what happened
        draft = AIDraft(
            firm_id=firm_id,
            client_id=body.client_id,
            created_by=user_id,
            draft_type=AIDraftType(body.draft_type),
            input_context_json=body.context,
            system_prompt_version="1.0-error",
            llm_model=settings.MISTRAL_MODEL,
            prompt_tokens=0,
            completion_tokens=0,
            total_cost_usd=0,
            output_text=error_msg,
        )
        db.add(draft)
        await db.commit()
        
        raise ServiceUnavailableError(error_msg)


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_200_OK)
async def delete_draft(
    draft_id: UUID,
    firm_id: UUID = Depends(get_current_firm_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_ca_staff),
):
    """Soft deletes an AI draft."""
    from datetime import datetime, timezone
    from app.core.exceptions import NotFoundError
    
    result = await db.execute(select(AIDraft).where(AIDraft.id == draft_id, AIDraft.firm_id == firm_id, AIDraft.deleted_at.is_(None)))
    draft = result.scalars().first()
    
    if not draft:
        raise NotFoundError("AI Draft")
        
    draft.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Draft deleted successfully"}


