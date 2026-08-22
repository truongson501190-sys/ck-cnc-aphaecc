"""
Webhook Management
==================

Cho phép đăng ký webhook để nhận thông báo về các sự kiện.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any, List
import uuid
import json
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookRegistration(BaseModel):
    url: HttpUrl
    events: List[str]  # ví dụ: ["document_processed", "document_failed", "validation_failed"]
    secret: Optional[str] = None
    active: bool = True


class WebhookEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: float
    data: Dict[str, Any]


# In-memory storage (có thể dùng DB)
_webhooks: Dict[str, WebhookRegistration] = {}
_webhook_events: List[WebhookEvent] = []
_MAX_EVENTS = 1000


@router.post("/register")
async def register_webhook(registration: WebhookRegistration):
    """Đăng ký webhook mới."""
    webhook_id = str(uuid.uuid4())
    _webhooks[webhook_id] = registration
    return {"webhook_id": webhook_id, "message": "Webhook registered"}


@router.delete("/{webhook_id}")
async def unregister_webhook(webhook_id: str):
    """Huỷ đăng ký webhook."""
    if webhook_id not in _webhooks:
        raise HTTPException(status_code=404, detail="Webhook not found")
    del _webhooks[webhook_id]
    return {"message": "Webhook unregistered"}


@router.get("/events")
async def get_webhook_events(limit: int = 100):
    """Lấy lịch sử sự kiện webhook."""
    return {"events": _webhook_events[-limit:]}


# Hàm gửi webhook (sẽ được gọi từ các agent)
def send_webhook(event_type: str, data: Dict[str, Any], background_tasks: BackgroundTasks = None):
    """Gửi sự kiện đến tất cả webhook đăng ký."""
    event = WebhookEvent(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=time.time(),
        data=data,
    )
    _webhook_events.append(event)
    if len(_webhook_events) > _MAX_EVENTS:
        _webhook_events = _webhook_events[-_MAX_EVENTS:]
    
    # Gửi webhook
    for webhook_id, reg in _webhooks.items():
        if not reg.active or event_type not in reg.events:
            continue
        
        payload = {
            "webhook_id": webhook_id,
            "event": event.dict(),
        }
        
        if background_tasks:
            background_tasks.add_task(_send_webhook_request, reg.url, payload, reg.secret)
        else:
            # Gửi đồng bộ (có thể chậm)
            _send_webhook_request(reg.url, payload, reg.secret)


def _send_webhook_request(url: str, payload: Dict, secret: Optional[str]):
    """Gửi request đến webhook."""
    try:
        headers = {"Content-Type": "application/json"}
        if secret:
            headers["X-Webhook-Secret"] = secret
        
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        if response.status_code not in [200, 201, 202]:
            logger.warning("Webhook %s returned %s", url, response.status_code)
    except Exception as e:
        logger.exception("Webhook request failed: %s", e)