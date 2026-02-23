import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppTemplatesService } from '../../whatsapp-templates/whatsapp-templates.service';

export interface CreateAgentTemplateDto {
  name: string;
  description?: string;
  category?: string;
  content: string;
  variables?: string[];
  provider?: string;
  model?: string;
  isDefault?: boolean;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  defaultVoiceEnabled?: boolean;
  defaultVoiceId?: string;
  defaultVoiceSpeed?: number;
  defaultVoiceModel?: string;
}

export interface UpdateAgentTemplateDto extends Partial<CreateAgentTemplateDto> {
  status?: string;
}

export interface AgentTemplateWithWhatsApp {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  content: string;
  variables: string[];
  provider?: string;
  model?: string;
  isDefault: boolean;
  usageCount: number;
  rating?: number;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappTemplateId?: string;
  isWhatsAppLinked: boolean;
  whatsappTemplateStatus?: string;
  defaultVoiceEnabled: boolean;
  defaultVoiceId: string;
  defaultVoiceSpeed: number;
  defaultVoiceModel: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AgentTemplatesService {
  private readonly logger = new Logger(AgentTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappTemplatesService: WhatsAppTemplatesService,
  ) {}

  /**
   * Create a new agent template
   */
  async create(userId: string, dto: CreateAgentTemplateDto): Promise<AgentTemplateWithWhatsApp> {
    // Check for duplicate name
    const existing = await this.prisma.agentTemplate.findFirst({
      where: { userId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Template with name "${dto.name}" already exists`);
    }

    // If linking to WhatsApp template, verify it exists
    let whatsappTemplateId: string | undefined;
    if (dto.whatsappTemplateName) {
      const waTemplate = await this.whatsappTemplatesService.getTemplateByName(
        userId,
        dto.whatsappTemplateName,
      );

      if (!waTemplate) {
        throw new BadRequestException(
          `WhatsApp template "${dto.whatsappTemplateName}" not found`,
        );
      }

      whatsappTemplateId = waTemplate.id;
    }

    const template = await this.prisma.agentTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        category: (dto.category as any) || 'PERSONALIZADO',
        content: dto.content,
        variables: dto.variables || [],
        provider: dto.provider as any,
        model: dto.model,
        isDefault: dto.isDefault ?? false,
        whatsappTemplateName: dto.whatsappTemplateName,
        whatsappTemplateLanguage: dto.whatsappTemplateLanguage || 'pt_BR',
        whatsappTemplateId,
        isWhatsAppLinked: !!dto.whatsappTemplateName,
        defaultVoiceEnabled: dto.defaultVoiceEnabled ?? false,
        defaultVoiceId: dto.defaultVoiceId ?? 'nova',
        defaultVoiceSpeed: dto.defaultVoiceSpeed ?? 1.0,
        defaultVoiceModel: dto.defaultVoiceModel ?? 'tts-1',
      },
    });

    return this.mapToResponse(template);
  }

  /**
   * Get all templates for a user
   */
  async findAll(
    userId: string,
    options?: {
      category?: string;
      status?: string;
      isWhatsAppLinked?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.isWhatsAppLinked !== undefined) {
      where.isWhatsAppLinked = options.isWhatsAppLinked;
    }

    const [templates, total] = await Promise.all([
      this.prisma.agentTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        include: {
          _count: {
            select: { agents: true },
          },
        },
      }),
      this.prisma.agentTemplate.count({ where }),
    ]);

    return {
      data: templates.map((t) => ({
        ...this.mapToResponse(t),
        agentCount: t._count.agents,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single template
   */
  async findOne(userId: string, id: string): Promise<AgentTemplateWithWhatsApp> {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          take: 10,
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Get WhatsApp template status if linked
    let whatsappStatus: string | undefined;
    if (template.isWhatsAppLinked && template.whatsappTemplateName) {
      try {
        const waTemplate = await this.whatsappTemplatesService.getTemplateByName(
          userId,
          template.whatsappTemplateName,
        );
        whatsappStatus = waTemplate?.status;
      } catch {
        this.logger.warn(`Could not fetch WhatsApp template status for ${template.whatsappTemplateName}`);
      }
    }

    return {
      ...this.mapToResponse(template),
      whatsappTemplateStatus: whatsappStatus,
    };
  }

  /**
   * Update a template
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateAgentTemplateDto,
  ): Promise<AgentTemplateWithWhatsApp> {
    const existing = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    // Check name conflict
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.agentTemplate.findFirst({
        where: { userId, name: dto.name, id: { not: id } },
      });

      if (nameConflict) {
        throw new ConflictException(`Template with name "${dto.name}" already exists`);
      }
    }

    // Handle WhatsApp template linking
    let whatsappTemplateId = existing.whatsappTemplateId;
    let isWhatsAppLinked = existing.isWhatsAppLinked;

    if (dto.whatsappTemplateName !== undefined) {
      if (dto.whatsappTemplateName) {
        const waTemplate = await this.whatsappTemplatesService.getTemplateByName(
          userId,
          dto.whatsappTemplateName,
        );

        if (!waTemplate) {
          throw new BadRequestException(
            `WhatsApp template "${dto.whatsappTemplateName}" not found`,
          );
        }

        whatsappTemplateId = waTemplate.id;
        isWhatsAppLinked = true;
      } else {
        whatsappTemplateId = null;
        isWhatsAppLinked = false;
      }
    }

    const template = await this.prisma.agentTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category as any }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.content && { content: dto.content }),
        ...(dto.variables && { variables: dto.variables }),
        ...(dto.provider !== undefined && { provider: dto.provider as any }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.whatsappTemplateName !== undefined && {
          whatsappTemplateName: dto.whatsappTemplateName || null,
          whatsappTemplateId,
          isWhatsAppLinked,
        }),
        ...(dto.whatsappTemplateLanguage && {
          whatsappTemplateLanguage: dto.whatsappTemplateLanguage,
        }),
        ...(dto.defaultVoiceEnabled !== undefined && {
          defaultVoiceEnabled: dto.defaultVoiceEnabled,
        }),
        ...(dto.defaultVoiceId && { defaultVoiceId: dto.defaultVoiceId }),
        ...(dto.defaultVoiceSpeed !== undefined && {
          defaultVoiceSpeed: dto.defaultVoiceSpeed,
        }),
        ...(dto.defaultVoiceModel && { defaultVoiceModel: dto.defaultVoiceModel }),
      },
    });

    return this.mapToResponse(template);
  }

  /**
   * Delete a template
   */
  async remove(userId: string, id: string): Promise<void> {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { agents: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template._count.agents > 0) {
      throw new BadRequestException(
        `Cannot delete template that is in use by ${template._count.agents} agent(s)`,
      );
    }

    await this.prisma.agentTemplate.delete({ where: { id } });
  }

  /**
   * Sync WhatsApp template data
   */
  async syncWhatsAppTemplate(userId: string, id: string): Promise<AgentTemplateWithWhatsApp> {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!template.whatsappTemplateName) {
      throw new BadRequestException('Template is not linked to a WhatsApp template');
    }

    const waTemplate = await this.whatsappTemplatesService.getTemplateByName(
      userId,
      template.whatsappTemplateName,
    );

    if (!waTemplate) {
      // WhatsApp template no longer exists - unlink
      const updated = await this.prisma.agentTemplate.update({
        where: { id },
        data: {
          whatsappTemplateId: null,
          isWhatsAppLinked: false,
        },
      });

      return {
        ...this.mapToResponse(updated),
        whatsappTemplateStatus: 'NOT_FOUND',
      };
    }

    // Update template ID if changed
    if (waTemplate.id !== template.whatsappTemplateId) {
      await this.prisma.agentTemplate.update({
        where: { id },
        data: { whatsappTemplateId: waTemplate.id },
      });
    }

    return {
      ...this.mapToResponse(template),
      whatsappTemplateId: waTemplate.id,
      whatsappTemplateStatus: waTemplate.status,
    };
  }

  /**
   * Get available WhatsApp templates that can be linked
   */
  async getAvailableWhatsAppTemplates(userId: string) {
    const result = await this.whatsappTemplatesService.listTemplates(userId, {
      status: 'APPROVED',
    });

    if (result.error) {
      return { templates: [], error: result.error };
    }

    // Get already linked templates
    const linkedTemplates = await this.prisma.agentTemplate.findMany({
      where: { userId, isWhatsAppLinked: true },
      select: { whatsappTemplateName: true },
    });

    const linkedNames = new Set(linkedTemplates.map((t) => t.whatsappTemplateName));

    return {
      templates: result.templates.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        isLinked: linkedNames.has(t.name),
      })),
    };
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    await this.prisma.agentTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * Create agent from template
   */
  async createAgentFromTemplate(
    userId: string,
    templateId: string,
    agentName: string,
    overrides?: {
      description?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
    },
  ) {
    const template = await this.findOne(userId, templateId);

    // Increment usage count
    await this.incrementUsage(templateId);

    // Create the agent with template defaults
    const agentData = {
      userId,
      name: agentName,
      description: overrides?.description || template.description,
      type: 'CHATBOT' as const,
      status: 'DRAFT' as const,
      provider: (overrides?.provider || template.provider || 'OPENAI') as 'OPENAI' | 'GEMINI' | 'DEEPSEEK',
      model: overrides?.model || template.model || 'gpt-4o-mini',
      systemPrompt: overrides?.systemPrompt || template.content,
      temperature: 0.7,
      maxTokens: 4096,
      templateId,
      voiceEnabled: template.defaultVoiceEnabled,
      voiceId: template.defaultVoiceId,
      voiceSpeed: template.defaultVoiceSpeed,
      voiceModel: template.defaultVoiceModel,
    };

    return this.prisma.aIAgent.create({
      data: agentData,
      include: { template: true },
    });
  }

  /**
   * Get default templates (system-wide)
   */
  async getDefaultTemplates() {
    return this.prisma.agentTemplate.findMany({
      where: { isDefault: true },
      orderBy: { category: 'asc' },
    });
  }

  private mapToResponse(template: any): AgentTemplateWithWhatsApp {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      status: template.status,
      content: template.content,
      variables: template.variables,
      provider: template.provider,
      model: template.model,
      isDefault: template.isDefault,
      usageCount: template.usageCount,
      rating: template.rating,
      whatsappTemplateName: template.whatsappTemplateName,
      whatsappTemplateLanguage: template.whatsappTemplateLanguage,
      whatsappTemplateId: template.whatsappTemplateId,
      isWhatsAppLinked: template.isWhatsAppLinked,
      defaultVoiceEnabled: template.defaultVoiceEnabled,
      defaultVoiceId: template.defaultVoiceId,
      defaultVoiceSpeed: template.defaultVoiceSpeed,
      defaultVoiceModel: template.defaultVoiceModel,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
