# backend_ai/api/import_erp.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uuid
import logging

from engines.automation.importer import ERPImporter
from engines.analytics.analyzer import AnalyticsEngine
from models.ai_prediction import AIPrediction

router = APIRouter(prefix="/api/ai", tags=["Automation"])

logger = logging.getLogger(__name__)
importer = ERPImporter()
analytics = AnalyticsEngine()

class ImportRequest(BaseModel):
    scan_id: str
    data: dict
    user_id: str = "system"

@router.post("/import")
async def import_to_erp(request: ImportRequest):
    """Import dữ liệu vào ERP theo engine automation nội bộ, trả về payload chuẩn."""
    try:
        import_result = importer.import_document(request.data, request.scan_id)
        if not import_result.get("success"):
            raise HTTPException(status_code=400, detail=import_result.get("reason", "Import failed"))

        tx_id = f"ERP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        prediction = AIPrediction(
            document_type=str(request.data.get("document_type", "unknown")),
            fields=request.data,
            confidence=1.0 if import_result.get("success") else 0.0,
            reasoning="ERP import completed",
            reasoning_steps=["✓ ERP import completed"],
            confidence_breakdown={"import": 1.0 if import_result.get("success") else 0.0},
            validation={"is_valid": bool(import_result.get("success"))},
            validation_messages=[import_result.get("reason", "Imported successfully")] if not import_result.get("success") else ["Imported successfully"],
            model_version="erp-import-v1",
            processing_time=0.0,
            metadata={"scan_id": request.scan_id, "user_id": request.user_id},
        )

        logger.info(f"ERP Import: {tx_id} for scan {request.scan_id}")
        analytics.log_event(
            "erp_imported",
            {
                "scan_id": request.scan_id,
                "user_id": request.user_id,
                "transaction_id": tx_id,
                "import_data": import_result.get("data", {}),
                "status": "completed",
            },
        )

        return {
            "success": True,
            "transaction_id": tx_id,
            "message": "✅ Dữ liệu đã được nhập vào ERP",
            "timestamp": datetime.now().isoformat(),
            "scan_id": request.scan_id,
            "status": "completed",
            "import": import_result,
            "prediction": prediction.to_dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))