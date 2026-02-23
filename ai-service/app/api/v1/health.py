"""
Health Check Endpoint
Provides health status for monitoring and load balancers.
"""

from fastapi import APIRouter

from app.config import get_settings
from app.core.providers import get_available_providers

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns service status, version, and available providers.
    Used by Fly.io health checks and monitoring systems.
    """
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "providers": get_available_providers(),
    }


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint.

    Indicates if the service is ready to receive traffic.
    """
    return {
        "ready": True,
        "version": settings.app_version,
    }


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint.

    Indicates if the service is alive and should not be restarted.
    """
    return {
        "alive": True,
    }
