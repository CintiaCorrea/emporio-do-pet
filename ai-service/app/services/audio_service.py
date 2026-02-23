"""
Audio Service - Speech-to-Text (STT) and Text-to-Speech (TTS)
Uses OpenAI Whisper for STT and OpenAI TTS for speech synthesis.
"""

import io
import logging
import tempfile
from pathlib import Path
from typing import Optional, Literal

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


# Supported voice options for OpenAI TTS
VoiceType = Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

# Supported TTS models
TTSModel = Literal["tts-1", "tts-1-hd"]

# Supported audio formats for TTS output
TTSFormat = Literal["mp3", "opus", "aac", "flac", "wav", "pcm"]

# Supported audio formats for STT input
STT_SUPPORTED_FORMATS = [
    "flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"
]


class AudioService:
    """
    Service for audio processing including:
    - Speech-to-Text (STT) using OpenAI Whisper
    - Text-to-Speech (TTS) using OpenAI TTS
    """

    def __init__(self, api_key: str):
        """
        Initialize the audio service.
        
        Args:
            api_key: OpenAI API key
        """
        self.client = AsyncOpenAI(api_key=api_key)
        logger.info("AudioService initialized with OpenAI client")

    async def transcribe(
        self,
        audio_data: bytes,
        filename: str = "audio.ogg",
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> dict:
        """
        Transcribe audio to text using OpenAI Whisper.
        
        Args:
            audio_data: Raw audio bytes
            filename: Original filename (used to detect format)
            language: Optional language code (e.g., "pt", "en")
            prompt: Optional prompt to guide transcription
            
        Returns:
            dict with transcription result:
                - text: Transcribed text
                - language: Detected language
                - duration: Audio duration in seconds
        """
        try:
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = filename
            
            # Prepare transcription parameters
            params = {
                "model": "whisper-1",
                "file": audio_file,
                "response_format": "verbose_json",
            }
            
            if language:
                params["language"] = language
            
            if prompt:
                params["prompt"] = prompt
            
            # Call OpenAI Whisper API
            response = await self.client.audio.transcriptions.create(**params)
            
            result = {
                "text": response.text,
                "language": getattr(response, "language", language or "unknown"),
                "duration": getattr(response, "duration", None),
            }
            
            logger.info(
                f"Transcription successful: {len(result['text'])} chars, "
                f"language: {result['language']}, duration: {result['duration']}s"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise

    async def synthesize(
        self,
        text: str,
        voice: VoiceType = "nova",
        model: TTSModel = "tts-1",
        speed: float = 1.0,
        response_format: TTSFormat = "mp3",
    ) -> bytes:
        """
        Convert text to speech using OpenAI TTS.
        
        Args:
            text: Text to convert to speech (max 4096 characters)
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            model: TTS model (tts-1 for speed, tts-1-hd for quality)
            speed: Speech speed (0.25 to 4.0, default 1.0)
            response_format: Output format (mp3, opus, aac, flac, wav, pcm)
            
        Returns:
            Audio data as bytes
        """
        try:
            # Validate text length
            if len(text) > 4096:
                logger.warning(f"Text too long ({len(text)} chars), truncating to 4096")
                text = text[:4096]
            
            # Validate speed
            speed = max(0.25, min(4.0, speed))
            
            # Call OpenAI TTS API
            response = await self.client.audio.speech.create(
                model=model,
                voice=voice,
                input=text,
                speed=speed,
                response_format=response_format,
            )
            
            # Get audio bytes
            audio_data = response.content
            
            logger.info(
                f"TTS synthesis successful: {len(text)} chars -> "
                f"{len(audio_data)} bytes ({response_format}), voice: {voice}"
            )
            
            return audio_data
            
        except Exception as e:
            logger.error(f"TTS synthesis error: {str(e)}")
            raise

    async def transcribe_from_url(
        self,
        audio_url: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> dict:
        """
        Download audio from URL and transcribe it.
        
        Args:
            audio_url: URL to download audio from
            language: Optional language code
            prompt: Optional prompt to guide transcription
            
        Returns:
            dict with transcription result
        """
        import httpx
        
        try:
            # Download audio
            async with httpx.AsyncClient() as client:
                response = await client.get(audio_url, timeout=30.0)
                response.raise_for_status()
                audio_data = response.content
            
            # Detect filename from URL or content-type
            content_type = response.headers.get("content-type", "")
            if "ogg" in content_type or "opus" in content_type:
                filename = "audio.ogg"
            elif "mp3" in content_type or "mpeg" in content_type:
                filename = "audio.mp3"
            elif "wav" in content_type:
                filename = "audio.wav"
            elif "m4a" in content_type or "mp4" in content_type:
                filename = "audio.m4a"
            else:
                # Try to get from URL
                url_path = audio_url.split("?")[0]
                filename = url_path.split("/")[-1] or "audio.ogg"
            
            logger.info(f"Downloaded {len(audio_data)} bytes from URL, filename: {filename}")
            
            return await self.transcribe(
                audio_data=audio_data,
                filename=filename,
                language=language,
                prompt=prompt,
            )
            
        except Exception as e:
            logger.error(f"Error transcribing from URL: {str(e)}")
            raise


# Per-key instance cache (avoids re-creating clients for the same key)
_audio_services: dict[str, AudioService] = {}


def get_audio_service(api_key: str) -> AudioService:
    """
    Get or create an AudioService for the given API key.
    Each unique API key gets its own client instance.
    
    Args:
        api_key: OpenAI API key
        
    Returns:
        AudioService instance configured with the given key
    """
    # Use last 8 chars of key as cache key to avoid storing full keys
    cache_key = api_key[-8:]
    if cache_key not in _audio_services:
        _audio_services[cache_key] = AudioService(api_key)
        # Limit cache size to prevent memory leaks
        if len(_audio_services) > 50:
            oldest_key = next(iter(_audio_services))
            del _audio_services[oldest_key]
    return _audio_services[cache_key]
