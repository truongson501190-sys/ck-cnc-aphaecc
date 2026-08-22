"""
LLM Fallback Agent
==================

Sử dụng Vision LLM để đọc ảnh trực tiếp nếu OCR cho kết quả kém.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from .base_agent import BaseAgent
from models.base_model_adapter import BaseModelAdapter

logger = logging.getLogger(__name__)


class LLMFallbackAgent(BaseAgent):
    """
    Agent fallback dùng LLM:
    - Kích hoạt khi OCR confidence thấp hoặc text quá ngắn
    - Gọi Vision LLM để đọc toàn bộ nội dung ảnh
    - Nối thêm kết quả vào raw_text
    """

    def __init__(
        self,
        llm: Optional[BaseModelAdapter] = None,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="llm_fallback_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["ocr_agent"]
        )
        self._llm = llm

    def _should_fallback(self, context: Dict[str, Any]) -> bool:
        """Xác định có cần fallback không."""
        if not self._llm or not self._llm.is_available():
            return False

        raw_text = context.get("raw_text", "")
        confidence = context.get("confidence", 0.0)

        # Các điều kiện kích hoạt fallback
        if confidence < 0.60:
            return True
        if len(raw_text) < 30:
            return True
        if len(raw_text.split()) < 10:
            return True
        return False

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Gọi LLM fallback nếu cần."""
        if not self._should_fallback(context):
            return context

        logger.info("LLM fallback triggered for enhanced text")

        primary_image = context.get("primary_image")
        if primary_image is None:
            return context

        try:
            response = self._llm.process_image(
                primary_image,
                prompt="""
                Đọc toàn bộ nội dung tài liệu.
                Không giải thích.
                Xuất toàn bộ text.
                """
            )
            if response.get("success"):
                llm_text = response.get("text", "").strip()
                if llm_text:
                    original = context.get("raw_text", "")
                    context["raw_text"] = original + "\n" + llm_text
                    context["llm_used"] = True
                    context["llm_text_length"] = len(llm_text)
                    logger.info(
                        "LLM added %d chars, total length: %d",
                        len(llm_text), len(context["raw_text"])
                    )
            else:
                logger.warning("LLM response not successful: %s", response.get("error"))
        except Exception as e:
            logger.warning("LLM fallback failed: %s", e)

        return context