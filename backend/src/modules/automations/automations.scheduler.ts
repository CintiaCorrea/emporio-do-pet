import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CronExpressionParser } from 'cron-parser';

interface ScheduledAutomation {
  id: string;
  name: string;
  triggerConfig: {
    cron?: string;
    timezone?: string;
  } | null;
}

@Injectable()
export class AutomationsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationsScheduler.name);
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @InjectQueue('automations') private automationsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing automations scheduler...');
    await this.syncScheduledAutomations();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down automations scheduler...');
    this.clearAllScheduledJobs();
  }

  // Sync scheduled automations every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncScheduledAutomations() {
    this.logger.debug('Syncing scheduled automations...');

    try {
      // Get all active SCHEDULE trigger automations
      const automations = await this.prisma.automation.findMany({
        where: {
          status: 'ACTIVE',
          trigger: 'SCHEDULE',
        },
        select: {
          id: true,
          name: true,
          triggerConfig: true,
        },
      });

      // Track which automations we've seen
      const seenIds = new Set<string>();

      for (const automation of automations) {
        seenIds.add(automation.id);
        
        const config = automation.triggerConfig as { cron?: string; timezone?: string } | null;
        const cronExpression = config?.cron;

        if (!cronExpression) {
          this.logger.warn(`Automation ${automation.id} has SCHEDULE trigger but no cron expression`);
          continue;
        }

        // Check if already scheduled
        if (!this.scheduledJobs.has(automation.id)) {
          this.scheduleAutomation(automation as ScheduledAutomation);
        }
      }

      // Remove jobs for automations that are no longer active or have changed trigger
      for (const [automationId] of this.scheduledJobs) {
        if (!seenIds.has(automationId)) {
          this.unscheduleAutomation(automationId);
        }
      }

      this.logger.debug(`Scheduled automations synced: ${this.scheduledJobs.size} active`);

    } catch (error) {
      this.logger.error('Error syncing scheduled automations:', error);
    }
  }

  private scheduleAutomation(automation: ScheduledAutomation) {
    const config = automation.triggerConfig;
    const cronExpression = config?.cron;
    const timezone = config?.timezone || 'America/Sao_Paulo';

    if (!cronExpression) return;

    try {
      // Parse cron and calculate next run
      const nextRun = this.getNextCronRun(cronExpression, timezone);
      const delay = nextRun.getTime() - Date.now();

      if (delay <= 0) {
        this.logger.warn(`Next run for ${automation.id} is in the past, scheduling for next occurrence`);
        return;
      }

      // Schedule the job
      const timeout = setTimeout(async () => {
        await this.triggerAutomation(automation.id);
        
        // Reschedule for next occurrence
        this.scheduledJobs.delete(automation.id);
        this.scheduleAutomation(automation);
      }, delay);

      this.scheduledJobs.set(automation.id, timeout);
      
      this.logger.log(
        `Scheduled automation ${automation.id} (${automation.name}) ` +
        `to run at ${nextRun.toISOString()} (in ${Math.round(delay / 1000 / 60)} minutes)`
      );

    } catch (error) {
      this.logger.error(`Error scheduling automation ${automation.id}:`, error);
    }
  }

  private unscheduleAutomation(automationId: string) {
    const timeout = this.scheduledJobs.get(automationId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(automationId);
      this.logger.log(`Unscheduled automation ${automationId}`);
    }
  }

  private clearAllScheduledJobs() {
    for (const [automationId, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
      this.logger.debug(`Cleared scheduled job for ${automationId}`);
    }
    this.scheduledJobs.clear();
  }

  private async triggerAutomation(automationId: string) {
    this.logger.log(`Triggering scheduled automation ${automationId}`);

    try {
      await this.automationsQueue.add(
        'execute',
        {
          automationId,
          triggeredBy: 'schedule',
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

    } catch (error) {
      this.logger.error(`Error triggering automation ${automationId}:`, error);
    }
  }

  // Manual trigger (can be called from API)
  async triggerManually(automationId: string, metadata?: Record<string, unknown>) {
    this.logger.log(`Manually triggering automation ${automationId}`);

    await this.automationsQueue.add(
      'execute',
      {
        automationId,
        triggeredBy: 'manual',
        metadata,
      },
      {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  // Event trigger (can be called from event handlers)
  async triggerByEvent(automationId: string, eventType: string, eventData: Record<string, unknown>) {
    this.logger.log(`Triggering automation ${automationId} by event ${eventType}`);

    await this.automationsQueue.add(
      'execute',
      {
        automationId,
        triggeredBy: 'event',
        metadata: {
          eventType,
          eventData,
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  // Webhook trigger (can be called from webhook endpoint)
  async triggerByWebhook(automationId: string, webhookData: Record<string, unknown>) {
    this.logger.log(`Triggering automation ${automationId} by webhook`);

    await this.automationsQueue.add(
      'execute',
      {
        automationId,
        triggeredBy: 'webhook',
        metadata: webhookData,
      },
      {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  // Parse cron expression and get next run time using cron-parser library.
  // Supports full cron syntax: standard 5-field cron, ranges, lists, steps, named months/weekdays
  private getNextCronRun(cronExpression: string, timezone?: string): Date {
    try {
      const parser = CronExpressionParser.parse(cronExpression, {
        currentDate: new Date(),
        tz: timezone || 'America/Sao_Paulo',
      });

      return parser.next().toDate();
    } catch (error) {
      this.logger.error(`Invalid cron expression: ${cronExpression}`, error);
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
  }

  // Validate cron expression without throwing
  private isValidCronExpression(cronExpression: string): boolean {
    try {
      CronExpressionParser.parse(cronExpression);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get human-readable description of cron schedule
   */
  private getCronDescription(cronExpression: string): string {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return 'Expressão inválida';

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Common patterns
    if (cronExpression === '0 * * * *') return 'A cada hora';
    if (cronExpression === '*/15 * * * *') return 'A cada 15 minutos';
    if (cronExpression === '*/30 * * * *') return 'A cada 30 minutos';
    if (cronExpression === '0 0 * * *') return 'Diariamente à meia-noite';
    if (cronExpression === '0 9 * * *') return 'Diariamente às 9h';
    if (cronExpression === '0 9 * * 1-5') return 'Dias úteis às 9h';
    if (cronExpression === '0 0 * * 0') return 'Semanalmente (domingo)';
    if (cronExpression === '0 0 1 * *') return 'Mensalmente (dia 1)';

    // Build description
    let desc = '';
    
    if (minute === '0' && hour !== '*') {
      desc = `Às ${hour}h`;
    } else if (minute.startsWith('*/')) {
      desc = `A cada ${minute.slice(2)} minutos`;
    } else if (hour === '*' && minute !== '*') {
      desc = `No minuto ${minute} de cada hora`;
    } else {
      desc = `${minute} ${hour}`;
    }

    if (dayOfWeek !== '*') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      if (dayOfWeek === '1-5') {
        desc += ' (dias úteis)';
      } else if (dayOfWeek.includes(',')) {
        desc += ` (${dayOfWeek.split(',').map(d => days[parseInt(d)]).join(', ')})`;
      } else {
        desc += ` (${days[parseInt(dayOfWeek)] || dayOfWeek})`;
      }
    }

    if (dayOfMonth !== '*') {
      desc += ` no dia ${dayOfMonth}`;
    }

    if (month !== '*') {
      desc += ` do mês ${month}`;
    }

    return desc;
  }

  // Get status of scheduled jobs
  getScheduledJobsStatus() {
    const jobs: { automationId: string; scheduledAt: Date }[] = [];
    
    for (const [automationId] of this.scheduledJobs) {
      jobs.push({
        automationId,
        scheduledAt: new Date(), // Would need to store the scheduled time
      });
    }

    return {
      count: this.scheduledJobs.size,
      jobs,
    };
  }
}
