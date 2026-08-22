# backend_ai/config/settings.py

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Paths
    base_dir: Path = Path(__file__).parent.parent
    data_dir: Path = base_dir / "data"
    models_dir: Path = base_dir / "models"
    logs_dir: Path = base_dir / "logs"
    
    # OCR
    ocr_engine: str = "easyocr"
    ocr_lang: str = "vi"
    ocr_use_gpu: bool = False
    
    # Vision
    vision_model: str = "qwen2.5-vl"
    ollama_url: str = "http://localhost:11434/api/generate"
    qwen_model_name: str = "qwen2.5-vl"
    
    # Database
    sqlite_path: Path = data_dir / "erp_ai.db"
    chroma_path: Path = data_dir / "chroma"
    
    # Confidence thresholds
    confidence_auto: float = 0.98
    confidence_suggest: float = 0.90
    confidence_manual: float = 0.90
    
    # ERP Connector
    erp_adapter: str = "mock"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    postgresql_url: str = ""
    erp_api_url: str = ""
    erp_api_key: str = ""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8002
    cors_origins_str: str = "http://localhost:3000,http://localhost:3002,http://localhost:5173,http://localhost:5174"  # Dùng string, sau đó parse
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        extra = "ignore"
    
    @property
    def cors_origins(self):
        """Chuyển chuỗi CSV thành list"""
        return [item.strip() for item in self.cors_origins_str.split(",") if item.strip()]

settings = Settings()

# Tạo thư mục
for d in [
    settings.data_dir,
    settings.models_dir,
    settings.logs_dir,
    settings.data_dir / "images",
    settings.data_dir / "labels",
    settings.data_dir / "uploads",
]:
    d.mkdir(parents=True, exist_ok=True)

# In cấu hình nếu ở DEBUG
if settings.log_level == "DEBUG":
    print("=" * 60)
    print("🤖 ERP AI CONFIG")
    print("=" * 60)
    print(f"Data dir: {settings.data_dir}")
    print(f"ERP Adapter: {settings.erp_adapter}")
    print(f"CORS Origins: {settings.cors_origins}")
    print("=" * 60)