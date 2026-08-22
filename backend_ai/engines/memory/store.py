# backend_ai/engines/memory/store.py

import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from config.settings import settings

class MemoryStore:
    """
    Memory Engine - Lưu trữ ngắn hạn và dài hạn
    Sử dụng SQLite cho dữ liệu có cấu trúc
    """
    
    def __init__(self):
        self.db_path = settings.sqlite_path
        self._init_db()
    
    def _init_db(self):
        """Khởi tạo database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Bảng documents
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT,
                text TEXT,
                fields TEXT,
                confidence REAL,
                reasoning TEXT,
                user_id TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                corrected_fields TEXT
            )
        ''')
        
        # Bảng corrections
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT,
                original_fields TEXT,
                corrected_fields TEXT,
                user_id TEXT,
                created_at TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store(self, doc_id: str, data: Dict[str, Any]) -> bool:
        """Lưu document"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO documents 
                (id, filename, text, fields, confidence, reasoning, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                doc_id,
                data.get('filename', ''),
                data.get('text', ''),
                json.dumps(data.get('fields', {}), ensure_ascii=False),
                data.get('confidence', 0.0),
                data.get('reasoning', ''),
                data.get('user_id', 'system'),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"❌ Memory store error: {e}")
            return False
    
    def update(self, doc_id: str, data: Dict[str, Any]) -> bool:
        """Cập nhật document"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Lấy document hiện tại
            cursor.execute('SELECT fields, corrected_fields FROM documents WHERE id = ?', (doc_id,))
            row = cursor.fetchone()
            
            if row:
                fields = json.loads(row[0]) if row[0] else {}
                corrected = json.loads(row[1]) if row[1] else {}
                
                # Gộp dữ liệu mới
                if 'corrected_fields' in data:
                    corrected.update(data['corrected_fields'])
                    data['corrected_fields'] = json.dumps(corrected)
                
                # Cập nhật
                cursor.execute('''
                    UPDATE documents 
                    SET fields = ?, corrected_fields = ?, updated_at = ?
                    WHERE id = ?
                ''', (
                    json.dumps(fields, ensure_ascii=False),
                    data.get('corrected_fields', json.dumps(corrected)),
                    datetime.now().isoformat(),
                    doc_id
                ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"❌ Memory update error: {e}")
            return False
    
    def get(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Lấy document theo ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    "id": row[0],
                    "filename": row[1],
                    "text": row[2],
                    "fields": json.loads(row[3]) if row[3] else {},
                    "confidence": row[4],
                    "reasoning": row[5],
                    "user_id": row[6],
                    "created_at": row[7],
                    "updated_at": row[8],
                    "corrected_fields": json.loads(row[9]) if row[9] else {}
                }
            
            conn.close()
            return None
        except Exception as e:
            print(f"❌ Memory get error: {e}")
            return None
    
    def get_all(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Lấy danh sách documents"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?', (limit,))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "id": row[0],
                    "filename": row[1],
                    "text": row[2],
                    "fields": json.loads(row[3]) if row[3] else {},
                    "confidence": row[4],
                    "reasoning": row[5],
                    "user_id": row[6],
                    "created_at": row[7],
                    "updated_at": row[8],
                    "corrected_fields": json.loads(row[9]) if row[9] else {}
                })
            
            conn.close()
            return results
        except Exception as e:
            print(f"❌ Memory get_all error: {e}")
            return []

    def get_learning_patterns(self, field_name: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy các pattern đã học từ correction theo field_name."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if field_name:
                cursor.execute(
                    """
                    SELECT field_name, correct_value, COUNT(*) AS hit_count
                    FROM corrections
                    WHERE field_name = ?
                    GROUP BY field_name, correct_value
                    ORDER BY hit_count DESC
                    LIMIT ?
                    """,
                    (field_name, limit)
                )
            else:
                cursor.execute(
                    """
                    SELECT field_name, correct_value, COUNT(*) AS hit_count
                    FROM corrections
                    GROUP BY field_name, correct_value
                    ORDER BY hit_count DESC
                    LIMIT ?
                    """,
                    (limit,)
                )

            rows = cursor.fetchall()
            conn.close()

            return [
                {
                    "field_name": row[0],
                    "correct_value": row[1],
                    "hit_count": row[2],
                }
                for row in rows
            ]
        except Exception as e:
            print(f"❌ Memory learning patterns error: {e}")
            return []

    def get_field_confidence_boost(self, field_name: str, observed_value: Any) -> float:
        """Ước tính boost confidence dựa trên history correction của field cùng giá trị."""
        try:
            patterns = self.get_learning_patterns(field_name=field_name)
            if not patterns:
                return 0.0

            for pattern in patterns:
                if str(pattern.get("correct_value")) == str(observed_value):
                    return min(0.04 * float(pattern.get("hit_count", 0)), 0.10)
            return 0.0
        except Exception:
            return 0.0