"""
Confidence Agent
================

Tính toán độ tin cậy tổng hợp từ nhiều nguồn.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from config.settings import settings
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class ConfidenceAgent(BaseAgent):
    """
    Agent confidence:
    - Tổng hợp confidence từ OCR, Brain, Layout, Validation
    - Quyết định needs_review
    """

    def __init__(
        self,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="confidence_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["validation_agent", "ocr_agent", "brain_agent"]
        )

    def _calculate_confidence(
        self,
        brain_conf: float,
        ocr_conf: float,
        layout_conf: float,
        is_valid: bool,
        llm_used: bool,
    ) -> float:
        """Tính confidence tổng hợp."""
        score = (
            brain_conf * 0.35
            + ocr_conf * 0.25
            + layout_conf * 0.20
        )
        if is_valid:
            score += 0.20
        if llm_used:
            score = min(score + 0.03, 0.99)
        return round(min(score, 0.99), 3)

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        brain_conf = context.get("brain_confidence", 0.0)
        ocr_conf = context.get("confidence", 0.0)
        is_valid = context.get("is_valid", False)
        raw_text = context.get("raw_text", "")
        llm_used = context.get("llm_used", False)

        # Layout confidence: dựa trên số dòng
        layout_conf = 0.85 if len(raw_text.splitlines()) >= 2 else 0.60

        confidence = self._calculate_confidence(
            brain_conf, ocr_conf, layout_conf, is_valid, llm_used
        )

        needs_review = confidence < settings.confidence_auto

        context["confidence"] = confidence
        context["needs_review"] = needs_review

        logger.debug(
            "Confidence: %.2f, review: %s",
            confidence, needs_review
        )
        return context