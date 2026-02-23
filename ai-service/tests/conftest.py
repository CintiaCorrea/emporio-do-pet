"""
Pytest Configuration
Fixtures and configuration for tests.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_credentials():
    """Mock credentials for testing."""
    return {
        "api_key": "sk-test-key-12345",
        "base_url": None,
    }


@pytest.fixture
def sample_messages():
    """Sample messages for testing."""
    return [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
    ]
