import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

@ApiTags('commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar comissões (derivadas de appointments)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionsService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      userId,
      startDate,
      endDate,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Criar comissão (atualiza appointment)' })
  create(@Body() dto: CreateCommissionDto) {
    return this.commissionsService.create(dto);
  }

  // ===================================================================
  // COMISSIONAMENTO COMPLETO
  // Rotas específicas ANTES de @Get(':id') para não serem capturadas.
  // ===================================================================

  @Get('config')
  @ApiOperation({ summary: 'Ler configuração de comissionamento' })
  getConfig() {
    return this.commissionsService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Salvar configuração de comissionamento' })
  saveConfig(@Body() config: any) {
    return this.commissionsService.saveConfig(config);
  }

  @Get('aberto')
  @ApiOperation({ summary: 'Comissões em aberto até uma data (por profissional)' })
  @ApiQuery({ name: 'baixadasAte', required: false })
  aberto(@Query('baixadasAte') baixadasAte?: string) {
    return this.commissionsService.aberto(baixadasAte);
  }

  @Post('fechar')
  @ApiOperation({ summary: 'Fechar comissões do período (gera extratos)' })
  fechar(
    @Body() dto: { baixadasAte?: string; referencia?: string },
    @CurrentUser('id') userId?: string,
  ) {
    return this.commissionsService.fechar(dto, userId);
  }

  @Get('extratos')
  @ApiOperation({ summary: 'Listar fechamentos e seus extratos' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false })
  extratos(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.commissionsService.extratos({ from, to, userId, status });
  }

  @Patch('extratos/:id')
  @ApiOperation({ summary: 'Atualizar status de um extrato (A_PAGAR | PAGO)' })
  updateExtrato(@Param('id') id: string, @Body() body: { status: string }) {
    return this.commissionsService.updateExtratoStatus(id, body.status);
  }

  @Get('minhas')
  @ApiOperation({ summary: 'Minhas comissões em aberto (usuário logado)' })
  @ApiQuery({ name: 'baixadasAte', required: false })
  minhas(
    @CurrentUser('id') userId: string,
    @Query('baixadasAte') baixadasAte?: string,
  ) {
    return this.commissionsService.minhas(userId, baixadasAte);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar comissão por ID' })
  get(@Param('id') id: string) {
    return this.commissionsService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar comissão (status/valor) via appointment' })
  update(@Param('id') id: string, @Body() dto: UpdateCommissionDto) {
    return this.commissionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar comissão (cancela appointment)' })
  remove(@Param('id') id: string) {
    return this.commissionsService.remove(id);
  }
}
