"""FastAPI application entry point — production-grade."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import (
    CAOSException, caos_exception_handler,
    validation_exception_handler, generic_exception_handler,
)
from app.core.redis import close_redis
from app.routers import auth, clients, compliance, ai, documents, billing, whatsapp, firms, staff, portal, webhooks, analytics, internal_chat

# Setup structured logging before anything else
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting CA-OS in {settings.ENVIRONMENT} mode")
    yield
    await close_redis()
    logger.info("CA-OS shutdown complete")


app = FastAPI(
    title="CA-OS API",
    description="AI Operating System for Indian Chartered Accountant Firms",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs" if not settings.is_production else None,
    redoc_url="/api/v1/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ─── Exception Handlers ──────────────────────────────────────────────────────
app.add_exception_handler(CAOSException, caos_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ─── Middleware ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# ─── Routers ────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(auth.router,       prefix=f"{PREFIX}/auth",      tags=["Authentication"])
app.include_router(clients.router,    prefix=f"{PREFIX}/clients",    tags=["Clients"])
app.include_router(compliance.router, prefix=f"{PREFIX}/compliance", tags=["Compliance"])
app.include_router(documents.router,  prefix=f"{PREFIX}/documents",  tags=["Documents"])
app.include_router(billing.router,    prefix=f"{PREFIX}/billing",    tags=["Billing"])
app.include_router(ai.router,         prefix=f"{PREFIX}/ai",         tags=["AI Intelligence"])
app.include_router(whatsapp.router,   prefix=f"{PREFIX}/whatsapp",   tags=["WhatsApp"])
app.include_router(firms.router,      prefix=f"{PREFIX}/firms",      tags=["Firms"])
app.include_router(staff.router,      prefix=f"{PREFIX}/staff",      tags=["Staff"])
app.include_router(portal.router,     prefix=f"{PREFIX}/portal",     tags=["Client Portal"])
app.include_router(webhooks.router,   prefix=f"{PREFIX}/webhooks",   tags=["Webhooks"])
app.include_router(analytics.router,  prefix=f"{PREFIX}/insight-engine",  tags=["Analytics"])
app.include_router(internal_chat.router, prefix=f"{PREFIX}/chat",       tags=["Internal Chat"])


@app.get(f"{PREFIX}/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT, "version": "1.0.0"}

@app.websocket("/ws/{firm_id}")
async def websocket_endpoint(websocket: WebSocket, firm_id: str):
    from app.core.socket_manager import socket_manager
    await socket_manager.connect(websocket, firm_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Handle client heartbeats if needed
    except Exception:
        socket_manager.disconnect(websocket, firm_id)
