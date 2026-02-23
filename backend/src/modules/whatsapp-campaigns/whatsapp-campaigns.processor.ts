import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppCampaignsService } from './whatsapp-campaigns.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface CampaignJobData {
  campaignId: string;
  userId: string;
}

@Processor('whatsapp-campaigns')
export class WhatsAppCampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppCampaignsProcessor.name);

  // Rate limiting: messages per second (WhatsApp Business API limit is ~80/second)
  private readonly RATE_LIMIT_DELAY_MS = 1000; // 1 second between messages for safety
  private readonly BATCH_SIZE = 50; // Process in batches

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
    private campaignsService: WhatsAppCampaignsService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<{ success: boolean; sent: number; failed: number }> {
    const { campaignId, userId } = job.data;

    this.logger.log(`Processing campaign ${campaignId} for user ${userId}`);

    let sent = 0;
    let failed = 0;

    try {
      // Get campaign details
      const campaign = await this.prisma.whatsAppCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Check if campaign is still running (might have been paused)
      if (campaign.status !== 'RUNNING') {
        this.logger.warn(`Campaign ${campaignId} is no longer running (status: ${campaign.status})`);
        return { success: false, sent, failed };
      }

      // Get WhatsApp config for user
      const config = await this.whatsAppService.getUserWhatsAppConfig(userId);

      if (!config) {
        this.logger.error(`No WhatsApp config found for user ${userId}`);
        await this.campaignsService.failCampaign(campaignId);
        return { success: false, sent, failed };
      }

      // Get pending recipients in batches
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        // Check if campaign was paused
        const currentStatus = await this.prisma.whatsAppCampaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });

        if (currentStatus?.status !== 'RUNNING') {
          this.logger.log(`Campaign ${campaignId} was paused/stopped`);
          break;
        }

        // Get batch of pending recipients
        const recipients = await this.prisma.whatsAppCampaignRecipient.findMany({
          where: {
            campaignId,
            status: 'PENDING',
          },
          take: this.BATCH_SIZE,
          skip: offset,
          orderBy: { createdAt: 'asc' },
        });

        if (recipients.length === 0) {
          hasMore = false;
          break;
        }

        this.logger.debug(`Processing batch of ${recipients.length} recipients`);

        // Process each recipient
        for (const recipient of recipients) {
          try {
            // Interpolate message with variables
            let message = campaign.messageContent;
            
            if (recipient.variables) {
              const vars = recipient.variables as Record<string, string>;
              for (const [key, value] of Object.entries(vars)) {
                // Support both {key} and {{key}} style placeholders
                message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
              }
            }

            // Replace common placeholders (both {var} and {{var}} styles)
            const replacePlaceholder = (msg: string, patterns: string[], value: string): string => {
              for (const pattern of patterns) {
                msg = msg.replace(new RegExp(`\\{\\{${pattern}\\}\\}`, 'gi'), value);
                msg = msg.replace(new RegExp(`\\{${pattern}\\}`, 'gi'), value);
              }
              return msg;
            };

            message = replacePlaceholder(message, ['nome', 'name', '1'], recipient.name || 'Cliente');
            message = replacePlaceholder(message, ['telefone', 'phone'], recipient.phone);
            message = replacePlaceholder(message, ['data', 'date'], new Date().toLocaleDateString('pt-BR'));

            // Send message
            let result;
            
            if (campaign.templateName) {
              // Send template message
              result = await this.whatsAppService.sendTemplateMessage(
                recipient.phone,
                campaign.templateName,
                this.extractTemplateParams(message),
                campaign.templateLanguage || 'pt_BR',
                config,
              );
            } else {
              // Send text message
              result = await this.whatsAppService.sendMessage(
                { to: recipient.phone, message },
                config,
              );
            }

            if (result.success) {
              await this.campaignsService.updateRecipientStatus(
                recipient.id,
                'SENT',
                result.messageId,
              );
              sent++;

              // Emit event
              this.eventEmitter.emit('whatsapp.campaign.message.sent', {
                campaignId,
                recipientId: recipient.id,
                phone: recipient.phone,
                messageId: result.messageId,
              });
            } else {
              await this.campaignsService.updateRecipientStatus(
                recipient.id,
                'FAILED',
                undefined,
                result.error,
              );
              failed++;

              this.logger.warn(`Failed to send to ${recipient.phone}: ${result.error}`);
            }

            // Rate limiting delay
            await this.delay(this.RATE_LIMIT_DELAY_MS);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.campaignsService.updateRecipientStatus(
              recipient.id,
              'FAILED',
              undefined,
              errorMessage,
            );
            failed++;
            this.logger.error(`Error sending to ${recipient.phone}: ${errorMessage}`);
          }
        }

        // Update campaign metrics periodically
        await this.campaignsService.updateCampaignMetrics(campaignId);

        // Update job progress
        const progress = Math.round(((sent + failed) / campaign.totalRecipients) * 100);
        await job.updateProgress(progress);

        // If batch had less than BATCH_SIZE, we're done
        if (recipients.length < this.BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += this.BATCH_SIZE;
        }
      }

      // Final metrics update
      await this.campaignsService.updateCampaignMetrics(campaignId);

      // Mark campaign as completed
      await this.campaignsService.completeCampaign(campaignId);

      this.logger.log(`Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`);

      // Emit completion event
      this.eventEmitter.emit('whatsapp.campaign.completed', {
        campaignId,
        userId,
        sent,
        failed,
        total: campaign.totalRecipients,
      });

      return { success: true, sent, failed };

    } catch (error) {
      this.logger.error(`Campaign ${campaignId} failed: ${error}`);

      // Mark campaign as failed
      await this.campaignsService.failCampaign(campaignId);

      throw error;
    }
  }

  /**
   * Extract template parameters from message.
   * 
   * WhatsApp Business API templates use numbered placeholders: {{1}}, {{2}}, etc.
   * This method extracts the values from an interpolated message where placeholders
   * have already been replaced with actual values.
   * 
   * If the message still contains numbered placeholders like {{1}}, they're extracted
   * as parameter positions. Otherwise, the whole message is sent as a single parameter.
   */
  private extractTemplateParams(message: string): Array<{ type: 'text'; text: string }> {
    // Check if message contains numbered template placeholders like {{1}}, {{2}}
    const placeholderRegex = /\{\{(\d+)\}\}/g;
    const matches = [...message.matchAll(placeholderRegex)];
    
    if (matches.length > 0) {
      // Message contains template placeholders - this means interpolation failed or
      // the original template had {{N}} style vars that should map to parameters
      // Return the interpolated values based on the template structure
      const maxIndex = Math.max(...matches.map(m => parseInt(m[1], 10)));
      const params: Array<{ type: 'text'; text: string }> = [];
      
      for (let i = 1; i <= maxIndex; i++) {
        params.push({ type: 'text', text: `{{${i}}}` });
      }
      
      return params;
    }

    // Check for named placeholders that were already interpolated
    // Split message by line breaks or sentences for multi-parameter templates
    const parts = message.split(/\n+/).filter(p => p.trim());
    
    if (parts.length > 1) {
      // Multiple lines - each line could be a parameter
      return parts.map(part => ({ type: 'text', text: part.trim() }));
    }

    // Single message - return as single parameter
    return [{ type: 'text', text: message }];
  }

  // Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
