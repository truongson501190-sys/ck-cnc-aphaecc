# backend_ai/engines/reasoning/reasoner.py

import re
from typing import Dict, Any, Tuple, List, Optional
import logging

logger = logging.getLogger(__name__)

class Reasoner:
    """
    Reasoning Engine - Suy luận logic để bổ sung và sửa dữ liệu
    """
    
    def __init__(self):
        # Luật suy luận
        self.rules = [
            self._rule_infer_shift,
            self._rule_infer_quantity,
            self._rule_normalize_date,
            self._rule_infer_machine_from_context,
            self._rule_clean_product_code,
        ]
    
    def enhance(self, fields: Dict[str, Any], raw_text: str, 
                reasoning: str) -> Tuple[Dict[str, Any], str]:
        """
        Áp dụng các luật suy luận để bổ sung và sửa dữ liệu
        """
        updated_fields = fields.copy()
        reasoning_parts = [reasoning]
        
        for rule in self.rules:
            new_fields, new_reasoning = rule(updated_fields, raw_text)
            if new_fields:
                updated_fields.update(new_fields)
            if new_reasoning:
                reasoning_parts.append(new_reasoning)
        
        return updated_fields, "\n".join(reasoning_parts)
    
    def _rule_infer_shift(self, fields: Dict[str, Any], text: str) -> Tuple[Dict[str, Any], str]:
        """Suy luận ca làm việc từ ngữ cảnh header"""
        if "shift" in fields:
            return {}, ""

        shift_map = {
            "ca1": "1", "ca 1": "1", "ca một": "1",
            "ca2": "2", "ca 2": "2", "ca hai": "2",
            "ca3": "3", "ca 3": "3", "ca ba": "3",
            "ngày": "1", "đêm": "3"
        }

        text_lower = text.lower()
        for key, value in shift_map.items():
            if key in text_lower:
                return {"shift": value}, f"🧠 Rule applied: infer shift from header token '{key}' -> {value}"

        return {}, ""
    
    def _rule_infer_quantity(self, fields: Dict[str, Any], text: str) -> Tuple[Dict[str, Any], str]:
        """Suy luận số lượng từ các từ khóa header"""
        if "quantity" in fields:
            return {}, ""

        patterns = [
            r"(?:số\s*lượng|sl|tổng)\s*[:：]?\s*(\d+)",
            r"(\d+)\s*(?:cái|chiếc|sản phẩm|sp)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                quantity = float(match.group(1))
                return {"quantity": quantity}, f"🧠 Rule applied: infer quantity from header pattern -> {quantity}"

        return {}, ""
    
    def _rule_normalize_date(self, fields: Dict[str, Any], text: str) -> Tuple[Dict[str, Any], str]:
        """Chuẩn hóa định dạng ngày theo header rule"""
        if "date" not in fields:
            return {}, ""

        date_str = fields["date"]

        formats = [
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),
            (r'(\d{4})/(\d{1,2})/(\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),
            (r'(\d{4})-(\d{1,2})-(\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),
        ]

        for pattern, formatter in formats:
            match = re.match(pattern, date_str)
            if match:
                normalized = formatter(match)
                if normalized != date_str:
                    return {"date": normalized}, f"🧠 Rule applied: normalize date header from '{date_str}' -> '{normalized}'"
                return {"date": normalized}, ""

        return {}, ""
    
    def _rule_infer_machine_from_context(self, fields: Dict[str, Any], text: str) -> Tuple[Dict[str, Any], str]:
        """Suy luận mã máy từ ngữ cảnh header"""
        if "machine_code" in fields:
            return {}, ""

        patterns = [
            r"MC\s*(\d{2})",
            r"M\s*(\d{2})",
            r"máy\s*(\d{2})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                code = f"MC{match.group(1)}"
                return {"machine_code": code}, f"🧠 Rule applied: infer machine header -> {code}"

        return {}, ""
    
    def _rule_clean_product_code(self, fields: Dict[str, Any], text: str) -> Tuple[Dict[str, Any], str]:
        """Làm sạch mã sản phẩm"""
        if "product_code" not in fields:
            return {}, ""
        
        code = fields["product_code"]
        # Xóa ký tự đặc biệt
        cleaned = re.sub(r'[^A-Za-z0-9\-_]', '', code)
        if cleaned != code:
            return {"product_code": cleaned}, f"🧠 Suy luận: Làm sạch mã sản phẩm thành {cleaned}"
        
        return {}, ""