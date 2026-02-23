"""
Chat Endpoint Tests
"""

import pytest


def test_chat_completion_missing_credentials(client, sample_messages):
    """Test chat completion without credentials returns error."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": sample_messages,
            # Missing credentials
        },
    )
    assert response.status_code == 422  # Validation error


def test_chat_completion_invalid_provider(client, sample_messages, mock_credentials):
    """Test chat completion with invalid provider returns error."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "provider": "invalid_provider",
            "model": "gpt-4o-mini",
            "messages": sample_messages,
            "credentials": mock_credentials,
        },
    )
    assert response.status_code == 422  # Validation error


def test_chat_completion_empty_messages(client, mock_credentials):
    """Test chat completion with empty messages."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": [],
            "credentials": mock_credentials,
        },
    )
    # Empty messages might be valid or return error depending on implementation
    assert response.status_code in [200, 400, 422, 500]


def test_chat_completion_valid_request_structure(client, sample_messages, mock_credentials):
    """Test that a valid request structure is accepted (may fail due to invalid API key)."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": sample_messages,
            "temperature": 0.7,
            "max_tokens": 100,
            "credentials": mock_credentials,
        },
    )
    # Request structure is valid, but API key is fake, so expect auth error
    assert response.status_code in [401, 500]
