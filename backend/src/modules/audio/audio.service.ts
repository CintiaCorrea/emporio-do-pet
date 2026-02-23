import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';
import OpenAI from 'openai';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration?: number;
}

export interface SynthesisOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export interface VoiceInfo {
  id: string;
  name: string;
  description: string;
  gender: string;
  language: string;
}

export interface AudioCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  cachedItems: number;
}

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly aiServiceUrl: string;
  private readonly cacheEnabled: boolean;
  private readonly cacheTtlSeconds: number;
  private readonly cachePrefix = 'tts:audio:';
  private readonly statsPrefix = 'tts:stats:';
  private readonly useDirectOpenAI: boolean;
  
  // In-memory stats (reset on restart)
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.cacheEnabled = this.configService.get<string>('TTS_CACHE_ENABLED') !== 'false';
    this.cacheTtlSeconds = parseInt(this.configService.get<string>('TTS_CACHE_TTL') || '86400', 10); // 24 hours default
    // Use direct OpenAI by default (simpler and more reliable)
    this.useDirectOpenAI = this.configService.get<string>('USE_AI_SERVICE') !== 'true';
    
    if (this.cacheEnabled) {
      this.logger.log(`TTS cache enabled with TTL of ${this.cacheTtlSeconds} seconds`);
    }
    
    this.logger.log(`Audio service mode: ${this.useDirectOpenAI ? 'Direct OpenAI' : 'AI Service proxy'}`);
  }

  /**
   * Create OpenAI client with the provided API key
   */
  private createOpenAIClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey });
  }

  /**
   * Generate a cache key based on text and synthesis options
   * Uses SHA-256 hash for consistent, URL-safe keys
   */
  private generateCacheKey(text: string, options: SynthesisOptions): string {
    const normalizedOptions = {
      voice: options.voice || 'nova',
      model: options.model || 'tts-1',
      speed: options.speed || 1.0,
      format: options.format || 'mp3',
    };
    
    const payload = JSON.stringify({ text, ...normalizedOptions });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    
    return `${this.cachePrefix}${hash}`;
  }

  /**
   * Get cached audio if available
   */
  private async getCachedAudio(cacheKey: string): Promise<Buffer | null> {
    if (!this.cacheEnabled) return null;

    try {
      const cached = await this.redisService.getClient().getBuffer(cacheKey);
      
      if (cached) {
        this.cacheHits++;
        this.logger.debug(`TTS cache hit for key: ${cacheKey.slice(-12)}`);
        return cached;
      }
      
      this.cacheMisses++;
      return null;
    } catch (error) {
      this.logger.warn(`Error reading TTS cache: ${error}`);
      return null;
    }
  }

  /**
   * Store audio in cache
   */
  private async cacheAudio(cacheKey: string, audioBuffer: Buffer): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      await this.redisService.getClient().setex(cacheKey, this.cacheTtlSeconds, audioBuffer);
      this.logger.debug(`TTS audio cached: ${cacheKey.slice(-12)} (${audioBuffer.length} bytes, TTL: ${this.cacheTtlSeconds}s)`);
    } catch (error) {
      this.logger.warn(`Error caching TTS audio: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<AudioCacheStats> {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;

    // Count cached items
    let cachedItems = 0;
    try {
      const keys = await this.redisService.getClient().keys(`${this.cachePrefix}*`);
      cachedItems = keys.length;
    } catch {
      // Ignore errors
    }

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      cachedItems,
    };
  }

  /**
   * Clear all cached audio
   */
  async clearCache(): Promise<{ cleared: number }> {
    try {
      const keys = await this.redisService.getClient().keys(`${this.cachePrefix}*`);
      
      if (keys.length > 0) {
        await this.redisService.getClient().del(...keys);
        this.logger.log(`Cleared ${keys.length} cached TTS audio files`);
      }
      
      // Reset stats
      this.cacheHits = 0;
      this.cacheMisses = 0;
      
      return { cleared: keys.length };
    } catch (error) {
      this.logger.error(`Error clearing TTS cache: ${error}`);
      return { cleared: 0 };
    }
  }

  /**
   * Invalidate cache for specific text/options combination
   */
  async invalidateCacheEntry(text: string, options: SynthesisOptions = {}): Promise<boolean> {
    const cacheKey = this.generateCacheKey(text, options);
    
    try {
      const result = await this.redisService.getClient().del(cacheKey);
      return result > 0;
    } catch {
      return false;
    }
  }

  /**
   * Transcribe audio from URL using OpenAI Whisper
   * Downloads the audio and transcribes it
   */
  async transcribeFromUrl(
    audioUrl: string,
    openAiKey: string,
    language?: string,
    prompt?: string,
  ): Promise<TranscriptionResult> {
    try {
      // Download audio from URL
      this.logger.log(`Downloading audio from URL: ${audioUrl.substring(0, 50)}...`);
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: HTTP ${audioResponse.status}`);
      }
      
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const contentType = audioResponse.headers.get('content-type') || '';
      
      // Detect filename from content-type
      let filename = 'audio.ogg';
      if (contentType.includes('mp3') || contentType.includes('mpeg')) {
        filename = 'audio.mp3';
      } else if (contentType.includes('wav')) {
        filename = 'audio.wav';
      } else if (contentType.includes('m4a') || contentType.includes('mp4')) {
        filename = 'audio.m4a';
      } else if (contentType.includes('webm')) {
        filename = 'audio.webm';
      }
      
      return this.transcribeFromBuffer(audioBuffer, filename, openAiKey, language, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Transcription from URL error: ${message}`);
      throw error;
    }
  }

  /**
   * Transcribe audio from buffer using OpenAI Whisper directly
   * This is the recommended method - simple and reliable
   */
  async transcribeFromBuffer(
    audioBuffer: Buffer,
    filename: string,
    openAiKey: string,
    language?: string,
    prompt?: string,
  ): Promise<TranscriptionResult> {
    // Use direct OpenAI API (default, simpler and more reliable)
    if (this.useDirectOpenAI) {
      return this.transcribeDirectOpenAI(audioBuffer, filename, openAiKey, language, prompt);
    }
    
    // Fallback to AI Service if configured
    return this.transcribeViaAIService(audioBuffer, filename, openAiKey, language, prompt);
  }

  /**
   * Direct transcription using OpenAI SDK - RECOMMENDED
   */
  private async transcribeDirectOpenAI(
    audioBuffer: Buffer,
    filename: string,
    openAiKey: string,
    language?: string,
    prompt?: string,
  ): Promise<TranscriptionResult> {
    try {
      this.logger.log(`Transcribing ${audioBuffer.length} bytes directly via OpenAI Whisper`);
      
      const openai = this.createOpenAIClient(openAiKey);
      
      // Convert Buffer to Uint8Array for File compatibility
      const uint8Array = new Uint8Array(audioBuffer);
      const file = new File([uint8Array], filename, { 
        type: this.getMimeType(filename) 
      });
      
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: language || undefined,
        prompt: prompt || undefined,
        response_format: 'verbose_json',
      });
      
      const result: TranscriptionResult = {
        text: transcription.text,
        language: (transcription as any).language || language || 'pt',
        duration: (transcription as any).duration,
      };
      
      this.logger.log(`Transcription successful: ${result.text.length} chars, language: ${result.language}`);
      
      return result;
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      this.logger.error(`Direct OpenAI transcription error: ${message}`);
      throw new Error(`Transcription failed: ${message}`);
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'm4a': 'audio/m4a',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'oga': 'audio/ogg',
      'flac': 'audio/flac',
    };
    return mimeTypes[ext || ''] || 'audio/ogg';
  }

  /**
   * Transcription via AI Service (legacy method)
   */
  private async transcribeViaAIService(
    audioBuffer: Buffer,
    filename: string,
    openAiKey: string,
    language?: string,
    prompt?: string,
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      
      const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.length,
      ) as ArrayBuffer;
      
      formData.append('file', new Blob([arrayBuffer]), filename);
      
      if (language) {
        formData.append('language', language);
      }
      if (prompt) {
        formData.append('prompt', prompt);
      }

      const transcribeController = new AbortController();
      const transcribeTimeout = setTimeout(() => transcribeController.abort(), 60_000);

      const response = await fetch(`${this.aiServiceUrl}/v1/audio/transcribe/upload`, {
        method: 'POST',
        headers: {
          'X-OpenAI-Key': openAiKey,
        },
        signal: transcribeController.signal,
        body: formData,
      });

      clearTimeout(transcribeTimeout);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Transcription failed: HTTP ${response.status}`);
      }

      const result = await response.json();
      
      this.logger.log(`Transcription via AI Service successful: ${result.text.length} chars`);
      
      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI Service transcription error: ${message}`);
      throw error;
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   * Results are cached in Redis to reduce API costs and latency
   */
  async synthesize(
    text: string,
    openAiKey: string,
    options: SynthesisOptions = {},
  ): Promise<Buffer> {
    const {
      voice = 'nova',
      model = 'tts-1',
      speed = 1.0,
      format = 'mp3',
    } = options;

    const normalizedOptions = { voice, model, speed, format };
    const cacheKey = this.generateCacheKey(text, normalizedOptions);

    // Try to get from cache first
    const cachedAudio = await this.getCachedAudio(cacheKey);
    if (cachedAudio) {
      this.logger.log(`TTS cache hit: ${text.length} chars -> ${cachedAudio.length} bytes (cached)`);
      return cachedAudio;
    }

    // Generate new audio
    let audioBuffer: Buffer;
    
    if (this.useDirectOpenAI) {
      audioBuffer = await this.synthesizeDirectOpenAI(text, openAiKey, normalizedOptions);
    } else {
      audioBuffer = await this.synthesizeViaAIService(text, openAiKey, normalizedOptions);
    }
    
    // Cache the result asynchronously (don't block response)
    this.cacheAudio(cacheKey, audioBuffer).catch(() => {
      // Ignore cache errors - synthesis already succeeded
    });
    
    this.logger.log(`TTS synthesis successful: ${text.length} chars -> ${audioBuffer.length} bytes (generated)`);
    
    return audioBuffer;
  }

  /**
   * Direct TTS synthesis using OpenAI SDK - RECOMMENDED
   */
  private async synthesizeDirectOpenAI(
    text: string,
    openAiKey: string,
    options: { voice: string; model: string; speed: number; format: string },
  ): Promise<Buffer> {
    try {
      const openai = this.createOpenAIClient(openAiKey);
      
      const response = await openai.audio.speech.create({
        model: options.model as 'tts-1' | 'tts-1-hd',
        voice: options.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
        speed: options.speed,
        response_format: options.format as 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm',
      });
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      this.logger.error(`Direct OpenAI TTS error: ${message}`);
      throw new Error(`TTS synthesis failed: ${message}`);
    }
  }

  /**
   * TTS via AI Service (legacy method)
   */
  private async synthesizeViaAIService(
    text: string,
    openAiKey: string,
    options: { voice: string; model: string; speed: number; format: string },
  ): Promise<Buffer> {
    try {
      const ttsController = new AbortController();
      const ttsTimeout = setTimeout(() => ttsController.abort(), 30_000);

      const response = await fetch(`${this.aiServiceUrl}/v1/audio/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': openAiKey,
        },
        signal: ttsController.signal,
        body: JSON.stringify({
          text,
          voice: options.voice,
          model: options.model,
          speed: options.speed,
          response_format: options.format,
        }),
      });

      clearTimeout(ttsTimeout);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `TTS synthesis failed: HTTP ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI Service TTS error: ${message}`);
      throw error;
    }
  }

  /**
   * Convert text to speech with cache bypass option
   * Use this when you need to regenerate audio regardless of cache
   */
  async synthesizeNoCache(
    text: string,
    openAiKey: string,
    options: SynthesisOptions = {},
  ): Promise<Buffer> {
    const {
      voice = 'nova',
      model = 'tts-1',
      speed = 1.0,
      format = 'mp3',
    } = options;

    const normalizedOptions = { voice, model, speed, format };
    
    if (this.useDirectOpenAI) {
      return this.synthesizeDirectOpenAI(text, openAiKey, normalizedOptions);
    }
    
    return this.synthesizeViaAIService(text, openAiKey, normalizedOptions);
  }

  /**
   * Get available TTS voices
   */
  async getVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/v1/audio/voices`);
      
      if (!response.ok) {
        throw new Error(`Failed to get voices: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Get voices error: ${message}`);
      
      // Return default voices if AI Service is unavailable
      return [
        { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced voice', gender: 'neutral', language: 'multilingual' },
        { id: 'echo', name: 'Echo', description: 'Warm and engaging male voice', gender: 'male', language: 'multilingual' },
        { id: 'fable', name: 'Fable', description: 'British-accented storytelling voice', gender: 'neutral', language: 'multilingual' },
        { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative male voice', gender: 'male', language: 'multilingual' },
        { id: 'nova', name: 'Nova', description: 'Friendly and expressive female voice', gender: 'female', language: 'multilingual' },
        { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle female voice', gender: 'female', language: 'multilingual' },
      ];
    }
  }
}
