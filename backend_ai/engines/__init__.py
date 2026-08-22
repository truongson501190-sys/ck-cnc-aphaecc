# backend_ai/engines/__init__.py

try:
    from .vision.processor import VisionProcessor
except Exception as e:
    print(f"⚠️ VisionProcessor: {e}")
    VisionProcessor = None

# Compatibility export for older imports.
try:
    from .ocr.easyocr_engine import EasyOCREngine
    PaddleOCRService = EasyOCREngine  # Đổi tên để tương thích code cũ
except Exception as e:
    print(f"⚠️ EasyOCR: {e}")
    PaddleOCRService = None

# Vẫn giữ Tesseract làm fallback
try:
    from .ocr.tesseract_ocr import TesseractOCRService
except Exception as e:
    print(f"⚠️ Tesseract: {e}")
    TesseractOCRService = None

try:
    from .brain.interpreter import Interpreter
except Exception as e:
    print(f"⚠️ Interpreter: {e}")
    Interpreter = None

try:
    from .reasoning.reasoner import Reasoner
except Exception:
    Reasoner = None

try:
    from .validation.validator import Validator
except Exception:
    Validator = None

try:
    from .memory.store import MemoryStore
except Exception:
    MemoryStore = None

try:
    from .learning.learner import Learner
except Exception:
    Learner = None

try:
    from .knowledge.knowledge_base import KnowledgeBase
except Exception:
    KnowledgeBase = None

try:
    from .automation.importer import ERPImporter
except Exception:
    ERPImporter = None

try:
    from .analytics.analyzer import AnalyticsEngine
except Exception:
    AnalyticsEngine = None

try:
    from .assistant.chat import ChatAssistant
except Exception:
    ChatAssistant = None

__all__ = [
    'VisionProcessor',
    'PaddleOCRService',
    'TesseractOCRService',
    'Interpreter',
    'Reasoner',
    'Validator',
    'MemoryStore',
    'Learner',
    'KnowledgeBase',
    'ERPImporter',
    'AnalyticsEngine',
    'ChatAssistant'
]