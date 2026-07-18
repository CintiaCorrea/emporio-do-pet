import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCompletionDto, AgentExecutionDto } from './dto';

export interface ChatCompletionResponse {
  id: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export interface AgentExecutionResponse {
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  model: string;
  provider: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('aiService.url') || 'http://localhost:8000';
    this.logger.log(`AI Service URL: ${this.aiServiceUrl}`);
  }

  /**
   * Get the user's integration settings for a specific provider
   */
  private async getProviderCredentials(
    userId: string,
    provider: 'openai' | 'gemini' | 'deepseek',
  ): Promise<{ apiKey: string; baseUrl?: string }> {
    // Fallback: chave do servidor (Fly secret) quando o usuário não tem uma própria.
    const envKey = provider === 'openai' ? (process.env.OPENAI_API_KEY || '') : '';

    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    // Config por usuário (prioridade). Se ausente/ inválida, cai no envKey.
    let config: any = null;
    const configJson = settings
      ? (settings[`${provider}Config` as keyof typeof settings] as string | null)
      : null;
    if (configJson) {
      try {
        config = JSON.parse(configJson);
      } catch {
        config = null;
      }
    }

    const apiKey = config && config.apiKey ? config.apiKey : envKey;
    if (!apiKey) {
      throw new HttpException(
        `${provider} não configurado. Adicione sua chave em Configurações (ou defina OPENAI_API_KEY no servidor).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      apiKey,
      baseUrl: (config && config.baseUrl) || undefined,
    };
  }

  /**
   * Send a chat completion request to the AI service
   */
  async chatCompletion(
    userId: string,
    dto: ChatCompletionDto,
  ): Promise<ChatCompletionResponse> {
    this.logger.log(`Chat completion request: provider=${dto.provider}, model=${dto.model}`);

    // Get credentials for the provider
    const credentials = await this.getProviderCredentials(userId, dto.provider);

    // Build the request payload
    const payload = {
      provider: dto.provider,
      model: dto.model,
      messages: dto.messages,
      temperature: dto.temperature ?? 0.7,
      max_tokens: dto.maxTokens ?? 4096,
      credentials: {
        api_key: credentials.apiKey,
        base_url: credentials.baseUrl,
      },
    };

    try {
      const response = await fetch(`${this.aiServiceUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logger.error(`AI Service error: ${response.status}`, error);
        throw new HttpException(
          error.detail?.message || error.message || 'AI service error',
          response.status,
        );
      }

      const result = await response.json();
      this.logger.log(`Chat completion successful: tokens=${result.usage.total_tokens}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to call AI service: ${error.message}`);
      throw new HttpException(
        'Failed to connect to AI service. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Execute an AI agent with the given configuration
   */
  async executeAgent(
    userId: string,
    dto: AgentExecutionDto,
  ): Promise<AgentExecutionResponse> {
    this.logger.log(`Agent execution request: provider=${dto.provider}, model=${dto.model}`);

    // Get credentials for the provider
    const credentials = await this.getProviderCredentials(userId, dto.provider);

    // Build the request payload (convert camelCase to snake_case for Python)
    const payload = {
      provider: dto.provider,
      model: dto.model,
      system_prompt: dto.systemPrompt,
      conversation_history: dto.conversationHistory || [],
      user_message: dto.userMessage,
      context: dto.context
        ? {
            clinic_name: dto.context.clinicName,
            tutor_name: dto.context.tutorName,
            pet_name: dto.context.petName,
            pet_species: dto.context.petSpecies,
            custom_data: dto.context.customData,
          }
        : null,
      temperature: dto.temperature ?? 0.7,
      max_tokens: dto.maxTokens ?? 4096,
      credentials: {
        api_key: credentials.apiKey,
        base_url: credentials.baseUrl,
      },
    };

    try {
      const response = await fetch(`${this.aiServiceUrl}/v1/agents/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logger.error(`AI Service error: ${response.status}`, error);
        throw new HttpException(
          error.detail?.message || error.message || 'AI service error',
          response.status,
        );
      }

      const result = await response.json();
      this.logger.log(`Agent execution successful: tokens=${result.usage.total_tokens}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to call AI service: ${error.message}`);
      throw new HttpException(
        'Failed to connect to AI service. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Check if the AI service is healthy
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`);
      if (!response.ok) {
        throw new Error('AI service unhealthy');
      }
      return await response.json();
    } catch (error) {
      this.logger.error(`AI service health check failed: ${error.message}`);
      throw new HttpException(
        'AI service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
