import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('webhooks/automations')
export class AutomationsWebhookController {
  private readonly logger = new Logger(AutomationsWebhookController.name);

  constructor(
    private readonly automationsService: AutomationsService,
    private readonly prisma: PrismaService,
  ) {}

  // Trigger automation via webhook
  @Post(':id')
  @HttpCode(200)
  async triggerWebhook(
    @Param('id') automationId: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-secret') webhookSecret?: string,
    @Headers('x-signature') signature?: string,
  ) {
    this.logger.log(`Webhook received for automation ${automationId}`);

    try {
      // Get automation
      const automation = await this.prisma.automation.findUnique({
        where: { id: automationId },
        select: {
          id: true,
          userId: true,
          name: true,
          status: true,
          trigger: true,
          triggerConfig: true,
        },
      });

      if (!automation) {
        return {
          success: false,
          error: 'Automation not found',
        };
      }

      // Check if automation is active
      if (automation.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Automation is not active',
        };
      }

      // Check if automation accepts webhooks
      if (automation.trigger !== 'WEBHOOK') {
        return {
          success: false,
          error: 'Automation does not accept webhooks',
        };
      }

      // Validate webhook secret if configured
      const triggerConfig = automation.triggerConfig as {
        webhookSecret?: string;
        requireSignature?: boolean;
      } | null;

      if (triggerConfig?.webhookSecret) {
        if (triggerConfig.requireSignature && signature) {
          // Validate HMAC signature
          const expectedSignature = crypto
            .createHmac('sha256', triggerConfig.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

          const providedSignature = signature.replace('sha256=', '');

          if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(providedSignature),
          )) {
            throw new UnauthorizedException('Invalid webhook signature');
          }
        } else if (webhookSecret !== triggerConfig.webhookSecret) {
          throw new UnauthorizedException('Invalid webhook secret');
        }
      }

      // Execute automation
      const result = await this.automationsService.execute(
        automation.userId,
        automationId,
        'webhook',
        payload,
      );

      return {
        ...result,
        success: true,
        automationId: automation.id,
        automationName: automation.name,
      };

    } catch (error) {
      this.logger.error(`Webhook error for automation ${automationId}: ${error}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get webhook info (for testing)
  @Post(':id/test')
  @HttpCode(200)
  async testWebhook(
    @Param('id') automationId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    this.logger.log(`Test webhook for automation ${automationId}`);

    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
      select: {
        id: true,
        name: true,
        status: true,
        trigger: true,
        triggerConfig: true,
        steps: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            type: true,
            position: true,
          },
        },
      },
    });

    if (!automation) {
      return {
        success: false,
        error: 'Automation not found',
      };
    }

    return {
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        status: automation.status,
        trigger: automation.trigger,
        stepsCount: automation.steps.length,
        steps: automation.steps.map(s => ({
          position: s.position,
          name: s.name,
          type: s.type,
        })),
      },
      receivedPayload: payload,
      message: 'Webhook test successful. Automation was NOT executed.',
    };
  }
}
