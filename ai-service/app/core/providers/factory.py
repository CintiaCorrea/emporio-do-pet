"""
Provider Factory
Factory for creating AI provider instances.
"""

import logging
from typing import Literal

from app.schemas import Credentials

from .base import BaseProvider
from .deepseek_provider import DeepSeekProvider
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

# Type alias for supported providers
ProviderName = Literal["openai", "gemini", "deepseek"]

# Registry of available providers
PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "deepseek": DeepSeekProvider,
}


def get_provider(provider_name: ProviderName, credentials: Credentials) -> BaseProvider:
    """
    Get an instance of the specified AI provider.

    Args:
        provider_name: Name of the provider (openai, gemini, deepseek)
        credentials: API credentials for the provider

    Returns:
        An instance of the requested provider

    Raises:
        ValueError: If the provider is not supported
    """
    if provider_name not in PROVIDERS:
        supported = ", ".join(PROVIDERS.keys())
        raise ValueError(
            f"Unsupported provider: {provider_name}. Supported providers: {supported}"
        )

    logger.info(f"Creating provider instance: {provider_name}")
    provider_class = PROVIDERS[provider_name]
    return provider_class(credentials)


def get_available_providers() -> list[str]:
    """
    Get list of available provider names.

    Returns:
        List of supported provider names
    """
    return list(PROVIDERS.keys())
