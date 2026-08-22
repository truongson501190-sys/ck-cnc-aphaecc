# backend_ai/engines/pipeline.py

import logging
import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List

try:
    from engines.reasoning.reasoner import Reasoner
except Exception:
    Reasoner = None

try:
    from engines.knowledge.knowledge_base import KnowledgeBase
except Exception:
    KnowledgeBase = None

logger = logging.getLogger(__name__)

try:
    import cv2
except Exception:
    cv2 = None

try:
    import numpy as np
except Exception:
    np = None


def _read_text_from_file(file_path: str) -> str:
    """Đọc text tĩnh khi OCR không khả dụng hoặc file là .txt/.json/.csv."""
    path = Path(file_path)
    if not path.exists():
        return ""

    try:
        suffix = path.suffix.lower()
        if suffix in {".txt", ".json", ".csv", ".log"}:
            return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

    return ""


def _extract_text_with_ocr(file_path: str) -> Dict[str, Any]:
    """Thử OCR theo thứ tự an toàn: PaddleOCR -> Tesseract -> empty."""
    try:
        from engines.ocr.paddle_ocr import PaddleOCRService
        ocr_service = PaddleOCRService()
    except Exception as exc:
        logger.warning(f"PaddleOCR unavailable in pipeline: {exc}")
        ocr_service = None

    if ocr_service is not None and cv2 is not None:
        try:
            image = cv2.imread(file_path)
            if image is not None:
                result = ocr_service.read(image)
                if result.get("text"):
                    return {
                        "raw_text": result["text"],
                        "confidence": float(result.get("confidence", 0.0)),
                        "provider": "paddleocr",
                        "reason": "OCR extraction succeeded"
                    }
        except Exception as exc:
            logger.warning(f"Pipeline OCR read failed: {exc}")

    try:
        from engines.ocr.tesseract_ocr import TesseractOCRService
        tesseract_service = TesseractOCRService()
        if cv2 is not None:
            image = cv2.imread(file_path)
            tesseract_result = tesseract_service.read(image)
            text = tesseract_result.get("text", "") if isinstance(tesseract_result, dict) else str(tesseract_result)
            if text.strip():
                return {
                    "raw_text": text,
                    "confidence": float(tesseract_result.get("confidence", 0.6)) if isinstance(tesseract_result, dict) else 0.6,
                    "provider": "tesseract",
                    "reason": "Fallback OCR extraction succeeded"
                }
    except Exception as exc:
        logger.warning(f"Tesseract fallback unavailable: {exc}")

    raw_text = _read_text_from_file(file_path)
    if raw_text.strip():
        return {
            "raw_text": raw_text,
            "confidence": 0.4,
            "provider": "text-file",
            "reason": "Read text directly from a plain text source"
        }

    return {
        "raw_text": "",
        "confidence": 0.0,
        "provider": "none",
        "reason": "No OCR/text extraction available"
    }


def process_document(file_path: str, document_type: str = "bao_cao_gia_cong"):
    """
    Xử lý tài liệu an toàn, không sập khi OCR native dependency bị thiếu.
    Trả về payload chuẩn để API export ra frontend.
    """
    start_time = time.time()

    extraction = _extract_text_with_ocr(file_path)
    raw_text = extraction.get("raw_text", "")
    confidence = float(extraction.get("confidence", 0.0))
    reasons = [extraction.get("reason", "No OCR text extracted")]

    if not isinstance(raw_text, str):
        raw_text = str(raw_text or "")

    if not raw_text.strip():
        return {
            "data": {},
            "raw_text": raw_text,
            "confidence": 0.0,
            "action": "MANUAL_CHECK",
            "status_message": "Không đọc được chữ. Vui lòng kiểm tra ảnh hoặc file đầu vào.",
            "reasons": reasons,
            "processing_time": time.time() - start_time,
        }

    fields = parse_bao_cao_gia_cong(raw_text)
    normalized_fields = _normalize_for_reasoning(fields)
    reasoning_text = "Rule-based parser applied to OCR output"

    if Reasoner is not None:
        try:
            normalized_fields, reasoning_text = Reasoner().enhance(normalized_fields, raw_text, reasoning_text)
            reasons.append(reasoning_text)
        except Exception as exc:
            logger.warning(f"Reasoner unavailable: {exc}")

    if KnowledgeBase is not None:
        try:
            normalized_fields, reasoning_text = KnowledgeBase().apply(normalized_fields, reasoning_text)
            reasons.append(reasoning_text)
        except Exception as exc:
            logger.warning(f"KnowledgeBase unavailable: {exc}")

    fields = _merge_normalized_fields(fields, normalized_fields)
    confidence = max(confidence, 0.95 if fields else 0.5)

    if confidence >= 0.98:
        action = "AUTO_IMPORT"
        status_message = "Đủ điều kiện tự động nhập ERP"
    elif confidence >= 0.90:
        action = "NEED_CONFIRMATION"
        status_message = "Đề nghị người dùng xác nhận"
    else:
        action = "MANUAL_CHECK"
        status_message = "Bắt buộc kiểm tra thủ công"

    return {
        "data": fields,
        "raw_text": raw_text,
        "confidence": confidence,
        "action": action,
        "status_message": status_message,
        "reasons": reasons,
        "processing_time": time.time() - start_time,
    }


