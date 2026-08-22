"""
Validator Engine
================

Kiểm tra tính hợp lệ của các trường đã trích xuất dựa trên các quy tắc nghiệp vụ.

Hỗ trợ:
- Required fields
- Regex pattern matching
- Giá trị trong danh sách cho phép
- Kiểu dữ liệu (int, float, date, ...)
- Quan hệ giữa các trường (cross-field)
- Logic tuỳ chỉnh qua hàm callback
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable, Union, Tuple

logger = logging.getLogger(__name__)


class ValidationRule:
    """
    Một quy tắc kiểm tra duy nhất.
    """

    def __init__(
        self,
        field: Optional[str] = None,
        rule_type: str = "required",
        params: Optional[Dict[str, Any]] = None,
        message: Optional[str] = None,
        callback: Optional[Callable[[Dict[str, Any]], Tuple[bool, str]]] = None,
        fields: Optional[List[str]] = None,  # cho cross-field
    ):
        """
        :param field: Tên trường cần kiểm tra (nếu là rule đơn trường)
        :param rule_type: Loại rule: required, regex, in_list, type, min, max, cross, custom
        :param params: Tham số cho rule (ví dụ: pattern cho regex, allowed list, v.v.)
        :param message: Thông báo lỗi tuỳ chỉnh
        :param callback: Hàm tuỳ chỉnh cho cross-field hoặc custom
        :param fields: Danh sách các trường liên quan (cho cross-field)
        """
        self.field = field
        self.rule_type = rule_type
        self.params = params or {}
        self.message = message or self._default_message()
        self.callback = callback
        self.fields = fields or []

    def _default_message(self) -> str:
        if self.rule_type == "required":
            return f"Trường '{self.field}' là bắt buộc"
        elif self.rule_type == "regex":
            return f"Trường '{self.field}' không đúng định dạng"
        elif self.rule_type == "in_list":
            return f"Trường '{self.field}' có giá trị không hợp lệ"
        elif self.rule_type == "type":
            return f"Trường '{self.field}' không đúng kiểu dữ liệu"
        elif self.rule_type == "min":
            return f"Trường '{self.field}' nhỏ hơn giá trị tối thiểu"
        elif self.rule_type == "max":
            return f"Trường '{self.field}' lớn hơn giá trị tối đa"
        elif self.rule_type == "cross":
            return "Kiểm tra quan hệ giữa các trường thất bại"
        else:
            return "Lỗi validation"

    def validate(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Thực hiện kiểm tra trên dict data.
        Trả về (True, "") nếu hợp lệ, ngược lại (False, error_message).
        """
        if self.rule_type == "custom" and self.callback:
            return self.callback(data)

        if self.rule_type == "cross":
            if self.callback:
                return self.callback(data)
            # Nếu không có callback, dùng logic cơ bản: kiểm tra các field có tồn tại và không rỗng
            for f in self.fields:
                if f not in data or not data[f]:
                    return False, f"Trường '{f}' bị thiếu hoặc rỗng"
            return True, ""

        # Các rule đơn trường
        if self.field is None:
            return False, "Rule thiếu tên trường"

        value = data.get(self.field)

        if self.rule_type == "required":
            if value is None or (isinstance(value, str) and not value.strip()):
                return False, self.message
            return True, ""

        # Nếu trường không có giá trị và không phải required -> bỏ qua các rule khác
        if value is None or (isinstance(value, str) and not value.strip()):
            return True, ""

        if self.rule_type == "regex":
            pattern = self.params.get("pattern", "")
            if not re.match(pattern, str(value)):
                return False, self.message
            return True, ""

        if self.rule_type == "in_list":
            allowed = self.params.get("allowed", [])
            if value not in allowed:
                return False, self.message
            return True, ""

        if self.rule_type == "type":
            expected = self.params.get("type", "str")
            if expected == "int":
                try:
                    int(value)
                except (ValueError, TypeError):
                    return False, self.message
            elif expected == "float":
                try:
                    float(value)
                except (ValueError, TypeError):
                    return False, self.message
            elif expected == "date":
                try:
                    datetime.strptime(str(value), "%Y-%m-%d")
                except ValueError:
                    return False, self.message
            # có thể thêm các kiểu khác
            return True, ""

        if self.rule_type == "min":
            min_val = self.params.get("value")
            if min_val is None:
                return True, ""
            try:
                if float(value) < min_val:
                    return False, self.message
            except (ValueError, TypeError):
                return False, self.message
            return True, ""

        if self.rule_type == "max":
            max_val = self.params.get("value")
            if max_val is None:
                return True, ""
            try:
                if float(value) > max_val:
                    return False, self.message
            except (ValueError, TypeError):
                return False, self.message
            return True, ""

        # Mặc định coi là hợp lệ
        return True, ""


