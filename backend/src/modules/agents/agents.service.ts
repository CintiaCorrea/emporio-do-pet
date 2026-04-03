import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto, AgentStatus } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { ExecuteAgentDto } from './dto/execute-agent.dto';
import { AudioService } from '../audio/audio.service';
import {
  CostCalculatorService,
  RateLimiterService,
  CircuitBreakerService,
  AgentVersioningService,
  TokenUsage,
} from './services';

export interface AgentExecutionResponse {
  id: string;
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latencyMs: number;
  cost?: {
    textCostUsd: number;
    voiceCostUsd?: number;
    totalCostUsd: number;
  };
  voiceAudio?: string; // Base64 encoded audio
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

export interface StreamChunk {
  type: 'content' | 'usage' | 'done' | 'error';
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  id?: string;
  cost?: {
    textCostUsd: number;
    embeddingCostUsd?: number;
    totalCostUsd: number;
  };
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
  error?: string;
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private audioService: AudioService,
    private costCalculator: CostCalculatorService,
    private rateLimiter: RateLimiterService,
    private circuitBreaker: CircuitBreakerService,
    private versioning: AgentVersioningService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('aiService.url') || 'http://localhost:8000';

    // Configure circuit breaker for AI service
    this.circuitBreaker.configure('ai-service', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      monitoringPeriod: 60000,
    });
  }

  async create(userId: string, dto: CreateAgentDto) {
    return this.prisma.aIAgent.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        type: dto.type || 'CHATBOT',
        status: dto.status || 'DRAFT',
        provider: dto.provider || 'OPENAI',
        model: dto.model || 'gpt-4o-mini',
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature || 0.7,
        maxTokens: dto.maxTokens || 4096,
        templateId: dto.templateId,
        // WhatsApp
        whatsappTemplateId: dto.whatsappTemplateId,
        whatsappTemplateName: dto.whatsappTemplateName,
        whatsappEnabled: dto.whatsappEnabled ?? false,
        whatsappAutoReply: dto.whatsappAutoReply ?? true,
        whatsappGreeting: dto.whatsappGreeting,
        whatsappOfflineMessage: dto.whatsappOfflineMessage,
        whatsappBusinessHoursOnly: dto.whatsappBusinessHoursOnly ?? false,
        // CRM
        crmEnabled: dto.crmEnabled ?? false,
        crmAutoCreateLead: dto.crmAutoCreateLead ?? true,
        crmAutoUpdateLead: dto.crmAutoUpdateLead ?? true,
        crmLeadScoring: dto.crmLeadScoring ?? false,
        crmNotifyOnHighScore: dto.crmNotifyOnHighScore ?? false,
        crmAssignToBoard: dto.crmAssignToBoard,
        // Voice
        voiceEnabled: dto.voiceEnabled ?? false,
        voiceId: dto.voiceId ?? 'nova',
        voiceSpeed: dto.voiceSpeed ?? 1.0,
        voiceModel: dto.voiceModel ?? 'tts-1',
      },
      include: {
        template: true,
      },
    });
  }

  async findAll(
    userId: string,
    options?: {
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.type) {
      where.type = options.type;
    }

    const [agents, total] = await Promise.all([
      this.prisma.aIAgent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
      }),
      this.prisma.aIAgent.count({ where }),
    ]);

    return {
      data: agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, userId },
      include: {
        template: true,
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            executions: true,
            automations: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agente não encontrado');
    }

    return agent;
  }

  async update(userId: string, id: string, dto: UpdateAgentDto) {
    await this.findOne(userId, id);

    return this.prisma.aIAgent.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        template: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.aIAgent.delete({
      where: { id },
    });

    return { message: 'Agente removido com sucesso' };
  }

  async updateStatus(userId: string, id: string, status: AgentStatus) {
    await this.findOne(userId, id);

    return this.prisma.aIAgent.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async execute(
    userId: string,
    id: string,
    dto: ExecuteAgentDto,
  ): Promise<AgentExecutionResponse> {
    const agent = await this.findOne(userId, id);

    if (agent.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Agente não está ativo. Ative o agente antes de executar.',
      );
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkAndConsume(id, userId, {
      maxRequests: agent.rateLimitRequests,
      windowSeconds: agent.rateLimitWindow,
    });

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit excedido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.`,
      );
    }

    // Check user budget
    const budgetCheck = await this.checkUserBudget(userId);
    if (!budgetCheck.allowed) {
      throw new BadRequestException(
        `Orçamento mensal de AI excedido. Limite: $${budgetCheck.limit?.toFixed(2)}, Usado: $${budgetCheck.used?.toFixed(2)}`,
      );
    }

    // Get provider credentials
    const credentials = await this.getProviderCredentials(userId, agent.provider as 'OPENAI' | 'GEMINI' | 'DEEPSEEK');

    if (!credentials) {
      throw new BadRequestException(
        `Credenciais do provedor ${agent.provider} não configuradas. Configure em Conexões.`,
      );
    }

    const startTime = Date.now();

    try {
      // Execute with circuit breaker and retry
      const result = await this.circuitBreaker.executeWithRetry(
        'ai-service',
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90_000);

          const response = await fetch(`${this.aiServiceUrl}/v1/agents/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              provider: agent.provider.toLowerCase(),
              model: agent.model,
              system_prompt: agent.systemPrompt,
              conversation_history: dto.conversationHistory || [],
              user_message: dto.userMessage,
              context: dto.context ? {
                clinic_name: dto.context.clinicName,
                tutor_name: dto.context.tutorName,
                pet_name: dto.context.petName,
                pet_species: dto.context.petSpecies,
                current_date: dto.context.currentDate,
                custom_data: dto.context.customVariable,
              } : {},
              credentials: {
                api_key: credentials.apiKey,
                base_url: credentials.baseUrl,
              },
              temperature: agent.temperature,
              max_tokens: agent.maxTokens,
              rag_enabled: agent.ragEnabled ?? false,
              rag_knowledge_base_id: agent.knowledgeBaseId ?? null,
              rag_top_k: agent.ragTopK ?? 5,
              rag_threshold: agent.ragThreshold ?? 0.7,
            }),
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao executar agente');
          }

          return response.json();
        },
        {
          maxRetries: 2,
          retryDelay: 1000,
          backoffMultiplier: 2,
          retryOn: (error) => {
            const message = error.message.toLowerCase();
            return message.includes('timeout') ||
                   message.includes('network') ||
                   message.includes('503') ||
                   message.includes('502');
          },
        },
      );

      const latencyMs = Date.now() - startTime;

      // Calculate costs
      const usage = result.usage as TokenUsage;
      const costBreakdown = this.costCalculator.calculateTextCost(
        usage,
        agent.model,
        agent.provider,
      );

      let voiceAudio: string | undefined;
      let voiceCostUsd: number | undefined;

      // Generate voice if enabled
      const shouldGenerateVoice = dto.generateVoice ?? agent.voiceEnabled;
      if (shouldGenerateVoice && result.response) {
        try {
          const audioBuffer = await this.audioService.synthesize(
            result.response,
            credentials.apiKey,
            {
              voice: agent.voiceId as any,
              model: agent.voiceModel as any,
              speed: agent.voiceSpeed,
            },
          );
          voiceAudio = audioBuffer.toString('base64');

          const ttsCost = this.costCalculator.calculateTTSCost(result.response, agent.voiceModel);
          voiceCostUsd = ttsCost.totalCost;
        } catch (voiceError) {
          this.logger.warn(`Voice generation failed: ${voiceError}`);
          // Don't fail the whole request if voice fails
        }
      }

      // Calculate embedding cost if RAG was used
      let embeddingCostUsd = 0;
      if (result.rag_embedding_tokens) {
        const embCost = this.costCalculator.calculateEmbeddingCost(result.rag_embedding_tokens);
        embeddingCostUsd = embCost.totalCost;
      }

      const totalCostUsd = costBreakdown.totalCost + (voiceCostUsd || 0) + embeddingCostUsd;

      // Build metadata with RAG info
      const executionMetadata: Record<string, any> = dto.context
        ? JSON.parse(JSON.stringify(dto.context))
        : {};

      if (result.rag_chunks_used) {
        executionMetadata.ragChunksUsed = result.rag_chunks_used;
        executionMetadata.ragSources = result.rag_sources || [];
        executionMetadata.ragEmbeddingTokens = result.rag_embedding_tokens || 0;
      }

      if (result.rag_error) {
        executionMetadata.ragError = result.rag_error;
        this.logger.warn(`RAG retrieval error for agent ${id}: ${result.rag_error}`);
      }

      // Record execution with costs
      const execution = await this.prisma.agentExecution.create({
        data: {
          agentId: id,
          status: 'SUCCESS',
          input: dto.userMessage,
          output: result.response,
          usage: result.usage,
          latencyMs,
          metadata: Object.keys(executionMetadata).length > 0 ? executionMetadata : undefined,
          costUsd: totalCostUsd,
          costBreakdown: {
            promptCost: costBreakdown.promptCost,
            completionCost: costBreakdown.completionCost,
            textCost: costBreakdown.totalCost,
            voiceCost: voiceCostUsd || 0,
            embeddingCost: embeddingCostUsd,
            totalCost: totalCostUsd,
            model: agent.model,
            provider: agent.provider,
          },
          voiceGenerated: !!voiceAudio,
          voiceCostUsd,
        },
      });

      // Update agent metrics and costs
      await this.updateAgentMetrics(id, latencyMs, true, totalCostUsd);

      // Update user's monthly cost
      await this.updateUserMonthlyCost(userId, totalCostUsd);

      return {
        id: execution.id,
        response: result.response,
        usage: result.usage,
        latencyMs,
        cost: {
          textCostUsd: costBreakdown.totalCost,
          voiceCostUsd,
          totalCostUsd,
        },
        voiceAudio,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Record failed execution
      await this.prisma.agentExecution.create({
        data: {
          agentId: id,
          status: 'FAILED',
          input: dto.userMessage,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          latencyMs,
          metadata: dto.context ? JSON.parse(JSON.stringify(dto.context)) : null,
        },
      });

      // Update agent metrics
      await this.updateAgentMetrics(id, latencyMs, false);

      throw error instanceof BadRequestException ? error : new BadRequestException(
        error instanceof Error ? error.message : 'Erro ao executar agente',
      );
    }
  }

  async *executeStream(
    userId: string,
    id: string,
    dto: ExecuteAgentDto,
  ): AsyncGenerator<StreamChunk> {
    const agent = await this.findOne(userId, id);

    if (agent.status !== 'ACTIVE') {
      yield { type: 'error', error: 'Agente não está ativo' };
      return;
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkAndConsume(id, userId, {
      maxRequests: agent.rateLimitRequests,
      windowSeconds: agent.rateLimitWindow,
    });

    if (!rateLimitResult.allowed) {
      yield { type: 'error', error: `Rate limit excedido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.` };
      return;
    }

    // Get provider credentials
    const credentials = await this.getProviderCredentials(userId, agent.provider as 'OPENAI' | 'GEMINI' | 'DEEPSEEK');

    if (!credentials) {
      yield { type: 'error', error: `Credenciais do provedor ${agent.provider} não configuradas` };
      return;
    }

    const startTime = Date.now();
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let ragMeta: { chunksUsed?: number; sources?: string[]; embeddingTokens?: number; error?: string } = {};

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);

      const response = await fetch(`${this.aiServiceUrl}/v1/agents/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
        body: JSON.stringify({
          provider: agent.provider.toLowerCase(),
          model: agent.model,
          system_prompt: agent.systemPrompt,
          conversation_history: dto.conversationHistory || [],
          user_message: dto.userMessage,
          context: dto.context ? {
            clinic_name: dto.context.clinicName,
            tutor_name: dto.context.tutorName,
            pet_name: dto.context.petName,
            pet_species: dto.context.petSpecies,
            current_date: dto.context.currentDate,
            custom_data: dto.context.customVariable,
          } : {},
          credentials: {
            api_key: credentials.apiKey,
            base_url: credentials.baseUrl,
          },
          temperature: agent.temperature,
          max_tokens: agent.maxTokens,
          rag_enabled: agent.ragEnabled ?? false,
          rag_knowledge_base_id: agent.knowledgeBaseId ?? null,
          rag_top_k: agent.ragTopK ?? 5,
          rag_threshold: agent.ragThreshold ?? 0.7,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        yield { type: 'error', error: error.message || 'Erro ao executar agente' };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'Stream não disponível' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.content) {
                fullContent += data.content;
                yield { type: 'content', content: data.content };
              } else if (data.type === 'rag_metadata') {
                ragMeta = {
                  chunksUsed: data.rag_chunks_used,
                  sources: data.rag_sources,
                  embeddingTokens: data.rag_embedding_tokens,
                  error: data.rag_error,
                };
                if (ragMeta.error) {
                  this.logger.warn(`RAG error during stream for agent ${id}: ${ragMeta.error}`);
                }
              } else if (data.type === 'usage') {
                usage = data.usage;
                yield { type: 'usage', usage: data.usage };
              } else if (data.type === 'done') {
                const costBreakdown = this.costCalculator.calculateTextCost(
                  usage as TokenUsage,
                  agent.model,
                  agent.provider,
                );

                let embeddingCostUsd = 0;
                if (ragMeta.embeddingTokens) {
                  const embCost = this.costCalculator.calculateEmbeddingCost(ragMeta.embeddingTokens);
                  embeddingCostUsd = embCost.totalCost;
                }

                const totalCostUsd = costBreakdown.totalCost + embeddingCostUsd;
                const latencyMs = Date.now() - startTime;

                const executionMetadata: Record<string, any> = dto.context
                  ? JSON.parse(JSON.stringify(dto.context))
                  : {};

                if (ragMeta.chunksUsed) {
                  executionMetadata.ragChunksUsed = ragMeta.chunksUsed;
                  executionMetadata.ragSources = ragMeta.sources || [];
                  executionMetadata.ragEmbeddingTokens = ragMeta.embeddingTokens || 0;
                }
                if (ragMeta.error) {
                  executionMetadata.ragError = ragMeta.error;
                }

                const execution = await this.prisma.agentExecution.create({
                  data: {
                    agentId: id,
                    status: 'SUCCESS',
                    input: dto.userMessage,
                    output: fullContent,
                    usage: usage,
                    costUsd: totalCostUsd,
                    latencyMs,
                    costBreakdown: {
                      promptCost: costBreakdown.promptCost,
                      completionCost: costBreakdown.completionCost,
                      embeddingCost: embeddingCostUsd,
                      textCost: costBreakdown.totalCost,
                      totalCost: totalCostUsd,
                      model: agent.model,
                      provider: agent.provider,
                    },
                    metadata: Object.keys(executionMetadata).length > 0 ? executionMetadata : undefined,
                  },
                });

                await this.updateAgentMetrics(id, latencyMs, true, totalCostUsd);
                await this.updateUserMonthlyCost(userId, totalCostUsd);

                yield {
                  type: 'done',
                  id: execution.id,
                  cost: {
                    textCostUsd: costBreakdown.totalCost,
                    embeddingCostUsd,
                    totalCostUsd,
                  },
                  rateLimit: {
                    remaining: rateLimitResult.remaining,
                    resetAt: rateLimitResult.resetAt,
                  },
                };
              } else if (data.type === 'error') {
                yield { type: 'error', error: data.error };
              }
            } catch (parseError) {
              this.logger.warn(`Failed to parse SSE data: ${line}`);
            }
          }
        }
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Record failed execution
      await this.prisma.agentExecution.create({
        data: {
          agentId: id,
          status: 'FAILED',
          input: dto.userMessage,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          latencyMs,
          metadata: dto.context ? JSON.parse(JSON.stringify(dto.context)) : null,
        },
      });

      await this.updateAgentMetrics(id, latencyMs, false);

      yield { type: 'error', error: error instanceof Error ? error.message : 'Erro ao executar agente' };
    }
  }

  async getMetrics(userId: string, id: string) {
    const agent = await this.findOne(userId, id);

    const executions = await this.prisma.agentExecution.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const successCount = executions.filter((e: { status: string }) => e.status === 'SUCCESS').length;
    const totalCount = executions.length;

    const avgLatency =
      executions.length > 0
        ? executions.reduce((sum: number, e: { latencyMs: number | null }) => sum + (e.latencyMs || 0), 0) / executions.length
        : 0;

    // Execuções por dia nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExecutions = await this.prisma.agentExecution.findMany({
      where: {
        agentId: id,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, status: true },
    });

    const dailyMap: Record<string, { total: number; success: number; failed: number }> = {};
    for (const exec of recentExecutions) {
      const date = exec.createdAt.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { total: 0, success: 0, failed: 0 };
      }
      dailyMap[date].total++;
      if (exec.status === 'SUCCESS') {
        dailyMap[date].success++;
      } else {
        dailyMap[date].failed++;
      }
    }

    const dailyExecutions = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalInteractions: agent.totalInteractions,
      successRate: agent.successRate,
      avgResponseTime: agent.avgResponseTime,
      lastActiveAt: agent.lastActiveAt,
      recentStats: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
        avgLatency: Math.round(avgLatency),
      },
      dailyExecutions,
    };
  }

  private async getProviderCredentials(
    userId: string,
    provider: 'OPENAI' | 'GEMINI' | 'DEEPSEEK',
  ): Promise<{ apiKey: string; baseUrl?: string } | null> {
    // First, try to get from environment variables (single-tenant mode)
    const envKeyMap: Record<string, string> = {
      OPENAI: 'integrations.openai.apiKey',
      GEMINI: 'integrations.gemini.apiKey',
      DEEPSEEK: 'integrations.deepseek.apiKey',
    };

    const envApiKey = this.configService.get<string>(envKeyMap[provider]);
    if (envApiKey) {
      this.logger.debug(`Using ${provider} API key from environment`);
      return { apiKey: envApiKey };
    }

    // Fallback: try to get from user's integration settings (multi-tenant mode)
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    if (!settings) return null;

    const configMap: Record<string, string | null> = {
      OPENAI: settings.openaiConfig,
      GEMINI: settings.geminiConfig,
      DEEPSEEK: settings.deepseekConfig,
    };

    const configString = configMap[provider];
    if (!configString) return null;

    try {
      const config = JSON.parse(configString);
      return {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      };
    } catch {
      return null;
    }
  }

  private async updateAgentMetrics(
    agentId: string,
    latencyMs: number,
    success: boolean,
    costUsd?: number,
  ) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) return;

    const newTotal = agent.totalInteractions + 1;
    const successCount = success
      ? Math.round((agent.successRate / 100) * agent.totalInteractions) + 1
      : Math.round((agent.successRate / 100) * agent.totalInteractions);
    const newSuccessRate = (successCount / newTotal) * 100;
    const newAvgLatency =
      (agent.avgResponseTime * agent.totalInteractions + latencyMs) / newTotal;

    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        totalInteractions: newTotal,
        successRate: newSuccessRate,
        avgResponseTime: newAvgLatency,
        lastActiveAt: new Date(),
        totalCostUsd: costUsd ? agent.totalCostUsd + costUsd : agent.totalCostUsd,
      },
    });
  }

  /**
   * Check if user is within budget
   */
  private async checkUserBudget(userId: string): Promise<{
    allowed: boolean;
    limit?: number;
    used?: number;
  }> {
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return { allowed: true }; // No settings = no limits
    }

    // Check if we need to reset monthly cost
    const now = new Date();
    const lastReset = new Date(settings.aiLastResetAt);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      await this.prisma.integrationSettings.update({
        where: { userId },
        data: {
          aiCurrentMonthCostUsd: 0,
          aiLastResetAt: now,
        },
      });
      return { allowed: true, limit: settings.aiMonthlyBudgetUsd ?? undefined, used: 0 };
    }

    // No budget limit set = unlimited
    if (!settings.aiMonthlyBudgetUsd) {
      return { allowed: true };
    }

    const allowed = settings.aiCurrentMonthCostUsd < settings.aiMonthlyBudgetUsd;
    return {
      allowed,
      limit: settings.aiMonthlyBudgetUsd,
      used: settings.aiCurrentMonthCostUsd,
    };
  }

  /**
   * Update user's monthly AI cost
   */
  private async updateUserMonthlyCost(userId: string, costUsd: number): Promise<void> {
    await this.prisma.integrationSettings.upsert({
      where: { userId },
      update: {
        aiCurrentMonthCostUsd: { increment: costUsd },
      },
      create: {
        userId,
        aiCurrentMonthCostUsd: costUsd,
        aiLastResetAt: new Date(),
      },
    });
  }

  /**
   * Get rate limit status for an agent
   */
  async getRateLimitStatus(userId: string, agentId: string) {
    const agent = await this.findOne(userId, agentId);

    return this.rateLimiter.getStatus(agentId, userId, {
      maxRequests: agent.rateLimitRequests,
      windowSeconds: agent.rateLimitWindow,
    });
  }

  /**
   * Reset rate limit for an agent
   */
  async resetRateLimit(userId: string, agentId: string) {
    await this.findOne(userId, agentId); // Verify ownership
    await this.rateLimiter.reset(agentId, userId);
    return { message: 'Rate limit reset successfully' };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitStatus() {
    return this.circuitBreaker.getStatus('ai-service');
  }

  /**
   * Get AI service cost pricing info
   */
  getPricing() {
    return {
      models: this.costCalculator.getAllPricing(),
      tts: this.costCalculator.getTTSPricing(),
    };
  }

  /**
   * Create a new version of an agent
   */
  async createVersion(userId: string, agentId: string, changeNotes?: string) {
    return this.versioning.createVersion(agentId, userId, changeNotes);
  }

  /**
   * Get all versions of an agent
   */
  async getVersions(userId: string, agentId: string, options?: { page?: number; limit?: number }) {
    return this.versioning.getVersions(agentId, userId, options);
  }

  /**
   * Get a specific version
   */
  async getVersion(userId: string, agentId: string, version: number) {
    return this.versioning.getVersion(agentId, version, userId);
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(userId: string, agentId: string, version: number) {
    await this.versioning.rollback(agentId, version, userId);
    return { message: `Successfully rolled back to version ${version}` };
  }

  /**
   * Compare two versions
   */
  async compareVersions(userId: string, agentId: string, version1: number, version2: number) {
    return this.versioning.compareVersions(agentId, version1, version2, userId);
  }

  /**
   * Get user's AI usage stats
   */
  async getUserAiUsage(userId: string) {
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    const agents = await this.prisma.aIAgent.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        totalCostUsd: true,
        totalInteractions: true,
      },
    });

    const totalAgentCost = agents.reduce((sum, a) => sum + a.totalCostUsd, 0);
    const totalInteractions = agents.reduce((sum, a) => sum + a.totalInteractions, 0);

    return {
      monthlyBudget: settings?.aiMonthlyBudgetUsd ?? null,
      currentMonthCost: settings?.aiCurrentMonthCostUsd ?? 0,
      budgetUsedPercent: settings?.aiMonthlyBudgetUsd
        ? ((settings.aiCurrentMonthCostUsd / settings.aiMonthlyBudgetUsd) * 100).toFixed(1)
        : null,
      lastResetAt: settings?.aiLastResetAt ?? null,
      totalCostAllTime: totalAgentCost,
      totalInteractions,
      agentBreakdown: agents.map(a => ({
        id: a.id,
        name: a.name,
        cost: a.totalCostUsd,
        interactions: a.totalInteractions,
      })),
    };
  }

  // Execute agent for WhatsApp conversation
  async executeForWhatsApp(
    agentId: string,
    conversationId: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    context?: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    executionId?: string;
  }> {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    if (agent.status !== 'ACTIVE') {
      return { success: false, error: 'Agent is not active' };
    }

    // Check rate limit
    const rateLimitResult = await this.rateLimiter.checkAndConsume(agentId, agent.userId, {
      maxRequests: agent.rateLimitRequests,
      windowSeconds: agent.rateLimitWindow,
    });

    if (!rateLimitResult.allowed) {
      return { success: false, error: `Rate limit excedido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.` };
    }

    // Check user budget
    const budgetCheck = await this.checkUserBudget(agent.userId);
    if (!budgetCheck.allowed) {
      return { success: false, error: `Orçamento mensal de AI excedido. Limite: $${budgetCheck.limit?.toFixed(2)}, Usado: $${budgetCheck.used?.toFixed(2)}` };
    }

    // Get credentials
    const credentials = await this.getProviderCredentials(
      agent.userId,
      agent.provider as 'OPENAI' | 'GEMINI' | 'DEEPSEEK',
    );

    if (!credentials) {
      return { success: false, error: `No credentials for provider ${agent.provider}` };
    }

    const startTime = Date.now();

    try {
      // Get conversation context from database
      const conversation = await this.prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
        include: {
          tutor: {
            include: {
              pets: true,
              contacts: true,
            },
          },
          messages: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Build context with mapped field names for Python AI service
      const tutorData = conversation?.tutor;
      const firstPet = tutorData?.pets?.[0];
      const contactName = conversation?.contactName || conversation?.contactPushName;

      const enrichedContext = {
        clinic_name: context?.clinicName || context?.clinic_name || 'Empório do Pet',
        tutor_name: tutorData?.name || contactName || context?.tutorName || context?.tutor_name,
        pet_name: firstPet?.name || context?.petName || context?.pet_name,
        pet_species: firstPet?.species || context?.petSpecies || context?.pet_species,
        current_date: new Date().toLocaleDateString('pt-BR'),
        custom_data: {
          conversationId,
          contactPhone: conversation?.contactPhone,
          contactName,
          tutor: tutorData ? {
            id: tutorData.id,
            name: tutorData.name,
            email: tutorData.email,
            pets: tutorData.pets.map(p => ({
              id: p.id,
              name: p.name,
              species: p.species,
              breed: p.breed,
            })),
          } : undefined,
          ...context,
        },
      };

      // Build conversation history from messages if not provided.
      // Skip the most recent inbound message since it's the current user_message
      // (already saved to DB before this method is called).
      const history = conversationHistory.length > 0
        ? conversationHistory
        : (conversation?.messages || [])
            .reverse()
            .filter((m, idx, arr) => {
              if (idx === arr.length - 1 && m.direction === 'INBOUND' && m.content === userMessage) {
                return false;
              }
              return true;
            })
            .slice(-10)
            .map(m => ({
              role: m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
              content: m.content,
            }));

      // Execute with circuit breaker and retry
      const result = await this.circuitBreaker.executeWithRetry(
        'ai-service',
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90_000);

          const response = await fetch(`${this.aiServiceUrl}/v1/agents/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              provider: agent.provider.toLowerCase(),
              model: agent.model,
              system_prompt: agent.systemPrompt,
              conversation_history: history,
              user_message: userMessage,
              context: enrichedContext,
              credentials: {
                api_key: credentials.apiKey,
                base_url: credentials.baseUrl,
              },
              temperature: agent.temperature,
              max_tokens: agent.maxTokens,
              rag_enabled: agent.ragEnabled ?? false,
              rag_knowledge_base_id: agent.knowledgeBaseId ?? null,
              rag_top_k: agent.ragTopK ?? 5,
              rag_threshold: agent.ragThreshold ?? 0.7,
            }),
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail?.message || error.message || 'AI service error');
          }

          return response.json();
        },
        {
          maxRetries: 2,
          retryDelay: 1000,
          backoffMultiplier: 2,
          retryOn: (error) => {
            const message = error.message.toLowerCase();
            return message.includes('timeout') ||
                   message.includes('network') ||
                   message.includes('503') ||
                   message.includes('502');
          },
        },
      );

      const latencyMs = Date.now() - startTime;

      // Calculate costs
      const usage = result.usage as TokenUsage;
      const costBreakdown = this.costCalculator.calculateTextCost(
        usage,
        agent.model,
        agent.provider,
      );

      let embeddingCostUsd = 0;
      if (result.rag_embedding_tokens) {
        const embCost = this.costCalculator.calculateEmbeddingCost(result.rag_embedding_tokens);
        embeddingCostUsd = embCost.totalCost;
      }

      const totalCostUsd = costBreakdown.totalCost + embeddingCostUsd;

      const executionMetadata: Record<string, any> = {
        source: 'whatsapp',
        conversationId,
        contactPhone: conversation?.contactPhone,
      };

      if (result.rag_chunks_used) {
        executionMetadata.ragChunksUsed = result.rag_chunks_used;
        executionMetadata.ragSources = result.rag_sources || [];
        executionMetadata.ragEmbeddingTokens = result.rag_embedding_tokens || 0;
      }

      if (result.rag_error) {
        executionMetadata.ragError = result.rag_error;
        this.logger.warn(`RAG retrieval error for WhatsApp agent ${agentId}: ${result.rag_error}`);
      }

      // Record execution with costs
      const execution = await this.prisma.agentExecution.create({
        data: {
          agentId,
          status: 'SUCCESS',
          input: userMessage,
          output: result.response,
          usage: result.usage,
          latencyMs,
          costUsd: totalCostUsd,
          costBreakdown: {
            promptCost: costBreakdown.promptCost,
            completionCost: costBreakdown.completionCost,
            embeddingCost: embeddingCostUsd,
            textCost: costBreakdown.totalCost,
            totalCost: totalCostUsd,
            model: agent.model,
            provider: agent.provider,
          },
          metadata: executionMetadata,
        },
      });

      // Update agent metrics with cost
      await this.updateAgentMetrics(agentId, latencyMs, true, totalCostUsd);

      // Update user's monthly cost
      await this.updateUserMonthlyCost(agent.userId, totalCostUsd);

      return {
        success: true,
        response: result.response,
        executionId: execution.id,
      };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failed execution
      await this.prisma.agentExecution.create({
        data: {
          agentId,
          status: 'FAILED',
          input: userMessage,
          error: errorMessage,
          latencyMs,
          metadata: {
            source: 'whatsapp',
            conversationId,
          },
        },
      });

      await this.updateAgentMetrics(agentId, latencyMs, false);

      return { success: false, error: errorMessage };
    }
  }

  // Get agent by ID (internal use, no user check)
  async getAgentById(agentId: string) {
    return this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });
  }

  // Get executions history
  async getExecutions(
    userId: string,
    agentId: string,
    options?: { page?: number; limit?: number; status?: string },
  ) {
    await this.findOne(userId, agentId);

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { agentId };

    if (options?.status) {
      where.status = options.status;
    }

    const [executions, total] = await Promise.all([
      this.prisma.agentExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          input: true,
          output: true,
          latencyMs: true,
          usage: true,
          error: true,
          createdAt: true,
        },
      }),
      this.prisma.agentExecution.count({ where }),
    ]);

    return {
      data: executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get detailed analytics
  async getAnalytics(
    userId: string,
    agentId: string,
    options?: { days?: number },
  ) {
    const agent = await this.findOne(userId, agentId);
    const days = options?.days || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all executions in the period
    const executions = await this.prisma.agentExecution.findMany({
      where: {
        agentId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate daily stats
    const dailyStats: Record<string, { total: number; success: number; failed: number; avgLatency: number }> = {};

    for (const exec of executions) {
      const date = exec.createdAt.toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, success: 0, failed: 0, avgLatency: 0 };
      }

      dailyStats[date].total++;
      
      if (exec.status === 'SUCCESS') {
        dailyStats[date].success++;
      } else {
        dailyStats[date].failed++;
      }

      dailyStats[date].avgLatency += exec.latencyMs || 0;
    }

    // Calculate averages
    for (const date of Object.keys(dailyStats)) {
      if (dailyStats[date].total > 0) {
        dailyStats[date].avgLatency = Math.round(dailyStats[date].avgLatency / dailyStats[date].total);
      }
    }

    // Calculate usage stats
    const usageStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
    };

    for (const exec of executions) {
      if (exec.usage) {
        const usage = exec.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        usageStats.totalTokens += usage.total_tokens || 0;
        usageStats.promptTokens += usage.prompt_tokens || 0;
        usageStats.completionTokens += usage.completion_tokens || 0;
      }
    }

    // Calculate source breakdown
    const sourceBreakdown: Record<string, number> = {};
    
    for (const exec of executions) {
      const metadata = exec.metadata as { source?: string } | null;
      const source = metadata?.source || 'direct';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    }

    // Top errors
    const errorCounts: Record<string, number> = {};
    
    for (const exec of executions) {
      if (exec.status === 'FAILED' && exec.error) {
        const errorKey = exec.error.substring(0, 100);
        errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
      }
    }

    const topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        provider: agent.provider,
        model: agent.model,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      summary: {
        totalExecutions: executions.length,
        successCount: executions.filter(e => e.status === 'SUCCESS').length,
        failedCount: executions.filter(e => e.status === 'FAILED').length,
        successRate: executions.length > 0
          ? ((executions.filter(e => e.status === 'SUCCESS').length / executions.length) * 100).toFixed(1)
          : '0',
        avgLatencyMs: executions.length > 0
          ? Math.round(executions.reduce((sum, e) => sum + (e.latencyMs || 0), 0) / executions.length)
          : 0,
      },
      usage: usageStats,
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })),
      sourceBreakdown: Object.entries(sourceBreakdown).map(([source, count]) => ({
        source,
        count,
        percentage: executions.length > 0
          ? ((count / executions.length) * 100).toFixed(1)
          : '0',
      })),
      topErrors,
    };
  }
}