def _normalize_for_reasoning(fields: Dict[str, Any]) -> Dict[str, Any]:
    """Chuẩn hóa key để các engine suy luận và tri thức biết cách đọc."""
    normalized: Dict[str, Any] = {}

    if 'ngay' in fields:
        normalized['date'] = fields['ngay']
    if 'ca' in fields:
        ca_value = str(fields['ca'])
        match = re.search(r'(\d+)', ca_value)
        if match:
            normalized['shift'] = match.group(1)
    if 'may' in fields:
        normalized['machine_code'] = fields['may']
    if 'so_luong' in fields:
        normalized['quantity'] = fields['so_luong']
    if 'vat_lieu' in fields:
        normalized['material'] = fields['vat_lieu']
    if 'nguoi_van_hanh' in fields:
        normalized['worker_name'] = fields['nguoi_van_hanh']
    if 'nguoi_kiem_tra' in fields:
        normalized['checker_name'] = fields['nguoi_kiem_tra']

    return normalized


def _merge_normalized_fields(original: Dict[str, Any], normalized: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(original)
    merged.update(normalized)
    return merged


def parse_bao_cao_gia_cong(text: str) -> dict:
    """Parse văn bản thành các trường (có thể cải thiện sau)"""
    fields: Dict[str, Any] = {}
    normalized_text = unicodedata.normalize('NFKD', text)
    normalized_text = ''.join(ch for ch in normalized_text if not unicodedata.combining(ch))

    date_match = re.search(r'NGAY\s*[:：]?\s*([\d/]+)', normalized_text, re.IGNORECASE)
    if date_match:
        fields['ngay'] = date_match.group(1).strip()

    ca_match = re.search(r'CA\s*[:：]?\s*([\w\s]+?)(?=\s*(?:MAY|$))', normalized_text, re.IGNORECASE)
    if ca_match:
        ca_value = ca_match.group(1).strip()
        num_match = re.search(r'(\d+)', ca_value)
        if num_match:
            fields['ca'] = f"Ca {num_match.group(1)}"
        elif 'ngay' in ca_value.lower():
            fields['ca'] = 'Ca 1'
        elif 'dem' in ca_value.lower():
            fields['ca'] = 'Ca 2'
        else:
            fields['ca'] = ca_value

    may_match = re.search(r'MAY\s*[:：]?\s*([A-Z0-9]+)', normalized_text, re.IGNORECASE)
    if may_match:
        fields['may'] = may_match.group(1).strip()

    sl_match = re.search(r'SL\s*[:：]?\s*(\d+)', normalized_text, re.IGNORECASE)
    if sl_match:
        fields['so_luong'] = int(sl_match.group(1))

    vl_match = re.search(r'VAT\s*LIEU\s*[:：]?\s*([^\n]+)', normalized_text, re.IGNORECASE)
    if vl_match:
        fields['vat_lieu'] = vl_match.group(1).strip()

    nv_match = re.search(r'NGUOI\s*VAN\s*HANH\s*[:：]?\s*([^\n]+)', normalized_text, re.IGNORECASE)
    if nv_match:
        fields['nguoi_van_hanh'] = nv_match.group(1).strip()

    nk_match = re.search(r'NGUOI\s*Kiem\s*TRA\s*[:：]?\s*([^\n]+)', normalized_text, re.IGNORECASE)
    if nk_match:
        fields['nguoi_kiem_tra'] = nk_match.group(1).strip()

    return fields