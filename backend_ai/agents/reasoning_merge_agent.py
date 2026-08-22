"""
Reasoning Merge Agent
=====================

Tổng hợp tất cả các lý do thành một chuỗi duy nhất.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class ReasoningMergeAgent(BaseAgent):
    """
    Agent tổng hợp reasoning:
    - Gom các reason từ brain, reasoning, knowledge, validation, erp
    - Tạo một chuỗi reasoning duy nhất cho context
    """

    def __init__(
        self,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="reasoning_merge_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["erp_agent", "analytics_agent"]
        )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        parts: List[str] = []

        # Lấy từng phần
        if brain_reason := context.get("brain_reason"):
            parts.append(brain_reason)
        if reason := context.get("reason"):
            parts.append(reason)
        if knowledge_reason := context.get("knowledge_reason"):
            parts.append(knowledge_reason)

        # Validation
        is_valid = context.get("is_valid", False)
        if is_valid:
            parts.append("Validation Passed")
        else:
            validation_reason = context.get("validation_reason", "")
            if validation_reason:
                parts.append(f"Validation: {validation_reason}")
            else:
                parts.append("Validation Failed")

        # ERP
        if context.get("erp_imported"):
            parts.append("ERP Imported")
        elif context.get("erp_message"):
            parts.append(f"ERP: {context.get('erp_message')}")

        # Filter empty
        merged = "\n".join(p.strip() for p in parts if p and p.strip())

        context["reasoning"] = merged
        return context