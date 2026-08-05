import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MapVendasService } from './mapvendas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro')
@Controller('financeiro/mapvendas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MapVendasController {
  constructor(private readonly service: MapVendasService) {}

  @Post('importar')
  @ApiOperation({ summary: 'Importa vendas do SimplesVet (CSV) para a unidade escolhida — Sede ou MAP HVG (idempotente)' })
  importar(@Body() body: { csv?: string; unidadeId?: string }) {
    return this.service.importar(body?.csv || '', body?.unidadeId);
  }
}
