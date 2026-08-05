import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecorrenciasService } from './recorrencias.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/agenda')
@Controller('financeiro/agenda')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgendaController {
  constructor(private readonly recorrencias: RecorrenciasService) {}

  @Get()
  @ApiOperation({
    summary:
      'Agenda de vencimentos (gera as recorrências devidas e lista pendentes + KPIs de alerta)',
  })
  agenda(
    @Query('filtro') filtro?: 'TODAS' | 'A_PAGAR' | 'A_RECEBER',
    @Query('ate') ate?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.recorrencias.agenda({ filtro, ate, unidadeId });
  }
}
