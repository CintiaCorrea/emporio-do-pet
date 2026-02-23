import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';

export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: Record<string, unknown>;
      field: string;
    }>;
  }>;
}

export enum WebhookEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export interface WebhookReplayConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  deadLetterAfterHours: number;
}

const DEFAULT_CONFIG: WebhookReplayConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 3600000, // 1 hour
  deadLetterAfterHours: 24,
};

@Injectable()
export class WebhookReplayService {
  private readonly logger = new Logger(WebhookReplayService.name);
  private readonly config: WebhookReplayConfig;
  private processingHandler?: (payload: WebhookPayload, userId: string) => Promise<void>;

  constructor(private prisma: PrismaService) {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Register the handler for processing webhooks
   */
  setProcessingHandler(handler: (payload: WebhookPayload, userId: string) => Promise<void>): void {
    this.processingHandler = handler;
  }

  /**
   * Store a webhook event for potential replay
   */
  async storeWebhookEvent(
    userId: string,
    eventType: string,
    payload: WebhookPayload,
    signature?: string,
  ): Promise<string> {
    const event = await this.prisma.webhookEvent.create({
      data: {
        userId,
        eventType,
        payload: payload as unknown as Prisma.JsonObject,
        signature,
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: new Date(),
      },
    });

    return event.id;
  }

  /**
   * Mark webhook event as completed
   */
  async markCompleted(eventId: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark webhook event as failed and schedule retry
   */
  async markFailed(eventId: string, error: string): Promise<void> {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    const attempts = event.attempts + 1;
    const isDeadLetter = attempts >= this.config.maxRetries;

    // Calculate next retry with exponential backoff
    const delayMs = Math.min(
      this.config.initialDelayMs * Math.pow(2, attempts - 1),
      this.config.maxDelayMs,
    );
    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
        attempts,
        lastError: error,
        nextRetryAt: isDeadLetter ? null : nextRetryAt,
      },
    });

    if (isDeadLetter) {
      this.logger.warn(`Webhook ${eventId} moved to dead letter queue after ${attempts} attempts`);
    } else {
      this.logger.log(`Webhook ${eventId} scheduled for retry at ${nextRetryAt.toISOString()}`);
    }
  }

  /**
   * Get pending webhooks ready for retry
   */
  async getPendingRetries(limit: number = 10): Promise<Array<{
    id: string;
    userId: string;
    eventType: string;
    payload: WebhookPayload;
    attempts: number;
  }>> {
    const events = await this.prisma.webhookEvent.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });

    return events.map(e => ({
      id: e.id,
      userId: e.userId,
      eventType: e.eventType,
      payload: e.payload as unknown as WebhookPayload,
      attempts: e.attempts,
    }));
  }

  /**
   * Process pending webhook retries (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRetries(): Promise<void> {
    if (!this.processingHandler) {
      return;
    }

    const pendingEvents = await this.getPendingRetries(5);

    for (const event of pendingEvents) {
      try {
        // Mark as processing
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSING' },
        });

        // Process the webhook
        await this.processingHandler(event.payload, event.userId);

        // Mark as completed
        await this.markCompleted(event.id);
        this.logger.log(`Webhook ${event.id} processed successfully on retry ${event.attempts + 1}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markFailed(event.id, errorMessage);
        this.logger.error(`Webhook ${event.id} retry failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Get dead letter webhooks for manual review
   */
  async getDeadLetterEvents(
    userId?: string,
    pagination?: { page: number; limit: number },
  ): Promise<{
    data: Array<{
      id: string;
      userId: string;
      eventType: string;
      payload: Record<string, unknown>;
      attempts: number;
      lastError: string | null;
      createdAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WebhookEventWhereInput = {
      status: 'DEAD_LETTER',
      ...(userId && { userId }),
    };

    const [events, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      data: events.map(e => ({
        id: e.id,
        userId: e.userId,
        eventType: e.eventType,
        payload: e.payload as Record<string, unknown>,
        attempts: e.attempts,
        lastError: e.lastError,
        createdAt: e.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manually retry a dead letter webhook
   */
  async retryDeadLetter(eventId: string): Promise<{ success: boolean; error?: string }> {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    if (event.status !== 'DEAD_LETTER') {
      return { success: false, error: 'Event is not in dead letter queue' };
    }

    // Reset for retry
    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: new Date(),
        lastError: null,
      },
    });

    this.logger.log(`Dead letter webhook ${eventId} queued for retry`);
    return { success: true };
  }

  /**
   * Delete old completed and dead letter events
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldEvents(): Promise<void> {
    const completedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const deadLetterCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const { count: completedDeleted } = await this.prisma.webhookEvent.deleteMany({
      where: {
        status: 'COMPLETED',
        processedAt: { lt: completedCutoff },
      },
    });

    const { count: deadLetterDeleted } = await this.prisma.webhookEvent.deleteMany({
      where: {
        status: 'DEAD_LETTER',
        createdAt: { lt: deadLetterCutoff },
      },
    });

    if (completedDeleted > 0 || deadLetterDeleted > 0) {
      this.logger.log(
        `Cleaned up ${completedDeleted} completed and ${deadLetterDeleted} dead letter webhook events`,
      );
    }
  }

  /**
   * Get webhook statistics
   */
  async getStats(userId?: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
    totalToday: number;
    successRateToday: number;
  }> {
    const where = userId ? { userId } : {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [counts, todayTotal, todayCompleted] = await Promise.all([
      this.prisma.webhookEvent.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.webhookEvent.count({
        where: { ...where, createdAt: { gte: todayStart } },
      }),
      this.prisma.webhookEvent.count({
        where: {
          ...where,
          status: 'COMPLETED',
          processedAt: { gte: todayStart },
        },
      }),
    ]);

    const countMap = counts.reduce(
      (acc, c) => {
        acc[c.status] = c._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      pending: countMap['PENDING'] || 0,
      processing: countMap['PROCESSING'] || 0,
      completed: countMap['COMPLETED'] || 0,
      failed: countMap['FAILED'] || 0,
      deadLetter: countMap['DEAD_LETTER'] || 0,
      totalToday: todayTotal,
      successRateToday: todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 100,
    };
  }
}
