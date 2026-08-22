# database/models.py
from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import Column, String, DateTime, Float, JSON, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from .core import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    username = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")
    confidence = Column(Float, default=0.0)
    needs_review = Column(Boolean, default=True)
    raw_text = Column(Text, nullable=True)
    fields = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    ocr_engine_used = Column(String(50), nullable=True)
    llm_used = Column(Boolean, default=False)
    source = Column(String(50), default="ocr")
    processing_time = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="documents")
    corrections = relationship("Correction", back_populates="document")
    versions = relationship("DocumentVersion", back_populates="document")
    analytics = relationship("AnalyticsLog", back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(50), primary_key=True)
    document_id = Column(String(50), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    fields = Column(JSON, nullable=False)
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text, nullable=True)
    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="versions")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(String(50), primary_key=True)
    document_id = Column(String(50), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_fields = Column(JSON, nullable=False)
    corrected_fields = Column(JSON, nullable=False)
    changes = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="corrections")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=True)
    context = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(50), primary_key=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    extra = Column(JSON, nullable=True)          # ✅ không dùng tên 'metadata'
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalyticsLog(Base):
    __tablename__ = "analytics_logs"

    id = Column(String(50), primary_key=True)
    event_type = Column(String(100), nullable=False)
    document_id = Column(String(50), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    data = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="analytics")


class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)