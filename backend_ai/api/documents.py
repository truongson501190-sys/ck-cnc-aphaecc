"""
Document Management API
=======================

API để upload, xử lý và truy vấn tài liệu.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import tempfile

from backend_ai.gateway import get_gateway
from backend_ai.processing_context import ProcessingContext

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    confidence: float
    needs_review: bool
    fields: dict
    reasoning: str
    processing_time: float
    error: Optional[str] = None


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form("system"),
):
    """Upload và xử lý tài liệu."""
    try:
        # Đọc file bytes
        image_bytes = await file.read()
        
        gateway = get_gateway()
        result = gateway.process_document(
            image_bytes=image_bytes,
            filename=file.filename,
            user_id=user_id,
        )
        
        return DocumentResponse(
            document_id=result.document_id,
            filename=result.filename,
            confidence=result.confidence,
            needs_review=result.needs_review,
            fields=result.fields,
            reasoning=result.reasoning,
            processing_time=result.processing_time,
            error=result.error,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}")
async def get_document(document_id: str):
    """Lấy thông tin chi tiết tài liệu."""
    gateway = get_gateway()
    if gateway.memory is None:
        raise HTTPException(status_code=503, detail="Memory not available")
    
    data = gateway.memory.retrieve(document_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return data


@router.get("/search")
async def search_documents(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=100),
):
    """Tìm kiếm tài liệu."""
    gateway = get_gateway()
    if gateway.memory is None:
        raise HTTPException(status_code=503, detail="Memory not available")
    
    results = gateway.memory.search(q, limit=limit)
    return {"query": q, "count": len(results), "results": results}


@router.post("/{document_id}/validate")
async def validate_document(document_id: str):
    """Kiểm tra tính hợp lệ của tài liệu."""
    gateway = get_gateway()
    if gateway.memory is None or gateway.validator is None:
        raise HTTPException(status_code=503, detail="Required components not available")
    
    data = gateway.memory.retrieve(document_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    fields = data.get("fields", {})
    is_valid, reason = gateway.validator.check(fields)
    
    return {"document_id": document_id, "valid": is_valid, "reason": reason}


@router.post("/{document_id}/correct")
async def correct_document(
    document_id: str,
    corrected_fields: dict,
    user_id: str = "system",
):
    """Sửa dữ liệu tài liệu và học từ sửa chữa."""
    gateway = get_gateway()
    try:
        gateway.learn_from_correction(document_id, corrected_fields, user_id)
        return {"document_id": document_id, "message": "Correction saved and learning applied"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))