# backend_ai/check_db.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "erp_ai.db"

def check_db():
    if not DB_PATH.exists():
        print("❌ Database file chưa tồn tại.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Kiểm tra bảng
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("📋 Các bảng trong DB:", [t[0] for t in tables])
    
    if "corrections" in [t[0] for t in tables]:
        cursor.execute("SELECT * FROM corrections ORDER BY id DESC LIMIT 5;")
        rows = cursor.fetchall()
        print("\n📊 5 bản ghi corrections mới nhất:")
        for row in rows:
            print(row)
    else:
        print("⚠️ Bảng 'corrections' chưa tồn tại.")
    
    conn.close()

if __name__ == "__main__":
    check_db()