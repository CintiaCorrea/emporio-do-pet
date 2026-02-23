"""
Agent Endpoint Tests
"""

import pytest


def test_agent_execution_missing_credentials(client):
    """Test agent execution without credentials returns error."""
    response = client.post(
        "/v1/agents/execute",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are a helpful assistant.",
            "user_message": "Hello!",
            # Missing credentials
        },
    )
    assert response.status_code == 422  # Validation error


def test_agent_execution_with_context(client, mock_credentials):
    """Test agent execution with context (structure validation)."""
    response = client.post(
        "/v1/agents/execute",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are the assistant for {clinic_name}.",
            "user_message": "Hello!",
            "context": {
                "clinic_name": "Empório do Pet",
                "tutor_name": "Maria",
                "pet_name": "Rex",
            },
            "credentials": mock_credentials,
        },
    )
    # Request structure is valid, but API key is fake
    assert response.status_code in [401, 500]


def test_agent_execution_with_history(client, mock_credentials):
    """Test agent execution with conversation history."""
    response = client.post(
        "/v1/agents/execute",
        json={
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are a helpful assistant.",
            "conversation_history": [
                {"role": "user", "content": "Hi!"},
                {"role": "assistant", "content": "Hello! How can I help?"},
            ],
            "user_message": "I need to schedule an appointment.",
            "credentials": mock_credentials,
        },
    )
    # Request structure is valid, but API key is fake
    assert response.status_code in [401, 500]
