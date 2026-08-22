# backend_ai/api/ocr.py (cập nhật)

import base64
import tempfile
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from engines.pipeline import process_document
from database.sqlite.db import db


def save_scan_record(file_name: str, extracted_json: Dict[str, Any], confidence: float, status: str):
    """Store scan records using the repository's existing SQLite wrapper."""
    import json
    import uuid
    from datetime import datetime

    record_id = str(uuid.uuid4())
    db.execute_write(
        """
        INSERT INTO documents (id, filename, text, fields, confidence, reasoning, user_id, created_at, updated_at, corrected_fields)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record_id,
            file_name,
            json.dumps(extracted_json),
            json.dumps(extracted_json),
            confidence,
            status,
            "system",
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            "{}",
        ),
    )
    return record_id

router = APIRouter(prefix="/ocr", tags=["OCR"])


# ============================================================
# MODELS
# ============================================================

class OCRReadRequest(BaseModel):
    file_base64: str
    filename: str
    user_id: str = "system"

class OCRReadResponse(BaseModel):
    success: bool
    document_id: str
    filename: str
    text: str
    fields: Dict[str, Any]
    confidence: float
    needs_review: bool
    reasoning: str
    processing_time: float
    error: Optional[str] = None


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/read", response_model=OCRReadResponse)
async def ocr_read(request: OCRReadRequest):
    """OCR và trích xuất dữ liệu (tương thích ngược với frontend cũ)"""
    start_time = datetime.now()
    
    try:
        # 1. Decode base64
        if ',' in request.file_base64:
            file_data = request.file_base64.split(',')[1]
        else:
            file_data = request.file_base64
        
        image_bytes = base64.b64decode(file_data)
        
        # 2. Lưu file tạm để pipeline xử lý
        with tempfile.NamedTemporaryFile(
            suffix=f"_{request.filename}", 
            delete=False
        ) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name
        
        # 3. Gọi pipeline xử lý
        result = process_document(
            file_path=tmp_path,
            document_type="unknown",
            memory_engine=None  # hoặc truyền memory_engine nếu có
        )
        
        # 4. Lưu lịch sử (nếu cần)
        scan_id = save_scan_record(
            file_name=request.filename,
            extracted_json=result["parsed_data"],
            confidence=result["confidence"],
            status=result["action"]
        )
        
        # 5. Tính thời gian
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return OCRReadResponse(
            success=True,
            document_id=str(scan_id),
            filename=request.filename,
            text="",  # raw_text không còn dùng nữa, có thể bỏ hoặc trả về JSON string
            fields=result["parsed_data"],
            confidence=result["confidence"],
            needs_review=result["action"] != "AUTO_IMPORT",
            reasoning="\n".join(result.get("reasons", [])),
            processing_time=processing_time
        )
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        return OCRReadResponse(
            success=False,
            document_id="",
            filename=request.filename,
            text="",
            fields={},
            confidence=0.0,
            needs_review=True,
            reasoning=str(e),
            processing_time=processing_time,
            error=str(e)
        )