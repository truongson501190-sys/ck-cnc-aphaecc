# backend_ai/api/learn.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from pathlib import Path
import logging

from engines.memory.store import MemoryStore
from engines.analytics.analyzer import AnalyticsEngine

router = APIRouter(prefix="/api/ai", tags=["Learning"])

DB_PATH = Path(__file__).parent.parent / "data" / "erp_ai.db"
logger = logging.getLogger(__name__)

class LearnRequest(BaseModel):
    scan_id: str
    field_name: str
    wrong_value: str = ""
    correct_value: str
    context: str = ""
    user_id: str = "system"


def _get_table_columns(conn: sqlite3.Connection) -> set[str]:
    cursor = conn.cursor()
    rows = cursor.execute("PRAGMA table_info(corrections)").fetchall()
    return {row[1] for row in rows}


def init_db():
    """Tạo hoặc sửa bảng corrections để tương thích với schema lưu hiện tại."""
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT,
                field_name TEXT,
                wrong_value TEXT,
                correct_value TEXT,
                context TEXT,
                user_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        existing_columns = _get_table_columns(conn)
        if "document_id" not in existing_columns:
            cursor.execute("ALTER TABLE corrections ADD COLUMN document_id TEXT")
        if "original_fields" not in existing_columns:
            cursor.execute("ALTER TABLE corrections ADD COLUMN original_fields TEXT")
        if "corrected_fields" not in existing_columns:
            cursor.execute("ALTER TABLE corrections ADD COLUMN corrected_fields TEXT")

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"DB init error: {e}")
        raise

@router.post("/learn")
async def learn_from_correction(request: LearnRequest):
    try:
        init_db()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        columns = {row[1] for row in cursor.execute("PRAGMA table_info(corrections)").fetchall()}

        insert_fields = ["scan_id", "field_name", "wrong_value", "correct_value", "context", "user_id"]
        values = [
            request.scan_id,
            request.field_name,
            request.wrong_value,
            request.correct_value,
            request.context,
            request.user_id,
        ]

        if "document_id" in columns:
            insert_fields.append("document_id")
            values.append(request.scan_id)
        if "original_fields" in columns:
            insert_fields.append("original_fields")
            values.append('{"' + request.field_name + '": "' + request.wrong_value + '"}')
        if "corrected_fields" in columns:
            insert_fields.append("corrected_fields")
            values.append('{"' + request.field_name + '": "' + request.correct_value + '"}')

        placeholders = ", ".join(["?"] * len(insert_fields))
        sql = f"INSERT INTO corrections ({', '.join(insert_fields)}) VALUES ({placeholders})"
        cursor.execute(sql, values)
        conn.commit()
        correction_id = cursor.lastrowid
        conn.close()

        memory = MemoryStore()
        memory.update(
            request.scan_id,
            {
                "corrected_fields": {
                    request.field_name: request.correct_value
                }
            },
        )

        analytics = AnalyticsEngine()
        analytics.log_event(
            "correction_saved",
            {
                "scan_id": request.scan_id,
                "field_name": request.field_name,
                "correct_value": request.correct_value,
                "user_id": request.user_id,
            },
        )

        return {
            "success": True,
            "message": f"✅ Learned: '{request.wrong_value}' → '{request.correct_value}' for field '{request.field_name}'",
            "correction_id": correction_id,
            "stored": True,
        }
    except sqlite3.Error as e:
        logger.error(f"SQL error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"General error: {e}")
        raise HTTPException(status_code=500, detail=str(e))