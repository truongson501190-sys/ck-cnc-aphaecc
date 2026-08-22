"""
Validation Agent
================

Kiểm tra tính hợp lệ của các trường đã trích xuất.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.validation.validator import Validator

logger = logging.getLogger(__name__)


class ValidationAgent(BaseAgent):
    """
    Agent validation:
    - Áp dụng các business rules lên fields
    - Trả về valid (bool) và lý do
    """

    def __init__(
        self,
        validator: Validator,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="validation_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["brain_agent"]  # cần fields
        )
        self.validator = validator

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        fields = context.get("fields", {})
        if not fields:
            context["is_valid"] = False
            context["validation_reason"] = "No fields to validate"
            return context

        try:
            is_valid, validation_reason = self.validator.check(fields)
            context["is_valid"] = is_valid
            context["validation_reason"] = validation_reason
            logger.debug("Validation result: %s", is_valid)
        except Exception as e:
            logger.exception("Validation failed: %s", e)
            context["is_valid"] = False
            context["validation_reason"] = f"Validation error: {str(e)}"

        return context