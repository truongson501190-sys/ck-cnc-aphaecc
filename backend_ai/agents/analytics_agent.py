"""
Analytics Agent
===============

Ghi log sự kiện phân tích.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.analytics.analyzer import AnalyticsEngine

logger = logging.getLogger(__name__)


class AnalyticsAgent(BaseAgent):
    """
    Agent analytics:
    - Ghi sự kiện document_processed
    - Thu thập metrics (confidence, thời gian, engine, ...)
    """

    def __init__(
        self,
        analytics: AnalyticsEngine,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="analytics_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["erp_agent", "memory_agent"]
        )
        self.analytics = analytics

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            event_data = {
                "doc": context.get("document_id"),
                "confidence": context.get("confidence"),
                "ocr": context.get("ocr_engine_used"),
                "time": context.get("processing_time", 0),
                "user": context.get("user_id"),
                "llm_used": context.get("llm_used", False),
                "needs_review": context.get("needs_review", True),
                "erp_imported": context.get("erp_imported", False),
            }
            self.analytics.log_event("document_processed", event_data)
            logger.debug("Analytics event logged")
        except Exception as e:
            logger.exception("Analytics logging failed: %s", e)

        return context