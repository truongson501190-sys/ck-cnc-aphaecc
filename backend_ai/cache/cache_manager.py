"""
Cache Manager
=============

Quản lý caching cho các kết quả tốn kém (OCR, Brain, Validation).
Hỗ trợ cả in-memory và Redis.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict, Optional, Callable
from functools import wraps

try:
    import redis
except ImportError:
    redis = None

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Quản lý cache với backend có thể cấu hình.
    """

    def __init__(
        self,
        backend: str = "memory",  # "memory" hoặc "redis"
        redis_url: Optional[str] = None,
        default_ttl: int = 3600,  # 1 giờ
        max_size: int = 1000,
    ):
        self.backend = backend
        self.default_ttl = default_ttl
        self._redis_client = None
        self._memory_cache: Dict[str, Dict] = {}
        self._max_size = max_size
        self._hit_count = 0
        self._miss_count = 0

        if backend == "redis" and redis:
            try:
                self._redis_client = redis.Redis.from_url(redis_url)
                self._redis_client.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.warning("Redis connection failed, falling back to memory: %s", e)
                self.backend = "memory"

        logger.info("CacheManager initialized (backend=%s)", self.backend)

    def _compute_key(self, prefix: str, *args, **kwargs) -> str:
        """Tạo key duy nhất từ prefix và tham số."""
        data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        hash_val = hashlib.md5(data.encode()).hexdigest()
        return f"{prefix}:{hash_val}"

    def get(self, key: str) -> Optional[Any]:
        """Lấy dữ liệu từ cache."""
        if self.backend == "redis" and self._redis_client:
            try:
                data = self._redis_client.get(key)
                if data:
                    self._hit_count += 1
                    return json.loads(data)
            except Exception as e:
                logger.warning("Redis get failed: %s", e)
                return None

        # Memory cache
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            if entry["expires"] > time.time():
                self._hit_count += 1
                return entry["data"]
            else:
                del self._memory_cache[key]

        self._miss_count += 1
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Lưu dữ liệu vào cache."""
        if ttl is None:
            ttl = self.default_ttl

        if self.backend == "redis" and self._redis_client:
            try:
                self._redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False))
                return True
            except Exception as e:
                logger.warning("Redis set failed: %s", e)
                return False

        # Memory cache
        # Kiểm tra max_size
        if len(self._memory_cache) >= self._max_size:
            # Xoá phần tử cũ nhất (theo thời gian expire)
            oldest_key = min(self._memory_cache.keys(), key=lambda k: self._memory_cache[k]["expires"])
            del self._memory_cache[oldest_key]

        self._memory_cache[key] = {
            "data": value,
            "expires": time.time() + ttl,
        }
        return True

    def delete(self, key: str) -> bool:
        """Xoá một entry."""
        if self.backend == "redis" and self._redis_client:
            try:
                self._redis_client.delete(key)
                return True
            except Exception:
                return False
        if key in self._memory_cache:
            del self._memory_cache[key]
            return True
        return False

    def clear(self, prefix: Optional[str] = None):
        """Xoá tất cả hoặc theo prefix."""
        if self.backend == "redis" and self._redis_client:
            try:
                if prefix:
                    pattern = f"{prefix}:*"
                    keys = self._redis_client.keys(pattern)
                    if keys:
                        self._redis_client.delete(*keys)
                else:
                    self._redis_client.flushdb()
            except Exception as e:
                logger.warning("Redis clear failed: %s", e)
        else:
            if prefix:
                keys_to_delete = [k for k in self._memory_cache if k.startswith(prefix)]
                for k in keys_to_delete:
                    del self._memory_cache[k]
            else:
                self._memory_cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Lấy thống kê cache."""
        total = self._hit_count + self._miss_count
        hit_rate = self._hit_count / max(1, total)
        return {
            "backend": self.backend,
            "hit_count": self._hit_count,
            "miss_count": self._miss_count,
            "total_requests": total,
            "hit_rate": f"{hit_rate:.2%}",
            "memory_size": len(self._memory_cache),
            "max_size": self._max_size,
        }

    # Decorator để tự động cache
    def cached(self, prefix: str = "auto", ttl: Optional[int] = None):
        """Decorator cho phép cache kết quả hàm."""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                key = self._compute_key(prefix, *args, **kwargs)
                cached = self.get(key)
                if cached is not None:
                    return cached
                result = func(*args, **kwargs)
                self.set(key, result, ttl=ttl)
                return result
            return wrapper
        return decorator


# Global instance
_cache = None

def get_cache() -> CacheManager:
    global _cache
    if _cache is None:
        from config.settings import settings
        _cache = CacheManager(
            backend=getattr(settings, "CACHE_BACKEND", "memory"),
            redis_url=getattr(settings, "REDIS_URL", None),
            default_ttl=getattr(settings, "CACHE_TTL", 3600),
        )
    return _cache