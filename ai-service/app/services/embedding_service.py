"""
Embedding Service
Generates text embeddings via OpenAI API for RAG operations.
"""

import logging
from typing import List

from openai import AsyncOpenAI

from app.config import get_settings
from app.schemas.common import Credentials

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self):
        self.settings = get_settings()

    def _get_client(self, credentials: Credentials) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key=credentials.api_key,
            base_url=credentials.base_url,
        )

    async def generate_embedding(
        self, text: str, credentials: Credentials
    ) -> List[float]:
        """Generate a single embedding vector for the given text."""
        client = self._get_client(credentials)

        response = await client.embeddings.create(
            model=self.settings.embedding_model,
            input=text,
            dimensions=self.settings.embedding_dimensions,
        )

        return response.data[0].embedding

    async def generate_embeddings_batch(
        self, texts: List[str], credentials: Credentials, batch_size: int = 2048
    ) -> List[List[float]]:
        """Generate embeddings for a batch of texts.
        
        OpenAI supports up to 2048 inputs per request.
        """
        client = self._get_client(credentials)
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            logger.info(f"Generating embeddings batch {i // batch_size + 1}, size={len(batch)}")

            response = await client.embeddings.create(
                model=self.settings.embedding_model,
                input=batch,
                dimensions=self.settings.embedding_dimensions,
            )

            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken."""
        import tiktoken

        try:
            enc = tiktoken.encoding_for_model("gpt-4o")
        except KeyError:
            enc = tiktoken.get_encoding("cl100k_base")

        return len(enc.encode(text))
