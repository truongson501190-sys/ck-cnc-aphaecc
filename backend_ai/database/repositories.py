from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    User,
    Document,
    DocumentVersion,
    Correction,
    ChatSession,
    ChatMessage,
    AnalyticsLog,
    SystemConfig,
)


class DocumentRepository:
    """Repository cho Document."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Document:
        """Tạo document mới."""
        doc = Document(**kwargs)
        self.session.add(doc)
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def get(self, doc_id: str) -> Optional[Document]:
        """Lấy document theo ID."""
        result = await self.session.execute(
            select(Document).where(Document.id == doc_id)
        )
        return result.scalar_one_or_none()

    async def update(self, doc_id: str, **kwargs) -> Optional[Document]:
        """Cập nhật document."""
        doc = await self.get(doc_id)
        if not doc:
            return None
        for key, value in kwargs.items():
            if hasattr(doc, key):
                setattr(doc, key, value)
        doc.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def list_by_user(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Document]:
        """Lấy danh sách document của user."""
        result = await self.session.execute(
            select(Document)
            .where(Document.user_id == user_id)
            .order_by(desc(Document.created_at))
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def list_by_status(self, status: str, limit: int = 100) -> List[Document]:
        """Lấy danh sách document theo status."""
        result = await self.session.execute(
            select(Document)
            .where(Document.status == status)
            .order_by(desc(Document.created_at))
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_file_hash(self, file_hash: str) -> Optional[Document]:
        """Lấy document theo file hash."""
        result = await self.session.execute(
            select(Document).where(Document.file_hash == file_hash)
        )
        return result.scalar_one_or_none()

    async def search(self, query: str, limit: int = 20) -> List[Document]:
        """Tìm kiếm document theo text hoặc fields."""
        # Đơn giản: tìm trong raw_text hoặc fields
        stmt = select(Document).where(
            or_(
                Document.raw_text.ilike(f"%{query}%"),
                # Có thể tìm trong fields JSON nếu cần
            )
        ).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class UserRepository:
    """Repository cho User."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> User:
        user = User(**kwargs)
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get(self, user_id: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()