class Validator:
    """
    Lớp quản lý các quy tắc validation và thực hiện kiểm tra.
    """

    def __init__(self, rules: Optional[List[ValidationRule]] = None):
        self.rules: List[ValidationRule] = rules or []
        self._load_default_rules()

    def _load_default_rules(self):
        """
        Tải các quy tắc mặc định (có thể ghi đè bằng config sau).
        """
        # Ví dụ một số rule cơ bản – bạn có thể mở rộng hoặc tải từ file config
        # Ví dụ: yêu cầu các trường cơ bản cho hoá đơn
        default_rules = [
            ValidationRule(field="invoice_number", rule_type="required", message="Số hoá đơn bắt buộc"),
            ValidationRule(field="invoice_date", rule_type="required", message="Ngày hoá đơn bắt buộc"),
            ValidationRule(field="tax_code", rule_type="regex", params={"pattern": r"^\d{10}$|^\d{13}$"}, 
                           message="Mã số thuế phải có 10 hoặc 13 chữ số"),
            ValidationRule(field="total_amount", rule_type="type", params={"type": "float"}, 
                           message="Tổng tiền phải là số"),
            ValidationRule(field="total_amount", rule_type="min", params={"value": 0}, 
                           message="Tổng tiền phải >= 0"),
            # Cross-field: tổng tiền bằng tổng các dòng (nếu có line_items)
            ValidationRule(
                rule_type="cross",
                fields=["total_amount", "line_items"],
                callback=self._validate_total_amount,
                message="Tổng tiền không khớp với tổng các dòng"
            ),
        ]
        # Chỉ thêm nếu chưa có rule nào (hoặc có thể merge)
        if not self.rules:
            self.rules.extend(default_rules)

    @staticmethod
    def _validate_total_amount(data: Dict[str, Any]) -> Tuple[bool, str]:
        """Kiểm tra tổng tiền khớp với tổng line items."""
        total = data.get("total_amount")
        line_items = data.get("line_items")
        if total is None or line_items is None:
            return True, ""  # bỏ qua nếu thiếu dữ liệu
        try:
            total = float(total)
            sum_lines = sum(
                float(item.get("amount", 0)) 
                for item in line_items if isinstance(item, dict)
            )
            if abs(total - sum_lines) > 0.01:  # sai số nhỏ
                return False, f"Tổng tiền ({total}) không khớp với tổng các dòng ({sum_lines})"
        except Exception:
            return False, "Lỗi tính toán tổng tiền"
        return True, ""

    def add_rule(self, rule: ValidationRule):
        """Thêm một quy tắc mới."""
        self.rules.append(rule)

    def remove_rule(self, field: str, rule_type: str) -> bool:
        """Xoá quy tắc theo field và rule_type."""
        original_len = len(self.rules)
        self.rules = [r for r in self.rules if not (r.field == field and r.rule_type == rule_type)]
        return len(self.rules) < original_len

    def clear_rules(self):
        """Xoá tất cả quy tắc."""
        self.rules = []

    def check(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Kiểm tra tất cả các quy tắc trên data.
        Trả về (True, "") nếu tất cả đều đúng;
        nếu có lỗi, trả về (False, "Lý do lỗi đầu tiên").
        """
        if not self.rules:
            return True, ""

        for rule in self.rules:
            ok, msg = rule.validate(data)
            if not ok:
                logger.warning("Validation failed: %s", msg)
                return False, msg

        return True, ""

    def check_all(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Kiểm tra tất cả và trả về chi tiết từng rule.
        Trả về dict: { "valid": bool, "errors": List[str] }
        """
        errors = []
        for rule in self.rules:
            ok, msg = rule.validate(data)
            if not ok:
                errors.append(msg)
        return {
            "valid": len(errors) == 0,
            "errors": errors,
        }