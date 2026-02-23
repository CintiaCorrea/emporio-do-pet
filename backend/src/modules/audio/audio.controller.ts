import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString, IsIn, IsNumber, Max, Min } from 'class-validator';
import 'multer'; // Express.Multer type augmentation
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AudioService, SynthesisOptions } from './audio.service';
import { PrismaService } from '../prisma/prisma.service';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

class TranscribeUrlDto {
  @IsString()
  audioUrl: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}

class TranscribeUploadDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}

class SynthesizeDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

  @IsOptional()
  @IsIn(['tts-1', 'tts-1-hd'])
  model?: 'tts-1' | 'tts-1-hd';

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  speed?: number;

  @IsOptional()
  @IsIn(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'])
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

@Controller('audio')
@UseGuards(JwtAuthGuard)
export class AudioController {
  private readonly logger = new Logger(AudioController.name);
  private readonly envOpenAiKey: string | undefined;

  constructor(
    private readonly audioService: AudioService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.envOpenAiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (this.envOpenAiKey) {
      this.logger.log('OpenAI API key configured via environment variable');
    }
  }

  /**
   * Get OpenAI API key - first from user's integration settings, then from .env as fallback
   */
  private async getOpenAiKey(userId: string): Promise<string> {
    // First, try to get from user's integration settings
    try {
      const settings = await this.prisma.integrationSettings.findUnique({
        where: { userId },
      });

      if (settings?.openaiConfig) {
        const openAiConfig = typeof settings.openaiConfig === 'string' 
          ? JSON.parse(settings.openaiConfig) 
          : settings.openaiConfig;
        
        if (openAiConfig?.apiKey) {
          this.logger.debug('Using OpenAI API key from user integration settings');
          return openAiConfig.apiKey;
        }
      }
    } catch (error) {
      this.logger.warn('Error reading integration settings, falling back to env key');
    }

    // Fallback to environment variable
    if (this.envOpenAiKey) {
      this.logger.debug('Using OpenAI API key from environment variable');
      return this.envOpenAiKey;
    }

    throw new BadRequestException(
      'OpenAI API key not configured. Please set OPENAI_API_KEY in .env or configure in Integration Settings.',
    );
  }

  @Get('voices')
  @HttpCode(HttpStatus.OK)
  async getVoices() {
    return this.audioService.getVoices();
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  async transcribeFromUrl(
    @Req() req: RequestWithUser,
    @Body() dto: TranscribeUrlDto,
  ) {
    if (!dto.audioUrl) {
      throw new BadRequestException('audioUrl is required');
    }

    const openAiKey = await this.getOpenAiKey(req.user.id);

    const result = await this.audioService.transcribeFromUrl(
      dto.audioUrl,
      openAiKey,
      dto.language,
      dto.prompt,
    );

    return result;
  }

  @Post('transcribe/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async transcribeFromUpload(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: TranscribeUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const openAiKey = await this.getOpenAiKey(req.user.id);

    const result = await this.audioService.transcribeFromBuffer(
      file.buffer,
      file.originalname || 'audio.ogg',
      openAiKey,
      body.language,
      body.prompt,
    );

    return result;
  }

  @Post('synthesize')
  @HttpCode(HttpStatus.OK)
  async synthesize(
    @Req() req: RequestWithUser,
    @Body() dto: SynthesizeDto,
  ) {
    if (!dto.text) {
      throw new BadRequestException('text is required');
    }

    if (dto.text.length > 4096) {
      throw new BadRequestException('text must be at most 4096 characters');
    }

    const openAiKey = await this.getOpenAiKey(req.user.id);

    const options: SynthesisOptions = {
      voice: dto.voice,
      model: dto.model,
      speed: dto.speed,
      format: dto.format,
    };

    const audioBuffer = await this.audioService.synthesize(
      dto.text,
      openAiKey,
      options,
    );

    // Return as base64 for easy handling in frontend
    return {
      audio: audioBuffer.toString('base64'),
      format: dto.format || 'mp3',
      size: audioBuffer.length,
      voice: dto.voice || 'nova',
    };
  }

  @Post('synthesize/raw')
  @HttpCode(HttpStatus.OK)
  async synthesizeRaw(
    @Req() req: RequestWithUser,
    @Body() dto: SynthesizeDto,
  ) {
    if (!dto.text) {
      throw new BadRequestException('text is required');
    }

    const openAiKey = await this.getOpenAiKey(req.user.id);

    const options: SynthesisOptions = {
      voice: dto.voice,
      model: dto.model,
      speed: dto.speed,
      format: dto.format,
    };

    const audioBuffer = await this.audioService.synthesize(
      dto.text,
      openAiKey,
      options,
    );

    // Return raw audio buffer
    // Note: In a real scenario, you'd set proper headers and return the buffer directly
    // For now, we return base64 which is easier to handle
    return audioBuffer;
  }

  /**
   * Synthesize without cache (force regeneration)
   */
  @Post('synthesize/no-cache')
  @HttpCode(HttpStatus.OK)
  async synthesizeNoCache(
    @Req() req: RequestWithUser,
    @Body() dto: SynthesizeDto,
  ) {
    if (!dto.text) {
      throw new BadRequestException('text is required');
    }

    if (dto.text.length > 4096) {
      throw new BadRequestException('text must be at most 4096 characters');
    }

    const openAiKey = await this.getOpenAiKey(req.user.id);

    const options: SynthesisOptions = {
      voice: dto.voice,
      model: dto.model,
      speed: dto.speed,
      format: dto.format,
    };

    const audioBuffer = await this.audioService.synthesizeNoCache(
      dto.text,
      openAiKey,
      options,
    );

    return {
      audio: audioBuffer.toString('base64'),
      format: dto.format || 'mp3',
      size: audioBuffer.length,
      voice: dto.voice || 'nova',
      cached: false,
    };
  }

  /**
   * Get TTS cache statistics
   */
  @Get('cache/stats')
  @HttpCode(HttpStatus.OK)
  async getCacheStats() {
    return this.audioService.getCacheStats();
  }

  /**
   * Clear all TTS cache
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    return this.audioService.clearCache();
  }

  /**
   * Invalidate a specific cache entry
   */
  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidateCacheEntry(
    @Body() dto: SynthesizeDto,
  ) {
    if (!dto.text) {
      throw new BadRequestException('text is required');
    }

    const options: SynthesisOptions = {
      voice: dto.voice,
      model: dto.model,
      speed: dto.speed,
      format: dto.format,
    };

    const invalidated = await this.audioService.invalidateCacheEntry(dto.text, options);

    return {
      invalidated,
      message: invalidated ? 'Cache entry invalidated' : 'Cache entry not found',
    };
  }
}
