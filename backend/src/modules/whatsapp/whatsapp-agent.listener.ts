import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
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
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get OpenAI API key - now uses environment variables for single-tenant mode
   */
  private getOpenAiKey(): string | null {
    return this.configService.get<string>('integrations.openai.apiKey') || null;
  }

  private isWithinBusinessHours(): boolean {
    const now = new Date();
    const brasiliaOffset = -3 * 60;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const brasiliaTime = new Date(utcMs + brasiliaOffset * 60000);

    const hour = brasiliaTime.getHours();
    const dayOfWeek = brasiliaTime.getDay();

    // Mon-Fri 8:00-18:00, Sat 8:00-13:00
    if (dayOfWeek === 0) return false; // Sunday
    if (dayOfWeek === 6) return hour >= 8 && hour < 13; // Saturday
    return hour >= 8 && hour < 18; // Weekdays
  }

  @OnEvent('whatsapp.message.process_with_agent')
  async handleProcessWithAgent(event: ProcessWithAgentEvent) {
    const { conversationId, agentId, userId, userMessage, messageId, messageType, mediaId } = event;

    this.logger.log(
      `Processing message ${messageId} with agent ${agentId} for conversation ${conversationId}`,
    );

    try {
      const agent = await this.agentsService.getAgentById(agentId);

      if (!agent || agent.status !== 'ACTIVE') {
        this.logger.warn(`Agent ${agentId} is not active or not found`);
        return;
      }

      const agentConfig = agent as {
        voiceEnabled?: boolean; voiceId?: string; voiceSpeed?: number; voiceModel?: string;
        whatsappBusinessHoursOnly?: boolean; whatsappOfflineMessage?: string;
        whatsappGreeting?: string;
      };

      // Business hours check
      if (agentConfig.whatsappBusinessHoursOnly && !this.isWithinBusinessHours()) {
        const offlineMessage = agentConfig.whatsappOfflineMessage
          || 'Obrigado por entrar em contato! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e sábado das 8h às 13h. Responderemos assim que possível!';

        await this.whatsAppService.sendAndSaveMessage(userId, conversationId, offlineMessage, 'TEXT');
        this.logger.log(`Offline message sent for conversation ${conversationId} (outside business hours)`);
        return;
      }

      // Greeting for first interaction: check if this is the first message in the conversation
      if (agentConfig.whatsappGreeting) {
        const messageCount = await this.prisma.whatsAppMessage.count({
          where: { conversationId, direction: 'INBOUND' },
        });

        if (messageCount <= 1) {
          await this.whatsAppService.sendAndSaveMessage(userId, conversationId, agentConfig.whatsappGreeting, 'TEXT');
          this.logger.log(`Greeting sent for conversation ${conversationId}`);
          // Small delay for better UX so greeting arrives before AI response
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      let processedMessage = userMessage;

      // If message is audio, transcribe it first
      if (messageType === 'audio' && mediaId) {
        this.logger.log(`Transcribing audio message ${messageId}`);
        
        const transcription = await this.transcribeAudioMessage(mediaId);
        
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

      if (agentConfig.voiceEnabled) {
        // Send response as audio
        await this.sendVoiceResponse(
          userId,
          conversationId,
          result.response,
          agentConfig.voiceId || 'nova',
          agentConfig.voiceSpeed || 1.0,
          agentConfig.voiceModel || 'tts-1',
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

      // Update CRM: track agent interaction on linked lead
      await this.updateCrmAfterAgentResponse(conversationId, agentId, result.response);

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
    mediaId: string,
  ): Promise<string | null> {
    try {
      // Get OpenAI key from environment
      const openAiKey = this.getOpenAiKey();
      if (!openAiKey) {
        this.logger.warn('No OpenAI API key configured for transcription (OPENAI_API_KEY)');
        return null;
      }

      // Get WhatsApp config from environment
      const config = this.whatsAppService.getConfig();

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
      // Get OpenAI key from environment
      const openAiKey = this.getOpenAiKey();
      if (!openAiKey) {
        this.logger.warn('No OpenAI API key for TTS (OPENAI_API_KEY), falling back to text');
        await this.whatsAppService.sendAndSaveMessage(
          userId,
          conversationId,
          text,
          'TEXT',
        );
        return;
      }

      // Get WhatsApp config from environment
      const config = this.whatsAppService.getConfig();

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

  /**
   * Track AI agent interaction in CRM (LeadEvent, activity, score update)
   */
  private async updateCrmAfterAgentResponse(
    conversationId: string,
    agentId: string,
    responseText: string,
  ): Promise<void> {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { whatsappConversationId: conversationId },
      });

      if (!lead) return;

      // Create LeadEvent for the AI interaction
      await this.prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'ai_agent_response',
          eventData: {
            name: 'Resposta do agente IA',
            agentId,
            conversationId,
            responseLength: responseText.length,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Update lead activity timestamp
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastActivityAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      // If CRM lead scoring is enabled on the agent, bump engagement score
      const agent = await this.prisma.aIAgent.findUnique({
        where: { id: agentId },
        select: { crmLeadScoring: true, crmNotifyOnHighScore: true },
      });

      if (agent?.crmLeadScoring) {
        const previousScore = lead.currentScore;
        const newScore = Math.min(previousScore + 2, 100);

        if (newScore !== previousScore) {
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              currentScore: newScore,
              scoreUpdatedAt: new Date(),
            },
          });

          await this.prisma.leadScore.create({
            data: {
              leadId: lead.id,
              score: newScore,
              breakdown: {
                reason: 'ai_agent_engagement',
                delta: newScore - previousScore,
                agentId,
              },
            },
          });

          this.eventEmitter.emit('crm.lead.score_changed', {
            leadId: lead.id,
            previousScore,
            newScore,
            scoreDelta: newScore - previousScore,
            reason: 'ai_agent_engagement',
          });
        }
      }

      this.logger.debug(`CRM updated for lead ${lead.id} after agent response`);
    } catch (error) {
      this.logger.warn(
        `Failed to update CRM after agent response: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    this.logger.debug(`Message received in conversation ${event.conversation.id}`);

    if (event.conversation.assignedAgentId && event.conversation.isAutoReplyEnabled) {
      this.logger.log(
        `Auto-reply enabled for conversation ${event.conversation.id}, processing with agent ${event.conversation.assignedAgentId}`,
      );
    }
  }
}
