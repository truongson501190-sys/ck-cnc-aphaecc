from __future__ import annotations

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData

from config.settings import settings

logger = logging.getLogger(__name__)

# Naming convention cho constraints
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)

Base = declarative_base(metadata=metadata)

_engine: Optional[AsyncEngine] = None
_async_session_maker: Optional[async_sessionmaker] = None

def get_database_url() -> str:
    return settings.DATABASE_URL

async def init_database() -> AsyncEngine:
    global _engine, _async_session_maker
    if _engine is not None:
        return _engine

    database_url = get_database_url()
    logger.info("Initializing database connection")

    _engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_recycle=3600,
    )

    _async_session_maker = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    return _engine

async def close_database():
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    if _async_session_maker is None:
        await init_database()
    async with _async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

def get_session_maker() -> async_sessionmaker:
    if _async_session_maker is None:
        raise RuntimeError("Database not initialized")
    return _async_session_maker


# database/core.py (đã có sẵn, kiểm tra lại)
async_session_maker: Optional[async_sessionmaker] = None

def get_session_maker() -> async_sessionmaker:
    """Get the async session maker."""
    if async_session_maker is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return async_session_maker