# backend_ai/api/ai.py

from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import time
from typing import Any, Dict, List
from core.pipeline import Pipeline
from engines.memory.store import MemoryStore
from engines.analytics.analyzer import AnalyticsEngine
from config.settings import settings
from models.ai_prediction import AIPrediction

pipeline = Pipeline()

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/document/parse")
async def parse_document(file: UploadFile = File(...)):
    """Parse document với pipeline AI hiện có, trả về payload chuẩn cho frontend."""
    try:
        upload_dir = settings.data_dir / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)

        scan_id = int(time.time())
        file_path = upload_dir / f"{scan_id}_{file.filename}"

        with open(file_path, "wb") as handle:
            shutil.copyfileobj(file.file, handle)

        with open(file_path, "rb") as handle:
            image_bytes = handle.read()

        prediction_obj = pipeline.process_document(image_bytes=image_bytes, filename=file.filename, user_id="system")
        payload = prediction_obj.to_dict()

        fields = payload.get("fields") or {}
        confidence = float(payload.get("confidence", 0.0))
        action = "MANUAL_CHECK"
        status_message = "Đã xử lý"
        reasons = payload.get("reasoning_steps") or [payload.get("reasoning", "")]
        raw_text = (payload.get("metadata") or {}).get("raw_text", "") or ""

        memory = MemoryStore()
        learning_boost = 0.0
        for field_name, value in fields.items():
            field_boost = memory.get_field_confidence_boost(field_name, value)
            if field_boost > 0:
                learning_boost += field_boost
                reasons.append(f"🧠 Learned history boosted field '{field_name}' by {field_boost:.2f}")

        confidence = min(0.99, confidence + learning_boost)
        if confidence >= 0.98:
            action = "AUTO_IMPORT"
            status_message = "Đủ điều kiện tự động nhập ERP"
        elif confidence >= 0.90:
            action = "NEED_CONFIRMATION"
            status_message = "Đề nghị người dùng xác nhận"
        else:
            action = "MANUAL_CHECK"
            status_message = "Bắt buộc kiểm tra thủ công"

        memory.store(
            str(scan_id),
            {
                "filename": file.filename,
                "text": raw_text,
                "fields": fields,
                "confidence": confidence,
                "reasoning": "\n".join(reasons),
                "user_id": "system",
            },
        )

        analytics = AnalyticsEngine()
        analytics.log_event(
            "document_processed",
            {
                "doc_id": scan_id,
                "confidence": confidence,
                "needs_review": action == "MANUAL_CHECK",
                "processing_time": payload.get("processing_time", 0.0),
                "fields": fields,
            },
        )

        file_path.unlink(missing_ok=True)

        if confidence >= 0.98:
            action = "AUTO_IMPORT"
            status_message = "Đủ điều kiện tự động nhập ERP"
        elif confidence >= 0.90:
            action = "NEED_CONFIRMATION"
            status_message = "Đề nghị người dùng xác nhận"
        else:
            action = "MANUAL_CHECK"
            status_message = "Bắt buộc kiểm tra thủ công"

        prediction = AIPrediction(
            document_type=payload.get("document_type", "bao_cao_gia_cong"),
            fields=fields,
            confidence=confidence,
            reasoning=payload.get("reasoning", "\n".join(reasons)),
            reasoning_steps=[step for step in reasons if step],
            confidence_breakdown=payload.get("confidence_breakdown") or {
                "ocr": round(confidence, 3),
                "validation": 1.0 if action != "MANUAL_CHECK" else 0.0,
            },
            validation={
                "passed": action != "MANUAL_CHECK",
                "warnings": []
            },
            validation_messages=[status_message] if status_message else ["Đã xử lý bằng pipeline AI"],
            model_version=payload.get("model_version", "erp-ai-pipeline-v1"),
            processing_time=payload.get("processing_time", 0.0),
            metadata={
                **(payload.get("metadata") or {}),
                "scan_id": scan_id,
                "source": "backend_ai",
                "raw_text_length": len(raw_text),
                "action": action,
            },
        )

        payload = prediction.to_dict()
        return {
            "success": True,
            "scan_id": scan_id,
            "prediction": {
                "documentType": payload["document_type"],
                "fields": payload["fields"],
                "confidence": payload["confidence"],
                "reasoning": payload["reasoning_steps"] or [payload["reasoning"]],
                "reasoning_steps": payload["reasoning_steps"],
                "confidence_breakdown": payload["confidence_breakdown"],
                "validation": payload["validation"],
                "validation_messages": payload["validation_messages"],
                "modelVersion": payload["model_version"],
                "action": action,
                "status_message": status_message,
                "raw_text": raw_text,
                "metadata": payload["metadata"],
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))