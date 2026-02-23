import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, TemplateStatus } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTemplateDto) {
    // Extrair variáveis do conteúdo automaticamente
    const extractedVariables = this.extractVariables(dto.content);
    const variables = dto.variables || extractedVariables;

    return this.prisma.agentTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'PERSONALIZADO',
        status: dto.status || 'DRAFT',
        content: dto.content,
        variables,
        provider: dto.provider,
        model: dto.model,
        isDefault: dto.isDefault || false,
      },
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
      includeDefaults?: boolean;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    // Incluir templates do usuário E templates padrão (se solicitado)
    const where: Record<string, unknown> = options?.includeDefaults
      ? {
          OR: [{ userId }, { isDefault: true }],
        }
      : { userId };

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

    const [templates, total] = await Promise.all([
      this.prisma.agentTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
        include: {
          _count: {
            select: {
              agents: true,
            },
          },
        },
      }),
      this.prisma.agentTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const template = await this.prisma.agentTemplate.findFirst({
      where: {
        id,
        OR: [{ userId }, { isDefault: true }],
      },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            agents: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return template;
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException(
        'Template não encontrado ou você não tem permissão para editá-lo',
      );
    }

    // Extrair variáveis se o conteúdo foi atualizado
    let variables = dto.variables;
    if (dto.content && !dto.variables) {
      variables = this.extractVariables(dto.content);
    }

    return this.prisma.agentTemplate.update({
      where: { id },
      data: {
        ...dto,
        variables: variables || undefined,
        updatedAt: new Date(),
      },
    });
  }

  async remove(userId: string, id: string) {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException(
        'Template não encontrado ou você não tem permissão para removê-lo',
      );
    }

    // Verificar se há agentes usando este template
    const agentsUsingTemplate = await this.prisma.aIAgent.count({
      where: { templateId: id },
    });

    if (agentsUsingTemplate > 0) {
      // Desassociar agentes do template ao invés de bloquear a remoção
      await this.prisma.aIAgent.updateMany({
        where: { templateId: id },
        data: { templateId: null },
      });
    }

    await this.prisma.agentTemplate.delete({
      where: { id },
    });

    return { message: 'Template removido com sucesso' };
  }

  async updateStatus(userId: string, id: string, status: TemplateStatus) {
    const template = await this.prisma.agentTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return this.prisma.agentTemplate.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async duplicate(userId: string, id: string, newName?: string) {
    const original = await this.findOne(userId, id);

    return this.prisma.agentTemplate.create({
      data: {
        userId,
        name: newName || `${original.name} (Cópia)`,
        description: original.description,
        category: original.category,
        status: 'DRAFT',
        content: original.content,
        variables: original.variables,
        provider: original.provider,
        model: original.model,
        isDefault: false,
      },
    });
  }

  async incrementUsage(id: string) {
    return this.prisma.agentTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  async getCategories() {
    return [
      { value: 'ATENDIMENTO', label: 'Atendimento', icon: '💬' },
      { value: 'VENDAS', label: 'Vendas', icon: '💰' },
      { value: 'MARKETING', label: 'Marketing', icon: '📢' },
      { value: 'SUPORTE', label: 'Suporte', icon: '🔧' },
      { value: 'AGENDAMENTO', label: 'Agendamento', icon: '📅' },
      { value: 'PERSONALIZADO', label: 'Personalizado', icon: '⚙️' },
    ];
  }

  // Export template(s) as JSON
  async exportTemplates(userId: string, templateIds?: string[]) {
    const where: Record<string, unknown> = templateIds
      ? { id: { in: templateIds }, OR: [{ userId }, { isDefault: true }] }
      : { OR: [{ userId }, { isDefault: true }] };

    const templates = await this.prisma.agentTemplate.findMany({
      where,
      select: {
        name: true,
        description: true,
        category: true,
        content: true,
        variables: true,
        provider: true,
        model: true,
      },
    });

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: templates.length,
      templates,
    };
  }

  // Export single template
  async exportTemplate(userId: string, id: string) {
    const template = await this.findOne(userId, id);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        variables: template.variables,
        provider: template.provider,
        model: template.model,
      },
    };
  }

  // Import templates from JSON
  async importTemplates(
    userId: string,
    templatesData: Array<{
      name: string;
      description?: string;
      category?: string;
      content: string;
      variables?: string[];
      provider?: string;
      model?: string;
    }>,
  ) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const templateData of templatesData) {
      try {
        // Verificar se já existe um template com o mesmo nome
        const existing = await this.prisma.agentTemplate.findFirst({
          where: { userId, name: templateData.name },
        });

        if (existing) {
          results.skipped++;
          results.errors.push(`Template "${templateData.name}" já existe (pulado)`);
          continue;
        }

        // Extrair variáveis se não fornecidas
        const variables = templateData.variables || this.extractVariables(templateData.content);

        await this.prisma.agentTemplate.create({
          data: {
            userId,
            name: templateData.name,
            description: templateData.description,
            category: (templateData.category as 'ATENDIMENTO' | 'VENDAS' | 'MARKETING' | 'SUPORTE' | 'AGENDAMENTO' | 'PERSONALIZADO') || 'PERSONALIZADO',
            status: 'DRAFT',
            content: templateData.content,
            variables,
            provider: templateData.provider as 'OPENAI' | 'GEMINI' | 'DEEPSEEK' | undefined,
            model: templateData.model,
            isDefault: false,
          },
        });

        results.imported++;
      } catch (error) {
        results.errors.push(
          `Erro ao importar "${templateData.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        );
      }
    }

    return results;
  }

  private extractVariables(content: string): string[] {
    const regex = /\{([^}]+)\}/g;
    const matches = content.match(regex);

    if (!matches) return [];

    // Extrair nomes únicos das variáveis
    const variables = matches
      .map((match) => match.replace('{', '').replace('}', ''))
      .filter((v, i, arr) => arr.indexOf(v) === i);

    return variables;
  }
}
