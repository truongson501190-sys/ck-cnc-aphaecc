# backend_ai/check_schema.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "erp_ai.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Xem thông tin cột của bảng corrections
cursor.execute("PRAGMA table_info(corrections);")
columns = cursor.fetchall()
print("📋 Cấu trúc bảng 'corrections':")
for col in columns:
    print(f"   {col[1]} ({col[2]})")

conn.close()