# backend_ai/reset_db.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "erp_ai.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Xóa bảng cũ nếu tồn tại
cursor.execute("DROP TABLE IF EXISTS corrections;")

# Tạo bảng mới với cấu trúc đúng
cursor.execute("""
    CREATE TABLE corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT,
        field_name TEXT,
        wrong_value TEXT,
        correct_value TEXT,
        context TEXT,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

conn.commit()
conn.close()
print("✅ Đã reset bảng 'corrections' thành công.")