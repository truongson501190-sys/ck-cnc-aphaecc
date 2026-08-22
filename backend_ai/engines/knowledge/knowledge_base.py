"""
Knowledge Base Engine
=====================

Cung cấp các chức năng tra cứu thông tin tham chiếu:
- Danh mục khách hàng, sản phẩm, đơn vị tính, mã số thuế, v.v.
- Gợi ý sửa lỗi dựa trên mapping hoặc lịch sử.
- Lưu trữ và cập nhật các mapping từ tên OCR sang giá trị chuẩn.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
from difflib import get_close_matches

logger = logging.getLogger(__name__)


class KnowledgeBase:
    """
    Lớp quản lý tri thức: tra cứu, gợi ý, cập nhật mapping.
    Hiện tại dùng dict in-memory, có thể mở rộng với database (SQLite, PostgreSQL).
    """

    def __init__(self, data_file: Optional[str] = None):
        """
        :param data_file: Đường dẫn đến file JSON chứa dữ liệu khởi tạo.
        """
        self._customers: Dict[str, Dict] = {}           # mã khách hàng -> thông tin
        self._products: Dict[str, Dict] = {}            # mã sản phẩm -> thông tin
        self._tax_codes: set = set()                    # tập mã số thuế hợp lệ
        self._unit_mappings: Dict[str, str] = {}        # tên OCR -> đơn vị chuẩn
        self._product_mappings: Dict[str, str] = {}     # tên OCR -> mã sản phẩm chuẩn
        self._customer_mappings: Dict[str, str] = {}    # tên OCR -> mã khách hàng

        if data_file:
            self.load_from_file(data_file)

        # Mặc định thêm một số dữ liệu mẫu (có thể ghi đè)
        self._init_default_data()

    def _init_default_data(self):
        """Khởi tạo dữ liệu mẫu."""
        # Mã số thuế hợp lệ
        self._tax_codes = {"1234567890", "9876543210", "1112223334"}

        # Đơn vị tính
        self._unit_mappings = {
            "cái": "piece",
            "chiếc": "piece",
            "hộp": "box",
            "kg": "kg",
            "kilogram": "kg",
            "gram": "g",
            "lít": "liter",
            "mét": "meter",
            "bộ": "set",
        }

        # Sản phẩm mẫu
        self._products = {
            "SP001": {"name": "Máy tính xách tay", "unit": "piece", "price": 15000000},
            "SP002": {"name": "Điện thoại thông minh", "unit": "piece", "price": 8000000},
            "SP003": {"name": "Bàn phím", "unit": "piece", "price": 300000},
        }
        self._product_mappings = {
            "laptop": "SP001",
            "máy tính xách tay": "SP001",
            "smartphone": "SP002",
            "điện thoại": "SP002",
            "bàn phím": "SP003",
            "keyboard": "SP003",
        }

        # Khách hàng mẫu
        self._customers = {
            "KH001": {"name": "Công ty A", "tax_code": "1234567890"},
            "KH002": {"name": "Công ty B", "tax_code": "9876543210"},
        }
        self._customer_mappings = {
            "công ty a": "KH001",
            "cty a": "KH001",
            "công ty b": "KH002",
            "cty b": "KH002",
        }

    def load_from_file(self, file_path: str):
        """Tải dữ liệu từ file JSON."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._customers = data.get("customers", {})
            self._products = data.get("products", {})
            self._tax_codes = set(data.get("tax_codes", []))
            self._unit_mappings = data.get("unit_mappings", {})
            self._product_mappings = data.get("product_mappings", {})
            self._customer_mappings = data.get("customer_mappings", {})
            logger.info("Loaded knowledge base from %s", file_path)
        except Exception as e:
            logger.warning("Failed to load knowledge base: %s", e)

    def save_to_file(self, file_path: str):
        """Lưu dữ liệu ra file JSON."""
        try:
            data = {
                "customers": self._customers,
                "products": self._products,
                "tax_codes": list(self._tax_codes),
                "unit_mappings": self._unit_mappings,
                "product_mappings": self._product_mappings,
                "customer_mappings": self._customer_mappings,
            }
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info("Saved knowledge base to %s", file_path)
        except Exception as e:
            logger.error("Failed to save knowledge base: %s", e)

    # -------------------- Tra cứu --------------------
    def lookup_tax_code(self, tax_code: str) -> Optional[Dict]:
        """Tra cứu thông tin khách hàng qua mã số thuế."""
        for cust_id, info in self._customers.items():
            if info.get("tax_code") == tax_code:
                return {"id": cust_id, **info}
        return None

    def lookup_product(self, product_code: str) -> Optional[Dict]:
        """Tra cứu thông tin sản phẩm qua mã."""
        return self._products.get(product_code)

    def lookup_customer(self, customer_id: str) -> Optional[Dict]:
        """Tra cứu thông tin khách hàng qua mã."""
        return self._customers.get(customer_id)

    # -------------------- Gợi ý / ánh xạ --------------------
    def suggest_product_code(self, name: str) -> Tuple[Optional[str], float]:
        """
        Gợi ý mã sản phẩm từ tên OCR.
        Trả về (mã_sản_phẩm, độ_tin_cậy) trong đó độ tin cậy từ 0-1.
        """
        if not name:
            return None, 0.0

        name_lower = name.strip().lower()

        # 1. Tìm chính xác trong mapping
        if name_lower in self._product_mappings:
            return self._product_mappings[name_lower], 1.0

        # 2. Tìm gần đúng (fuzzy)
        all_keys = list(self._product_mappings.keys())
        matches = get_close_matches(name_lower, all_keys, n=1, cutoff=0.6)
        if matches:
            best = matches[0]
            return self._product_mappings[best], 0.8  # tin cậy thấp hơn

        # 3. Duyệt qua danh sách sản phẩm và so khớp từ khoá
        for code, info in self._products.items():
            if name_lower in info.get("name", "").lower():
                return code, 0.7

        return None, 0.0

    def suggest_customer_id(self, name: str) -> Tuple[Optional[str], float]:
        """Gợi ý mã khách hàng từ tên OCR."""
        if not name:
            return None, 0.0

        name_lower = name.strip().lower()

        if name_lower in self._customer_mappings:
            return self._customer_mappings[name_lower], 1.0

        all_keys = list(self._customer_mappings.keys())
        matches = get_close_matches(name_lower, all_keys, n=1, cutoff=0.6)
        if matches:
            best = matches[0]
            return self._customer_mappings[best], 0.8

        # Tìm trong thông tin khách hàng
        for code, info in self._customers.items():
            if name_lower in info.get("name", "").lower():
                return code, 0.7

        return None, 0.0

    def normalize_unit(self, unit_text: str) -> str:
        """Chuẩn hoá đơn vị tính."""
        if not unit_text:
            return ""
        unit_lower = unit_text.strip().lower()
        return self._unit_mappings.get(unit_lower, unit_text)

    # -------------------- Cập nhật / học --------------------
    def add_product_mapping(self, ocr_name: str, product_code: str):
        """Thêm mapping từ tên OCR sang mã sản phẩm."""
        self._product_mappings[ocr_name.strip().lower()] = product_code

    def add_customer_mapping(self, ocr_name: str, customer_id: str):
        """Thêm mapping từ tên OCR sang mã khách hàng."""
        self._customer_mappings[ocr_name.strip().lower()] = customer_id

    def add_unit_mapping(self, ocr_unit: str, standard_unit: str):
        """Thêm mapping đơn vị tính."""
        self._unit_mappings[ocr_unit.strip().lower()] = standard_unit

    def add_tax_code(self, tax_code: str):
        """Thêm mã số thuế hợp lệ."""
        self._tax_codes.add(tax_code.strip())

    # -------------------- Ứng dụng trong pipeline --------------------
    def apply(self, fields: Dict[str, Any], reasoning: str = "") -> Tuple[Dict[str, Any], str]:
        """
        Áp dụng tri thức để làm giàu / sửa chữa các trường.
        Trả về (fields_updated, log_message)
        """
        updated_fields = dict(fields)
        logs = []

        # 1. Nếu có customer_name, gợi ý mã khách hàng
        if "customer_name" in updated_fields:
            cust_name = updated_fields.get("customer_name")
            if cust_name:
                suggested_id, confidence = self.suggest_customer_id(cust_name)
                if suggested_id:
                    updated_fields["customer_id"] = suggested_id
                    updated_fields["customer_id_confidence"] = confidence
                    logs.append(f"Gợi ý khách hàng: {suggested_id} (độ tin cậy {confidence:.2f})")
                else:
                    logs.append(f"Không gợi ý được khách hàng cho '{cust_name}'")
            else:
                logs.append("Thiếu customer_name")

        # 2. Nếu có product_name, gợi ý mã sản phẩm và đơn vị
        if "product_name" in updated_fields:
            prod_name = updated_fields.get("product_name")
            if prod_name:
                suggested_code, confidence = self.suggest_product_code(prod_name)
                if suggested_code:
                    updated_fields["product_code"] = suggested_code
                    updated_fields["product_code_confidence"] = confidence
                    logs.append(f"Gợi ý sản phẩm: {suggested_code} (độ tin cậy {confidence:.2f})")
                    # Tra cứu thêm thông tin sản phẩm
                    prod_info = self.lookup_product(suggested_code)
                    if prod_info:
                        updated_fields["product_unit"] = prod_info.get("unit", "")
                        updated_fields["product_price"] = prod_info.get("price", 0)
                else:
                    logs.append(f"Không gợi ý được sản phẩm cho '{prod_name}'")

        # 3. Chuẩn hoá đơn vị tính nếu có
        if "unit" in updated_fields:
            unit = updated_fields.get("unit")
            if unit:
                normalized = self.normalize_unit(unit)
                if normalized != unit:
                    updated_fields["unit"] = normalized
                    logs.append(f"Chuẩn hoá đơn vị: '{unit}' -> '{normalized}'")

        # 4. Kiểm tra mã số thuế (nếu có)
        if "tax_code" in updated_fields:
            tax = updated_fields.get("tax_code")
            if tax and tax in self._tax_codes:
                logs.append(f"Mã số thuế {tax} hợp lệ")
            elif tax:
                logs.append(f"Mã số thuế {tax} không có trong danh sách hợp lệ (có thể không đúng)")

        # 5. Gợi ý bổ sung dựa trên tổng hợp (có thể mở rộng)
        # Ví dụ: nếu có số tiền, có thể gợi ý thuế suất, v.v.

        log_msg = "\n".join(logs) if logs else "Knowledge base không có đề xuất nào"
        return updated_fields, log_msg

    # -------------------- Query khác --------------------
    def get_all_products(self) -> Dict[str, Dict]:
        return self._products

    def get_all_customers(self) -> Dict[str, Dict]:
        return self._customers

    def get_tax_codes(self) -> set:
        return self._tax_codes