# backend_ai/api/assistant.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any

from engines.assistant.chat import ChatAssistant
from engines.analytics.analyzer import AnalyticsEngine
from engines.memory.store import MemoryStore

router = APIRouter(prefix="/assistant", tags=["Assistant"])

assistant = ChatAssistant()
memory = MemoryStore()
analytics = AnalyticsEngine()

# ============================================================
# MODELS
# ============================================================

class ChatRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None

class QueryRequest(BaseModel):
    question: str
    scan_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    success: bool
    answer: str
    error: Optional[str] = None

# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat với AI assistant"""
    try:
        answer = assistant.answer(request.question, request.context)
        return ChatResponse(success=True, answer=answer)
    except Exception as e:
        return ChatResponse(success=False, answer="", error=str(e))

@router.post("/query", response_model=ChatResponse)
async def query(request: QueryRequest):
    """Truy vấn assistant theo scan_id và context document thực tế."""
    try:
        context = dict(request.context or {})
        if request.scan_id:
            context["scan_id"] = request.scan_id
        answer = assistant.answer(request.question, context)
        return ChatResponse(success=True, answer=answer)
    except Exception as e:
        return ChatResponse(success=False, answer="", error=str(e))

@router.get("/history/{scan_id}")
async def get_scan_history(scan_id: str):
    """Lấy trạng thái document + import cho một scan_id nhất định."""
    document = memory.get(scan_id)
    import_status = analytics.get_import_status(scan_id)
    return {
        "scan_id": scan_id,
        "document": document,
        "import_status": import_status,
    }

@router.get("/summary")
async def get_summary():
    """Tổng quan nhanh cho dashboard ERP AI."""
    stats = analytics.get_stats(period_days=30)
    daily = analytics.get_daily_stats(days=7)
    machines = analytics.get_most_common_machines(limit=5)
    docs = memory.get_all(limit=20)

    return {
        "period_days": 30,
        "total_documents": len(docs),
        "total_events": stats.get("total_events", 0),
        "avg_confidence": stats.get("avg_confidence", 0.0),
        "top_events": stats.get("top_events", []),
        "daily": daily,
        "most_common_machines": machines,
    }

@router.get("/recent-documents")
async def get_recent_documents(limit: int = 10):
    """Lấy danh sách document gần nhất từ memory store."""
    docs = memory.get_all(limit=limit)
    return docs

@router.get("/top-machines")
async def get_top_machines(limit: int = 5):
    """Lấy top máy xuất hiện nhiều nhất trong analytics."""
    return analytics.get_most_common_machines(limit=limit)

@router.get("/recent-imports")
async def get_recent_imports(limit: int = 10):
    """Lấy lịch sử import ERP gần nhất cho dashboard."""
    return analytics.get_recent_imports(limit=limit)

@router.get("/import-trend")
async def get_import_trend(days: int = 7):
    """Lấy xu hướng import ERP theo ngày."""
    return analytics.get_daily_stats(days=days)

@router.get("/stats")
async def get_stats():
    """Lấy thống kê analytics."""
    return analytics.get_stats(period_days=30)

@router.get("/stats/daily")
async def get_daily_stats():
    """Lấy thống kê theo ngày."""
    return analytics.get_daily_stats(days=7)

@router.get("/help")
async def get_help():
    """Lấy hướng dẫn sử dụng"""
    return {
        "commands": [
            {"command": "Thống kê", "description": "Xem thống kê hệ thống"},
            {"command": "Tìm [mã]", "description": "Tìm kiếm tài liệu"},
            {"command": "Máy [MCxx]", "description": "Thông tin máy CNC"},
            {"command": "Ca [1/2/3]", "description": "Thông tin ca làm việc"},
            {"command": "Giúp", "description": "Xem hướng dẫn"}
        ]
    }