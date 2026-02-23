"""
Audio API Endpoints - Speech-to-Text and Text-to-Speech
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import Response

from app.schemas.audio import (
    TranscriptionRequest,
    TranscriptionResponse,
    SynthesisRequest,
    SynthesisResponse,
    VoiceInfo,
    AVAILABLE_VOICES,
    VoiceType,
    TTSModel,
    AudioFormat,
)
from app.services.audio_service import get_audio_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["Audio"])


def get_api_key(x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key")) -> str:
    """Extract OpenAI API key from header."""
    if not x_openai_key:
        raise HTTPException(
            status_code=401,
            detail="OpenAI API key required. Pass via X-OpenAI-Key header."
        )
    return x_openai_key


@router.get("/voices", response_model=list[VoiceInfo])
async def list_voices():
    """
    List available TTS voices.
    
    Returns information about all available voices including:
    - ID for use in synthesis requests
    - Name and description
    - Gender classification
    """
    return AVAILABLE_VOICES


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    request: TranscriptionRequest,
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    Transcribe audio from URL using OpenAI Whisper.
    
    Downloads the audio file from the provided URL and transcribes it.
    Supports various audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg.
    
    The API key must be passed via X-OpenAI-Key header.
    """
    api_key = get_api_key(x_openai_key)
    
    try:
        service = get_audio_service(api_key)
        result = await service.transcribe_from_url(
            audio_url=request.audio_url,
            language=request.language,
            prompt=request.prompt,
        )
        
        return TranscriptionResponse(
            text=result["text"],
            language=result["language"],
            duration=result.get("duration"),
        )
        
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/transcribe/upload", response_model=TranscriptionResponse)
async def transcribe_audio_upload(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="Language code (e.g., 'pt', 'en')"),
    prompt: Optional[str] = Form(None, description="Optional context prompt"),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    Transcribe uploaded audio file using OpenAI Whisper.
    
    Upload an audio file directly for transcription.
    Supports various audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg.
    
    The API key must be passed via X-OpenAI-Key header.
    """
    api_key = get_api_key(x_openai_key)
    
    try:
        # Read uploaded file
        audio_data = await file.read()
        filename = file.filename or "audio.ogg"
        
        service = get_audio_service(api_key)
        result = await service.transcribe(
            audio_data=audio_data,
            filename=filename,
            language=language,
            prompt=prompt,
        )
        
        return TranscriptionResponse(
            text=result["text"],
            language=result["language"],
            duration=result.get("duration"),
        )
        
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/synthesize")
async def synthesize_speech(
    request: SynthesisRequest,
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    Convert text to speech using OpenAI TTS.
    
    Returns the audio file directly as binary data.
    
    Available voices:
    - alloy: Neutral and balanced
    - echo: Warm male voice
    - fable: British storytelling
    - onyx: Deep authoritative male
    - nova: Friendly expressive female
    - shimmer: Soft gentle female
    
    The API key must be passed via X-OpenAI-Key header.
    """
    api_key = get_api_key(x_openai_key)
    
    try:
        service = get_audio_service(api_key)
        audio_data = await service.synthesize(
            text=request.text,
            voice=request.voice,
            model=request.model,
            speed=request.speed,
            response_format=request.response_format,
        )
        
        # Determine content type
        content_types = {
            "mp3": "audio/mpeg",
            "opus": "audio/opus",
            "aac": "audio/aac",
            "flac": "audio/flac",
            "wav": "audio/wav",
            "pcm": "audio/pcm",
        }
        content_type = content_types.get(request.response_format, "audio/mpeg")
        
        return Response(
            content=audio_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech.{request.response_format}",
                "X-Voice": request.voice,
                "X-Model": request.model,
                "X-Audio-Size": str(len(audio_data)),
            }
        )
        
    except Exception as e:
        logger.error(f"TTS synthesis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"TTS synthesis failed: {str(e)}"
        )


@router.post("/synthesize/json", response_model=SynthesisResponse)
async def synthesize_speech_json(
    request: SynthesisRequest,
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    Convert text to speech and return metadata only (for testing).
    
    This endpoint synthesizes the audio but only returns metadata.
    Use /synthesize for actual audio data.
    """
    api_key = get_api_key(x_openai_key)
    
    try:
        service = get_audio_service(api_key)
        audio_data = await service.synthesize(
            text=request.text,
            voice=request.voice,
            model=request.model,
            speed=request.speed,
            response_format=request.response_format,
        )
        
        return SynthesisResponse(
            format=request.response_format,
            size_bytes=len(audio_data),
            voice=request.voice,
        )
        
    except Exception as e:
        logger.error(f"TTS synthesis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"TTS synthesis failed: {str(e)}"
        )
