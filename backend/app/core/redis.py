"""Async Redis client — singleton pattern."""
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


# ─── OTP Redis helpers ───────────────────────────────────────────────────────

OTP_PREFIX = "otp:"
OTP_ATTEMPTS_PREFIX = "otp_attempts:"
OTP_REQUEST_COUNT_PREFIX = "otp_req:"
SESSION_PREFIX = "session:"


_in_memory_cache = {}

async def store_otp(mobile: str, hashed_otp: str, expire_seconds: int = 600) -> None:
    try:
        r = await get_redis()
        await r.setex(f"{OTP_PREFIX}{mobile}", expire_seconds, hashed_otp)
        await r.delete(f"{OTP_ATTEMPTS_PREFIX}{mobile}")
    except Exception:
        _in_memory_cache[f"{OTP_PREFIX}{mobile}"] = hashed_otp


async def get_stored_otp(mobile: str) -> Optional[str]:
    try:
        r = await get_redis()
        return await r.get(f"{OTP_PREFIX}{mobile}")
    except Exception:
        return _in_memory_cache.get(f"{OTP_PREFIX}{mobile}")


async def increment_otp_attempts(mobile: str) -> int:
    try:
        r = await get_redis()
        key = f"{OTP_ATTEMPTS_PREFIX}{mobile}"
        count = await r.incr(key)
        await r.expire(key, 1800)
        return count
    except Exception:
        return 1


async def delete_otp(mobile: str) -> None:
    try:
        r = await get_redis()
        await r.delete(f"{OTP_PREFIX}{mobile}", f"{OTP_ATTEMPTS_PREFIX}{mobile}")
    except Exception:
        _in_memory_cache.pop(f"{OTP_PREFIX}{mobile}", None)


async def check_otp_request_limit(mobile: str, limit: int = 3, window_seconds: int = 600) -> bool:
    try:
        r = await get_redis()
        key = f"{OTP_REQUEST_COUNT_PREFIX}{mobile}"
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_seconds)
        return count <= limit
    except Exception:
        return True



async def store_session(user_id: str, session_data: dict, expire_seconds: int = 86400 * 7) -> None:
    r = await get_redis()
    import json
    await r.setex(f"{SESSION_PREFIX}{user_id}", expire_seconds, json.dumps(session_data))


async def get_session(user_id: str) -> Optional[dict]:
    r = await get_redis()
    import json
    data = await r.get(f"{SESSION_PREFIX}{user_id}")
    return json.loads(data) if data else None


async def delete_session(user_id: str) -> None:
    r = await get_redis()
    await r.delete(f"{SESSION_PREFIX}{user_id}")


async def cache_set(key: str, value: str, expire_seconds: int = 300) -> None:
    r = await get_redis()
    await r.setex(key, expire_seconds, value)


async def cache_get(key: str) -> Optional[str]:
    r = await get_redis()
    return await r.get(key)


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    r = await get_redis()
    keys = await r.keys(pattern)
    if keys:
        await r.delete(*keys)
