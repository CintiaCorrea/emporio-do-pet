import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAutomationDto,
  AgentStatus,
  AutomationStepDto,
} from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
// Type for Prisma transaction client
type TransactionClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Inline types for Automation-related entities
interface AutomationLogRecord {
  id: string;
  status: string;
  duration: number | null;
  createdAt: Date;
}

interface AutomationStepRecord {
  id: string;
  type: string;
  name: string;
  config: unknown;
  position: number;
}

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAutomationDto) {
    // Criar automação com steps em uma transação
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const automation = await tx.automation.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description,
          category: dto.category || 'ATENDIMENTO',
          status: dto.status || 'DRAFT',
          trigger: dto.trigger || 'MANUAL',
          triggerConfig: dto.triggerConfig
            ? JSON.parse(JSON.stringify(dto.triggerConfig))
            : null,
          agentId: dto.agentId,
        },
      });

      // Criar steps se fornecidos
      if (dto.steps && dto.steps.length > 0) {
        await this.createSteps(tx, automation.id, dto.steps);
      }

      return this.findOneById(tx, automation.id);
    });
  }

  async findAll(
    userId: string,
    options?: {
      category?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [automations, total] = await Promise.all([
      this.prisma.automation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          steps: {
            orderBy: { position: 'asc' },
          },
          _count: {
            select: {
              logs: true,
              steps: true,
            },
          },
        },
      }),
      this.prisma.automation.count({ where }),
    ]);

    return {
      data: automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId },
      include: {
        agent: true,
        steps: {
          orderBy: { position: 'asc' },
        },
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            logs: true,
            steps: true,
          },
        },
      },
    });

    if (!automation) {
      throw new NotFoundException('Automação não encontrada');
    }

    return automation;
  }

  async update(userId: string, id: string, dto: UpdateAutomationDto) {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx: TransactionClient) => {
      // Atualizar automação
      await tx.automation.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          status: dto.status,
          trigger: dto.trigger,
          triggerConfig: dto.triggerConfig
            ? JSON.parse(JSON.stringify(dto.triggerConfig))
            : undefined,
          agentId: dto.agentId,
          updatedAt: new Date(),
        },
      });

      // Se steps foram fornecidos, substituir todos
      if (dto.steps !== undefined) {
        await tx.automationStep.deleteMany({ where: { automationId: id } });

        if (dto.steps.length > 0) {
          await this.createSteps(tx, id, dto.steps);
        }
      }

      return this.findOneById(tx, id);
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.automation.delete({
      where: { id },
    });

    return { message: 'Automação removida com sucesso' };
  }

  async updateStatus(userId: string, id: string, status: AgentStatus) {
    await this.findOne(userId, id);

    return this.prisma.automation.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async duplicate(userId: string, id: string, newName?: string) {
    const original = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const automation = await tx.automation.create({
        data: {
          userId,
          name: newName || `${original.name} (Cópia)`,
          description: original.description,
          category: original.category,
          status: 'DRAFT',
          trigger: original.trigger,
          triggerConfig: original.triggerConfig
            ? JSON.parse(JSON.stringify(original.triggerConfig))
            : null,
          agentId: original.agentId,
        },
      });

      // Copiar steps
      if (original.steps.length > 0) {
        const steps = original.steps.map((step: AutomationStepRecord) => ({
          type: step.type,
          name: step.name,
          config: step.config,
        }));
        await this.createSteps(tx, automation.id, steps as AutomationStepDto[]);
      }

      return this.findOneById(tx, automation.id);
    });
  }

  async execute(
    userId: string,
    id: string,
    triggeredBy: string = 'manual',
    metadata?: Record<string, unknown>,
  ) {
    const automation = await this.findOne(userId, id);

    if (automation.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Automação não está ativa. Ative a automação antes de executar.',
      );
    }

    const startTime = Date.now();

    try {
      // Criar log de execução
      const log = await this.prisma.automationLog.create({
        data: {
          automationId: id,
          status: 'RUNNING',
          triggeredBy,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      // Executar cada step em ordem
      let stepsExecuted = 0;

      for (const step of automation.steps) {
        await this.executeStep(userId, automation, step);
        stepsExecuted++;
      }

      const duration = Date.now() - startTime;

      // Atualizar log com sucesso
      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          duration,
          stepsExecuted,
        },
      });

      // Atualizar métricas da automação
      await this.updateAutomationMetrics(id, duration, true);

      return {
        success: true,
        logId: log.id,
        duration,
        stepsExecuted,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Registrar falha
      await this.prisma.automationLog.create({
        data: {
          automationId: id,
          status: 'FAILED',
          triggeredBy,
          duration,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });

      // Atualizar métricas
      await this.updateAutomationMetrics(id, duration, false);

      throw error;
    }
  }

  async getLogs(
    userId: string,
    id: string,
    options?: { page?: number; limit?: number },
  ) {
    await this.findOne(userId, id);

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.automationLog.findMany({
        where: { automationId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.automationLog.count({ where: { automationId: id } }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(userId: string, id: string) {
    const automation = await this.findOne(userId, id);

    const logs = await this.prisma.automationLog.findMany({
      where: { automationId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const successCount = logs.filter((l: AutomationLogRecord) => l.status === 'SUCCESS').length;
    const totalCount = logs.length;

    const avgDuration =
      logs.length > 0
        ? logs.reduce((sum: number, l: AutomationLogRecord) => sum + (l.duration || 0), 0) / logs.length
        : 0;

    // Execuções por dia nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyExecutions = await this.prisma.automationLog.groupBy({
      by: ['createdAt'],
      where: {
        automationId: id,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    return {
      totalExecutions: automation.executions,
      successRate: automation.successRate,
      avgDuration: automation.avgDuration,
      lastRunAt: automation.lastRunAt,
      recentStats: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
        avgDuration: Math.round(avgDuration),
      },
      dailyExecutions,
    };
  }

  async getCategories() {
    return [
      { value: 'ATENDIMENTO', label: 'Atendimento', icon: '💬' },
      { value: 'MARKETING', label: 'Marketing', icon: '📢' },
      { value: 'NOTIFICACAO', label: 'Notificação', icon: '🔔' },
      { value: 'INTEGRACAO', label: 'Integração', icon: '🔗' },
      { value: 'AGENDAMENTO', label: 'Agendamento', icon: '📅' },
    ];
  }

  async getTriggerTypes() {
    return [
      { value: 'MANUAL', label: 'Manual', description: 'Executar manualmente' },
      {
        value: 'SCHEDULE',
        label: 'Agendado',
        description: 'Executar em horários específicos',
      },
      {
        value: 'EVENT',
        label: 'Evento',
        description: 'Executar quando um evento ocorrer',
      },
      {
        value: 'WEBHOOK',
        label: 'Webhook',
        description: 'Executar via chamada HTTP',
      },
    ];
  }

  async getStepTypes() {
    return [
      { value: 'query', label: 'Consulta', description: 'Buscar dados no banco' },
      {
        value: 'filter',
        label: 'Filtro',
        description: 'Filtrar resultados anteriores',
      },
      {
        value: 'message',
        label: 'Mensagem',
        description: 'Enviar mensagem WhatsApp',
      },
      { value: 'email', label: 'E-mail', description: 'Enviar e-mail' },
      { value: 'delay', label: 'Aguardar', description: 'Pausar execução' },
      { value: 'webhook', label: 'Webhook', description: 'Chamar URL externa' },
      { value: 'ai_chat', label: 'IA Chat', description: 'Gerar texto com IA' },
      {
        value: 'notification',
        label: 'Notificação',
        description: 'Enviar notificação no sistema',
      },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createSteps(tx: any, automationId: string, steps: AutomationStepDto[]) {
    const stepsData = steps.map((step, index) => ({
      automationId,
      type: step.type,
      name: step.name,
      config: step.config ? JSON.parse(JSON.stringify(step.config)) : null,
      position: index,
    }));

    await tx.automationStep.createMany({
      data: stepsData,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async findOneById(tx: any, id: string) {
    return tx.automation.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        steps: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            logs: true,
            steps: true,
          },
        },
      },
    });
  }

  /**
   * Execute a single automation step.
   * Note: For production use, prefer AutomationsProcessor which has full integration
   * with WhatsApp, Email, and AI services. This method provides basic execution
   * for testing and simple use cases.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeStep(_userId: string, _automation: any, step: any, context: Record<string, unknown> = {}): Promise<unknown> {
    const config = (step.config || {}) as Record<string, unknown>;
    
    switch (step.type) {
      case 'delay':
        const delayMs = Math.min(Number(config.duration) || 1000, 30000); // Max 30s
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return { delayed: true, duration: delayMs };

      case 'ai_chat':
        // Returns placeholder - full implementation in AutomationsProcessor
        return { 
          message: 'AI Chat step - use AutomationsProcessor for full AI integration',
          prompt: config.prompt,
          provider: config.provider || 'openai'
        };

      case 'message':
        // Returns placeholder - full implementation in AutomationsProcessor
        return { 
          message: 'Message step - use AutomationsProcessor for WhatsApp integration',
          template: config.template,
          phoneField: config.phoneField
        };

      case 'email':
        // Returns placeholder - full implementation in AutomationsProcessor
        return { 
          message: 'Email step - use AutomationsProcessor for email integration',
          subject: config.subject,
          template: config.template
        };

      case 'webhook':
        // Execute webhook call
        const url = config.url as string;
        const method = (config.method as string) || 'POST';
        const headers = (config.headers as Record<string, string>) || {};
        const body = config.body || context;

        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: method !== 'GET' ? JSON.stringify(body) : undefined,
          });

          const responseData = await response.json().catch(() => ({}));
          return {
            success: response.ok,
            status: response.status,
            data: responseData,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Webhook failed',
          };
        }

      case 'query':
        // Execute database query
        const entity = config.entity as string;
        const queryConfig = config.query as Record<string, unknown> || {};
        const queryLimit = Number(queryConfig.limit) || 100;
        const queryWhere = queryConfig.where as Record<string, unknown> | undefined;
        
        switch (entity) {
          case 'tutors':
            return this.prisma.tutor.findMany({ 
              take: queryLimit,
              where: queryWhere as any,
            });
          case 'pets':
            return this.prisma.pet.findMany({ 
              take: queryLimit,
              where: queryWhere as any,
              include: { tutor: true },
            });
          case 'appointments':
            return this.prisma.appointment.findMany({
              take: queryLimit,
              where: queryWhere as any,
              include: { tutor: true, pet: true },
              orderBy: { date: 'asc' },
            });
          case 'products':
            return this.prisma.product.findMany({
              take: queryLimit,
              where: queryWhere as any,
            });
          // CRM Entities
          case 'leads':
            return this.prisma.lead.findMany({
              take: queryLimit,
              where: queryWhere as any,
              include: {
                enrichment: true,
                events: { take: 5, orderBy: { createdAt: 'desc' } },
                insights: { where: { dismissed: false }, take: 3 },
              },
              orderBy: { lastSeenAt: 'desc' },
            });
          case 'clients':
            // Client unificado em Tutor com classificacao=Cliente
            return this.prisma.tutor.findMany({
              take: queryLimit,
              where: { ...(queryWhere as any), classificacao: 'Cliente' },
              orderBy: { createdAt: 'desc' },
            });
          case 'whatsapp_conversations':
            return this.prisma.whatsAppConversation.findMany({
              take: queryLimit,
              where: queryWhere as any,
              include: {
                messages: { take: 1, orderBy: { createdAt: 'desc' } },
              },
              orderBy: { lastMessageAt: 'desc' },
            });
          default:
            return [];
        }

      case 'filter':
        // Filter data from previous step
        const previousStepKey = Object.keys(context)
          .filter(k => k.startsWith('step_'))
          .sort()
          .pop();
        
        const data = previousStepKey ? (context[previousStepKey] as unknown[]) : [];
        if (!Array.isArray(data)) return data;

        const field = config.field as string;
        const operator = config.operator as string;
        const value = config.value;

        if (!field || !operator) return data;

        return data.filter((item: any) => {
          const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
          
          switch (operator) {
            case 'equals':
            case '==':
              return fieldValue === value;
            case 'not_equals':
            case '!=':
              return fieldValue !== value;
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
            case 'greater_than':
            case '>':
              return Number(fieldValue) > Number(value);
            case 'less_than':
            case '<':
              return Number(fieldValue) < Number(value);
            case 'in':
              const inValues = Array.isArray(value) ? value : String(value).split(',');
              return inValues.includes(fieldValue);
            case 'is_null':
              return fieldValue === null || fieldValue === undefined;
            case 'is_not_null':
              return fieldValue !== null && fieldValue !== undefined;
            default:
              return true;
          }
        });

      case 'notification':
        // Create in-app notification
        return {
          type: 'notification',
          title: config.title,
          message: config.message,
          createdAt: new Date().toISOString(),
        };

      default:
        console.log(`Step type ${step.type} not implemented in service`);
        return { skipped: true, type: step.type };
    }
  }

  private async updateAutomationMetrics(
    automationId: string,
    duration: number,
    success: boolean,
  ) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) return;

    const newTotal = automation.executions + 1;
    const successCount = success
      ? Math.round((automation.successRate / 100) * automation.executions) + 1
      : Math.round((automation.successRate / 100) * automation.executions);
    const newSuccessRate = (successCount / newTotal) * 100;
    const newAvgDuration =
      (automation.avgDuration * automation.executions + duration) / newTotal;

    await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        executions: newTotal,
        successRate: newSuccessRate,
        avgDuration: newAvgDuration,
        lastRunAt: new Date(),
      },
    });
  }
}
