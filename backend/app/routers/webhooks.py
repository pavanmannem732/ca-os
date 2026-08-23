"""Razorpay webhook router."""
import hashlib, hmac, logging
from fastapi import APIRouter, Request, Response
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return Response(status_code=400)
    payload = await request.json()
    event = payload.get("event", "")
    logger.info(f"Razorpay webhook: {event}")
    return Response(status_code=200)
