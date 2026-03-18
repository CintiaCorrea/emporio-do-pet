"""
Application Configuration
Using Pydantic Settings for type-safe configuration management.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Empório do Pet AI Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    log_level: str = "INFO"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Model Defaults
    default_chat_model: str = "gpt-4o-mini"
    default_tts_model: str = "tts-1"
    default_tts_voice: str = "alloy"
    default_stt_model: str = "whisper-1"

    # RAG Configuration
    database_url: str = "postgresql://emporio:emporio_2024@localhost:15432/emporio_db"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    default_rag_top_k: int = 5
    default_rag_threshold: float = 0.7
    chunk_size: int = 600
    chunk_overlap: int = 100

    # Timeouts (in seconds)
    llm_timeout: int = 60
    tts_timeout: int = 30
    stt_timeout: int = 60

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Using lru_cache to ensure settings are only loaded once.
    """
    return Settings()
