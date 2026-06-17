import json
import hashlib
from redis.asyncio import Redis
from app.config import settings

redis_client: Redis | None = None


async def init_redis():
    global redis_client
    try:
        redis_client = Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await redis_client.ping()
    except Exception:
        redis_client = None


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def _make_key(prefix: str, query: str, center_id: int | None = None) -> str:
    raw = f"{prefix}:{center_id}:{query.strip().lower()}"
    h = hashlib.sha256(raw.encode()).hexdigest()
    return f"ilmify_ai:{prefix}:{h}"


async def cache_get(prefix: str, query: str, center_id: int | None = None) -> list[dict] | None:
    if not redis_client:
        return None
    key = _make_key(prefix, query, center_id)
    data = await redis_client.get(key)
    if data:
        return json.loads(data)
    return None


async def cache_set(prefix: str, query: str, data: list[dict], center_id: int | None = None, ttl: int | None = None):
    if not redis_client:
        return
    key = _make_key(prefix, query, center_id)
    await redis_client.setex(key, ttl or settings.redis_cache_ttl, json.dumps(data, default=str))


async def cache_invalidate_pattern(pattern: str):
    if not redis_client:
        return
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"ilmify_ai:{pattern}*")
        if keys:
            await redis_client.delete(*keys)
        if cursor == 0:
            break
