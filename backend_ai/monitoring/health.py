"""
Health Check
============

Các endpoint kiểm tra sức khoẻ của hệ thống và các thành phần.
"""

from typing import Dict, Any, List
import time


class HealthChecker:
    """Kiểm tra sức khoẻ của các thành phần."""

    def __init__(self, gateway):
        self.gateway = gateway
        self._checks: Dict[str, callable] = {}
        self._register_default_checks()

    def _register_default_checks(self):
        """Đăng ký các kiểm tra mặc định."""
        self.register("gateway", self._check_gateway)
        self.register("ocr", self._check_ocr)
        self.register("memory", self._check_memory)
        self.register("knowledge", self._check_knowledge)
        self.register("llm", self._check_llm)

    def register(self, name: str, check_func: callable):
        """Đăng ký một kiểm tra."""
        self._checks[name] = check_func

    def _check_gateway(self) -> Dict:
        return {"status": "ok", "message": "Gateway is running"}

    def _check_ocr(self) -> Dict:
        if hasattr(self.gateway, "ocr"):
            engines = list(self.gateway.ocr.engines.keys())
            return {
                "status": "ok" if engines else "degraded",
                "available_engines": [e.value for e in engines] if engines else [],
                "message": f"{len(engines)} OCR engines available" if engines else "No OCR engines"
            }
        return {"status": "unavailable", "message": "OCR not configured"}

    def _check_memory(self) -> Dict:
        if hasattr(self.gateway, "memory"):
            return {"status": "ok", "message": "Memory store available"}
        return {"status": "unavailable", "message": "Memory not configured"}

    def _check_knowledge(self) -> Dict:
        if hasattr(self.gateway, "knowledge"):
            customers = len(self.gateway.knowledge.get_all_customers())
            products = len(self.gateway.knowledge.get_all_products())
            return {
                "status": "ok",
                "customers": customers,
                "products": products,
                "message": f"Knowledge base: {customers} customers, {products} products"
            }
        return {"status": "unavailable", "message": "Knowledge not configured"}

    def _check_llm(self) -> Dict:
        if hasattr(self.gateway, "_enable_llm") and self.gateway._enable_llm:
            llm = self.gateway.llm
            if llm and llm.is_available():
                return {"status": "ok", "message": "LLM available"}
            return {"status": "degraded", "message": "LLM loaded but not available"}
        return {"status": "disabled", "message": "LLM disabled"}

    def check_all(self) -> Dict[str, Any]:
        """Chạy tất cả kiểm tra."""
        results = {}
        for name, check in self._checks.items():
            try:
                results[name] = check()
            except Exception as e:
                results[name] = {"status": "error", "error": str(e)}
        return results

    def is_healthy(self) -> bool:
        """Kiểm tra xem hệ thống có healthy không."""
        results = self.check_all()
        # Tất cả phải ok hoặc degraded (không error)
        return all(r.get("status") not in ["error", "unavailable"] for r in results.values())