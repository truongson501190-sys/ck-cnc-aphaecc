"""
Assistant Agent
===============

Agent để tích hợp assistant vào pipeline (nếu cần).
Ví dụ: sau khi xử lý xong tài liệu, assistant có thể tự động đưa ra nhận xét.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from assistant import Assistant

logger = logging.getLogger(__name__)


class AssistantAgent(BaseAgent):
    """
    Agent gọi assistant để phân tích và đưa ra nhận xét về kết quả xử lý.
    """

    def __init__(
        self,
        assistant: Assistant,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="assistant_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["confidence_agent"]  # chạy sau khi có kết quả
        )
        self.assistant = assistant

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Gọi assistant để phân tích kết quả."""
        doc_id = context.get("document_id")
        if not doc_id:
            return context

        # Gọi assistant giải thích
        # Giả sử assistant có method explain_document
        try:
            result = self.assistant.tools.call_tool("explain_document", document_id=doc_id)
            if result.get("success"):
                explanation = result["result"]
                context["assistant_explanation"] = explanation
                logger.debug("Assistant explanation added for %s", doc_id)
        except Exception as e:
            logger.warning("AssistantAgent failed: %s", e)

        return context