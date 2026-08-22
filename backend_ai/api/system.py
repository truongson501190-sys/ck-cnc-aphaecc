"""
System Management API
=====================

API để quản lý hệ thống: health, metrics, cache, config.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import time

from backend_ai.gateway import get_gateway
from backend_ai.monitoring import get_metrics
from backend_ai.cache import get_cache

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/health")
async def health_check():
    """Health check tổng thể."""
    gateway = get_gateway()
    health = gateway.health_checker.check_all()
    
    # Xác định status tổng
    status = "healthy"
    for name, check in health.items():
        if check.get("status") in ["error", "unavailable"]:
            status = "unhealthy"
            break
        elif check.get("status") == "degraded":
            status = "degraded"
    
    return {
        "status": status,
        "timestamp": time.time(),
        "details": health,
        "uptime": gateway.health_checker.uptime if hasattr(gateway.health_checker, "uptime") else None
    }


@router.get("/metrics")
async def get_metrics():
    """Lấy tất cả metrics."""
    metrics = get_metrics()
    return metrics.get_all_metrics()


@router.get("/cache/stats")
async def get_cache_stats():
    """Lấy thống kê cache."""
    cache = get_cache()
    return cache.get_stats()


@router.post("/cache/clear")
async def clear_cache(prefix: Optional[str] = None):
    """Xoá cache (theo prefix nếu có)."""
    cache = get_cache()
    cache.clear(prefix)
    return {"message": f"Cache cleared ({prefix if prefix else 'all'})"}


@router.get("/config")
async def get_config():
    """Lấy cấu hình hệ thống (ẩn secrets)."""
    from config.settings import settings
    # Filter để không lộ secrets
    safe_config = {
        k: v for k, v in vars(settings).items()
        if not any(secret in k.lower() for secret in ["key", "secret", "password", "token"])
    }
    return safe_config


@router.get("/agents/status")
async def get_agents_status():
    """Trạng thái các agent."""
    gateway = get_gateway()
    if hasattr(gateway, "agent_manager"):
        return gateway.agent_manager.get_status()
    return {"message": "Agent Manager not available"}