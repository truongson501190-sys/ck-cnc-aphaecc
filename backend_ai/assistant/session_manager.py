"""
Session Manager
===============

Quản lý phiên hội thoại giữa assistant và người dùng.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class Message:
    """Một tin nhắn trong hội thoại."""
    role: str  # "user" hoặc "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Session:
    """Một phiên hội thoại."""
    session_id: str
    user_id: str
    messages: List[Message] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


class SessionManager:
    """
    Quản lý các phiên hội thoại.
    Hỗ trợ lưu trữ in-memory (có thể mở rộng với Redis hoặc DB).
    """

    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self._sessions: Dict[str, Session] = {}
        self._user_sessions: Dict[str, List[str]] = defaultdict(list)  # user_id -> list session_ids

    def create_session(self, user_id: str, initial_context: Optional[Dict[str, Any]] = None) -> Session:
        """Tạo phiên mới."""
        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            user_id=user_id,
            context=initial_context or {},
        )
        self._sessions[session_id] = session
        self._user_sessions[user_id].append(session_id)
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Lấy phiên theo ID."""
        return self._sessions.get(session_id)

    def get_user_sessions(self, user_id: str) -> List[Session]:
        """Lấy tất cả phiên của một user."""
        session_ids = self._user_sessions.get(user_id, [])
        return [self._sessions[sid] for sid in session_ids if sid in self._sessions]

    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> bool:
        """Thêm tin nhắn vào phiên."""
        session = self.get_session(session_id)
        if session is None:
            return False

        message = Message(role=role, content=content, metadata=metadata or {})
        session.messages.append(message)
        session.updated_at = time.time()

        # Giới hạn lịch sử
        if len(session.messages) > self.max_history:
            session.messages = session.messages[-self.max_history:]

        return True

    def get_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Lấy lịch sử tin nhắn của phiên."""
        session = self.get_session(session_id)
        if session is None:
            return []

        messages = session.messages
        if limit:
            messages = messages[-limit:]

        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp,
                "metadata": msg.metadata,
            }
            for msg in messages
        ]

    def update_context(self, session_id: str, context: Dict[str, Any]) -> bool:
        """Cập nhật context của phiên."""
        session = self.get_session(session_id)
        if session is None:
            return False
        session.context.update(context)
        session.updated_at = time.time()
        return True

    def get_context(self, session_id: str) -> Dict[str, Any]:
        """Lấy context của phiên."""
        session = self.get_session(session_id)
        if session is None:
            return {}
        return session.context.copy()

    def delete_session(self, session_id: str) -> bool:
        """Xoá phiên."""
        session = self.get_session(session_id)
        if session is None:
            return False
        # Xoá khỏi user_sessions
        if session.user_id in self._user_sessions:
            self._user_sessions[session.user_id] = [
                sid for sid in self._user_sessions[session.user_id] if sid != session_id
            ]
        del self._sessions[session_id]
        return True

    def clear_expired(self, max_age_seconds: int = 86400):
        """Xoá các phiên cũ hơn max_age_seconds (mặc định 1 ngày)."""
        now = time.time()
        expired = [
            sid for sid, session in self._sessions.items()
            if now - session.updated_at > max_age_seconds
        ]
        for sid in expired:
            self.delete_session(sid)
        return len(expired)