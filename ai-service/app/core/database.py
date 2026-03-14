"""
Database Connection Pool
Async PostgreSQL connection pool using asyncpg for RAG operations.
"""

import logging
from typing import Optional

import asyncpg
from pgvector.asyncpg import register_vector

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> asyncpg.Pool:
    """Initialize the asyncpg connection pool with pgvector support."""
    global _pool
    settings = get_settings()

    logger.info(f"Initializing database pool: {settings.database_url.split('@')[-1]}")

    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=10,
        command_timeout=60,
        setup=_setup_connection,
    )

    logger.info("Database pool initialized successfully")
    return _pool


async def _setup_connection(conn: asyncpg.Connection):
    """Register pgvector type on each new connection."""
    await register_vector(conn)


async def close_db_pool():
    """Close the database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


def get_db_pool() -> asyncpg.Pool:
    """Get the current database connection pool."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    return _pool
