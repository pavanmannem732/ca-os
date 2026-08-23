"""Complete exception catalog and handlers."""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Any, Optional


class CAOSException(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None,
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


# ─── Specific Exception Types ────────────────────────────────────────────────

class NotFoundError(CAOSException):
    def __init__(self, resource: str, resource_id: Any = None):
        msg = f"{resource} not found" if not resource_id else f"{resource} '{resource_id}' not found"
        super().__init__("not_found", msg, status.HTTP_404_NOT_FOUND)


class UnauthorizedError(CAOSException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("unauthorized", message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(CAOSException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__("forbidden", message, status.HTTP_403_FORBIDDEN)


class ConflictError(CAOSException):
    def __init__(self, message: str):
        super().__init__("conflict", message, status.HTTP_409_CONFLICT)


class RateLimitError(CAOSException):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            "rate_limited",
            f"Too many requests. Please wait {retry_after} seconds.",
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"retry_after": retry_after},
        )


class ValidationError(CAOSException):
    def __init__(self, message: str, details: Any = None):
        super().__init__("validation_error", message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class ServiceUnavailableError(CAOSException):
    def __init__(self, service: str):
        super().__init__(
            "service_unavailable",
            f"{service} is temporarily unavailable. Please try again.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class OTPError(CAOSException):
    def __init__(self, message: str, attempts_remaining: Optional[int] = None):
        details = {"attempts_remaining": attempts_remaining} if attempts_remaining is not None else None
        super().__init__("otp_error", message, status.HTTP_400_BAD_REQUEST, details)


# ─── Handlers ────────────────────────────────────────────────────────────────

async def caos_exception_handler(request: Request, exc: Any) -> JSONResponse:
    content: dict[str, Any] = {
        "error": exc.error_code,
        "message": exc.message,
    }
    if exc.details:
        content["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=content)


async def validation_exception_handler(request: Request, exc: Any) -> JSONResponse:
    errors = [
        {"field": ".".join(str(l) for l in e["loc"][1:]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "validation_error", "message": "Request validation failed", "details": errors},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal_error", "message": "An unexpected error occurred. Please try again."},
    )
