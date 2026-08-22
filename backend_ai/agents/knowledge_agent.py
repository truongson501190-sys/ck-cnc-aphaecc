"""
Knowledge Agent
===============

Áp dụng tri thức (knowledge base) để làm giàu và sửa lỗi các trường.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.knowledge.knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)


class KnowledgeAgent(BaseAgent):
    """
    Agent knowledge:
    - Tra cứu thông tin tham chiếu (customer, product, tax code)
    - Ánh xạ tên OCR sang mã chuẩn
    - Chuẩn hoá đơn vị tính
    - Gợi ý sửa lỗi
    """

    def __init__(
        self,
        knowledge: KnowledgeBase,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="knowledge_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["reasoning_agent"]
        )
        self.knowledge = knowledge

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        fields = context.get("fields", {})
        reason = context.get("reason", "")

        if not fields:
            context["knowledge_reason"] = "No fields to apply knowledge"
            return context

        try:
            fields, knowledge_reason = self.knowledge.apply(fields, reason)
            context["fields"] = fields
            context["knowledge_reason"] = knowledge_reason
            logger.debug("Knowledge applied: %s", knowledge_reason[:50] if knowledge_reason else "None")
        except Exception as e:
            logger.exception("Knowledge application failed: %s", e)
            context["knowledge_reason"] = f"Knowledge error: {str(e)}"

        return context