import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConveniosService } from './convenios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/convenios')
@Controller('financeiro/convenios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConveniosController {
  constructor(private readonly convenios: ConveniosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Visão de contas a receber de convênio: processa itens-convênio (lazy) e retorna faturas em aberto + fechadas do mês + KPIs',
  })
  overview(@Query('competencia') competencia?: string) {
    return this.convenios.overview(competencia);
  }

  @Post('processar')
  @ApiOperation({ summary: 'Reprocessa os itens-convênio manualmente (idempotente)' })
  processar() {
    return this.convenios.processar();
  }

  @Post('faturas/:id/fechar')
  @ApiOperation({ summary: 'Fecha a fatura do convênio e gera a conta a receber' })
  fechar(
    @Param('id') id: string,
    @Body() body: { contaId?: string; vencimento?: string },
  ) {
    return this.convenios.fecharFatura(id, body ?? {});
  }
}
