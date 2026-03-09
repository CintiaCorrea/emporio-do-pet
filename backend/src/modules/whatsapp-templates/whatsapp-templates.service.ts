import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSimpleTemplateDto,
  CreateWhatsAppTemplateDto,
  TemplateCategory,
  ButtonType,
  OtpType,
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
  cards?: Array<{ components: TemplateComponent[] }>;
  limited_time_offer?: {
    text: string;
    has_expiration: boolean;
  };
  buttons?: Array<{
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
    example?: string[] | string;
    flow_id?: string;
    flow_name?: string;
    flow_json?: string;
    navigate_screen?: string;
    flow_action?: string;
    otp_type?: string;
    package_name?: string;
    signature_hash?: string;
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
    this.apiVersion = this.configService.get<string>('whatsapp.apiVersion') || 'v21.0';
  }

  /**
   * Get WhatsApp config - uses environment variables (single-tenant)
   */
  getConfig(): WhatsAppConfig | null {
    const accessToken = this.configService.get<string>('whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId');
    const businessAccountId = this.configService.get<string>('whatsapp.businessAccountId');

    if (!accessToken || !businessAccountId) {
      this.logger.warn('WhatsApp credentials not configured in environment variables');
      return null;
    }

    return {
      accessToken,
      phoneNumberId: phoneNumberId || '',
      businessAccountId,
    };
  }

  /**
   * @deprecated Use getConfig() instead - kept for backwards compatibility
   */
  async getUserConfig(userId: string): Promise<WhatsAppConfig | null> {
    return this.getConfig();
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
    const config = this.getConfig();

    if (!config) {
      return { templates: [], error: 'WhatsApp not configured. Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env' };
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
    const config = this.getConfig();

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
    dto: CreateWhatsAppTemplateDto,
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const config = this.getConfig();

    if (!config) {
      return { success: false, error: 'WhatsApp not configured. Check environment variables.' };
    }

    try {
      const components = this.normalizeComponents(dto.components);
      const compositionError = this.validateTemplateComposition(dto.category, components);
      if (compositionError) {
        return { success: false, error: compositionError };
      }
      const buttonValidationError = this.validateButtonRules(components, dto.category);
      if (buttonValidationError) {
        return { success: false, error: buttonValidationError };
      }
      const flowValidationError = await this.validateFlowReferences(components, config);
      if (flowValidationError) {
        return { success: false, error: flowValidationError };
      }

      // Prepare request body
      const requestBody = {
        name: this.sanitizeTemplateName(dto.name),
        category: dto.category,
        language: dto.language || 'pt_BR',
        components,
        allow_category_change: dto.allow_category_change ?? true,
        add_security_recommendation: dto.add_security_recommendation,
        code_expiration_minutes: dto.code_expiration_minutes,
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
    const config = this.getConfig();

    if (!config) {
      return { success: false, error: 'WhatsApp not configured. Check environment variables.' };
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
    const config = this.getConfig();

    if (!config) {
      return { success: false, error: 'WhatsApp not configured. Check environment variables.' };
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
  getLanguages(): { value: string; label: string }[] {
    return ALL_META_TEMPLATE_LANGUAGES;
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
      {
        value: ButtonType.FLOW,
        label: 'Flow',
        description: 'Botão que abre um WhatsApp Flow publicado',
      },
      {
        value: ButtonType.OTP,
        label: 'OTP',
        description: 'Botão de autenticação (one-tap, zero-tap ou copy code)',
      },
      {
        value: ButtonType.MPM,
        label: 'MPM',
        description: 'Botão de multi-produto para catálogos',
      },
    ];
  }

  async listFlows(userId: string): Promise<{ flows: Array<{ id: string; name: string }>; error?: string }> {
    const config = this.getConfig();
    if (!config) {
      return { flows: [], error: 'WhatsApp not configured. Check environment variables.' };
    }
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${config.businessAccountId}/flows?fields=id,name,status`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return { flows: [], error: data.error?.message || `HTTP ${response.status}` };
      }
      const flows = (data.data || [])
        .filter((f: { status?: string }) => !f.status || f.status === 'PUBLISHED')
        .map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));
      return { flows };
    } catch (error) {
      return { flows: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async uploadTemplateMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<{ handle?: string; error?: string }> {
    const config = this.getConfig();
    if (!config) {
      return { error: 'WhatsApp not configured. Check environment variables.' };
    }
    const mediaRuleError = this.validateTemplateMediaRules(mimeType, buffer.byteLength);
    if (mediaRuleError) {
      return { error: mediaRuleError };
    }
    try {
      const appId = this.configService.get<string>('whatsapp.appId');
      if (!appId) {
        return { error: 'WHATSAPP_APP_ID not configured in environment variables.' };
      }

      const initResponse = await fetch(`${this.baseUrl}/${this.apiVersion}/${appId}/uploads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: filename,
          file_length: buffer.byteLength,
          file_type: mimeType,
        }),
      });
      const initData = await initResponse.json();
      if (!initResponse.ok || !initData.id) {
        return {
          error: initData.error?.message || initData.error?.error_user_msg || `HTTP ${initResponse.status}`,
        };
      }

      const sessionId = initData.id as string;
      const uploadResponse = await fetch(`${this.baseUrl}/${this.apiVersion}/${sessionId}`, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${config.accessToken}`,
          file_offset: '0',
        },
        body: new Uint8Array(buffer),
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        return {
          error: uploadData.error?.message || uploadData.error?.error_user_msg || `HTTP ${uploadResponse.status}`,
        };
      }

      const handle = uploadData.h as string | undefined;
      if (!handle) {
        return { error: 'Meta upload did not return a media handle.' };
      }
      return { handle };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private normalizeComponents(components: CreateWhatsAppTemplateDto['components']): TemplateComponent[] {
    return components.map((component) => {
      if (component.type !== 'BUTTONS') {
        return component as TemplateComponent;
      }
      const buttonsComponent = component as { buttons?: Array<Record<string, unknown>> };
      const normalizedButtons = (buttonsComponent.buttons || []).map((button) => {
        const normalizedButton: Record<string, unknown> = { ...button };
        if (button.type === ButtonType.URL && typeof button.example === 'string' && button.example.trim()) {
          normalizedButton.example = [button.example];
        }
        if (button.type === ButtonType.COPY_CODE && typeof button.example === 'string' && button.example.trim()) {
          normalizedButton.example = [button.example];
        }
        if (button.type === ButtonType.OTP && button.otp_type === OtpType.COPY_CODE) {
          normalizedButton.otp_type = 'COPY_CODE';
        }
        return normalizedButton;
      });
      return {
        ...(component as TemplateComponent),
        buttons: normalizedButtons as TemplateComponent['buttons'],
      };
    });
  }

  private validateButtonRules(components: TemplateComponent[], category: TemplateCategory): string | null {
    const buttonsComponent = components.find((c) => c.type === 'BUTTONS');
    if (!buttonsComponent?.buttons?.length) return null;

    const buttons = buttonsComponent.buttons;
    const quickReplies = buttons.filter((b) => b.type === ButtonType.QUICK_REPLY).length;
    const urls = buttons.filter((b) => b.type === ButtonType.URL).length;
    const phones = buttons.filter((b) => b.type === ButtonType.PHONE_NUMBER).length;
    const flows = buttons.filter((b) => b.type === ButtonType.FLOW).length;
    const otp = buttons.filter((b) => b.type === ButtonType.OTP).length;
    const mpm = buttons.filter((b) => b.type === ButtonType.MPM).length;

    if (quickReplies > 0 && (urls > 0 || phones > 0)) {
      return 'A Meta não permite misturar QUICK_REPLY com botões CTA (URL/PHONE_NUMBER).';
    }
    if (quickReplies > 3) {
      return 'Máximo de 3 botões QUICK_REPLY permitido.';
    }
    if (urls > 1 || phones > 1) {
      return 'Máximo de 1 botão URL e 1 botão PHONE_NUMBER permitido.';
    }
    if (urls + phones > 2) {
      return 'Máximo de 2 botões CTA (URL/PHONE_NUMBER) permitido.';
    }
    if (flows > 1) {
      return 'Máximo de 1 botão FLOW permitido.';
    }
    if (otp > 0 && category !== TemplateCategory.AUTHENTICATION) {
      return 'Botões OTP só são permitidos para templates de autenticação.';
    }
    if (mpm > 0 && category !== TemplateCategory.MARKETING) {
      return 'Botão MPM só é permitido para templates de marketing.';
    }
    if (mpm > 1) {
      return 'Máximo de 1 botão MPM permitido.';
    }
    return null;
  }

  private validateTemplateComposition(category: TemplateCategory, components: TemplateComponent[]): string | null {
    const hasBody = components.some((component) => component.type === 'BODY');
    if (!hasBody) {
      return 'Todo template precisa de um componente BODY.';
    }

    const hasLto = components.some((component) => component.type === 'LIMITED_TIME_OFFER');
    if (hasLto && category !== TemplateCategory.MARKETING) {
      return 'LIMITED_TIME_OFFER só é permitido em categoria MARKETING.';
    }
    if (hasLto && components.some((component) => component.type === 'FOOTER')) {
      return 'Templates LIMITED_TIME_OFFER não suportam FOOTER.';
    }

    const hasOrderDetails = components.some((component) => component.type === 'ORDER_DETAILS');
    if (hasOrderDetails && category !== TemplateCategory.UTILITY) {
      return 'ORDER_DETAILS só é permitido em categoria UTILITY.';
    }

    const carousel = components.find((component) => component.type === 'CAROUSEL');
    if (carousel) {
      if (!carousel.cards || carousel.cards.length < 2 || carousel.cards.length > 10) {
        return 'CAROUSEL precisa ter entre 2 e 10 cards.';
      }
      const signatureSet = new Set<string>();
      for (const card of carousel.cards) {
        const cardHeader = card.components.find((component) => component.type === 'HEADER');
        const cardBody = card.components.find((component) => component.type === 'BODY');
        if (!cardHeader || !cardBody) {
          return 'Cada card do CAROUSEL precisa de HEADER e BODY.';
        }
        if (!['IMAGE', 'VIDEO'].includes(cardHeader.format || '')) {
          return 'HEADER de card de CAROUSEL só pode ser IMAGE ou VIDEO.';
        }
        const cardButtons = card.components.find((component) => component.type === 'BUTTONS')?.buttons || [];
        if (cardButtons.length > 2) {
          return 'Cada card do CAROUSEL pode ter no máximo 2 botões.';
        }
        signatureSet.add(cardButtons.map((button) => button.type).sort().join('|'));
      }
      if (signatureSet.size > 1) {
        return 'Todos os cards do CAROUSEL devem ter os mesmos tipos de botões.';
      }
    }

    if (category === TemplateCategory.AUTHENTICATION) {
      const hasFooter = components.some((component) => component.type === 'FOOTER');
      if (hasFooter) {
        return 'Templates de autenticação não suportam FOOTER.';
      }
      const invalidButtons =
        components
          .find((component) => component.type === 'BUTTONS')
          ?.buttons?.some((button) => ![ButtonType.OTP, ButtonType.COPY_CODE].includes(button.type as ButtonType)) ||
        false;
      if (invalidButtons) {
        return 'Templates de autenticação só suportam botões OTP ou COPY_CODE.';
      }
    }

    return null;
  }

  private async validateFlowReferences(
    components: TemplateComponent[],
    config: WhatsAppConfig,
  ): Promise<string | null> {
    const buttonSets = components
      .filter((component) => component.type === 'BUTTONS' && component.buttons?.length)
      .flatMap((component) => component.buttons || []);

    const flowIds = buttonSets
      .filter((button) => button.type === ButtonType.FLOW && typeof button.flow_id === 'string' && button.flow_id)
      .map((button) => String(button.flow_id));

    if (!flowIds.length) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${config.businessAccountId}/flows?fields=id,status`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        return data.error?.message || 'Não foi possível validar FLOW com a Meta.';
      }

      const publishedIds = new Set(
        (data.data || [])
          .filter((flow: { status?: string }) => !flow.status || flow.status === 'PUBLISHED')
          .map((flow: { id: string }) => flow.id),
      );
      const invalidIds = flowIds.filter((id) => !publishedIds.has(id));
      if (invalidIds.length) {
        return `Flow(s) não publicado(s) ou inválido(s): ${invalidIds.join(', ')}`;
      }
      return null;
    } catch {
      return 'Falha ao validar FLOW com a Meta.';
    }
  }

  private validateTemplateMediaRules(mimeType: string, sizeInBytes: number): string | null {
    const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const videoTypes = new Set(['video/mp4', 'video/3gpp']);
    const documentTypes = new Set([
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]);

    if (imageTypes.has(mimeType) && sizeInBytes > 5 * 1024 * 1024) {
      return 'Imagem acima de 5MB.';
    }
    if (videoTypes.has(mimeType) && sizeInBytes > 16 * 1024 * 1024) {
      return 'Vídeo acima de 16MB.';
    }
    if (documentTypes.has(mimeType) && sizeInBytes > 100 * 1024 * 1024) {
      return 'Documento acima de 100MB.';
    }

    if (!imageTypes.has(mimeType) && !videoTypes.has(mimeType) && !documentTypes.has(mimeType)) {
      return 'Tipo de arquivo não suportado para template.';
    }

    return null;
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

const ALL_META_TEMPLATE_LANGUAGES: Array<{ value: string; label: string }> = [
  { value: 'af', label: 'Afrikaans' },
  { value: 'sq', label: 'Albanian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ar_EG', label: 'Arabic (Egypt)' },
  { value: 'ar_AE', label: 'Arabic (UAE)' },
  { value: 'ar_LB', label: 'Arabic (Lebanon)' },
  { value: 'ar_MA', label: 'Arabic (Morocco)' },
  { value: 'ar_QA', label: 'Arabic (Qatar)' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'be_BY', label: 'Belarusian' },
  { value: 'bn', label: 'Bengali' },
  { value: 'bn_IN', label: 'Bengali (India)' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'zh_CN', label: 'Chinese (Mainland)' },
  { value: 'zh_HK', label: 'Chinese (Hong Kong)' },
  { value: 'zh_TW', label: 'Chinese (Taiwan)' },
  { value: 'hr', label: 'Croatian' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'prs_AF', label: 'Dari (Afghanistan)' },
  { value: 'nl', label: 'Dutch' },
  { value: 'nl_BE', label: 'Dutch (Belgium)' },
  { value: 'en', label: 'English' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_AE', label: 'English (UAE)' },
  { value: 'en_AU', label: 'English (Australia)' },
  { value: 'en_CA', label: 'English (Canada)' },
  { value: 'en_GH', label: 'English (Ghana)' },
  { value: 'en_IE', label: 'English (Ireland)' },
  { value: 'en_IN', label: 'English (India)' },
  { value: 'en_JM', label: 'English (Jamaica)' },
  { value: 'en_MY', label: 'English (Malaysia)' },
  { value: 'en_NZ', label: 'English (New Zealand)' },
  { value: 'en_QA', label: 'English (Qatar)' },
  { value: 'en_SG', label: 'English (Singapore)' },
  { value: 'en_UG', label: 'English (Uganda)' },
  { value: 'en_ZA', label: 'English (South Africa)' },
  { value: 'et', label: 'Estonian' },
  { value: 'fil', label: 'Filipino' },
  { value: 'fi', label: 'Finnish' },
  { value: 'fr', label: 'French' },
  { value: 'fr_BE', label: 'French (Belgium)' },
  { value: 'fr_CA', label: 'French (Canada)' },
  { value: 'fr_CH', label: 'French (Switzerland)' },
  { value: 'fr_CI', label: 'French (Ivory Coast)' },
  { value: 'fr_MA', label: 'French (Morocco)' },
  { value: 'ka', label: 'Georgian' },
  { value: 'de', label: 'German' },
  { value: 'de_AT', label: 'German (Austria)' },
  { value: 'de_CH', label: 'German (Switzerland)' },
  { value: 'el', label: 'Greek' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'ha', label: 'Hausa' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ga', label: 'Irish' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'kn', label: 'Kannada' },
  { value: 'kk', label: 'Kazakh' },
  { value: 'rw_RW', label: 'Kinyarwanda' },
  { value: 'ko', label: 'Korean' },
  { value: 'ky_KG', label: 'Kyrgyz' },
  { value: 'lo', label: 'Lao' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'ms', label: 'Malay' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'nb', label: 'Norwegian' },
  { value: 'ps_AF', label: 'Pashto (Afghanistan)' },
  { value: 'fa', label: 'Persian' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'pt_PT', label: 'Portuguese (Portugal)' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'si_LK', label: 'Sinhala (Sri Lanka)' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'es', label: 'Spanish' },
  { value: 'es_AR', label: 'Spanish (Argentina)' },
  { value: 'es_CL', label: 'Spanish (Chile)' },
  { value: 'es_CO', label: 'Spanish (Colombia)' },
  { value: 'es_MX', label: 'Spanish (Mexico)' },
  { value: 'sw', label: 'Swahili' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'uz', label: 'Uzbek' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'zu', label: 'Zulu' },
];
