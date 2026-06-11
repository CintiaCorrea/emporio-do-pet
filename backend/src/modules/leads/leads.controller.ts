import { 
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  TrackEventDto,
  TrackEventByEmailDto,
  ListLeadsQueryDto,
} from './dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ============================================
  // Endpoints públicos (tracking)
  // ============================================

  @Post('track')
  @ApiOperation({ summary: 'Cria lead e/ou registra evento (público)' })
  @ApiResponse({ status: 201, description: 'Lead criado/atualizado' })
  async trackPublic(@Body() dto: CreateLeadDto) {
    return this.leadsService.upsert(dto);
  }

  @Post('track/event')
  @ApiOperation({ summary: 'Registra evento por email (público)' })
  @ApiResponse({ status: 201, description: 'Evento registrado' })
  async trackEventPublic(@Body() dto: TrackEventByEmailDto) {
    const { email, ...eventData } = dto;
    return this.leadsService.trackEventByEmail(email, eventData);
  }

  // ============================================
  // Endpoints protegidos (CRM)
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista leads com filtros' })
  @ApiResponse({ status: 200, description: 'Lista de leads' })
  async findAll(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estatísticas gerais dos leads' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  async getStats() {
    return this.leadsService.getStats();
  }

  @Get('hot')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista leads quentes (score >= 70)' })
  @ApiResponse({ status: 200, description: 'Leads quentes' })
  async getHotLeads(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.findAll({ ...query, hotOnly: true });
  }

  @Get('with-insights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista leads com insights pendentes' })
  @ApiResponse({ status: 200, description: 'Leads com insights' })
  async getLeadsWithInsights(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.findAll({ ...query, hasInsights: true });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Busca lead por ID' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Lead encontrado' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria novo lead' })
  @ApiResponse({ status: 201, description: 'Lead criado' })
  @ApiResponse({ status: 409, description: 'Email já existe' })
  async create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Lead atualizado' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Lead removido' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  async remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  // ============================================
  // Eventos
  // ============================================

  @Post(':id/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registra evento para lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 201, description: 'Evento registrado' })
  async trackEvent(@Param('id') id: string, @Body() dto: TrackEventDto) {
    return this.leadsService.trackEvent(id, dto);
  }

  @Get(':id/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista eventos do lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async getEvents(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.leadsService.getEvents(id, limit);
  }

  // ============================================
  // Insights
  // ============================================

  @Get(':id/insights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista insights do lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Lista de insights' })
  async getInsights(@Param('id') id: string) {
    return this.leadsService.getInsights(id);
  }

  @Post('insights/:insightId/dismiss')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismissar insight' })
  @ApiParam({ name: 'insightId', description: 'ID do insight' })
  @ApiResponse({ status: 200, description: 'Insight dismissado' })
  async dismissInsight(@Param('insightId') insightId: string) {
    return this.leadsService.dismissInsight(insightId);
  }

  @Post('insights/:insightId/act')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar insight como acionado' })
  @ApiParam({ name: 'insightId', description: 'ID do insight' })
  @ApiResponse({ status: 200, description: 'Insight marcado como acionado' })
  async actOnInsight(@Param('insightId') insightId: string) {
    return this.leadsService.actOnInsight(insightId);
  }

  // ============================================
  // Score
  // ============================================

  @Get(':id/score-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de score do lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 200, description: 'Histórico de scores' })
  async getScoreHistory(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.leadsService.getScoreHistory(id, limit);
  }

  // ============================================
  // Ações manuais
  // ============================================

  @Post(':id/enrich')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Força re-enriquecimento do lead' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 202, description: 'Enriquecimento enfileirado' })
  async forceEnrich(@Param('id') id: string) {
    await this.leadsService.queueEnrichment(id);
    return { message: 'Enriquecimento enfileirado' };
  }

  @Post(':id/score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Força recálculo de score' })
  @ApiParam({ name: 'id', description: 'ID do lead' })
  @ApiResponse({ status: 202, description: 'Scoring enfileirado' })
  async forceScore(@Param('id') id: string) {
    await this.leadsService.queueScoring(id);
    return { message: 'Scoring enfileirado' };
  }

  @Patch(':id/qualification')
  @ApiOperation({ summary: 'Atualizar respostas de qualificação (5 perguntas)' })
  async updateQualification(
    @Param('id') id: string,
    @Body() body: {
      qualSituacaoPet?: string;
      qualQueMaisIncomoda?: string;
      qualTentouOutroVet?: string;
      qualOQueMudaResolver?: string;
      qualQuemDecide?: string;
    },
  ) {
    return this.leadsService.updateQualification(id, body);
  }

  @Patch(':id/pipeline-stage')
  @ApiOperation({ summary: 'Mudar etapa do pipeline (com automações: Compareceu→Cliente)' })
  async updatePipelineStage(
    @Param('id') id: string,
    @Body() body: { stage: string },
  ) {
    return this.leadsService.updatePipelineStage(id, body.stage);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Converter Lead em Tutor (Cliente/Fornecedor/Parceiro)' })
  async convertToTutor(
    @Param('id') id: string,
    @Body() body?: { classificacao?: string },
  ) {
    return this.leadsService.convertToTutor(id, body?.classificacao);
  }

}
