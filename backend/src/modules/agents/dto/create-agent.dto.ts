import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
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

  // WhatsApp Template ID (from Meta API - numeric string)
  @IsString()
  @IsOptional()
  whatsappTemplateId?: string;

  // WhatsApp Template Name (for reference)
  @IsString()
  @IsOptional()
  whatsappTemplateName?: string;

  // WhatsApp Configuration
  @IsBoolean()
  @IsOptional()
  whatsappEnabled?: boolean = false;

  @IsBoolean()
  @IsOptional()
  whatsappAutoReply?: boolean = true;

  @IsString()
  @IsOptional()
  whatsappGreeting?: string;

  @IsString()
  @IsOptional()
  whatsappOfflineMessage?: string;

  @IsBoolean()
  @IsOptional()
  whatsappBusinessHoursOnly?: boolean = false;

  // CRM Configuration
  @IsBoolean()
  @IsOptional()
  crmEnabled?: boolean = false;

  @IsBoolean()
  @IsOptional()
  crmAutoCreateLead?: boolean = true;

  @IsBoolean()
  @IsOptional()
  crmAutoUpdateLead?: boolean = true;

  @IsBoolean()
  @IsOptional()
  crmLeadScoring?: boolean = false;

  @IsBoolean()
  @IsOptional()
  crmNotifyOnHighScore?: boolean = false;

  @IsUUID()
  @IsOptional()
  crmAssignToBoard?: string;

  // RAG Configuration
  @IsUUID()
  @IsOptional()
  knowledgeBaseId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  knowledgeBaseIds?: string[];

  @IsBoolean()
  @IsOptional()
  ragEnabled?: boolean = false;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  ragTopK?: number = 5;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  ragThreshold?: number = 0.7;

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
