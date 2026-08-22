# backend_ai/database/sqlite/db.py

import sqlite3
from contextlib import contextmanager
from typing import Dict, Any, List, Optional
from pathlib import Path
import json

from config.settings import settings

class Database:
    """SQLite database wrapper"""
    
    def __init__(self):
        self.db_path = settings.sqlite_path
        self._init_db()
    
    def _init_db(self):
        """Khởi tạo database và các bảng"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Documents
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
            
            # Corrections
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
            
            # Learning samples
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id TEXT,
                    original_fields TEXT,
                    corrected_fields TEXT,
                    user_id TEXT,
                    confidence REAL,
                    created_at TIMESTAMP,
                    applied BOOLEAN DEFAULT 0
                )
            ''')
            
            # Learning patterns
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    field_name TEXT,
                    pattern TEXT,
                    confidence REAL,
                    sample_count INTEGER,
                    created_at TIMESTAMP
                )
            ''')
            
            # Analytics events
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    data TEXT,
                    created_at TIMESTAMP
                )
            ''')
            
            # Indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_docs_created ON documents(created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type)')
            
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def execute(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute query and return results as dict"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def execute_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        """Execute query and return one result"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def execute_write(self, query: str, params: tuple = ()) -> int:
        """Execute write query and return last row id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.lastrowid

db = Database()