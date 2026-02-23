import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';
import { AgentsService } from '../agents/agents.service';
import { AudioService } from '../audio/audio.service';
import { PrismaService } from '../prisma/prisma.service';

interface ProcessWithAgentEvent {
  conversationId: string;
  agentId: string;
  userId: string;
  userMessage: string;
  messageId: string;
  messageType?: string;
  mediaId?: string;
}

@Injectable()
export class WhatsAppAgentListener {
  private readonly logger = new Logger(WhatsAppAgentListener.name);

  constructor(
    private whatsAppService: WhatsAppService,
    private agentsService: AgentsService,
    private audioService: AudioService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get user's OpenAI API key from integration settings
   */
  private async getOpenAiKey(userId: string): Promise<string | null> {
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    const openAiConfig = settings?.openaiConfig as { apiKey?: string } | null;
    return openAiConfig?.apiKey || null;
  }

  @OnEvent('whatsapp.message.process_with_agent')
  async handleProcessWithAgent(event: ProcessWithAgentEvent) {
    const { conversationId, agentId, userId, userMessage, messageId, messageType, mediaId } = event;

    this.logger.log(
      `Processing message ${messageId} with agent ${agentId} for conversation ${conversationId}`,
    );

    try {
      // Get agent with voice settings
      const agent = await this.agentsService.getAgentById(agentId);

      if (!agent || agent.status !== 'ACTIVE') {
        this.logger.warn(`Agent ${agentId} is not active or not found`);
        return;
      }

      let processedMessage = userMessage;

      // If message is audio, transcribe it first
      if (messageType === 'audio' && mediaId) {
        this.logger.log(`Transcribing audio message ${messageId}`);
        
        const transcription = await this.transcribeAudioMessage(userId, mediaId);
        
        if (transcription) {
          processedMessage = transcription;
          this.logger.log(`Audio transcribed: "${transcription.substring(0, 100)}..."`);
        } else {
          this.logger.warn('Failed to transcribe audio, using original message');
        }
      }

      // Execute agent with the (possibly transcribed) message
      const result = await this.agentsService.executeForWhatsApp(
        agentId,
        conversationId,
        processedMessage,
        [], // Conversation history will be loaded from DB
      );

      if (!result.success || !result.response) {
        this.logger.error(`Agent execution failed: ${result.error}`);
        return;
      }

      // Check if agent should respond with voice
      const agentData = agent as { voiceEnabled?: boolean; voiceId?: string; voiceSpeed?: number; voiceModel?: string };
      
      if (agentData.voiceEnabled) {
        // Send response as audio
        await this.sendVoiceResponse(
          userId,
          conversationId,
          result.response,
          agentData.voiceId || 'nova',
          agentData.voiceSpeed || 1.0,
          agentData.voiceModel || 'tts-1',
        );
      } else {
        // Send response as text
        const sendResult = await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          result.response,
          'TEXT',
        );

        if (sendResult.response.success) {
          this.logger.log(
            `AI text response sent to conversation ${conversationId}, messageId: ${sendResult.response.messageId}`,
          );
        } else {
          this.logger.error(
            `Failed to send AI response: ${sendResult.response.error}`,
          );
        }
      }

    } catch (error) {
      this.logger.error(
        `Error processing message with agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Transcribe audio message using OpenAI Whisper
   */
  private async transcribeAudioMessage(
    userId: string,
    mediaId: string,
  ): Promise<string | null> {
    try {
      // Get OpenAI key
      const openAiKey = await this.getOpenAiKey(userId);
      if (!openAiKey) {
        this.logger.warn('No OpenAI API key configured for transcription');
        return null;
      }

      // Get WhatsApp config
      const config = await this.whatsAppService.getUserWhatsAppConfig(userId);
      if (!config) {
        this.logger.warn('No WhatsApp config found');
        return null;
      }

      // Download audio from WhatsApp
      const downloadResult = await this.whatsAppService.downloadMedia(mediaId, config);
      if (downloadResult.error || !downloadResult.buffer) {
        this.logger.warn(`Failed to download audio from WhatsApp: ${downloadResult.error}`);
        return null;
      }

      // Transcribe using AudioService
      const result = await this.audioService.transcribeFromBuffer(
        downloadResult.buffer,
        'audio.ogg',
        openAiKey,
        'pt', // Portuguese as default language
      );

      return result.text;

    } catch (error) {
      this.logger.error(
        `Audio transcription error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Send response as voice message
   */
  private async sendVoiceResponse(
    userId: string,
    conversationId: string,
    text: string,
    voiceId: string,
    voiceSpeed: number,
    voiceModel: string,
  ): Promise<void> {
    try {
      // Get OpenAI key
      const openAiKey = await this.getOpenAiKey(userId);
      if (!openAiKey) {
        this.logger.warn('No OpenAI API key for TTS, falling back to text');
        await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          text,
          'TEXT',
        );
        return;
      }

      // Get WhatsApp config
      const config = await this.whatsAppService.getUserWhatsAppConfig(userId);
      if (!config) {
        this.logger.warn('No WhatsApp config, falling back to text');
        await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          text,
          'TEXT',
        );
        return;
      }

      // Synthesize audio
      this.logger.log(`Synthesizing voice response with voice: ${voiceId}`);
      
      const audioBuffer = await this.audioService.synthesize(
        text,
        openAiKey,
        {
          voice: voiceId as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
          speed: voiceSpeed,
          model: voiceModel as 'tts-1' | 'tts-1-hd',
          format: 'mp3',
        },
      );

      // Upload audio to WhatsApp
      const uploadResult = await this.whatsAppService.uploadMedia(
        audioBuffer,
        'audio/mpeg',
        'response.mp3',
        config,
      );

      if (!uploadResult.mediaId) {
        this.logger.warn('Failed to upload audio, falling back to text');
        await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          text,
          'TEXT',
        );
        return;
      }

      // Get conversation to get recipient phone
      const conversation = await this.prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        this.logger.error('Conversation not found');
        return;
      }

      // Send audio message
      const sendResult = await this.whatsAppService.sendMediaMessage(
        conversation.contactPhone,
        uploadResult.mediaId,
        'audio',
        undefined, // No caption for audio
        undefined,
        config,
      );

      if (sendResult.success) {
        // Save the sent message to database
        await this.prisma.whatsAppMessage.create({
          data: {
            conversationId,
            waMessageId: sendResult.messageId || `sent-${Date.now()}`,
            type: 'AUDIO',
            direction: 'OUTBOUND',
            content: `[Áudio] ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
            status: 'SENT',
            metadata: {
              voiceId,
              voiceSpeed,
              voiceModel,
              originalText: text,
              audioSize: audioBuffer.length,
            },
          },
        });

        // Update conversation lastMessageAt
        await this.prisma.whatsAppConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        this.logger.log(
          `AI voice response sent to conversation ${conversationId}, messageId: ${sendResult.messageId}`,
        );
      } else {
        this.logger.error(
          `Failed to send AI voice response: ${sendResult.error}`,
        );
        
        // Fall back to text
        await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          text,
          'TEXT',
        );
      }

    } catch (error) {
      this.logger.error(
        `Voice response error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      
      // Fall back to text
      await this.whatsAppService.sendAndSaveMessage(
        userId,
        conversationId,
        text,
        'TEXT',
      );
    }
  }

  @OnEvent('whatsapp.message.received')
  async handleMessageReceived(event: {
    message: unknown;
    conversation: { id: string; assignedAgentId?: string; isAutoReplyEnabled?: boolean };
    userId: string;
    content: string;
  }) {
    // Log for debugging
    this.logger.debug(`Message received in conversation ${event.conversation.id}`);

    // Check if auto-reply is enabled and agent is assigned
    if (event.conversation.assignedAgentId && event.conversation.isAutoReplyEnabled) {
      this.logger.log(
        `Auto-reply enabled for conversation ${event.conversation.id}, processing with agent ${event.conversation.assignedAgentId}`,
      );
    }
  }
}
