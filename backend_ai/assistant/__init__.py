"""
Assistant Module
================

Cung cấp trợ lý AI thông minh cho hệ thống xử lý tài liệu.
Hỗ trợ:
- Trò chuyện tự nhiên
- Giải thích kết quả xử lý
- Đề xuất sửa lỗi
- Tra cứu thông tin từ knowledge base và memory
- Gọi các chức năng hệ thống thông qua tools
"""

from .assistant import Assistant
from .tools import AssistantTools
from .session_manager import SessionManager
from .prompts import (
    SYSTEM_PROMPT,
    EXPLAIN_PROMPT,
    CORRECT_PROMPT,
    QUERY_PROMPT,
)

__all__ = [
    "Assistant",
    "AssistantTools",
    "SessionManager",
    "SYSTEM_PROMPT",
    "EXPLAIN_PROMPT",
    "CORRECT_PROMPT",
    "QUERY_PROMPT",
]