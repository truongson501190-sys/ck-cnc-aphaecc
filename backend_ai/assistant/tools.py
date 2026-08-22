"""
Assistant Tools
===============

Các công cụ (hàm) mà assistant có thể gọi để thực hiện tác vụ cụ thể.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Callable

logger = logging.getLogger(__name__)


class AssistantTools:
    """
    Tập hợp các công cụ dành cho assistant.
    Mỗi công cụ là một hàm nhận tham số và trả về kết quả dạng dict.
    """

    def __init__(self, gateway=None, knowledge=None, memory=None, validator=None):
        self.gateway = gateway
        self.knowledge = knowledge
        self.memory = memory
        self.validator = validator

        # Đăng ký các công cụ
        self._tools: Dict[str, Callable] = {
            "get_document_status": self.get_document_status,
            "explain_document": self.explain_document,
            "suggest_corrections": self.suggest_corrections,
            "lookup_customer": self.lookup_customer,
            "lookup_product": self.lookup_product,
            "search_documents": self.search_documents,
            "get_statistics": self.get_statistics,
            "validate_fields": self.validate_fields,
        }

    def get_tool(self, name: str) -> Optional[Callable]:
        """Lấy công cụ theo tên."""
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """Danh sách tên các công cụ."""
        return list(self._tools.keys())

    def call_tool(self, name: str, **kwargs) -> Dict[str, Any]:
        """Gọi công cụ với tham số."""
        tool = self._tools.get(name)
        if tool is None:
            return {"error": f"Tool '{name}' not found"}
        try:
            result = tool(**kwargs)
            return {"success": True, "result": result}
        except Exception as e:
            logger.exception("Tool %s failed: %s", name, e)
            return {"success": False, "error": str(e)}

    # ----------------------------------------------------------------
    # Các công cụ cụ thể
    # ----------------------------------------------------------------

    def get_document_status(self, document_id: str) -> Dict[str, Any]:
        """
        Lấy trạng thái xử lý của một tài liệu.
        """
        if self.memory is None:
            return {"error": "Memory không khả dụng"}
        data = self.memory.retrieve(document_id)
        if data is None:
            return {"error": f"Không tìm thấy tài liệu {document_id}"}
        return {
            "document_id": document_id,
            "status": data.get("status", "unknown"),
            "confidence": data.get("confidence", 0.0),
            "needs_review": data.get("needs_review", True),
            "processed_at": data.get("timestamp"),
        }

    def explain_document(self, document_id: str) -> Dict[str, Any]:
        """
        Lấy giải thích chi tiết về kết quả xử lý tài liệu.
        """
        if self.memory is None:
            return {"error": "Memory không khả dụng"}
        data = self.memory.retrieve(document_id)
        if data is None:
            return {"error": f"Không tìm thấy tài liệu {document_id}"}
        # Lấy thêm thông tin từ các nguồn khác nếu cần
        return {
            "document_id": document_id,
            "raw_text": data.get("text", ""),
            "fields": data.get("fields", {}),
            "confidence": data.get("confidence", 0.0),
            "reasoning": data.get("reasoning", ""),
            "needs_review": data.get("needs_review", True),
            "ocr_engine": data.get("ocr_engine", ""),
            "llm_used": data.get("llm_used", False),
        }

    def suggest_corrections(self, document_id: str) -> Dict[str, Any]:
        """
        Đề xuất sửa lỗi cho các trường dữ liệu dựa trên validation.
        """
        if self.memory is None:
            return {"error": "Memory không khả dụng"}
        data = self.memory.retrieve(document_id)
        if data is None:
            return {"error": f"Không tìm thấy tài liệu {document_id}"}

        fields = data.get("fields", {})
        if self.validator is None:
            return {"suggestions": [], "message": "Validator không khả dụng"}

        # Kiểm tra từng field và gợi ý
        suggestions = []
        for field, value in fields.items():
            # Kiểm tra rule của field này
            # (Giả định validator có method get_rules_for_field)
            try:
                ok, msg = self.validator.check_field(field, value)
                if not ok:
                    suggestions.append({
                        "field": field,
                        "current_value": value,
                        "issue": msg,
                        "suggestion": f"Kiểm tra lại giá trị '{field}'"
                    })
            except Exception:
                pass

        # Nếu có knowledge base, có thể gợi ý dựa trên mappings
        if self.knowledge is not None:
            if "customer_name" in fields:
                cust_name = fields["customer_name"]
                suggested, conf = self.knowledge.suggest_customer_id(cust_name)
                if suggested and conf < 1.0:
                    suggestions.append({
                        "field": "customer_id",
                        "current_value": fields.get("customer_id", ""),
                        "suggestion": f"Có thể khách hàng là '{suggested}'",
                        "confidence": conf
                    })

        return {
            "document_id": document_id,
            "suggestions": suggestions,
            "total_issues": len(suggestions)
        }

    def lookup_customer(self, name: str = None, tax_code: str = None) -> Dict[str, Any]:
        """
        Tra cứu thông tin khách hàng theo tên hoặc mã số thuế.
        """
        if self.knowledge is None:
            return {"error": "Knowledge Base không khả dụng"}
        if name:
            # Tìm gần đúng
            suggested_id, conf = self.knowledge.suggest_customer_id(name)
            if suggested_id:
                info = self.knowledge.lookup_customer(suggested_id)
                if info:
                    return {"customer": {"id": suggested_id, **info}, "confidence": conf}
        if tax_code:
            info = self.knowledge.lookup_tax_code(tax_code)
            if info:
                return {"customer": info, "confidence": 1.0}
        return {"error": "Không tìm thấy khách hàng"}

    def lookup_product(self, name: str = None, code: str = None) -> Dict[str, Any]:
        """
        Tra cứu thông tin sản phẩm theo tên hoặc mã.
        """
        if self.knowledge is None:
            return {"error": "Knowledge Base không khả dụng"}
        if name:
            suggested_code, conf = self.knowledge.suggest_product_code(name)
            if suggested_code:
                info = self.knowledge.lookup_product(suggested_code)
                if info:
                    return {"product": {"code": suggested_code, **info}, "confidence": conf}
        if code:
            info = self.knowledge.lookup_product(code)
            if info:
                return {"product": {"code": code, **info}, "confidence": 1.0}
        return {"error": "Không tìm thấy sản phẩm"}

    def search_documents(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """
        Tìm kiếm tài liệu theo từ khoá (trong text hoặc fields).
        """
        if self.memory is None:
            return {"error": "Memory không khả dụng"}
        # Giả định memory có method search
        results = self.memory.search(query, limit=limit)
        return {
            "query": query,
            "count": len(results),
            "results": results
        }

    def get_statistics(self) -> Dict[str, Any]:
        """
        Lấy thống kê tổng quan về hệ thống.
        """
        if self.memory is None:
            return {"error": "Memory không khả dụng"}
        stats = self.memory.get_stats()
        return {
            "total_documents": stats.get("total", 0),
            "processed": stats.get("processed", 0),
            "needs_review": stats.get("needs_review", 0),
            "average_confidence": stats.get("avg_confidence", 0.0),
        }

    def validate_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        Kiểm tra tính hợp lệ của các trường (không cần document_id).
        """
        if self.validator is None:
            return {"error": "Validator không khả dụng"}
        is_valid, message = self.validator.check(fields)
        return {
            "valid": is_valid,
            "message": message if not is_valid else "Tất cả trường đều hợp lệ"
        }