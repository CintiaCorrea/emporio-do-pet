"""
Empório do Pet AI Service
FastAPI application for AI-powered chat completions and agent execution.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.v1.router import api_router
from app.core.database import init_db_pool, close_db_pool

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Log level: {settings.log_level}")

    db_url = settings.database_url
    has_db_config = db_url and "localhost" not in db_url if settings.is_production else bool(db_url)

    if settings.is_production and not has_db_config:
        logger.error(
            "DATABASE_URL not configured! RAG will be disabled. "
            "Set it via: fly secrets set DATABASE_URL='postgres://...'"
        )

    try:
        await init_db_pool()
        app.state.rag_available = True
        logger.info("Database pool ready for RAG operations")
    except Exception as e:
        app.state.rag_available = False
        level = logging.ERROR if settings.is_production else logging.WARNING
        logger.log(level, f"Failed to initialize database pool (RAG disabled): {e}")

    yield

    # Shutdown
    await close_db_pool()
    logger.info("Shutting down AI Service")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="AI Service for chat completions with multiple providers (OpenAI, Gemini, DeepSeek)",
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
            "detail": str(exc) if not settings.is_production else None,
        },
    )


# Health check endpoint (root level for Fly.io)
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    rag_available = getattr(app.state, "rag_available", False)
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "rag_available": rag_available,
    }


# Include API routers
app.include_router(api_router, prefix="/v1")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs" if not settings.is_production else "disabled in production",
        "health": "/health",
        "api": "/v1",
    }
