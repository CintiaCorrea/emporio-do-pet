import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  IsIn,
} from 'class-validator';

export enum AgentType {
  CHATBOT = 'CHATBOT',
  AUTOMATION = 'AUTOMATION',
  ASSISTANT = 'ASSISTANT',
  SCHEDULER = 'SCHEDULER',
}

export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAFT = 'DRAFT',
  ERROR = 'ERROR',
}

export enum AIProvider {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  DEEPSEEK = 'DEEPSEEK',
}

// Available TTS voices
export const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
export type TTSVoice = typeof TTS_VOICES[number];

// Available TTS models
export const TTS_MODELS = ['tts-1', 'tts-1-hd'] as const;
export type TTSModel = typeof TTS_MODELS[number];

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType = AgentType.CHATBOT;

  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus = AgentStatus.DRAFT;

  @IsEnum(AIProvider)
  @IsOptional()
  provider?: AIProvider = AIProvider.OPENAI;

  @IsString()
  @IsOptional()
  model?: string = 'gpt-4o-mini';

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number = 0.7;

  @IsNumber()
  @Min(1)
  @Max(128000)
  @IsOptional()
  maxTokens?: number = 4096;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  // Voice configuration
  @IsBoolean()
  @IsOptional()
  voiceEnabled?: boolean = false;

  @IsString()
  @IsOptional()
  @IsIn(TTS_VOICES)
  voiceId?: TTSVoice = 'nova';

  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  @IsOptional()
  voiceSpeed?: number = 1.0;

  @IsString()
  @IsOptional()
  @IsIn(TTS_MODELS)
  voiceModel?: TTSModel = 'tts-1';
}
