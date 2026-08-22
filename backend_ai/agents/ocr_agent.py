"""
OCR Agent
=========

Chạy hybrid OCR trên các biến thể ảnh và chọn kết quả tốt nhất.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class OCRAgent(BaseAgent):
    """
    Agent OCR:
    - Chạy tất cả OCR engines trên từng biến thể
    - Tính điểm và chọn kết quả tốt nhất
    """

    def __init__(
        self,
        ocr_runner,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="ocr_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["vision_agent"]  # cần variants
        )
        self.ocr = ocr_runner

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Chạy OCR và chọn kết quả tốt nhất."""
        variants = context.get("variants")
        if not variants:
            raise ValueError("No image variants available")

        best_result = None
        best_engine = ""
        best_score = -1.0

        for variant in variants:
            result, engine = self.ocr.read(variant)
            score = self.ocr.score(result)
            if score > best_score:
                best_result = result
                best_engine = engine
                best_score = score

        if best_result is None or not best_result.success:
            raise RuntimeError(f"All OCR engines failed (best_score={best_score})")

        context["raw_text"] = (best_result.text or "").strip()
        context["confidence"] = best_result.confidence
        context["ocr_engine_used"] = best_engine
        context["source"] = "ocr"
        context["ocr_score"] = best_score

        logger.info(
            "OCR best engine: %s, confidence: %.2f, score: %.2f",
            best_engine, best_result.confidence, best_score
        )
        return context