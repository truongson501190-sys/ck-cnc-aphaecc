# backend_ai/engines/analytics/analyzer.py

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import Counter, defaultdict
import logging

from config.settings import settings

logger = logging.getLogger(__name__)

class AnalyticsEngine:
    """
    Analytics Engine - Phân tích dữ liệu
    """
    
    def __init__(self):
        self.db_path = settings.sqlite_path
        self.stats = defaultdict(int)
        self.cache = {}
    
    def log_event(self, event_type: str, data: Dict[str, Any]):
        """Ghi log sự kiện"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    data TEXT,
                    created_at TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                INSERT INTO analytics_events (event_type, data, created_at)
                VALUES (?, ?, ?)
            ''', (
                event_type,
                json.dumps(data),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            # Cập nhật thống kê trong bộ nhớ
            self.stats[event_type] += 1
            
        except Exception as e:
            logger.error(f"❌ Analytics log error: {e}")
    
    def get_stats(self, period_days: int = 7) -> Dict[str, Any]:
        """
        Lấy thống kê trong khoảng thời gian
        """
        start_date = (datetime.now() - timedelta(days=period_days)).isoformat()
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tổng số events
            cursor.execute('''
                SELECT COUNT(*) FROM analytics_events 
                WHERE created_at >= ?
            ''', (start_date,))
            total_events = cursor.fetchone()[0]
            
            # Events theo loại
            cursor.execute('''
                SELECT event_type, COUNT(*) FROM analytics_events 
                WHERE created_at >= ?
                GROUP BY event_type
            ''', (start_date,))
            events_by_type = dict(cursor.fetchall())
            
            # Trung bình confidence
            cursor.execute('''
                SELECT AVG(CAST(json_extract(data, '$.confidence') AS REAL))
                FROM analytics_events 
                WHERE event_type = 'document_processed' AND created_at >= ?
            ''', (start_date,))
            avg_confidence = cursor.fetchone()[0] or 0.0
            
            conn.close()
            
            return {
                "period_days": period_days,
                "total_events": total_events,
                "events_by_type": events_by_type,
                "avg_confidence": avg_confidence,
                "top_events": sorted(events_by_type.items(), key=lambda x: x[1], reverse=True)[:5]
            }
            
        except Exception as e:
            logger.error(f"❌ Analytics stats error: {e}")
            return {"error": str(e)}
    
    def get_daily_stats(self, days: int = 7) -> List[Dict[str, Any]]:
        """Thống kê theo ngày"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM analytics_events 
                WHERE created_at >= DATE('now', ?)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            ''', (f'-{days} days',))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [{"date": row[0], "count": row[1]} for row in rows]
            
        except Exception as e:
            logger.error(f"❌ Daily stats error: {e}")
            return []
    
    def get_import_status(self, scan_id: str) -> Dict[str, Any]:
        """Lấy trạng thái import ERP theo scan_id nếu có event tương ứng."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                '''
                SELECT event_type, data, created_at
                FROM analytics_events
                WHERE (
                    json_extract(data, '$.scan_id') = ? OR
                    json_extract(data, '$.doc_id') = ?
                )
                AND event_type IN ('erp_imported', 'erp_import_automation')
                ORDER BY created_at DESC
                LIMIT 1
                ''',
                (scan_id, scan_id),
            )
            row = cursor.fetchone()
            conn.close()

            if row is None:
                return {"imported": False, "status": "not_found"}

            return {
                "imported": True,
                "event_type": row[0],
                "data": json.loads(row[1]) if row[1] else {},
                "created_at": row[2],
            }
        except Exception as e:
            logger.error(f"❌ Import status lookup error: {e}")
            return {"imported": False, "status": "error", "error": str(e)}

    def get_recent_imports(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy lịch sử import ERP gần nhất từ analytics_events."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                '''
                SELECT event_type, data, created_at
                FROM analytics_events
                WHERE event_type IN ('erp_imported', 'erp_import_automation')
                ORDER BY created_at DESC
                LIMIT ?
                ''',
                (limit,),
            )
            rows = cursor.fetchall()
            conn.close()

            results = []
            for row in rows:
                payload = json.loads(row[1]) if row[1] else {}
                results.append({
                    "event_type": row[0],
                    "scan_id": payload.get("scan_id") or payload.get("doc_id"),
                    "import_data": payload.get("import_data") or payload.get("import_result") or {},
                    "created_at": row[2],
                })
            return results
        except Exception as e:
            logger.error(f"❌ Recent imports lookup error: {e}")
            return []

    def get_most_common_machines(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Thống kê máy được sử dụng nhiều nhất"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT json_extract(data, '$.fields.machine_code') as machine, COUNT(*) as count
                FROM analytics_events 
                WHERE event_type = 'document_processed'
                AND json_extract(data, '$.fields.machine_code') IS NOT NULL
                GROUP BY machine
                ORDER BY count DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [{"machine": row[0], "count": row[1]} for row in rows if row[0]]
            
        except Exception as e:
            logger.error(f"❌ Machine stats error: {e}")
            return []