"""
Reasoning Agent
===============

Tăng cường suy luận trên các trường đã trích xuất.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.reasoning.reasoner import Reasoner

logger = logging.getLogger(__name__)


class ReasoningAgent(BaseAgent):
    """
    Agent reasoning:
    - Dựa trên fields và raw_text
    - Bổ sung logic, tính toán, suy luận
    - Có thể sửa lỗi hoặc làm giàu dữ liệu
    """

    def __init__(
        self,
        reasoner: Reasoner,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="reasoning_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["brain_agent"]
        )
        self.reasoner = reasoner

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        fields = context.get("fields", {})
        raw_text = context.get("raw_text", "")
        brain_reason = context.get("brain_reason", "")

        if not fields:
            context["reason"] = "No fields to reason about"
            return context

        try:
            fields, reason = self.reasoner.enhance(fields, raw_text, brain_reason)
            context["fields"] = fields
            context["reason"] = reason
            logger.debug("Reasoning completed: %s", reason[:50] if reason else "No reasoning")
        except Exception as e:
            logger.exception("Reasoning failed: %s", e)
            context["reason"] = f"Reasoning error: {str(e)}"

        return context