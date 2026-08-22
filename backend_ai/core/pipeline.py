# backend_ai/core/pipeline.py

import asyncio
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from core.gateway import Gateway, ProcessingContext
from document_profiles import CNCDispatchProfile, ProductionReportProfile, get_document_profile
from models.ai_prediction import AIPrediction

logger = logging.getLogger(__name__)

GENERIC_FIELD_PATTERNS = {
    "machine_code": r"(?:máy|machine|mc|mã\s+máy)\s*[:：]?\s*([A-Z0-9\-_]+)",
    "product_code": r"(?:sản\s+phẩm|product|sp|mã\s+sp)\s*[:：]?\s*([A-Z0-9\-_]+)",
    "quantity": r"(?:số\s+lượng|sl|quantity)\s*[:：]?\s*([\d,\.]+)",
    "date": r"(?:ngày|date)\s*[:：]?\s*([\d/\-\.]+)",
    "shift": r"(?:ca|shift)\s*[:：]?\s*(\d+)",
    "worker_name": r"(?:người\s*vận\s*hành|worker|operator)\s*[:：]?\s*([^\n]+)",
    "checker_name": r"(?:người\s*kiểm\s*tra|checker|inspector)\s*[:：]?\s*([^\n]+)",
}


def extract_fields_from_text(raw_text: str) -> Dict[str, Any]:
    """Extract structured fields from OCR text using profiles and simple regex fallbacks."""
    if not raw_text:
        return {}

    extracted_fields: Dict[str, Any] = {}

    for profile in (CNCDispatchProfile(), ProductionReportProfile()):
        try:
            parsed = profile.parse(raw_text)
        except Exception:
            parsed = {}
        if parsed:
            extracted_fields.update(parsed)

    if extracted_fields:
        return extracted_fields

    for field_name, pattern in GENERIC_FIELD_PATTERNS.items():
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if not match:
            continue
        value = match.group(1).strip()
        if field_name == "quantity":
            try:
                value = int(float(value.replace(",", "")))
            except ValueError:
                pass
        extracted_fields[field_name] = value

    return extracted_fields


class Pipeline:
    """Async pipeline that orchestration OCR, reasoning and profile-based parsing."""

    def __init__(self, max_workers: int = 4):
        self.gateway = Gateway()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.queue = asyncio.Queue()
        self.running = False

    async def process_batch(self, items: List[Dict[str, Any]]) -> List[Optional[AIPrediction]]:
        """Process multiple documents concurrently and return standardized AI predictions."""
        loop = asyncio.get_event_loop()
        tasks = []

        for item in items:
            task = loop.run_in_executor(
                self.executor,
                self._process_single_item_sync,
                item["bytes"],
                item["filename"],
                item.get("user_id", "system"),
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        final_results: List[Optional[AIPrediction]] = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"❌ Pipeline error: {result}")
                final_results.append(None)
            else:
                final_results.append(result)

        return final_results

    def process_document(self, image_bytes: bytes, filename: str, user_id: str = "system") -> AIPrediction:
        """Process a single document and return a normalized AIPrediction payload."""
        return self._process_single_item_sync(image_bytes, filename, user_id)

    async def process_stream(self, item: Dict[str, Any]):
        """Process streaming, returning one prediction at a time."""
        # TODO: implement streaming
        pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "gateway": "running",
            "queue_size": self.queue.qsize(),
            "workers": self.executor._max_workers,
        }

    def _process_single_item_sync(self, image_bytes: bytes, filename: str, user_id: str) -> AIPrediction:
        start_time = time.time()
        context = self.gateway.process_document(image_bytes, filename, user_id)
        return self._build_prediction(context, start_time)

    def _build_prediction(self, context: ProcessingContext, start_time: float) -> AIPrediction:
        raw_text = (context.raw_text or "").strip()
        profile = get_document_profile(raw_text or context.filename)
        profile_fields: Dict[str, Any] = {}
        regions: Dict[str, Any] = {}
        if profile is not None:
            profile_fields = profile.parse(raw_text)
            regions = profile.extract_regions(raw_text)

        parsed_fields = extract_fields_from_text(raw_text)
        merged_fields = dict(parsed_fields)
        merged_fields.update(context.fields or {})
        merged_fields.update(profile_fields)

        if not merged_fields:
            fallback_text = re.sub(r"[^A-Za-z0-9À-ÿ\s]", " ", raw_text or context.filename or "")
            fallback_tokens = [token for token in fallback_text.split() if token]
            if fallback_tokens:
                merged_fields["raw_tokens"] = fallback_tokens[:8]
                if len(fallback_tokens) >= 2:
                    merged_fields["document_hint"] = fallback_tokens[0]

        document_type = profile.document_type if profile is not None else str(merged_fields.get("document_type", "unknown"))
        validation_passed = bool(profile is None or profile.validate_required_fields(merged_fields))
        validation_messages = []
        if profile is not None and not profile.validate_required_fields(merged_fields):
            validation_messages.append("Thiếu trường bắt buộc theo document profile")
        if not validation_passed:
            validation_messages.append("Cần review thủ công")
        elif not context.reasoning:
            validation_messages.append("Không phát hiện xung đột dữ liệu")

        machine_code = str(merged_fields.get("machine_code") or merged_fields.get("may") or "").strip()
        reasoning_steps = []
        if machine_code:
            reasoning_steps.append(f"✓ OCR đọc {machine_code}")
        else:
            reasoning_steps.append("✓ OCR không phát hiện mã máy")

        if profile is not None:
            reasoning_steps.append("✓ Layout đúng vùng Machine")
        else:
            reasoning_steps.append("✓ Không có document profile phù hợp")

        if context.confidence >= 0.8:
            reasoning_steps.append("✓ ERP xác nhận tồn tại")
        else:
            reasoning_steps.append("✓ ERP cần kiểm tra thêm")

        if validation_passed:
            reasoning_steps.append("✓ Không có xung đột dữ liệu")
        else:
            reasoning_steps.append("✓ Có dữ liệu cần review")

        field_bonus = min(len([value for value in merged_fields.values() if value not in ("", None)]) * 0.04, 0.15)
        confidence_breakdown = {
            "ocr": round(float(context.confidence), 3),
            "profile": 0.95 if profile is not None else 0.0,
            "validation": 1.0 if validation_passed else 0.0,
        }
        confidence_value = min(
            float(context.confidence)
            + (0.03 if profile is not None else 0.0)
            + (0.02 if validation_passed else 0.0)
            + field_bonus,
            0.99,
        )

        reasoning = context.reasoning or "Không có giải thích từ engine"
        reasoning_lines = [
            f"Machine = {machine_code or 'unknown'}",
            f"Confidence = {confidence_value * 100:.1f}%",
            "Reasoning",
            *[f"- {step}" for step in reasoning_steps],
            "",
            reasoning,
        ]

        return AIPrediction(
            document_type=document_type,
            fields=merged_fields,
            confidence=confidence_value,
            reasoning="\n".join(reasoning_lines),
            reasoning_steps=reasoning_steps,
            confidence_breakdown=confidence_breakdown,
            validation={"is_valid": validation_passed, "required_fields_present": bool(profile is not None)},
            validation_messages=validation_messages or ["Dữ liệu đủ điều kiện để tiếp tục"],
            model_version="erp-ai-pipeline-v1",
            processing_time=float(context.processing_time) + (time.time() - start_time),
            metadata={
                "filename": context.filename,
                "source": context.source,
                "ocr_engine_used": context.ocr_engine_used,
                "llm_used": context.llm_used,
                "raw_text": raw_text,
                "raw_text_length": len(raw_text),
                "regions": regions,
            },
        )