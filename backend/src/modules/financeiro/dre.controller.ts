import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DreService } from './dre.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/dre')
@Controller('financeiro/dre')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DreController {
  constructor(private readonly service: DreService) {}

  @Get()
  @ApiOperation({
    summary: 'DRE gerencial por competência (consolidado c/ comparação, ou por unidade)',
  })
  dre(
    @Query('competencia') competencia: string,
    @Query('comparar') comparar?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('marcaId') marcaId?: string,
    @Query('linhaServicoId') linhaServicoId?: string,
    @Query('modo') modo?: 'CONSOLIDADO' | 'POR_UNIDADE' | 'POR_LINHA',
    @Query('regime') regime?: 'CAIXA' | 'COMPETENCIA',
  ) {
    return this.service.dre({ competencia, comparar, unidadeId, marcaId, linhaServicoId, modo, regime });
  }
}
