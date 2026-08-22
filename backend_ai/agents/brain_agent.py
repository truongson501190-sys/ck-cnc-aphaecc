"""
Brain Agent
===========

Diễn giải văn bản OCR thành các trường có cấu trúc.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.brain.interpreter import Interpreter

logger = logging.getLogger(__name__)


class BrainAgent(BaseAgent):
    """
    Agent diễn giải văn bản:
    - Nhận raw_text từ OCR/LLM
    - Trích xuất các trường thông tin (invoice_number, date, total, ...)
    - Trả về dict fields và confidence
    """

    def __init__(
        self,
        brain: Interpreter,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="brain_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["llm_fallback_agent"]  # cần raw_text cuối cùng
        )
        self.brain = brain

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raw_text = context.get("raw_text", "")
        if not raw_text:
            logger.warning("No raw_text for brain interpretation")
            context["fields"] = {}
            context["brain_confidence"] = 0.0
            context["brain_reason"] = "No text to interpret"
            return context

        try:
            fields, brain_conf, brain_reason = self.brain.interpret(raw_text)
            context["fields"] = fields
            context["brain_confidence"] = brain_conf
            context["brain_reason"] = brain_reason
            logger.debug("Brain extracted %d fields", len(fields))
        except Exception as e:
            logger.exception("Brain interpretation failed: %s", e)
            context["fields"] = {}
            context["brain_confidence"] = 0.0
            context["brain_reason"] = f"Brain failed: {str(e)}"

        return context