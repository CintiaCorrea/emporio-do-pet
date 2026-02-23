"""
API Dependencies
Common dependencies used across API endpoints.
"""

import logging
from typing import Annotated

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)


async def verify_content_type(
    content_type: Annotated[str | None, Header()] = None
) -> None:
    """
    Verify that the request has the correct content type.
    This is a simple validation dependency.
    """
    if content_type and "application/json" not in content_type:
        raise HTTPException(
            status_code=415,
            detail="Content-Type must be application/json",
        )


async def get_request_id(
    x_request_id: Annotated[str | None, Header()] = None
) -> str | None:
    """
    Get request ID from header for tracing.
    """
    return x_request_id
