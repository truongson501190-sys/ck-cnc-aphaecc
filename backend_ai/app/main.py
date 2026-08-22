# backend_ocr/app/main.py

import os
import base64
import time
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# MODELS
# ============================================================

class OCRRequest(BaseModel):
    file_base64: str
    filename: str
    page: int = 1

class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    fields: dict = {}
    confidence: float = 0.0
    needs_review: bool = False
    error: str = ""
    processing_time: float = 0.0
    reasoning: str = ""

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="🤖 ERP AI - OCR Service",
    description="OCR Service for ERP CNC",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# FAKE OCR ENGINE (sẽ thay bằng PaddleOCR sau)
# ============================================================

class OCRService:
    def __init__(self):
        self.engine = "paddle"  # sẽ chuyển sang PaddleOCR
    
    def read(self, image_bytes: bytes) -> tuple:
        """Đọc ảnh và trả về (text, confidence)"""
        # TODO: Thay bằng PaddleOCR thực tế
        # Hiện tại giả lập
        import random
        texts = [
            "BÁO CÁO GIA CÔNG\nXưởng CNC\nNGÀY: 2024-01-15\nMÁY: MC06\nSỐ LƯỢNG: 150",
            "PHIẾU NHẬP KHO\nMÃ HÀNG: SP-001\nSỐ LƯỢNG: 100\nĐƠN VỊ: Cái",
            "BÁO CÁO QC\nSẢN PHẨM: SP-002\nKẾT QUẢ: Đạt\nNGÀY: 2024-01-16"
        ]
        text = random.choice(texts)
        confidence = 0.85 + random.random() * 0.14
        return text, confidence

ocr_service = OCRService()

# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/health")
async def health():
    return {"status": "healthy", "engine": ocr_service.engine}

@app.post("/ocr/read", response_model=OCRResponse)
async def read_document(request: OCRRequest):
    start_time = time.time()
    
    try:
        # Decode base64
        if ',' in request.file_base64:
            file_data = request.file_base64.split(',')[1]
        else:
            file_data = request.file_base64
        
        image_bytes = base64.b64decode(file_data)
        
        # OCR
        text, confidence = ocr_service.read(image_bytes)
        
        # Parse fields
        fields = {}
        for line in text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                fields[key.strip()] = value.strip()
        
        return OCRResponse(
            success=True,
            text=text,
            fields=fields,
            confidence=confidence,
            needs_review=confidence < 0.90,
            processing_time=time.time() - start_time,
            reasoning=f"Đọc bằng {ocr_service.engine}, confidence: {confidence*100:.1f}%"
        )
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return OCRResponse(
            success=False,
            error=str(e),
            processing_time=time.time() - start_time
        )

@app.post("/ocr/learn")
async def learn(request: dict):
    """Học từ sửa lỗi của người dùng"""
    document_id = request.get("document_id")
    corrected_fields = request.get("corrected_fields", {})
    user_id = request.get("user_id")
    
    logger.info(f"📚 Learning from {user_id}: {corrected_fields}")
    
    # TODO: Lưu vào database
    
    return {
        "success": True,
        "message": "Đã học thành công",
        "learned": corrected_fields
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)