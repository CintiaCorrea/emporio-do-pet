import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WebhookReplayService } from './services/webhook-replay.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('WhatsApp Webhooks')
@ApiBearerAuth()
@Controller('whatsapp/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppWebhooksController {
  constructor(private readonly webhookReplayService: WebhookReplayService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get webhook processing statistics' })
  async getStats(@CurrentUser() user: { userId: string }) {
    return this.webhookReplayService.getStats(user.userId);
  }

  @Get('dead-letter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dead letter webhooks for manual review' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDeadLetterEvents(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhookReplayService.getDeadLetterEvents(user.userId, {
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Post('dead-letter/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually retry a dead letter webhook' })
  async retryDeadLetter(
    @Param('id') id: string,
  ) {
    return this.webhookReplayService.retryDeadLetter(id);
  }

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get pending webhook retries (admin only)' })
  async getPendingRetries(@Query('limit') limit?: number) {
    return this.webhookReplayService.getPendingRetries(limit || 10);
  }

  @Get('stats/global')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get global webhook statistics (admin only)' })
  async getGlobalStats() {
    return this.webhookReplayService.getStats();
  }
}
