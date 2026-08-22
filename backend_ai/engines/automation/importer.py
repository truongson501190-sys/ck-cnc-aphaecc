# backend_ai/engines/automation/importer.py

import json
import logging
import sqlite3
from typing import Dict, Any, Optional
from datetime import datetime

from config.settings import settings
from engines.analytics.analyzer import AnalyticsEngine

logger = logging.getLogger(__name__)

class ERPImporter:
    """
    Automation Engine - Tự động nhập dữ liệu vào ERP
    """
    
    def __init__(self):
        # Trong thực tế, kết nối đến database ERP
        self.erp_conn = None  # sẽ kết nối sau
        self.import_log = []
        self.analytics = AnalyticsEngine()
        self.db_path = settings.sqlite_path
        self._init_audit_db()

    def _init_audit_db(self):
        """Khởi tạo bảng local audit cho ERP import."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                '''
                CREATE TABLE IF NOT EXISTS erp_imports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT,
                    import_id TEXT,
                    machine TEXT,
                    quantity REAL,
                    date TEXT,
                    worker TEXT,
                    status TEXT,
                    created_at TIMESTAMP
                )
                '''
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"⚠️ ERP audit init error: {e}")

    def _persist_import_audit(self, doc_id: str, import_id: str, data: Dict[str, Any]):
        """Lưu audit import vào SQLite local để có history lâu dài."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO erp_imports (doc_id, import_id, machine, quantity, date, worker, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    doc_id,
                    import_id,
                    data.get("machine"),
                    data.get("quantity"),
                    data.get("date"),
                    data.get("worker"),
                    "success",
                    datetime.now().isoformat(),
                )
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"⚠️ ERP audit persist error: {e}")
    
    def import_document(self, fields: Dict[str, Any], doc_id: str) -> Dict[str, Any]:
        """
        Tự động nhập vào ERP
        """
        logger.info(f"🚀 Importing document {doc_id} to ERP")
        
        try:
            # 1. Kiểm tra dữ liệu bắt buộc
            required = ["machine_code", "quantity", "date"]
            missing = [f for f in required if f not in fields]
            
            if missing:
                return {
                    "success": False,
                    "reason": f"Thiếu dữ liệu bắt buộc: {missing}"
                }
            
            # 2. Chuẩn bị dữ liệu nhập
            import_data = self._prepare_import_data(fields)
            
            # 3. Import vào ERP (giả lập)
            import_result = self._import_to_erp(import_data)
            
            # 4. Ghi log
            self.import_log.append({
                "doc_id": doc_id,
                "fields": fields,
                "result": import_result,
                "timestamp": datetime.now().isoformat()
            })

            import_id = f"IMP_{doc_id}"
            self._persist_import_audit(doc_id, import_id, import_data)

            self.analytics.log_event(
                "erp_import_automation",
                {
                    "doc_id": doc_id,
                    "fields": fields,
                    "import_result": import_result,
                    "scan_id": doc_id,
                },
            )
            
            return {
                "success": True,
                "import_id": f"IMP_{doc_id}",
                "data": import_data
            }
            
        except Exception as e:
            logger.error(f"❌ Import error: {e}")
            return {"success": False, "reason": str(e)}
    
    def _prepare_import_data(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Chuẩn bị dữ liệu cho import"""
        # Chuyển đổi format
        import_data = {
            "machine": fields.get("machine_code"),
            "quantity": float(fields.get("quantity", 0)),
            "date": fields.get("date"),
            "product": fields.get("product_code", "UNKNOWN"),
            "shift": fields.get("shift", "1"),
            "worker": fields.get("worker_name", "UNKNOWN"),
            "notes": fields.get("notes", ""),
        }
        return import_data
    
    def _import_to_erp(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Thực hiện import vào ERP (giả lập)"""
        # TODO: Kết nối thực tế đến database ERP
        
        # Giả lập import thành công
        return {
            "status": "success",
            "erp_id": f"ERP_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "message": "Import thành công"
        }
    
    def get_import_history(self, limit: int = 10) -> list:
        """Lấy lịch sử import"""
        return self.import_log[-limit:]