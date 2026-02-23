import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSimpleTemplateDto,
  TemplateCategory,
  TemplateLanguage,
  HeaderFormat,
  ButtonType,
  ComponentType,
} from './dto/create-whatsapp-template.dto';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
}

export interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
  example?: Record<string, unknown>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  quality_score?: {
    score: string;
    date: string;
  };
  rejected_reason?: string;
  previous_category?: string;
}

export interface TemplateListResponse {
  templates: WhatsAppTemplate[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
  error?: string;
}

@Injectable()
export class WhatsAppTemplatesService {
  private readonly logger = new Logger(WhatsAppTemplatesService.name);
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly apiVersion: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
  }

  /**
   * Get WhatsApp config for a user
   */
  async getUserConfig(userId: string): Promise<WhatsAppConfig | null> {
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    const whatsappConfig = settings?.whatsappConfig as {
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    } | null;

    if (!whatsappConfig?.accessToken || !whatsappConfig?.businessAccountId) {
      return null;
    }

    return {
      accessToken: whatsappConfig.accessToken,
      phoneNumberId: whatsappConfig.phoneNumberId || '',
      businessAccountId: whatsappConfig.businessAccountId,
    };
  }

  /**
   * List all message templates
   */
  async listTemplates(
    userId: string,
    options?: {
      status?: string;
      category?: string;
      limit?: number;
      after?: string;
    },
  ): Promise<TemplateListResponse> {
    const config = await this.getUserConfig(userId);

    if (!config) {
      return { templates: [], error: 'WhatsApp not configured' };
    }

    try {
      const params = new URLSearchParams();
      params.append('limit', String(options?.limit || 100));

      if (options?.status) {
        params.append('status', options.status);
      }
      if (options?.category) {
        params.append('category', options.category);
      }
      if (options?.after) {
        params.append('after', options.after);
      }

      // Request fields we need
      params.append(
        'fields',
        'id,name,status,category,language,components,quality_score,rejected_reason,previous_category',
      );

      const url = `${this.baseUrl}/${this.apiVersion}/${config.businessAccountId}/message_templates?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to list templates: ${JSON.stringify(data.error)}`);
        return {
          templates: [],
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      return {
        templates: data.data || [],
        paging: data.paging,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error listing templates: ${message}`);
      return { templates: [], error: message };
    }
  }

  /**
   * Get template details by ID
   */
  async getTemplate(userId: string, templateId: string): Promise<WhatsAppTemplate | null> {
    const config = await this.getUserConfig(userId);

    if (!config) {
      throw new BadRequestException('WhatsApp not configured');
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${templateId}?fields=id,name,status,category,language,components,quality_score,rejected_reason`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new BadRequestException(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Error getting template: ${message}`);
    }
  }

  /**
   * Get template by name
   */
  async getTemplateByName(userId: string, name: string): Promise<WhatsAppTemplate | null> {
    const result = await this.listTemplates(userId);

    if (result.error) {
      throw new BadRequestException(result.error);
    }

    return result.templates.find((t) => t.name === name) || null;
  }

  /**
   * Create a new message template
   */
  async createTemplate(
    userId: string,
    dto: CreateSimpleTemplateDto,
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const config = await this.getUserConfig(userId);

    if (!config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      // Build components array
      const components: TemplateComponent[] = [];

      // Header component (optional)
      if (dto.headerText || dto.headerFormat) {
        const headerComponent: TemplateComponent = {
          type: 'HEADER',
          format: dto.headerFormat || 'TEXT',
        };

        if (dto.headerFormat === HeaderFormat.TEXT || !dto.headerFormat) {
          headerComponent.text = dto.headerText;

          // Add examples for variables in header
          if (dto.headerExamples && dto.headerExamples.length > 0) {
            headerComponent.example = {
              header_text: dto.headerExamples,
            };
          }
        } else {
          // For media headers, add handle example
          if (dto.headerExamples && dto.headerExamples.length > 0) {
            headerComponent.example = {
              header_handle: dto.headerExamples,
            };
          }
        }

        components.push(headerComponent);
      }

      // Body component (required)
      const bodyComponent: TemplateComponent = {
        type: 'BODY',
        text: dto.bodyText,
      };

      // Add examples for variables in body
      if (dto.bodyExamples && dto.bodyExamples.length > 0) {
        bodyComponent.example = {
          body_text: [dto.bodyExamples],
        };
      }

      components.push(bodyComponent);

      // Footer component (optional)
      if (dto.footerText) {
        components.push({
          type: 'FOOTER',
          text: dto.footerText,
        });
      }

      // Buttons component (optional)
      if (dto.buttons && dto.buttons.length > 0) {
        const mappedButtons = dto.buttons.map((btn) => {
          const button: {
            type: string;
            text?: string;
            url?: string;
            phone_number?: string;
            example?: string[];
          } = {
            type: btn.type,
            text: btn.text,
          };

          if (btn.type === ButtonType.URL && btn.url) {
            button.url = btn.url;
            // URL with variable needs example
            if (btn.url.includes('{{')) {
              button.example = [btn.example || 'https://example.com'];
            }
          }

          if (btn.type === ButtonType.PHONE_NUMBER && btn.phone_number) {
            button.phone_number = btn.phone_number;
          }

          if (btn.type === ButtonType.COPY_CODE && btn.example) {
            button.example = [btn.example];
          }

          return button;
        });

        const buttonsComponent: TemplateComponent = {
          type: 'BUTTONS',
          buttons: mappedButtons,
        };

        components.push(buttonsComponent);
      }

      // Prepare request body
      const requestBody = {
        name: this.sanitizeTemplateName(dto.name),
        category: dto.category,
        language: dto.language || TemplateLanguage.PT_BR,
        components,
        allow_category_change: true,
      };

      this.logger.log(`Creating template: ${requestBody.name}`);
      this.logger.debug(`Template payload: ${JSON.stringify(requestBody, null, 2)}`);

      const url = `${this.baseUrl}/${this.apiVersion}/${config.businessAccountId}/message_templates`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to create template: ${JSON.stringify(data.error)}`);
        return {
          success: false,
          error: data.error?.message || data.error?.error_user_msg || `HTTP ${response.status}`,
        };
      }

      this.logger.log(`Template created successfully: ${data.id}`);

      return {
        success: true,
        templateId: data.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating template: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Update an existing template (only possible for REJECTED or PAUSED templates)
   */
  async updateTemplate(
    userId: string,
    templateId: string,
    dto: Partial<CreateSimpleTemplateDto>,
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getUserConfig(userId);

    if (!config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    // First, get the current template to check status
    const template = await this.getTemplate(userId, templateId);

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Can only edit REJECTED or PAUSED templates
    if (!['REJECTED', 'PAUSED'].includes(template.status)) {
      return {
        success: false,
        error: `Cannot edit template with status ${template.status}. Only REJECTED or PAUSED templates can be edited.`,
      };
    }

    try {
      // Build components for update
      const components: TemplateComponent[] = [];

      // Body component (required for update)
      if (dto.bodyText) {
        const bodyComponent: TemplateComponent = {
          type: 'BODY',
          text: dto.bodyText,
        };

        if (dto.bodyExamples && dto.bodyExamples.length > 0) {
          bodyComponent.example = {
            body_text: [dto.bodyExamples],
          };
        }

        components.push(bodyComponent);
      }

      // Header update (optional)
      if (dto.headerText) {
        components.push({
          type: 'HEADER',
          format: dto.headerFormat || 'TEXT',
          text: dto.headerText,
        });
      }

      const url = `${this.baseUrl}/${this.apiVersion}/${templateId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify({
          components,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to update template: ${JSON.stringify(data.error)}`);
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      this.logger.log(`Template ${templateId} updated successfully`);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating template: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Delete a template by name
   */
  async deleteTemplate(
    userId: string,
    templateName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getUserConfig(userId);

    if (!config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${config.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to delete template: ${JSON.stringify(data.error)}`);
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      this.logger.log(`Template "${templateName}" deleted successfully`);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting template: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Get template categories
   */
  getCategories(): { value: TemplateCategory; label: string; description: string }[] {
    return [
      {
        value: TemplateCategory.MARKETING,
        label: 'Marketing',
        description: 'Promoções, ofertas, atualizações de produtos e convites para eventos',
      },
      {
        value: TemplateCategory.UTILITY,
        label: 'Utilidade',
        description: 'Confirmações, lembretes, atualizações de pedidos e notificações de conta',
      },
      {
        value: TemplateCategory.AUTHENTICATION,
        label: 'Autenticação',
        description: 'Códigos de verificação e senhas temporárias',
      },
    ];
  }

  /**
   * Get available languages
   */
  getLanguages(): { value: TemplateLanguage; label: string }[] {
    return [
      { value: TemplateLanguage.PT_BR, label: 'Português (Brasil)' },
      { value: TemplateLanguage.EN_US, label: 'English (US)' },
      { value: TemplateLanguage.ES, label: 'Español' },
    ];
  }

  /**
   * Get button types
   */
  getButtonTypes(): { value: ButtonType; label: string; description: string }[] {
    return [
      {
        value: ButtonType.QUICK_REPLY,
        label: 'Resposta Rápida',
        description: 'Botão que envia uma mensagem predefinida',
      },
      {
        value: ButtonType.URL,
        label: 'Link',
        description: 'Botão que abre uma URL',
      },
      {
        value: ButtonType.PHONE_NUMBER,
        label: 'Ligar',
        description: 'Botão que inicia uma chamada',
      },
      {
        value: ButtonType.COPY_CODE,
        label: 'Copiar Código',
        description: 'Botão que copia um código (para templates de autenticação)',
      },
    ];
  }

  /**
   * Sanitize template name to follow Meta's naming convention
   * - Only lowercase letters, numbers, and underscores
   * - No spaces or special characters
   */
  private sanitizeTemplateName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9_]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Get template status info
   */
  getStatusInfo(status: string): { label: string; color: string; description: string } {
    const statusMap: Record<string, { label: string; color: string; description: string }> = {
      APPROVED: {
        label: 'Aprovado',
        color: 'green',
        description: 'Template aprovado e pronto para uso',
      },
      PENDING: {
        label: 'Pendente',
        color: 'yellow',
        description: 'Template aguardando aprovação da Meta',
      },
      REJECTED: {
        label: 'Rejeitado',
        color: 'red',
        description: 'Template rejeitado pela Meta',
      },
      PAUSED: {
        label: 'Pausado',
        color: 'orange',
        description: 'Template pausado devido a baixa qualidade',
      },
      DISABLED: {
        label: 'Desativado',
        color: 'gray',
        description: 'Template desativado',
      },
      IN_APPEAL: {
        label: 'Em Recurso',
        color: 'blue',
        description: 'Recurso de rejeição em análise',
      },
    };

    return (
      statusMap[status] || {
        label: status,
        color: 'gray',
        description: 'Status desconhecido',
      }
    );
  }
}
