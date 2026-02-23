import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WhatsAppCampaignsScheduler implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppCampaignsScheduler.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-campaigns') private campaignsQueue: Queue,
    private eventEmitter: EventEmitter2,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    this.logger.log('WhatsApp Campaigns Scheduler initialized');
    // Check immediately for any pending scheduled campaigns
    this.checkScheduledCampaigns();
  }

  /**
   * Check for scheduled campaigns every minute
   * This is the main scheduler that starts campaigns at their scheduled time
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledCampaigns() {
    try {
      const now = new Date();
      
      // Find all campaigns that are:
      // 1. Status = SCHEDULED
      // 2. scheduledFor <= now (time has come or passed)
      // 3. Have recipients
      const scheduledCampaigns = await this.prisma.whatsAppCampaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            lte: now,
          },
          totalRecipients: {
            gt: 0,
          },
        },
        select: {
          id: true,
          name: true,
          userId: true,
          scheduledFor: true,
          totalRecipients: true,
        },
      });

      if (scheduledCampaigns.length > 0) {
        this.logger.log(`Found ${scheduledCampaigns.length} scheduled campaigns to start`);

        for (const campaign of scheduledCampaigns) {
          await this.startScheduledCampaign(campaign);
        }
      }
    } catch (error) {
      this.logger.error('Error checking scheduled campaigns:', error);
    }
  }

  /**
   * Start a scheduled campaign
   */
  private async startScheduledCampaign(campaign: {
    id: string;
    name: string;
    userId: string;
    scheduledFor: Date | null;
    totalRecipients: number;
  }) {
    try {
      this.logger.log(`Starting scheduled campaign: ${campaign.id} - ${campaign.name}`);

      // Update campaign status to RUNNING
      await this.prisma.whatsAppCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Add to processing queue
      await this.campaignsQueue.add(
        'process-campaign',
        {
          campaignId: campaign.id,
          userId: campaign.userId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      // Emit event
      this.eventEmitter.emit('campaign.started', {
        campaignId: campaign.id,
        userId: campaign.userId,
        name: campaign.name,
        totalRecipients: campaign.totalRecipients,
      });

      this.logger.log(`Campaign ${campaign.id} added to queue successfully`);
    } catch (error) {
      this.logger.error(`Error starting scheduled campaign ${campaign.id}:`, error);

      // Mark as failed if we can't start it
      await this.prisma.whatsAppCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Clean up old completed campaigns every day at midnight
   * Removes recipient details for campaigns older than 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldCampaigns() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete old recipients (keep campaign summary but not individual recipients)
      const result = await this.prisma.whatsAppCampaignRecipient.deleteMany({
        where: {
          campaign: {
            completedAt: {
              lt: thirtyDaysAgo,
            },
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old campaign recipients`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old campaigns:', error);
    }
  }

  /**
   * Update metrics for running campaigns every 5 minutes
   * This ensures metrics are synchronized even if some updates were missed
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncRunningCampaignMetrics() {
    try {
      const runningCampaigns = await this.prisma.whatsAppCampaign.findMany({
        where: { status: 'RUNNING' },
        select: { id: true },
      });

      for (const campaign of runningCampaigns) {
        const stats = await this.prisma.whatsAppCampaignRecipient.groupBy({
          by: ['status'],
          where: { campaignId: campaign.id },
          _count: { status: true },
        });

        let sentCount = 0;
        let deliveredCount = 0;
        let readCount = 0;
        let failedCount = 0;
        let pendingCount = 0;

        for (const stat of stats) {
          switch (stat.status) {
            case 'SENT':
              sentCount = stat._count.status;
              break;
            case 'DELIVERED':
              deliveredCount = stat._count.status;
              break;
            case 'READ':
              readCount = stat._count.status;
              break;
            case 'FAILED':
              failedCount = stat._count.status;
              break;
            case 'PENDING':
              pendingCount = stat._count.status;
              break;
          }
        }

        await this.prisma.whatsAppCampaign.update({
          where: { id: campaign.id },
          data: {
            sentCount,
            deliveredCount,
            readCount,
            failedCount,
          },
        });

        // Check if campaign is complete (no pending recipients)
        if (pendingCount === 0 && (sentCount > 0 || failedCount > 0)) {
          await this.prisma.whatsAppCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          this.logger.log(`Campaign ${campaign.id} marked as completed via sync`);
        }
      }
    } catch (error) {
      this.logger.error('Error syncing running campaign metrics:', error);
    }
  }

  /**
   * Check for stuck campaigns every 30 minutes
   * A campaign is "stuck" if it's been running for more than 2 hours without progress
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkStuckCampaigns() {
    try {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const stuckCampaigns = await this.prisma.whatsAppCampaign.findMany({
        where: {
          status: 'RUNNING',
          startedAt: {
            lt: twoHoursAgo,
          },
          updatedAt: {
            lt: twoHoursAgo,
          },
        },
        select: {
          id: true,
          name: true,
          userId: true,
          totalRecipients: true,
          sentCount: true,
        },
      });

      for (const campaign of stuckCampaigns) {
        this.logger.warn(`Campaign ${campaign.id} appears to be stuck, attempting to re-queue`);

        // Check if there are still pending recipients
        const pendingCount = await this.prisma.whatsAppCampaignRecipient.count({
          where: {
            campaignId: campaign.id,
            status: 'PENDING',
          },
        });

        if (pendingCount === 0) {
          // No pending recipients, mark as completed
          await this.prisma.whatsAppCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          this.logger.log(`Campaign ${campaign.id} marked as completed (was stuck but finished)`);
        } else {
          // Re-queue the campaign
          await this.campaignsQueue.add(
            'process-campaign',
            {
              campaignId: campaign.id,
              userId: campaign.userId,
              resume: true,
            },
            {
              attempts: 1,
            },
          );

          this.logger.log(`Campaign ${campaign.id} re-queued for processing`);
        }
      }
    } catch (error) {
      this.logger.error('Error checking stuck campaigns:', error);
    }
  }
}
