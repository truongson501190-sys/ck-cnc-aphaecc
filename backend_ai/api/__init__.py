# backend_ai/api/__init__.py
# API module
# Keep this file lightweight so importing the package does not eagerly pull in
# optional OCR/assistant dependencies that may be unavailable in the local env.

try:
    from .ai import router as ai_router
except Exception:
    ai_router = None

try:
    from .ocr import router as ocr_router
except Exception:
    ocr_router = None

try:
    from .assistant import router as assistant_router
except Exception:
    assistant_router = None

__all__ = ['ai_router', 'ocr_router', 'assistant_router']
"""
API Package
===========

FastAPI routes cho hệ thống Backend AI.
"""

from .documents import router as documents_router
from .chat import router as chat_router
from .system import router as system_router
from .webhooks import router as webhooks_router