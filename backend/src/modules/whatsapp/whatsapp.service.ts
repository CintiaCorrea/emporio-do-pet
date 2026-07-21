import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CloudStorageService } from '../media/cloud-storage.service';
import { findTutorByPhoneUnique } from '../../common/tutor-match';
import * as crypto from 'crypto';
import {
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppMessageDirection,
  WhatsAppConversationStatus,
  Prisma,
} from '@prisma/client';

export interface SendWhatsAppMessagePayload {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: Array<{ type: 'text'; text: string }>;
  language?: string;
  /** waMessageId da mensagem que está sendo respondida — vira resposta citada no WhatsApp. */
  replyToWaMessageId?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  apiVersion?: string;
}

export interface IncomingMessageData {
  waMessageId: string;
  from: string;
  contactName?: string;
  type: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaCaption?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationFilters {
  status?: WhatsAppConversationStatus;
  search?: string;
  hasUnread?: boolean;
  assignedAgentId?: string;
  tutorId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Rate limiter for WhatsApp API (80 messages per second limit)
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number = 60, refillRate: number = 60) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      // Wait for next token
      const waitTime = Math.ceil((1 / this.refillRate) * 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly webhookVerifyToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;
  private readonly defaultCountry: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => CloudStorageService))
    private cloudStorageService: CloudStorageService,
  ) {
    this.accessToken = this.configService.get<string>('whatsapp.accessToken') || '';
    this.phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId') || '';
    this.webhookVerifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken') || '';
    this.apiVersion = this.configService.get<string>('whatsapp.apiVersion') || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.rateLimiter = new RateLimiter(60, 60); // 60 messages per second
    this.defaultCountry = this.configService.get<string>('DEFAULT_COUNTRY') || 'BR';
  }

  // Helper method for retrying failed requests
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain errors
        const errorMessage = lastError.message.toLowerCase();
        if (
          errorMessage.includes('invalid') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('not found')
        ) {
          throw lastError;
        }

        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(2, attempt),
            config.maxDelay,
          );
          this.logger.warn(
            `Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms: ${lastError.message}`,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Get WhatsApp config from user's integration settings
  async getUserWhatsAppConfig(userId: string): Promise<WhatsAppConfig | null> {
    try {
      const settings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
        select: { whatsappConfig: true },
      });

      if (!settings?.whatsappConfig) {
        return null;
      }

      return JSON.parse(settings.whatsappConfig);
    } catch (error) {
      this.logger.error(`Error getting WhatsApp config for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get WhatsApp config from environment variables (single-tenant mode)
   * This is the preferred method for single-tenant deployments
   */
  getConfig(): WhatsAppConfig {
    return {
      accessToken: this.accessToken,
      phoneNumberId: this.phoneNumberId,
      businessAccountId: this.configService.get<string>('whatsapp.businessAccountId'),
      webhookVerifyToken: this.webhookVerifyToken,
      apiVersion: this.apiVersion,
    };
  }

  // Send a text message
  async sendMessage(
    message: SendWhatsAppMessagePayload,
    config?: WhatsAppConfig,
    enableRetry: boolean = true,
  ): Promise<WhatsAppResponse> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'WhatsApp API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID',
      };
    }

    const phone = this.formatPhoneNumber(message.to);
    this.logger.debug(`Sending WhatsApp message to ${phone}`);

    const sendOperation = async (): Promise<WhatsAppResponse> => {
      // Apply rate limiting
      await this.rateLimiter.acquire();

      const response = await fetch(`${this.baseUrl}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: {
            preview_url: true,
            body: message.message,
          },
          // Resposta citada: o WhatsApp do cliente mostra a mensagem original grudada
          // em cima da resposta — igual ao "responder" do app.
          ...(message.replyToWaMessageId
            ? { context: { message_id: message.replyToWaMessageId } }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        const errorCode = data.error?.code?.toString();

        // Check for rate limit errors
        if (response.status === 429 || errorCode === '130472') {
          throw new Error(`Rate limited: ${errorMsg}`);
        }

        throw new Error(`${errorMsg}${errorCode ? ` (code: ${errorCode})` : ''}`);
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${phone}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    };

    try {
      if (enableRetry) {
        return await this.withRetry(sendOperation);
      }
      return await sendOperation();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending WhatsApp message to ${phone}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Send a template message (for approved WhatsApp Business templates)
  async sendTemplateMessage(
    to: string,
    templateName: string,
    params?: Array<{ type: 'text'; text: string }>,
    language: string = 'pt_BR',
    config?: WhatsAppConfig,
  ): Promise<WhatsAppResponse> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'WhatsApp API not configured',
      };
    }

    try {
      const phone = this.formatPhoneNumber(to);

      this.logger.debug(`Sending WhatsApp template "${templateName}" to ${phone}`);

      const templatePayload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
        },
      };

      // Add components if params provided
      if (params && params.length > 0) {
        (templatePayload.template as Record<string, unknown>).components = [
          {
            type: 'body',
            parameters: params,
          },
        ];
      }

      const response = await fetch(`${this.baseUrl}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(templatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp template sent to ${phone}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending WhatsApp template: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Send messages to multiple recipients
  async sendBulkMessages(
    messages: SendWhatsAppMessagePayload[],
    config?: WhatsAppConfig,
    delayMs: number = 1000,
  ): Promise<{ sent: number; failed: number; results: WhatsAppResponse[] }> {
    const results: WhatsAppResponse[] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const result = message.templateName
        ? await this.sendTemplateMessage(
            message.to,
            message.templateName,
            message.templateParams,
            message.language,
            config,
          )
        : await this.sendMessage(message, config);

      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      if (delayMs > 0 && i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.logger.log(`Bulk WhatsApp messages: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
  }

  // Mark message as read
  async markAsRead(messageId: string, config?: WhatsAppConfig): Promise<boolean> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) return false;

    try {
      const response = await fetch(`${this.baseUrl}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Validate webhook signature from Meta
  validateWebhookSignature(payload: string, signature: string): boolean {
    const appSecret = this.configService.get<string>('whatsapp.appSecret');
    
    if (!appSecret) {
      this.logger.error(
        'WHATSAPP_APP_SECRET not configured! Rejecting webhook for security. ' +
        'Set the WHATSAPP_APP_SECRET environment variable to enable webhook processing.',
      );
      return false;
    }

    if (!signature) {
      this.logger.warn('No signature provided in webhook request');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');
      
      // Ensure both signatures have the same length before comparing
      if (expectedSignature.length !== providedSignature.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature),
      );
    } catch (error) {
      this.logger.error(`Webhook signature validation error: ${error}`);
      return false;
    }
  }

  // Verify webhook challenge from Meta
  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string,
  ): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    return null;
  }

  // Format phone number to international E.164 format
  private formatPhoneNumber(phone: string, defaultCountry?: string): string {
    // Remove all non-digit characters except + at the start
    let digits = phone.replace(/[^\d+]/g, '');
    const hasPlus = digits.startsWith('+');
    digits = digits.replace(/\D/g, '');

    // Remove leading zeros
    digits = digits.replace(/^0+/, '');

    // Country code detection and formatting
    const country = defaultCountry || this.defaultCountry;
    
    // Map of country codes with their dial codes and national number lengths
    const countryConfig: Record<string, { dialCode: string; nationalLengths: number[]; mobileDigit?: string }> = {
      BR: { dialCode: '55', nationalLengths: [10, 11], mobileDigit: '9' },
      US: { dialCode: '1', nationalLengths: [10] },
      AR: { dialCode: '54', nationalLengths: [10, 11] },
      MX: { dialCode: '52', nationalLengths: [10] },
      CO: { dialCode: '57', nationalLengths: [10] },
      PT: { dialCode: '351', nationalLengths: [9] },
      ES: { dialCode: '34', nationalLengths: [9] },
      DE: { dialCode: '49', nationalLengths: [10, 11] },
      FR: { dialCode: '33', nationalLengths: [9] },
      GB: { dialCode: '44', nationalLengths: [10] },
      IT: { dialCode: '39', nationalLengths: [9, 10] },
      CL: { dialCode: '56', nationalLengths: [9] },
      PE: { dialCode: '51', nationalLengths: [9] },
      UY: { dialCode: '598', nationalLengths: [8] },
      PY: { dialCode: '595', nationalLengths: [9] },
    };

    // Try to detect country from existing dial code
    let detectedCountry: string | null = null;
    for (const [code, config] of Object.entries(countryConfig)) {
      if (digits.startsWith(config.dialCode)) {
        detectedCountry = code;
        break;
      }
    }

    // If already has country code, validate and return
    if (hasPlus || detectedCountry) {
      return digits;
    }

    // Use default country for formatting
    const config = countryConfig[country] || countryConfig['BR'];
    
    // Check if the number length matches any expected national length
    if (config.nationalLengths.includes(digits.length)) {
      // For Brazil, handle the 9-digit mobile transition
      if (country === 'BR' && digits.length === 10) {
        const ddd = digits.substring(0, 2);
        const number = digits.substring(2);
        const dddNum = parseInt(ddd);
        
        // Brazilian DDDs are 11-99, and mobile numbers should have 9 as first digit
        if (dddNum >= 11 && dddNum <= 99) {
          // Check if it might need the 9 prefix (not landline 2-5)
          if (!['2', '3', '4', '5'].includes(number[0])) {
            digits = ddd + '9' + number;
          }
        }
      }
      
      return config.dialCode + digits;
    }

    // If number is longer, assume it already has country code
    if (digits.length > Math.max(...config.nationalLengths)) {
      return digits;
    }

    // Default: add country code
    return config.dialCode + digits;
  }

  // Get webhook verify token
  getWebhookVerifyToken(): string {
    return this.webhookVerifyToken;
  }

  // Get app secret (for signature validation checks in controller)
  getAppSecret(): string | undefined {
    return this.configService.get<string>('whatsapp.appSecret');
  }

  // Check if WhatsApp is configured
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  // Test connection to WhatsApp API
  async testConnection(config?: WhatsAppConfig): Promise<{ connected: boolean; error?: string; phoneNumber?: string }> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) {
      return { connected: false, error: 'Access token or Phone Number ID not configured' };
    }

    try {
      // Get phone number details to verify connection
      const response = await fetch(`${this.baseUrl}/${phoneId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          connected: false, 
          error: data.error?.message || `HTTP ${response.status}` 
        };
      }

      return { 
        connected: true,
        phoneNumber: data.display_phone_number,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // Conversation Management Methods
  // ============================================

  /**
   * Baixa a mídia (imagem/áudio/etc) de uma mensagem direto do object storage
   * (Tigris/S3, bucket PRIVADO) via SigV4, pra o app servir só a quem está logado.
   * Mesmo padrão de pets.service.getArquivo.
   */
  async getMessageMedia(
    messageId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const msg = await this.prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { mediaCloudUrl: true, mediaCloudId: true, mediaType: true },
    });
    if (!msg) return null;
    const endpoint = process.env.S3_ENDPOINT || '';
    const bucket = process.env.S3_BUCKET || '';
    const region = process.env.S3_REGION || 'auto';
    const ak = process.env.S3_ACCESS_KEY_ID || '';
    const sk = process.env.S3_SECRET_ACCESS_KEY || '';
    if (!endpoint || !bucket || !ak || !sk) return null;
    // Deriva a KEY do objeto a partir da URL guardada (…/{bucket}/{key}) ou do id.
    const prefix = `${endpoint}/${bucket}/`;
    let key = '';
    if (msg.mediaCloudUrl && msg.mediaCloudUrl.startsWith(prefix)) {
      key = msg.mediaCloudUrl.slice(prefix.length);
    } else if (msg.mediaCloudId) {
      key = msg.mediaCloudId;
    }
    if (!key) return null;
    const crypto = await import('crypto');
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateShort = date.substring(0, 8);
    const emptyHash = crypto.createHash('sha256').update('').digest('hex');
    const host = new URL(endpoint).host;
    const canonicalHeaders = [`host:${host}`, `x-amz-content-sha256:${emptyHash}`, `x-amz-date:${date}`].join('\n');
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['GET', `/${bucket}/${key}`, '', canonicalHeaders, '', signedHeaders, emptyHash].join('\n');
    const credentialScope = `${dateShort}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', date, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const kDate = crypto.createHmac('sha256', `AWS4${sk}`).update(dateShort).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const signingKey = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`${endpoint}/${bucket}/${key}`, { headers: { 'x-amz-content-sha256': emptyHash, 'x-amz-date': date, Authorization: authorization } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || msg.mediaType || 'application/octet-stream';
    return { buffer, contentType };
  }

  /**
   * Casa um telefone a um Tutor existente — SÓ quando o número é de um único
   * cliente (evita vincular ao cliente errado quando 2 cadastros compartilham
   * o mesmo número). Telefone ambíguo → não vincula (vira revisão manual).
   */
  private async matchTutorByPhone(
    phone: string,
  ): Promise<{ tutorId: string; contactId: string } | null> {
    const m = await findTutorByPhoneUnique(this.prisma, phone);
    return m.status === 'unique' ? { tutorId: m.tutorId, contactId: m.contactId } : null;
  }

  // Create or get existing conversation
  async createOrGetConversation(
    userId: string,
    contactPhone: string,
    contactName?: string,
    contactPushName?: string,
    firstMessage?: string,
  ) {
    const formattedPhone = this.formatPhoneNumber(contactPhone);

    let existing = await this.prisma.whatsAppConversation.findUnique({
      where: {
        userId_contactPhone: {
          userId,
          contactPhone: formattedPhone,
        },
      },
      include: {
        assignedAgent: true,
        tutor: true,
      },
    });

    // Evita conversa DUPLICADA por causa do 9º dígito (ex.: cadastro 55859... x WhatsApp
    // real 5585...): se não achou exato, reusa a mesma pessoa pelos últimos 8 dígitos.
    if (!existing) {
      const tail = formattedPhone.replace(/\D/g, '').slice(-8);
      if (tail.length >= 8) {
        // Clínica tem 1 número: a mesma pessoa é UMA conversa, mesmo que o envio
        // automático tenha usado outro usuário/formato. Reusa a de mais mensagens.
        existing = await this.prisma.whatsAppConversation.findFirst({
          where: { contactPhone: { endsWith: tail } },
          include: { assignedAgent: true, tutor: true },
          orderBy: { lastMessageAt: 'desc' },
        });
      }
    }

    if (existing) {
      // Re-vincula conversa ÓRFÃ a um cliente existente: o telefone pode ter sido
      // cadastrado DEPOIS que a conversa nasceu (ex.: cliente importado do SimplesVet).
      let relinkTutorId: string | null = null;
      if (!existing.tutorId) {
        const m = await this.matchTutorByPhone(formattedPhone);
        if (m) {
          relinkTutorId = m.tutorId;
          await this.prisma.contact
            .update({ where: { id: m.contactId }, data: { isWhatsApp: true } })
            .catch(() => undefined);
          this.logger.log(`Conversa ${existing.id} re-vinculada ao cliente ${m.tutorId} pelo telefone`);
        }
      }
      const precisaNome =
        !!(contactName || contactPushName) &&
        (contactName !== existing.contactName || contactPushName !== existing.contactPushName);
      if (relinkTutorId || precisaNome) {
        return this.prisma.whatsAppConversation.update({
          where: { id: existing.id },
          data: {
            ...(relinkTutorId ? { tutorId: relinkTutorId } : {}),
            ...(precisaNome
              ? {
                  contactName: contactName || existing.contactName,
                  contactPushName: contactPushName || existing.contactPushName,
                }
              : {}),
          },
          include: { assignedAgent: true, tutor: true },
        });
      }
      return existing;
    }

    // Cliente já existe pelo telefone? (sem exigir a flag isWhatsApp — o número é o
    // número, com ou sem o "9" do celular). Se achar, a conversa já nasce vinculada.
    const match = await this.matchTutorByPhone(formattedPhone);
    const tutorId = match?.tutorId || null;
    if (match) {
      await this.prisma.contact
        .update({ where: { id: match.contactId }, data: { isWhatsApp: true } })
        .catch(() => undefined);
    }
    // Contato DESCONHECIDO não vira "cliente fantasma": a conversa entra sem tutor
    // (como LEAD) e o listener de CRM cria o lead. Vira cliente quando for convertido.

    // Check for default AI agent for auto-reply
    const defaultAgentId = this.configService.get<string>('whatsapp.defaultAgentId');
    let assignedAgentId: string | null = null;
    let isAutoReplyEnabled = false;

    if (defaultAgentId) {
      const agent = await this.prisma.aIAgent.findFirst({
        where: { 
          id: defaultAgentId,
          status: 'ACTIVE',
        },
      });

      if (agent) {
        assignedAgentId = agent.id;
        isAutoReplyEnabled = true;
        this.logger.log(`Auto-assigning agent ${agent.name} (${agent.id}) to new conversation`);
      } else {
        this.logger.warn(`Default agent ${defaultAgentId} not found or not active`);
      }
    }

    const newConversation = await this.prisma.whatsAppConversation.create({
      data: {
        userId,
        contactPhone: formattedPhone,
        contactName: contactName || contactPushName,
        contactPushName,
        status: 'OPEN',
        tutorId,
        assignedAgentId,
        isAutoReplyEnabled,
      },
      include: {
        assignedAgent: true,
        tutor: true,
      },
    });

    // Emit event for CRM lead creation
    this.eventEmitter.emit('whatsapp.conversation.new', {
      conversationId: newConversation.id,
      userId,
      contactPhone: formattedPhone,
      contactName: contactName || contactPushName,
      firstMessage,
    });

    return newConversation;
  }

  // Save inbound message
  async saveInboundMessage(
    conversationId: string,
    data: IncomingMessageData,
  ) {
    const messageType = this.mapMessageType(data.type);

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId: data.waMessageId,
        direction: 'INBOUND',
        type: messageType,
        status: 'DELIVERED',
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        mediaCaption: data.mediaCaption,
        metadata: data.metadata ? (data.metadata as Prisma.JsonObject) : undefined,
        deliveredAt: new Date(),
      },
    });

    // Update conversation
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: data.content.substring(0, 100),
        unreadCount: { increment: 1 },
        status: 'OPEN',
      },
    });

    return message;
  }

  // Save outbound message
  async saveOutboundMessage(
    conversationId: string,
    content: string,
    type: WhatsAppMessageType = 'TEXT',
    waMessageId?: string,
    metadata?: Record<string, unknown>,
    senderInfo?: { senderType: 'AI' | 'HUMAN' | 'SYSTEM'; senderName?: string; senderId?: string },
  ) {
    const mergedMetadata: Record<string, unknown> = { ...metadata };
    if (senderInfo) {
      mergedMetadata.senderType = senderInfo.senderType;
      if (senderInfo.senderName) mergedMetadata.senderName = senderInfo.senderName;
      if (senderInfo.senderId) {
        if (senderInfo.senderType === 'AI') {
          mergedMetadata.senderAgentId = senderInfo.senderId;
        } else {
          mergedMetadata.senderUserId = senderInfo.senderId;
        }
      }
    }

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId,
        direction: 'OUTBOUND',
        type,
        status: waMessageId ? 'SENT' : 'PENDING',
        content,
        sentAt: waMessageId ? new Date() : undefined,
        metadata: Object.keys(mergedMetadata).length > 0 ? (mergedMetadata as Prisma.JsonObject) : undefined,
      },
    });

    // Update conversation
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100),
      },
    });

    return message;
  }

  // Update message status (from webhook status updates)
  async updateMessageStatus(
    waMessageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    failedReason?: string,
  ) {
    const statusMap: Record<string, WhatsAppMessageStatus> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const updateData: Prisma.WhatsAppMessageUpdateInput = {
      status: statusMap[status] || 'PENDING',
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
    } else if (status === 'failed') {
      updateData.failedReason = failedReason;
    }

    try {
      return await this.prisma.whatsAppMessage.update({
        where: { waMessageId },
        data: updateData,
      });
    } catch (error) {
      // Message might not exist yet (race condition)
      this.logger.warn(`Could not update message status for ${waMessageId}: ${error}`);
      return null;
    }
  }

  // Get conversations (shared inbox - all authenticated users see all conversations)
  async getConversations(
    userId?: string | null,
    filters?: ConversationFilters,
    pagination?: PaginationParams,
  ) {
    const where: Prisma.WhatsAppConversationWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.hasUnread) {
      where.unreadCount = { gt: 0 };
    }

    if (filters?.assignedAgentId) {
      where.assignedAgentId = filters.assignedAgentId;
    }

    if (filters?.tutorId) {
      where.tutorId = filters.tutorId;
    }

    if (filters?.search) {
      where.OR = [
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { contactPhone: { contains: filters.search } },
        { contactPushName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.whatsAppConversation.findMany({
        where,
        include: {
          assignedAgent: {
            select: { id: true, name: true },
          },
          assignedUser: {
            select: { id: true, name: true },
          },
          tutor: {
            select: { id: true, name: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppConversation.count({ where }),
    ]);

    // Religa conversas ÓRFÃS (sem cliente) que agora casam com um cadastro pelo telefone —
    // ex.: o cliente escreveu de um número diferente e o número foi corrigido depois na ficha.
    // Assim, corrigir o telefone faz a conversa reconhecer o cliente no próximo refresh, sem
    // depender de uma mensagem nova chegar. Só liga quando o número é de UM único cliente.
    const orfas = conversations.filter((c: any) => !c.tutorId && c.contactPhone);
    if (orfas.length) {
      await Promise.all(
        orfas.map(async (c: any) => {
          try {
            const m = await this.matchTutorByPhone(c.contactPhone);
            if (!m) return;
            await this.prisma.whatsAppConversation.update({ where: { id: c.id }, data: { tutorId: m.tutorId } });
            await this.prisma.contact.update({ where: { id: m.contactId }, data: { isWhatsApp: true } }).catch(() => undefined);
            const t = await this.prisma.tutor.findUnique({ where: { id: m.tutorId }, select: { id: true, name: true } });
            c.tutorId = m.tutorId;
            c.tutor = t;
            this.logger.log(`Conversa ${c.id} re-vinculada ao cliente ${m.tutorId} (telefone corrigido)`);
          } catch { /* re-link é best-effort; nunca quebra a listagem */ }
        }),
      );
    }

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get messages for a conversation
  async getMessages(
    conversationId: string,
    pagination?: PaginationParams,
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppMessage.count({ where: { conversationId } }),
    ]);

    // Mark as read after fetching
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return {
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single conversation
  async getConversation(conversationId: string) {
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: {
        assignedAgent: true,
        assignedUser: { select: { id: true, name: true } },
        tutor: {
          include: {
            contacts: true,
            pets: true,
          },
        },
      },
    });

    if (!conversation) return null;

    // Calculate 24h window: find the last inbound message timestamp
    const lastInbound = await this.prisma.whatsAppMessage.findFirst({
      where: { conversationId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastInboundAt = lastInbound?.createdAt || null;
    const is24hWindowOpen = lastInboundAt
      ? (Date.now() - lastInboundAt.getTime()) < 24 * 60 * 60 * 1000
      : false;

    return { ...conversation, lastInboundAt, is24hWindowOpen };
  }

  // Update conversation
  async updateConversation(
    conversationId: string,
    data: {
      status?: WhatsAppConversationStatus;
      assignedAgentId?: string | null;
      assignedUserId?: string | null;
      humanTakeoverAt?: Date | null;
      tutorId?: string | null;
      isAutoReplyEnabled?: boolean;
    },
  ) {
    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data,
      include: {
        assignedAgent: true,
        assignedUser: { select: { id: true, name: true } },
        tutor: true,
      },
    });
  }

  // Etiquetas da conversa: guardadas em metadata.tags (sem coluna nova no banco).
  async setConversationTags(conversationId: string, tags: string[]) {
    const conv = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });
    const meta = (conv?.metadata && typeof conv.metadata === 'object' ? conv.metadata : {}) as Record<string, unknown>;
    const limpas = Array.from(new Set((tags || []).map((t) => String(t).trim()).filter(Boolean)));
    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { metadata: { ...meta, tags: limpas } as any },
      select: { id: true, metadata: true },
    });
  }

  // Human takeover: disable AI auto-reply and assign a human user
  async takeoverConversation(conversationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    const userName = user?.name || 'Atendente';

    const updated = await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        isAutoReplyEnabled: false,
        assignedUserId: userId,
        humanTakeoverAt: new Date(),
        status: 'ASSIGNED',
      },
      include: {
        assignedAgent: true,
        assignedUser: { select: { id: true, name: true } },
        tutor: true,
      },
    });

    // Send handoff message visible to both client and dashboard
    // Wrapped in try/catch: takeover must succeed even if message delivery fails (e.g. 24h window expired)
    try {
      const takeoverMessage = `Olá! A partir de agora, ${userName} vai continuar seu atendimento. Como posso ajudar?`;
      await this.sendAndSaveMessage(
        updated.userId,
        conversationId,
        takeoverMessage,
        'TEXT',
        { senderType: 'SYSTEM', senderName: userName, senderId: userId },
      );
    } catch (error) {
      this.logger.warn(`Failed to send takeover message for conversation ${conversationId}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    this.eventEmitter.emit('whatsapp.conversation.takeover', {
      conversationId,
      userId: updated.userId,
      assignedUserId: userId,
      assignedUserName: userName,
    });

    return updated;
  }

  // Release conversation back to AI agent
  async releaseConversation(conversationId: string) {
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: { assignedAgentId: true, userId: true, assignedAgent: { select: { name: true } } },
    });

    const hasAgent = !!conversation?.assignedAgentId;
    const agentName = conversation?.assignedAgent?.name || 'assistente virtual';

    const updated = await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        isAutoReplyEnabled: hasAgent,
        assignedUserId: null,
        humanTakeoverAt: null,
        status: hasAgent ? 'ASSIGNED' : 'OPEN',
      },
      include: {
        assignedAgent: true,
        assignedUser: { select: { id: true, name: true } },
        tutor: true,
      },
    });

    // Send release message visible to both client and dashboard
    // Wrapped in try/catch: release must succeed even if message delivery fails (e.g. 24h window expired)
    if (hasAgent && conversation?.userId) {
      try {
        const releaseMessage = `Você está novamente sendo atendido pelo nosso ${agentName}. Se precisar falar com um atendente, é só pedir!`;
        await this.sendAndSaveMessage(
          conversation.userId,
          conversationId,
          releaseMessage,
          'TEXT',
          { senderType: 'SYSTEM', senderName: agentName, senderId: conversation.assignedAgentId! },
        );
      } catch (error) {
        this.logger.warn(`Failed to send release message for conversation ${conversationId}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    this.eventEmitter.emit('whatsapp.conversation.released', {
      conversationId,
      userId: updated.userId,
    });

    return updated;
  }

  // Assign AI agent to conversation
  async assignAgentToConversation(conversationId: string, agentId: string | null) {
    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        assignedAgentId: agentId,
        isAutoReplyEnabled: !!agentId,
        status: agentId ? 'ASSIGNED' : 'OPEN',
        assignedUserId: null,
        humanTakeoverAt: null,
      },
      include: {
        assignedAgent: true,
        assignedUser: { select: { id: true, name: true } },
        tutor: true,
      },
    });
  }

  // Send message and save to database
  async sendAndSaveMessage(
    userId: string,
    conversationId: string,
    content: string,
    type: WhatsAppMessageType = 'TEXT',
    senderInfo?: { senderType: 'AI' | 'HUMAN' | 'SYSTEM'; senderName?: string; senderId?: string },
    replyToWaMessageId?: string,
  ): Promise<{ message: { id: string } | null; response: WhatsAppResponse }> {
    // Get conversation
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return {
        message: null,
        response: { success: false, error: 'Conversation not found' },
      };
    }

    // Get user config
    const config = await this.getUserWhatsAppConfig(userId);

    // Send message
    const response = await this.sendMessage(
      { to: conversation.contactPhone, message: content, replyToWaMessageId },
      config || undefined,
    );

    // Save message — guarda a citação também do NOSSO lado, senão o cliente vê a
    // resposta grudada na pergunta e a caixa da recepção mostra ela solta.
    const message = await this.saveOutboundMessage(
      conversationId,
      content,
      type,
      response.messageId,
      replyToWaMessageId ? { replyToWaMessageId } : undefined,
      senderInfo,
    );

    // Emit event for WebSocket real-time updates
    if (response.success) {
      this.eventEmitter.emit('whatsapp.message.sent', {
        userId,
        conversationId,
        messageId: message?.id,
      });
    }

    return { message, response };
  }

  /**
   * Envia o BOLETIM pro tutor. Conversa ABERTA (cliente falou nas últimas 24h) → manda o
   * texto completo REGISTRANDO na conversa (aparece no inbox). Conversa FECHADA → manda a
   * abridora (template boletim_fisioterapia) e GUARDA na fila; quando o cliente responder,
   * o listener entrega o boletim completo sozinho.
   */
  async enviarBoletim(tutorId: string, texto: string, petNome?: string): Promise<{ status: 'enviado' | 'na_fila' | 'erro'; error?: string }> {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, include: { contacts: true } });
    if (!tutor) return { status: 'erro', error: 'Tutor não encontrado' };
    const cs = (tutor.contacts || []) as any[];
    const wa = cs.find((x) => x.isWhatsApp) || cs.find((x) => x.isPrimary) || cs[0];
    const phone = wa?.number;
    if (!phone) return { status: 'erro', error: 'Tutor sem telefone' };
    const formatted = this.formatPhoneNumber(phone);

    const conv = await this.prisma.whatsAppConversation.findFirst({ where: { contactPhone: formatted }, orderBy: { lastMessageAt: 'desc' } });
    let aberta = false;
    if (conv) {
      const lastIn = await this.prisma.whatsAppMessage.findFirst({ where: { conversationId: conv.id, direction: 'INBOUND' }, orderBy: { createdAt: 'desc' } });
      aberta = !!lastIn && Date.now() - new Date(lastIn.createdAt).getTime() < 24 * 3600 * 1000;
    }

    if (aberta && conv) {
      const r = await this.sendAndSaveMessage(conv.userId, conv.id, texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Boletim' });
      if (!r?.response?.success) return { status: 'erro', error: r?.response?.error || 'Falha no envio' };
      return { status: 'enviado' };
    }

    const primeiroNome = (tutor.name || '').trim().split(/\s+/)[0] || 'tutor';
    const res = await this.enviarTemplateRegistrando(formatted, 'boletim_fisioterapia', [{ type: 'text', text: primeiroNome }, { type: 'text', text: petNome || 'seu pet' }], `🌿 Enviei a mensagem que abre a conversa — o boletim do(a) ${petNome || 'pet'} vai assim que o cliente responder.`);
    if (!res.success) return { status: 'erro', error: res.error || 'Falha ao enviar a abridora' };
    await this.prisma.listaItem.deleteMany({ where: { lista: 'boletim_fila', valor: { contains: `"tutorId":"${tutorId}"` } } });
    await this.prisma.listaItem.create({ data: { lista: 'boletim_fila', valor: JSON.stringify({ tutorId, texto, petNome: petNome || '', criadoAt: new Date().toISOString() }) } });
    return { status: 'na_fila' };
  }

  /**
   * Boletim de INTERNAÇÃO pro tutor. Mesma lógica do enviarBoletim (fisio), mas usa a
   * abridora `boletim_internacao` (variável = nome do pet). Conversa aberta → texto direto
   * registrando no inbox; fechada → abridora com botões + guarda na MESMA fila (o listener
   * entrega quando o tutor toca "Ver o boletim").
   */
  /**
   * Baixa a mídia da NOSSA url (S3) e manda pelo WhatsApp com legenda.
   * A Meta só aceita mídia por `mediaId`, então tem que subir o arquivo antes.
   */
  private async enviarMidiaDeUrl(
    phone: string,
    url: string,
    tipo: 'image' | 'video',
    caption?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const r = await fetch(url);
      if (!r.ok) return { success: false, error: `Não consegui baixar o arquivo (${r.status})` };
      const mime = r.headers.get('content-type') || (tipo === 'image' ? 'image/jpeg' : 'video/mp4');
      const buf = Buffer.from(await r.arrayBuffer());
      const nome = (url.split('/').pop() || '').split('?')[0] || (tipo === 'image' ? 'foto.jpg' : 'video.mp4');
      const up = await this.uploadMedia(buf, mime, nome);
      if (!up.mediaId) return { success: false, error: up.error || 'Falha ao subir o arquivo para a Meta' };
      const res = await this.sendMediaMessage(phone, up.mediaId, tipo, caption);
      return { success: res.success, messageId: (res as any).messageId, error: res.error };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao enviar o arquivo' };
    }
  }

  async enviarBoletimInternacao(
    tutorId: string,
    texto: string,
    petNome?: string,
    midia?: { url: string; tipo: 'image' | 'video' },
  ): Promise<{ status: 'enviado' | 'na_fila' | 'erro'; error?: string }> {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, include: { contacts: true } });
    if (!tutor) return { status: 'erro', error: 'Tutor não encontrado' };
    const cs = (tutor.contacts || []) as any[];
    const wa = cs.find((x) => x.isWhatsApp) || cs.find((x) => x.isPrimary) || cs[0];
    const phone = wa?.number;
    if (!phone) return { status: 'erro', error: 'Tutor sem telefone' };
    const formatted = this.formatPhoneNumber(phone);

    const conv = await this.prisma.whatsAppConversation.findFirst({ where: { contactPhone: formatted }, orderBy: { lastMessageAt: 'desc' } });
    let aberta = false;
    if (conv) {
      const lastIn = await this.prisma.whatsAppMessage.findFirst({ where: { conversationId: conv.id, direction: 'INBOUND' }, orderBy: { createdAt: 'desc' } });
      aberta = !!lastIn && Date.now() - new Date(lastIn.createdAt).getTime() < 24 * 3600 * 1000;
    }

    if (aberta && conv) {
      if (midia?.url) {
        // Foto/vídeo vai com o boletim como legenda — uma mensagem só.
        const r = await this.enviarMidiaDeUrl(formatted, midia.url, midia.tipo, texto);
        if (!r.success) return { status: 'erro', error: r.error || 'Falha ao enviar o arquivo' };
        await this.saveOutboundMessage(conv.id, texto, midia.tipo === 'image' ? 'IMAGE' : 'VIDEO', r.messageId, { mediaUrl: midia.url, fromSystem: true }, { senderType: 'SYSTEM', senderName: 'Boletim internação' });
        await this.prisma.whatsAppConversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }).catch(() => undefined);
        return { status: 'enviado' };
      }
      const r = await this.sendAndSaveMessage(conv.userId, conv.id, texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Boletim internação' });
      if (!r?.response?.success) return { status: 'erro', error: r?.response?.error || 'Falha no envio' };
      return { status: 'enviado' };
    }

    const res = await this.enviarTemplateRegistrando(formatted, 'boletim_internacao', [{ type: 'text', text: petNome || 'seu pet' }], `🏥 Enviei a mensagem que abre a conversa — o boletim do(a) ${petNome || 'pet'} vai assim que o tutor responder.`);
    if (!res.success) return { status: 'erro', error: res.error || 'Falha ao enviar a abridora' };
    await this.prisma.listaItem.deleteMany({ where: { lista: 'boletim_fila', valor: { contains: `"tutorId":"${tutorId}"` } } });
    // A mídia fica guardada na fila junto com o texto — quando o tutor responder,
    // o listener entrega os dois (o arquivo continua no S3 até lá).
    await this.prisma.listaItem.create({ data: { lista: 'boletim_fila', valor: JSON.stringify({ tutorId, texto, petNome: petNome || '', midia: midia || null, criadoAt: new Date().toISOString() }) } });
    return { status: 'na_fila' };
  }

  /** Entrega o boletim que estava na fila — chamado pelo listener quando o cliente responde. */
  async entregarBoletimDaFila(tutorId: string): Promise<boolean> {
    const item = await this.prisma.listaItem.findFirst({ where: { lista: 'boletim_fila', valor: { contains: `"tutorId":"${tutorId}"` } } });
    if (!item) return false;
    let dados: any = {}; try { dados = JSON.parse(item.valor); } catch { return false; }
    const conv = await this.prisma.whatsAppConversation.findFirst({ where: { tutorId }, orderBy: { lastMessageAt: 'desc' } });
    if (conv && dados.texto) {
      if (dados.midia?.url) {
        // Boletim com foto/vídeo: entrega o arquivo com o texto como legenda.
        const r = await this.enviarMidiaDeUrl(conv.contactPhone, dados.midia.url, dados.midia.tipo, dados.texto);
        if (r.success) {
          await this.saveOutboundMessage(conv.id, dados.texto, dados.midia.tipo === 'image' ? 'IMAGE' : 'VIDEO', r.messageId, { mediaUrl: dados.midia.url, fromSystem: true }, { senderType: 'SYSTEM', senderName: 'Boletim' });
          await this.prisma.whatsAppConversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }).catch(() => undefined);
        } else {
          // Se a mídia falhar, pelo menos o texto do boletim chega.
          this.logger.warn(`Mídia do boletim falhou (tutor ${tutorId}): ${r.error}`);
          await this.sendAndSaveMessage(conv.userId, conv.id, dados.texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Boletim' });
        }
      } else {
        await this.sendAndSaveMessage(conv.userId, conv.id, dados.texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Boletim' });
      }
    }
    await this.prisma.listaItem.delete({ where: { id: item.id } }).catch(() => undefined);
    return true;
  }

  /** Cancela o boletim na fila (cliente respondeu que não precisa). */
  async cancelarBoletimDaFila(tutorId: string): Promise<void> {
    await this.prisma.listaItem.deleteMany({ where: { lista: 'boletim_fila', valor: { contains: `"tutorId":"${tutorId}"` } } });
  }

  /**
   * Envia um TEMPLATE e, se já existe conversa com esse número, REGISTRA a mensagem
   * na conversa (aparece no inbox como enviada pelo sistema). Usado pelos lembretes
   * (aniversário/protocolo) e pela abridora do boletim, pra não sumirem do histórico.
   */
  // Dono das conversas de WhatsApp (clínica single-tenant = admin). Usado para CRIAR a
  // conversa quando um envio automático vai para alguém que ainda não tem thread — assim
  // toda mensagem que o sistema manda APARECE no inbox, não só para quem já falou antes.
  private _donoWhatsApp: string | null = null;
  private async resolverDonoWhatsApp(): Promise<string | null> {
    if (this._donoWhatsApp) return this._donoWhatsApp;
    const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }).catch(() => null);
    this._donoWhatsApp = admin?.id || (await this.prisma.user.findFirst({ select: { id: true } }).catch(() => null))?.id || null;
    return this._donoWhatsApp;
  }
  /** Acha a conversa pelo telefone (últimos 8) ou CRIA uma nova (dono = admin). */
  private async acharOuCriarConversa(formatted: string) {
    const tail = formatted.replace(/\D/g, '').slice(-8);
    if (tail.length >= 8) {
      const existente = await this.prisma.whatsAppConversation.findFirst({ where: { contactPhone: { endsWith: tail } }, orderBy: { lastMessageAt: 'desc' } });
      if (existente) return existente;
    }
    const dono = await this.resolverDonoWhatsApp();
    if (!dono) return null;
    return this.createOrGetConversation(dono, formatted);
  }

  async enviarTemplateRegistrando(
    phone: string,
    templateName: string,
    params: Array<{ type: 'text'; text: string }>,
    textoLegivel?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.sendTemplateMessage(phone, templateName, params);
    if (!res.success) return { success: false, error: res.error };
    try {
      const formatted = this.formatPhoneNumber(phone);
      const conv = await this.acharOuCriarConversa(formatted);
      if (conv) {
        await this.saveOutboundMessage(conv.id, textoLegivel || `[modelo enviado: ${templateName}]`, 'TEMPLATE', res.messageId, { template: templateName, fromSystem: true }, { senderType: 'SYSTEM', senderName: 'Sistema' });
        await this.prisma.whatsAppConversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }).catch(() => undefined);
      }
    } catch { /* registrar é best-effort — nunca trava o envio */ }
    return { success: true };
  }

  /**
   * Envia TEXTO livre e REGISTRA na conversa (se já existir), pra avisos do sistema
   * (pesquisa, confirmação em texto, etc.) aparecerem no inbox como enviados.
   */
  async enviarTextoRegistrando(phone: string, texto: string): Promise<{ success: boolean; error?: string }> {
    const formatted = this.formatPhoneNumber(phone);
    const conv = await this.acharOuCriarConversa(formatted);
    if (conv) {
      // sendAndSaveMessage envia E registra na conversa (mesmo que a thread tenha nascido agora).
      const r = await this.sendAndSaveMessage(conv.userId, conv.id, texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Sistema' });
      return { success: !!r?.response?.success, error: r?.response?.error };
    }
    // Sem como resolver o dono → envia direto (sem thread onde registrar).
    const res = await this.sendMessage({ to: formatted, message: texto });
    return { success: res.success, error: res.error };
  }

  // Map incoming message type to enum
  private mapMessageType(type: string): WhatsAppMessageType {
    const typeMap: Record<string, WhatsAppMessageType> = {
      text: 'TEXT',
      image: 'IMAGE',
      document: 'DOCUMENT',
      audio: 'AUDIO',
      video: 'VIDEO',
      location: 'LOCATION',
      template: 'TEMPLATE',
      interactive: 'INTERACTIVE',
      button: 'BUTTON',
      sticker: 'STICKER',
      contacts: 'CONTACTS',
    };
    return typeMap[type.toLowerCase()] || 'TEXT';
  }

  // ============================================
  // WhatsApp Cloud API Methods
  // ============================================

  // Get message templates
  async getTemplates(config?: WhatsAppConfig): Promise<{ templates: unknown[]; error?: string }> {
    const token = this.accessToken || config?.accessToken;
    const businessId = config?.businessAccountId || this.configService.get<string>('whatsapp.businessAccountId');

    if (!token || !businessId) {
      return { templates: [], error: 'Business Account ID not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${businessId}/message_templates?limit=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return { 
          templates: [], 
          error: data.error?.message || `HTTP ${response.status}` 
        };
      }

      return { templates: data.data || [] };
    } catch (error) {
      return {
        templates: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // Media Download Methods
  // ============================================

  /**
   * Get media URL from WhatsApp Cloud API
   * Media IDs are received in webhook messages
   */
  async getMediaUrl(
    mediaId: string,
    config?: WhatsAppConfig,
  ): Promise<{ url?: string; mimeType?: string; sha256?: string; fileSize?: number; error?: string }> {
    const token = this.accessToken || config?.accessToken;

    if (!token) {
      return { error: 'WhatsApp access token not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      return {
        url: data.url,
        mimeType: data.mime_type,
        sha256: data.sha256,
        fileSize: data.file_size,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download media content from WhatsApp
   * This downloads the actual file content from the temporary URL
   */
  async downloadMedia(
    mediaId: string,
    config?: WhatsAppConfig,
  ): Promise<{ buffer?: Buffer; mimeType?: string; error?: string }> {
    const token = this.accessToken || config?.accessToken;

    if (!token) {
      return { error: 'WhatsApp access token not configured' };
    }

    try {
      // First, get the media URL
      const mediaInfo = await this.getMediaUrl(mediaId, config);

      if (mediaInfo.error || !mediaInfo.url) {
        return { error: mediaInfo.error || 'Failed to get media URL' };
      }

      // Download the media content
      const downloadResponse = await fetch(mediaInfo.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!downloadResponse.ok) {
        return {
          error: `Failed to download media: HTTP ${downloadResponse.status}`,
        };
      }

      const arrayBuffer = await downloadResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      this.logger.log(`Downloaded media ${mediaId}: ${buffer.length} bytes, type: ${mediaInfo.mimeType}`);

      return {
        buffer,
        mimeType: mediaInfo.mimeType,
      };
    } catch (error) {
      this.logger.error(`Error downloading media ${mediaId}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download media and return as base64 string
   * Useful for embedding in responses or storing in database
   */
  async downloadMediaAsBase64(
    mediaId: string,
    config?: WhatsAppConfig,
  ): Promise<{ base64?: string; mimeType?: string; dataUrl?: string; error?: string }> {
    const result = await this.downloadMedia(mediaId, config);

    if (result.error || !result.buffer) {
      return { error: result.error || 'Failed to download media' };
    }

    const base64 = result.buffer.toString('base64');
    const dataUrl = `data:${result.mimeType};base64,${base64}`;

    return {
      base64,
      mimeType: result.mimeType,
      dataUrl,
    };
  }

  /**
   * Process incoming media message
   * Downloads the media and stores it permanently (cloud or local)
   */
  async processIncomingMedia(
    messageId: string,
    mediaId: string,
    userId: string,
  ): Promise<{ success: boolean; cloudUrl?: string; localUrl?: string; error?: string }> {
    try {
      // Preserva a metadata que já existe (mediaId, replyToWaMessageId…) ao atualizar —
      // senão o backfill perderia o mediaId e não conseguiria re-tentar.
      const _msgAtual = await this.prisma.whatsAppMessage.findUnique({ where: { id: messageId }, select: { metadata: true } });
      const _baseMeta: any = (_msgAtual?.metadata as any) || {};

      // Get user config — cai pro config GLOBAL (mesma lógica do download no webhook),
      // senão usuários sem config própria nunca baixam a mídia e o backfill falha em tudo.
      const config = (await this.getUserWhatsAppConfig(userId)) || this.getConfig();

      // Download media from WhatsApp
      const mediaResult = await this.downloadMedia(mediaId, config || undefined);

      if (mediaResult.error || !mediaResult.buffer) {
        this.logger.warn(`Failed to download media for message ${messageId}: ${mediaResult.error}`);
        return { success: false, error: mediaResult.error };
      }

      const mimeType = mediaResult.mimeType || 'application/octet-stream';
      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = `wa_${mediaId}_${Date.now()}${extension}`;

      // Try cloud storage first if configured
      if (this.cloudStorageService.isConfigured()) {
        const uploadResult = await this.cloudStorageService.upload(
          mediaResult.buffer,
          filename,
          mimeType,
          `whatsapp/${userId}`,
        );

        if (uploadResult.success && uploadResult.url) {
          // Update message with cloud storage info
          await this.prisma.whatsAppMessage.update({
            where: { id: messageId },
            data: {
              mediaCloudUrl: uploadResult.url,
              mediaCloudId: uploadResult.publicId,
              mediaStorageType: uploadResult.provider,
              mediaDownloadedAt: new Date(),
              metadata: {
                ..._baseMeta,
                mediaMimeType: mimeType,
                mediaSize: mediaResult.buffer.length,
                mediaDownloaded: true,
              },
            },
          });

          // Also create a MediaFile record for tracking
          await this.prisma.mediaFile.create({
            data: {
              userId,
              originalFilename: filename,
              mimeType,
              size: mediaResult.buffer.length,
              cloudUrl: uploadResult.url,
              publicId: uploadResult.publicId,
              storageProvider: uploadResult.provider,
              source: 'whatsapp',
              sourceId: messageId,
            },
          });

          this.logger.log(`Media uploaded to ${uploadResult.provider} for message ${messageId}: ${uploadResult.url}`);
          return { success: true, cloudUrl: uploadResult.url };
        }

        this.logger.warn(`Cloud upload failed, falling back to local: ${uploadResult.error}`);
      }

      // Fallback: store metadata only (actual file in local storage handled by MediaService)
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          mediaDownloadedAt: new Date(),
          metadata: {
            ..._baseMeta,
            mediaDownloaded: true,
            mediaMimeType: mimeType,
            mediaSize: mediaResult.buffer.length,
            mediaStoredLocally: true,
          },
        },
      });

      this.logger.log(`Processed media for message ${messageId} (local/fallback)`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing media for message ${messageId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get file extension from MIME type
   */
  getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/opus': '.opus',
      'audio/aac': '.aac',
      'video/mp4': '.mp4',
      'video/3gpp': '.3gp',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };

    return mimeMap[mimeType] || '.bin';
  }

  /**
   * Upload media to WhatsApp for sending
   * Used when you need to send media files
   */
  async uploadMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    config?: WhatsAppConfig,
  ): Promise<{ mediaId?: string; error?: string }> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) {
      return { error: 'WhatsApp API not configured' };
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      // Convert Buffer to ArrayBuffer for Blob compatibility
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length) as ArrayBuffer;
      formData.append('file', new Blob([arrayBuffer], { type: mimeType }), filename);
      formData.append('type', mimeType);

      const response = await fetch(`${this.baseUrl}/${phoneId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      this.logger.log(`Uploaded media: ${data.id}`);

      return { mediaId: data.id };
    } catch (error) {
      this.logger.error('Error uploading media:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send media message (image, document, video, audio)
   */
  async sendMediaMessage(
    to: string,
    mediaId: string,
    // 'sticker' entrou pro anexo da caixa de entrada; os chamadores antigos
    // (agente de IA mandando áudio) seguem iguais.
    type: 'image' | 'document' | 'video' | 'audio' | 'sticker',
    caption?: string,
    filename?: string,
    config?: WhatsAppConfig,
    /** Novo e opcional NO FIM de propósito: não mexe em quem já chama. */
    replyToWaMessageId?: string,
  ): Promise<WhatsAppResponse> {
    const token = this.accessToken || config?.accessToken;
    const phoneId = this.phoneNumberId || config?.phoneNumberId;

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'WhatsApp API not configured',
      };
    }

    try {
      const phone = this.formatPhoneNumber(to);

      const mediaPayload: Record<string, unknown> = {
        id: mediaId,
      };

      // Só image/video/document aceitam legenda — o Meta recusa a mensagem inteira
      // se vier caption em áudio ou figurinha.
      if (caption && ['image', 'video', 'document'].includes(type)) {
        mediaPayload.caption = caption;
      }

      if (filename && type === 'document') {
        mediaPayload.filename = filename;
      }

      const response = await fetch(`${this.baseUrl}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type,
          [type]: mediaPayload,
          ...(replyToWaMessageId ? { context: { message_id: replyToWaMessageId } } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
        };
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`Sent ${type} message to ${phone}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending ${type} message:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
