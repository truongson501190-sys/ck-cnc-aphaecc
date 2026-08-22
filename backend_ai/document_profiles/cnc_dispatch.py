from __future__ import annotations

import re
from typing import Any, Dict, Mapping

from .base_profile import BaseDocumentProfile


class CNCDispatchProfile(BaseDocumentProfile):
    """Document profile for CNC dispatch / production dispatch sheet."""

    document_type = "cnc_dispatch"

    def detect(self, text: str) -> bool:
        lowered = text.lower()
        keywords = ["phiếu điều độ", "cnc", "máy", "sản phẩm", "số lượng"]
        return any(keyword in lowered for keyword in keywords)

    def extract_regions(self, text: str) -> Dict[str, Any]:
        normalized = text.replace("\r\n", "\n")
        lines = [line.strip() for line in normalized.splitlines() if line.strip()]
        return {
            "header": lines[:3],
            "machine": self._extract_value(text, r"máy\s*[:：]?\s*([A-Z0-9\-_]+)"),
            "product": self._extract_value(text, r"sản phẩm\s*[:：]?\s*([A-Z0-9\-_]+)"),
            "quantity": self._extract_value(text, r"số lượng\s*[:：]?\s*([\d,\.]+)"),
            "raw_lines": lines,
        }

    def parse(self, text: str) -> Dict[str, Any]:
        fields: Dict[str, Any] = {}
        machine = self._extract_value(text, r"máy\s*[:：]?\s*([A-Z0-9\-_]+)")
        if machine:
            fields["machine_code"] = machine

        product_code = self._extract_value(text, r"sản phẩm\s*[:：]?\s*([A-Z0-9\-_]+)")
        if product_code:
            fields["product_code"] = product_code

        quantity_raw = self._extract_value(text, r"số lượng\s*[:：]?\s*([\d,\.]+)")
        if quantity_raw:
            try:
                fields["quantity"] = int(float(quantity_raw.replace(",", "")))
            except ValueError:
                fields["quantity"] = quantity_raw

        return fields

    def validate_required_fields(self, fields: Mapping[str, Any]) -> bool:
        required = ["machine_code", "product_code", "quantity"]
        return all(str(fields.get(field, "")).strip() for field in required)

    def _extract_value(self, text: str, pattern: str) -> str:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            return ""
        return match.group(1).strip()
