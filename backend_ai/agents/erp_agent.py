"""
ERP Agent
=========

Nhập dữ liệu vào ERP nếu đủ tin cậy.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.automation.importer import ERPImporter

logger = logging.getLogger(__name__)


class ERPImportAgent(BaseAgent):
    """
    Agent ERP:
    - Chỉ import khi confidence đủ cao
    - Gửi dữ liệu lên ERP
    - Ghi nhận kết quả import
    """

    def __init__(
        self,
        importer: ERPImporter,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="erp_agent",
            enabled=enabled,
            config=config or {},
            dependencies=["confidence_agent"]
        )
        self.importer = importer

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        needs_review = context.get("needs_review", True)
        if needs_review:
            context["erp_imported"] = False
            context["erp_message"] = "Skipped due to needs_review"
            return context

        fields = context.get("fields", {})
        doc_id = context.get("document_id")

        if not fields:
            context["erp_imported"] = False
            context["erp_message"] = "No fields to import"
            return context

        try:
            result = self.importer.import_document(fields, doc_id)
            if result.get("success"):
                context["erp_imported"] = True
                context["erp_message"] = "Import successful"
                logger.info("ERP import successful for %s", doc_id)
            else:
                context["erp_imported"] = False
                context["erp_message"] = result.get("error", "Import failed")
                logger.warning("ERP import failed for %s: %s", doc_id, context["erp_message"])
        except Exception as e:
            logger.exception("ERP import exception: %s", e)
            context["erp_imported"] = False
            context["erp_message"] = f"ERP error: {str(e)}"

        return context