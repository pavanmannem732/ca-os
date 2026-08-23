"""Async SQLAlchemy engine and session factory."""
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from app.core.config import settings

engine = create_async_engine(
    settings.get_database_url(),
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=0,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)
