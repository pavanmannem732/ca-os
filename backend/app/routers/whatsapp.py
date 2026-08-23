"""WhatsApp router — Meta webhook handling and message sending."""
import hashlib
import hmac
import logging
from fastapi import APIRouter, Request, Response, Query, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_db, get_current_firm_id, require_ca_staff
from app.core.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_meta_signature(body: bytes, signature: str) -> bool:
    """Verify Meta's HMAC-SHA256 webhook signature."""
    if not settings.WHATSAPP_APP_SECRET:
        return True  # Skip in dev
    expected = "sha256=" + hmac.new(
        settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# @router.get("/webhook", response_class=PlainTextResponse)
# async def verify_webhook(
#     hub_mode: str = Query(..., alias="hub.mode"),
#     hub_challenge: str = Query(..., alias="hub.challenge"),
#     hub_verify_token: str = Query(..., alias="hub.verify_token"),
# ):
#     """Meta webhook verification — one-time setup."""
#     if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
#         return hub_challenge
#     raise UnauthorizedError("Invalid verify token")


# @router.post("/webhook")
# async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
#     """Receive and process incoming WhatsApp messages from Meta."""
#     body = await request.body()
#     signature = request.headers.get("X-Hub-Signature-256", "")
# 
#     if not verify_meta_signature(body, signature):
#         raise UnauthorizedError("Invalid webhook signature")
# 
#     try:
#         payload = await request.json()
#         logger.info(f"WhatsApp webhook received: {payload.get('object')}")
#         
#         from app.services.whatsapp_service import whatsapp_service
#         await whatsapp_service.handle_inbound_webhook(db, payload)
#         
#     except Exception as e:
#         logger.error(f"WhatsApp webhook processing error: {e}")
# 
#     # Must return 200 immediately — Meta will retry if we don't respond fast
#     return Response(status_code=200)
