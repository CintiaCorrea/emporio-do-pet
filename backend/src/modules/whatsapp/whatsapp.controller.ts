import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Req,
  RawBodyRequest,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppService, IncomingMessageData } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CloudStorageService } from '../media/cloud-storage.service';
import { WebhookReplayService } from './services/webhook-replay.service';

// Type definitions for WhatsApp Webhook
interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  /** Presente quando o cliente RESPONDE citando uma mensagem: `id` é a citada. */
  context?: { id?: string; from?: string; forwarded?: boolean };
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  document?: { id: string; filename?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; caption?: string; mime_type?: string };
  sticker?: { id: string; mime_type?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  button?: { text: string; payload: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  contacts?: Array<{
    name: { formatted_name: string };
    phones?: Array<{ phone: string; type: string }>;
  }>;
}

interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

interface WebhookMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: WebhookMetadata;
      contacts?: WebhookContact[];
      messages?: WebhookMessage[];
      statuses?: WebhookStatus[];
    };
    field: string;
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

@Controller('webhook/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  
  // Map phone number ID to user ID (should be loaded from DB in production)
  private phoneToUserMap: Map<string, string> = new Map();
  
  // Cache of valid webhook verify tokens (from all users' configurations)
  private validVerifyTokens: Set<string> = new Set();
  
  // Cached default user ID for single-tenant mode
  private defaultUserId: string | null = null;

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mediaService: MediaService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly webhookReplayService: WebhookReplayService,
  ) {
    // Load phone to user mapping on startup
    this.loadPhoneUserMapping();
    
    // Register webhook processing handler for replay
    this.webhookReplayService.setProcessingHandler(
      this.processWebhookPayload.bind(this),
    );
  }

  private async loadPhoneUserMapping() {
    try {
      const settings = await this.prisma.integrationSettings.findMany({
        where: { whatsappConfig: { not: null } },
        select: { userId: true, whatsappConfig: true },
      });

      // Clear and reload caches
      this.phoneToUserMap.clear();
      this.validVerifyTokens.clear();

      for (const setting of settings) {
        if (setting.whatsappConfig) {
          try {
            const config = JSON.parse(setting.whatsappConfig);
            if (config.phoneNumberId) {
              this.phoneToUserMap.set(config.phoneNumberId, setting.userId);
            }
            // Also collect verify tokens from user configurations
            if (config.webhookVerifyToken) {
              this.validVerifyTokens.add(config.webhookVerifyToken);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      this.logger.log(`Loaded ${this.phoneToUserMap.size} phone-to-user mappings and ${this.validVerifyTokens.size} verify tokens`);
    } catch (error) {
      this.logger.error('Error loading phone-to-user mapping:', error);
    }
  }

  /**
   * Get default user ID for single-tenant mode
   * Returns the first admin user or the first user in the system
   */
  private async getDefaultUserId(): Promise<string | null> {
    if (this.defaultUserId) {
      return this.defaultUserId;
    }

    try {
      // Try to find an admin user first
      const adminUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (adminUser) {
        this.defaultUserId = adminUser.id;
        this.logger.log(`Single-tenant mode: Using admin user ${adminUser.id}`);
        return this.defaultUserId;
      }

      // Fallback to any user
      const anyUser = await this.prisma.user.findFirst({
        select: { id: true },
      });

      if (anyUser) {
        this.defaultUserId = anyUser.id;
        this.logger.log(`Single-tenant mode: Using user ${anyUser.id}`);
        return this.defaultUserId;
      }

      this.logger.warn('No users found in database for single-tenant mode');
      return null;
    } catch (error) {
      this.logger.error('Error getting default user ID:', error);
      return null;
    }
  }

  // Get user ID from phone number ID (with single-tenant fallback)
  private async getUserIdFromPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    // Check cache first
    if (this.phoneToUserMap.has(phoneNumberId)) {
      return this.phoneToUserMap.get(phoneNumberId)!;
    }

    // Reload mapping and try again
    await this.loadPhoneUserMapping();
    
    if (this.phoneToUserMap.has(phoneNumberId)) {
      return this.phoneToUserMap.get(phoneNumberId)!;
    }

    // Single-tenant fallback: use default user
    this.logger.log(`No user mapping found for phone ${phoneNumberId}, using single-tenant fallback`);
    return this.getDefaultUserId();
  }

  // Check if a verify token is valid (from env OR from any user's configuration)
  private async isValidVerifyToken(token: string): Promise<boolean> {
    // First, check against environment variable token
    const envToken = this.whatsAppService.getWebhookVerifyToken();
    if (envToken && token === envToken) {
      return true;
    }

    // Then, check against cached user tokens
    if (this.validVerifyTokens.has(token)) {
      return true;
    }

    // Reload from database and check again
    await this.loadPhoneUserMapping();
    return this.validVerifyTokens.has(token);
  }

  // Webhook verification (GET) - Meta sends this to verify webhook URL
  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    this.logger.log(`Webhook verification request: mode=${mode}, token=${token ? '[PRESENT]' : '[MISSING]'}`);

    if (mode !== 'subscribe') {
      this.logger.warn('Invalid mode for webhook verification');
      return 'Invalid mode';
    }

    // Verify token against env variable and user configurations
    const isValid = await this.isValidVerifyToken(token);

    if (isValid) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Webhook verification failed - invalid verify token');
    return 'Verification failed';
  }

  // Webhook notifications (POST) - Meta sends messages and status updates here
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<string> {
    // Validate signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    const appSecret = this.whatsAppService.getAppSecret();

    if (appSecret) {
      if (!signature) {
        this.logger.warn('Missing webhook signature header');
        return 'Missing signature';
      }
      if (!this.whatsAppService.validateWebhookSignature(rawBody, signature)) {
        this.logger.warn('Invalid webhook signature');
        return 'Invalid signature';
      }
    }

    // Process webhook
    if (payload.object !== 'whatsapp_business_account') {
      return 'OK';
    }

    // Get user ID from first entry's metadata
    let userId: string | null = null;
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.metadata?.phone_number_id) {
          userId = await this.getUserIdFromPhoneNumberId(change.value.metadata.phone_number_id);
          break;
        }
      }
      if (userId) break;
    }

    // Store webhook for replay if processing fails
    let webhookEventId: string | undefined;
    if (userId) {
      try {
        webhookEventId = await this.webhookReplayService.storeWebhookEvent(
          userId,
          'whatsapp_webhook',
          payload,
          signature,
        );
      } catch (error) {
        this.logger.warn(`Failed to store webhook event: ${error}`);
      }
    }

    try {
      // Process the webhook
      await this.processWebhookPayload(payload, userId || '');
      
      // Mark as completed
      if (webhookEventId) {
        await this.webhookReplayService.markCompleted(webhookEventId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook processing failed: ${errorMessage}`);
      
      // Mark as failed for retry
      if (webhookEventId) {
        await this.webhookReplayService.markFailed(webhookEventId, errorMessage);
      }
      
      // Still return OK to prevent Meta from retrying immediately
      // Our replay service will handle retries with backoff
    }

    return 'OK';
  }

  /**
   * Process webhook payload - used for both direct processing and replay
   */
  private async processWebhookPayload(payload: WebhookPayload, userId: string): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Process incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await this.handleIncomingMessage(message, value.contacts?.[0], value.metadata);
          }
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await this.handleStatusUpdate(status);
          }
        }
      }
    }
  }

  private async handleIncomingMessage(
    message: WebhookMessage,
    contact: WebhookContact | undefined,
    metadata: WebhookMetadata,
  ): Promise<void> {
    const contactName = contact?.profile?.name || 'Unknown';
    
    this.logger.log(
      `Incoming ${message.type} message from ${message.from} (${contactName})`,
    );

    // Get user ID from phone number ID
    const userId = await this.getUserIdFromPhoneNumberId(metadata.phone_number_id);
    
    if (!userId) {
      this.logger.warn(`No user found for phone number ID: ${metadata.phone_number_id}`);
      return;
    }

    // Extract message content and metadata based on type
    const { content, mediaUrl, mediaType, mediaCaption, messageMetadata } = this.extractMessageContent(message);

    this.logger.debug(`Message content: ${content}`);

    // Create or get conversation
    const conversation = await this.whatsAppService.createOrGetConversation(
      userId,
      message.from,
      contactName,
      contact?.profile?.name,
      content,
    );

    // Prepare message data
    const messageData: IncomingMessageData = {
      waMessageId: message.id,
      from: message.from,
      contactName,
      type: message.type,
      content,
      mediaUrl,
      mediaType,
      mediaCaption,
      timestamp: message.timestamp,
      // Quando o cliente responde citando, o Meta manda qual mensagem ele citou.
      // Guardamos junto pra caixa mostrar "respondeu a isto" em vez de texto solto.
      metadata: message.context?.id
        ? { ...(messageMetadata || {}), replyToWaMessageId: message.context.id }
        : messageMetadata,
    };

    // Save message to database
    const savedMessage = await this.whatsAppService.saveInboundMessage(
      conversation.id,
      messageData,
    );

    // Download and store media permanently (async, don't block message processing)
    const mediaId = (messageMetadata as Record<string, unknown>)?.mediaId as string | undefined;
    if (mediaId && mediaType) {
      this.downloadAndStoreMedia(userId, savedMessage.id, mediaId, mediaType).catch(err => {
        this.logger.error(`Failed to download media for message ${savedMessage.id}: ${err}`);
      });
    }

    // Emit event for WebSocket (real-time) and automations
    this.eventEmitter.emit('whatsapp.message.received', {
      message: savedMessage,
      conversation,
      conversationId: conversation.id,
      userId,
      contactPhone: message.from,
      contactName,
      content,
      messageType: message.type,
      type: message.type,
    });

    // If conversation has an assigned agent with auto-reply enabled, process with AI
    if (conversation.assignedAgentId && conversation.isAutoReplyEnabled) {
      this.eventEmitter.emit('whatsapp.message.process_with_agent', {
        conversationId: conversation.id,
        agentId: conversation.assignedAgentId,
        userId,
        userMessage: content,
        messageId: savedMessage.id,
        messageType: message.type,
        mediaId: messageMetadata?.mediaId as string | undefined,
      });
    }

    // Mark message as read
    const config = await this.whatsAppService.getUserWhatsAppConfig(userId);
    await this.whatsAppService.markAsRead(message.id, config || undefined);
  }

  private extractMessageContent(message: WebhookMessage): {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaCaption?: string;
    messageMetadata?: Record<string, unknown>;
  } {
    let content = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mediaCaption: string | undefined;
    let messageMetadata: Record<string, unknown> | undefined;

    switch (message.type) {
      case 'text':
        content = message.text?.body || '';
        break;

      case 'image':
        content = message.image?.caption || '[Imagem]';
        mediaType = message.image?.mime_type;
        mediaCaption = message.image?.caption;
        messageMetadata = { mediaId: message.image?.id };
        break;

      case 'document':
        content = `[Documento: ${message.document?.filename || 'arquivo'}]`;
        mediaType = message.document?.mime_type;
        messageMetadata = { 
          mediaId: message.document?.id,
          filename: message.document?.filename,
        };
        break;

      case 'audio':
        content = '[Áudio]';
        mediaType = message.audio?.mime_type;
        messageMetadata = { mediaId: message.audio?.id };
        break;

      case 'video':
        content = message.video?.caption || '[Vídeo]';
        mediaType = message.video?.mime_type;
        mediaCaption = message.video?.caption;
        messageMetadata = { mediaId: message.video?.id };
        break;

      case 'sticker':
        content = '[Sticker]';
        mediaType = message.sticker?.mime_type;
        messageMetadata = { mediaId: message.sticker?.id };
        break;

      case 'location':
        content = message.location?.name || message.location?.address || '[Localização]';
        messageMetadata = {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address,
        };
        break;

      case 'button':
        content = message.button?.text || '';
        messageMetadata = { payload: message.button?.payload };
        break;

      case 'interactive':
        if (message.interactive?.button_reply) {
          content = message.interactive.button_reply.title;
          messageMetadata = { 
            type: 'button_reply',
            id: message.interactive.button_reply.id,
          };
        } else if (message.interactive?.list_reply) {
          content = message.interactive.list_reply.title;
          messageMetadata = { 
            type: 'list_reply',
            id: message.interactive.list_reply.id,
            description: message.interactive.list_reply.description,
          };
        }
        break;

      case 'contacts':
        if (message.contacts && message.contacts.length > 0) {
          const contactInfo = message.contacts[0];
          content = `[Contato: ${contactInfo.name.formatted_name}]`;
          messageMetadata = { contacts: message.contacts };
        }
        break;

      case 'reaction':
        // Cliente reagiu a uma mensagem com um emoji (👍 ❤️ 😂 …). Antes caía no
        // default e aparecia "[reaction]". Mostra o emoji; emoji vazio = reação removida.
        content = message.reaction?.emoji || '↩️ reação removida';
        messageMetadata = { reaction: true, emoji: message.reaction?.emoji || '', reactionTo: message.reaction?.message_id };
        break;

      default:
        content = `[${message.type}]`;
    }

    return { content, mediaUrl, mediaType, mediaCaption, messageMetadata };
  }

  /**
   * Download media from WhatsApp and store it permanently.
   * Tries cloud storage first (S3/Cloudinary), falls back to local storage.
   * Updates the message record with the permanent media URL.
   */
  private async downloadAndStoreMedia(
    userId: string,
    messageId: string,
    mediaId: string,
    mimeType: string,
  ): Promise<void> {
    try {
      const userConfig = await this.whatsAppService.getUserWhatsAppConfig(userId);
      const config = userConfig || this.whatsAppService.getConfig();

      if (!config?.accessToken) {
        this.logger.warn('No WhatsApp config for media download');
        return;
      }

      // Download from WhatsApp
      const downloadResult = await this.whatsAppService.downloadMedia(mediaId, config);
      
      if (downloadResult.error || !downloadResult.buffer) {
        this.logger.warn(`Failed to download media ${mediaId}: ${downloadResult.error}`);
        return;
      }

      const actualMimeType = downloadResult.mimeType || mimeType;
      const filename = this.cloudStorageService.generateFilename(
        `wa_${mediaId}${this.whatsAppService.getExtensionFromMimeType(actualMimeType)}`,
        'whatsapp',
      );

      // Try cloud storage first
      if (this.cloudStorageService.isConfigured()) {
        const uploadResult = await this.cloudStorageService.upload(
          downloadResult.buffer,
          filename,
          actualMimeType,
          `whatsapp/${userId}`,
        );

        if (uploadResult.success && uploadResult.url) {
          // Update message with cloud storage URL
          await this.prisma.whatsAppMessage.update({
            where: { id: messageId },
            data: {
              mediaUrl: uploadResult.url,
              mediaCloudUrl: uploadResult.url,
              mediaCloudId: uploadResult.publicId,
              mediaStorageType: uploadResult.provider,
              mediaDownloadedAt: new Date(),
            },
          });

          // Create MediaFile record for tracking
          await this.prisma.mediaFile.create({
            data: {
              userId,
              originalFilename: filename,
              mimeType: actualMimeType,
              size: downloadResult.buffer.length,
              cloudUrl: uploadResult.url,
              publicId: uploadResult.publicId,
              storageProvider: uploadResult.provider,
              source: 'whatsapp',
              sourceId: messageId,
            },
          });

          this.logger.log(
            `Media uploaded to ${uploadResult.provider} for message ${messageId}: ${uploadResult.url}`,
          );
          return;
        }

        this.logger.warn(`Cloud upload failed: ${uploadResult.error}, falling back to local`);
      }

      // Fallback: store locally
      const stored = await this.mediaService.storeBuffer(
        downloadResult.buffer,
        filename,
        actualMimeType,
      );

      // Update message with local media URL
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          mediaUrl: stored.url,
          mediaStorageType: 'local',
          mediaDownloadedAt: new Date(),
        },
      });

      // Create MediaFile record
      await this.prisma.mediaFile.create({
        data: {
          userId,
          originalFilename: filename,
          mimeType: actualMimeType,
          size: stored.size,
          localPath: stored.path,
          storageProvider: 'local',
          source: 'whatsapp',
          sourceId: messageId,
        },
      });

      this.logger.log(
        `Media stored locally for message ${messageId}: ${stored.url} (${stored.size} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `Error downloading/storing media: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  private async handleStatusUpdate(
    status: WebhookStatus,
  ): Promise<void> {
    this.logger.debug(
      `Message ${status.id} status: ${status.status} for ${status.recipient_id}`,
    );

    let failedReason: string | undefined;

    if (status.status === 'failed' && status.errors) {
      failedReason = status.errors.map(e => `${e.title} (${e.code})`).join('; ');
      for (const error of status.errors) {
        this.logger.error(`Message delivery failed: ${error.title} (code: ${error.code})`);
      }
    }

    // Update message status in database
    await this.whatsAppService.updateMessageStatus(
      status.id,
      status.status,
      failedReason,
    );

    // Find the userId for this message to send targeted WebSocket event
    let userId: string | undefined;
    try {
      const message = await this.prisma.whatsAppMessage.findFirst({
        where: { waMessageId: status.id },
        include: { conversation: { select: { userId: true } } },
      });
      userId = message?.conversation?.userId;
    } catch {}

    // Emit event for tracking (targeted to user if found, otherwise skip)
    if (userId) {
      this.eventEmitter.emit('whatsapp.message.status_updated', {
        userId,
        waMessageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
        timestamp: status.timestamp,
        errors: status.errors,
      });
    }
  }
}
