"""
API v1 Router
Combines all v1 API routes.
"""

from fastapi import APIRouter

from .agents import router as agents_router
from .audio import router as audio_router
from .chat import router as chat_router
from .health import router as health_router
from .rag import router as rag_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(health_router)
api_router.include_router(chat_router)
api_router.include_router(agents_router)
api_router.include_router(audio_router)
api_router.include_router(rag_router)
