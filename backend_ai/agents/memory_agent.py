"""
Memory Agent
============

Lưu trữ kết quả xử lý vào memory store.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.memory.store import MemoryStore

logger = logging.getLogger(__name__)


class MemoryAgent(BaseAgent):
    """
    Agent memory:
    - Lưu context vào memory store
    - Có thể truy vấn lịch sử sau này
    """

    def __init__(
        self,
        memory: MemoryStore,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="memory_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["confidence_agent"]
        )
        self.memory = memory

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = context.get("document_id")
        if doc_id is None:
            logger.warning("No document_id, skipping memory store")
            return context

        data = {
            "filename": context.get("filename"),
            "text": context.get("raw_text"),
            "fields": context.get("fields"),
            "confidence": context.get("confidence"),
            "ocr_engine": context.get("ocr_engine_used"),
            "llm_used": context.get("llm_used", False),
            "user_id": context.get("user_id"),
            "timestamp": context.get("processing_time"),
        }

        try:
            self.memory.store(doc_id, data)
            logger.debug("Stored document %s in memory", doc_id)
        except Exception as e:
            logger.exception("Memory store failed: %s", e)

        return context