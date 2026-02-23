"""
Audio Schemas - Request/Response models for audio endpoints
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


# Voice options
VoiceType = Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

# TTS model options
TTSModel = Literal["tts-1", "tts-1-hd"]

# Audio format options
AudioFormat = Literal["mp3", "opus", "aac", "flac", "wav", "pcm"]


class TranscriptionRequest(BaseModel):
    """Request for transcribing audio from URL."""
    
    audio_url: str = Field(
        ...,
        description="URL of the audio file to transcribe"
    )
    language: Optional[str] = Field(
        None,
        description="Language code (e.g., 'pt', 'en'). Auto-detected if not provided."
    )
    prompt: Optional[str] = Field(
        None,
        description="Optional prompt to guide transcription (e.g., context, vocabulary)"
    )


class TranscriptionResponse(BaseModel):
    """Response from transcription."""
    
    text: str = Field(..., description="Transcribed text")
    language: str = Field(..., description="Detected or specified language")
    duration: Optional[float] = Field(None, description="Audio duration in seconds")


class SynthesisRequest(BaseModel):
    """Request for text-to-speech synthesis."""
    
    text: str = Field(
        ...,
        max_length=4096,
        description="Text to convert to speech (max 4096 characters)"
    )
    voice: VoiceType = Field(
        "nova",
        description="Voice to use for synthesis"
    )
    model: TTSModel = Field(
        "tts-1",
        description="TTS model: 'tts-1' for speed, 'tts-1-hd' for quality"
    )
    speed: float = Field(
        1.0,
        ge=0.25,
        le=4.0,
        description="Speech speed (0.25 to 4.0)"
    )
    response_format: AudioFormat = Field(
        "mp3",
        description="Output audio format"
    )


class SynthesisResponse(BaseModel):
    """Response metadata from synthesis (actual audio is returned as bytes)."""
    
    format: str = Field(..., description="Audio format")
    size_bytes: int = Field(..., description="Audio size in bytes")
    voice: str = Field(..., description="Voice used")


class VoiceInfo(BaseModel):
    """Information about available voices."""
    
    id: VoiceType
    name: str
    description: str
    gender: str
    language: str = "multilingual"


# Available voices with descriptions
AVAILABLE_VOICES: list[VoiceInfo] = [
    VoiceInfo(
        id="alloy",
        name="Alloy",
        description="Neutral and balanced voice",
        gender="neutral"
    ),
    VoiceInfo(
        id="echo",
        name="Echo",
        description="Warm and engaging male voice",
        gender="male"
    ),
    VoiceInfo(
        id="fable",
        name="Fable",
        description="British-accented storytelling voice",
        gender="neutral"
    ),
    VoiceInfo(
        id="onyx",
        name="Onyx",
        description="Deep and authoritative male voice",
        gender="male"
    ),
    VoiceInfo(
        id="nova",
        name="Nova",
        description="Friendly and expressive female voice",
        gender="female"
    ),
    VoiceInfo(
        id="shimmer",
        name="Shimmer",
        description="Soft and gentle female voice",
        gender="female"
    ),
]
