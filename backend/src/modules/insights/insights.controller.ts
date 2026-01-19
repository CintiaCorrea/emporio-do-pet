import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';
import { InsightPriorityEnum } from './generators';

@ApiTags('Insights')
@Controller('insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista insights pendentes de ação' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de insights' })
  async getPendingInsights(@Query('limit') limit?: number) {
    return this.insightsService.getPendingInsights(limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de insights' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  async getStats() {
    return this.insightsService.getInsightStats();
  }

  @Get('urgent')
  @ApiOperation({ summary: 'Lista insights urgentes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Insights urgentes' })
  async getUrgentInsights(@Query('limit') limit?: number) {
    return this.insightsService.getUrgentInsights(limit);
  }

  @Get('priority/:priority')
  @ApiOperation({ summary: 'Lista insights por prioridade' })
  @ApiParam({ name: 'priority', enum: InsightPriorityEnum })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Insights filtrados' })
  async getByPriority(
    @Param('priority') priority: InsightPriorityEnum,
    @Query('limit') limit?: number,
  ) {
    return this.insightsService.getInsightsByPriority(priority, limit);
  }

  @Get('lead/:leadId')
  @ApiOperation({ summary: 'Lista insights ativos de um lead' })
  @ApiParam({ name: 'leadId', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Insights do lead' })
  async getLeadInsights(@Param('leadId') leadId: string) {
    return this.insightsService.getActiveInsights(leadId);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismissar insight' })
  @ApiParam({ name: 'id', description: 'ID do insight' })
  @ApiResponse({ status: 200, description: 'Insight dismissado' })
  async dismiss(@Param('id') id: string) {
    return this.insightsService.dismissInsight(id);
  }

  @Post(':id/act')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar insight como acionado' })
  @ApiParam({ name: 'id', description: 'ID do insight' })
  @ApiResponse({ status: 200, description: 'Insight marcado como acionado' })
  async act(@Param('id') id: string) {
    return this.insightsService.actOnInsight(id);
  }

  @Post('lead/:leadId/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenera insights de um lead' })
  @ApiParam({ name: 'leadId', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Insights regenerados' })
  async regenerate(@Param('leadId') leadId: string) {
    const count = await this.insightsService.regenerateInsights(leadId);
    return { message: `${count} insights gerados` };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Limpa insights expirados' })
  @ApiResponse({ status: 200, description: 'Insights limpos' })
  async cleanup() {
    const count = await this.insightsService.cleanupExpiredInsights();
    return { message: `${count} insights expirados removidos` };
  }
}
