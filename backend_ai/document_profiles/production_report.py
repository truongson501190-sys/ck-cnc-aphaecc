from __future__ import annotations

import re
from typing import Any, Dict, Mapping

from .base_profile import BaseDocumentProfile


class ProductionReportProfile(BaseDocumentProfile):
    """Document profile for production / machining reports such as BÁO CÁO GIA CÔNG."""

    document_type = "production_report"

    def detect(self, text: str) -> bool:
        return self.match(text)

    def match(self, text: str) -> bool:
        lowered = (text or "").lower()
        report_keywords = ["báo cáo sản xuất", "báo cáo gia công", "gia công", "sản xuất"]
        header_keywords = ["ngày", "ca", "máy", "dự án", "số lượng", "vật liệu", "số bản vẽ"]
        has_report_keyword = any(keyword in lowered for keyword in report_keywords)
        has_header_keyword = any(keyword in lowered for keyword in header_keywords)
        return has_report_keyword and has_header_keyword

    def extract_regions(self, text: str) -> Dict[str, Any]:
        return {
            "machine": self._extract_value(text, r"máy\s*[:：]?\s*([A-Z0-9\-_]+)"),
            "quantity": self._extract_value(text, r"số lượng\s*[:：]?\s*([\d,\.]+)"),
            "worker": self._extract_value(text, r"người\s*vận\s*hành\s*[:：]?\s*([^\n]+)"),
            "checker": self._extract_value(text, r"người\s*kiểm\s*tra\s*[:：]?\s*([^\n]+)"),
        }

    def parse(self, text: str) -> Dict[str, Any]:
        fields: Dict[str, Any] = {}

        date_value = self._extract_value(text, r"ngày\s*[:：]?\s*([\d/\-\.]+)")
        if date_value:
            fields["date"] = date_value
            fields["ngay"] = date_value

        shift_value = self._extract_value(text, r"ca\s*[:：]?\s*(\d+|ngày|chiều|đêm)")
        if shift_value:
            fields["shift"] = self._normalize_shift(shift_value)
            fields["ca"] = self._normalize_shift(shift_value)

        machine = self._extract_value(text, r"máy\s*[:：]?\s*([A-Z0-9\-_]+)")
        if machine:
            fields["machine_code"] = machine
            fields["machine"] = machine
            fields["may"] = machine

        project = self._extract_value(text, r"dự\s*án\s*[:：]?\s*([A-Z0-9\-_]+)")
        if not project:
            project = self._extract_value(text, r"sản\s*phẩm\s*[:：]?\s*([A-Z0-9\-_]+)")
        if not project:
            project = self._extract_value(text, r"sp\s*[:：]?\s*([A-Z0-9\-_]+)")
        if project:
            fields["project_code"] = project
            fields["project"] = project
            fields["du_an"] = project

        quantity_raw = self._extract_value(text, r"số\s*lượng\s*[:：]?\s*([\d,\.]+)")
        if quantity_raw:
            try:
                quantity_value = int(float(quantity_raw.replace(",", "")))
            except ValueError:
                quantity_value = quantity_raw
            fields["quantity"] = quantity_value
            fields["so_luong"] = quantity_value

        material = self._extract_value(text, r"vật\s*liệu\s*[:：]?\s*([^\n]+)")
        if material:
            fields["material"] = material
            fields["vat_lieu"] = material

        drawing_number = self._extract_value(text, r"số\s*bản\s*vẽ\s*[:：]?\s*([A-Z0-9\-_\/]+)")
        if drawing_number:
            fields["drawing_number"] = drawing_number
            fields["so_ban_ve"] = drawing_number

        detail_number = self._extract_value(text, r"chi\s*tiết\s*số\s*[:：]?\s*([A-Z0-9\-_\/]+)")
        if detail_number:
            fields["detail_number"] = detail_number
            fields["chi_tiet_so"] = detail_number

        detail_name = self._extract_value(text, r"tên\s*chi\s*tiết\s*[:：]?\s*([^\n]+)")
        if detail_name:
            fields["detail_name"] = detail_name
            fields["ten_chi_tiet"] = detail_name

        labor_number = self._extract_value(text, r"ng\.?\s*công\s*số\s*[:：]?\s*([A-Z0-9\-_\/]+)")
        if labor_number:
            fields["labor_number"] = labor_number
            fields["ng_cong_so"] = labor_number

        total_labor = self._extract_value(text, r"tổng\s*ng\.?\s*công\s*[:：]?\s*([\d,\.]+)")
        if total_labor:
            fields["total_labor"] = total_labor
            fields["tong_ng_cong"] = total_labor

        gc_time = self._extract_value(text, r"t\.?gian\s*gc\s*/\s*cái\s*[:：]?\s*([\d,\.]+)")
        if not gc_time:
            gc_time = self._extract_value(text, r"t\.?gian\s*gc\s*[:：]?\s*([\d,\.]+)")
        if gc_time:
            fields["gc_time_per_piece"] = gc_time
            fields["t_gian_gc_cai"] = gc_time

        total_time = self._extract_value(text, r"tổng\s*t\.?gian\s*[:：]?\s*([\d,\.]+)")
        if total_time:
            fields["total_time"] = total_time
            fields["tong_t_gian"] = total_time

        operator = self._extract_value(text, r"người\s*vận\s*hành\s*[:：]?\s*([^\n]+)")
        if operator:
            fields["operator"] = operator.strip()
            fields["nguoi_van_hanh"] = operator.strip()

        checker = self._extract_value(text, r"người\s*kiểm\s*tra\s*[:：]?\s*([^\n]+)")
        if checker:
            fields["checker"] = checker.strip()
            fields["nguoi_kiem_tra"] = checker.strip()

        return fields

    def validate_required_fields(self, fields: Mapping[str, Any]) -> bool:
        return bool(fields.get("machine_code") or fields.get("quantity") or fields.get("date") or fields.get("project_code"))

    def _extract_value(self, text: str, pattern: str) -> str:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            return ""
        return match.group(1).strip()

    def _normalize_shift(self, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized in {"1", "ca1", "ca 1", "ca một", "ngày"}:
            return "1"
        if normalized in {"2", "ca2", "ca 2", "ca hai", "chiều"}:
            return "2"
        if normalized in {"3", "ca3", "ca 3", "ca ba", "đêm"}:
            return "3"
        return value
