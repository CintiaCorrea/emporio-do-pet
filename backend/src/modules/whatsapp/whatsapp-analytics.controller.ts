import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppAnalyticsService, DateRange } from './services/whatsapp-analytics.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('WhatsApp Analytics')
@ApiBearerAuth()
@Controller('whatsapp/analytics')
@UseGuards(JwtAuthGuard)
export class WhatsAppAnalyticsController {
  constructor(private readonly analyticsService: WhatsAppAnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get WhatsApp dashboard with overview metrics' })
  async getDashboard(@CurrentUser() user: { id: string }) {
    return this.analyticsService.getDashboard(user.id);
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get conversation metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
  async getConversationMetrics(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getConversationMetrics(user.id, dateRange);
  }

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get message metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
  async getMessageMetrics(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getMessageMetrics(user.id, dateRange);
  }

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get campaign metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
  async getCampaignMetrics(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getCampaignMetrics(user.id, dateRange);
  }

  @Get('agents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI agent metrics for WhatsApp conversations' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string' })
  async getAgentMetrics(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getAgentMetrics(user.id, dateRange);
  }

  @Get('hourly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get hourly message distribution for a specific day' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'ISO date string (defaults to today)' })
  async getHourlyDistribution(
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return this.analyticsService.getHourlyDistribution(user.id, targetDate);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'], description: 'Export format' })
  async exportAnalytics(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    const dateRange: DateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
    return this.analyticsService.exportAnalytics(user.id, dateRange, format || 'json');
  }

  private parseDateRange(startDate?: string, endDate?: string): DateRange | undefined {
    if (!startDate || !endDate) {
      return undefined;
    }

    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }
}
