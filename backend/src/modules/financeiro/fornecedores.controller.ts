import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FornecedoresService } from './fornecedores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/fornecedores')
@Controller('financeiro/fornecedores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FornecedoresController {
  constructor(private readonly fornecedores: FornecedoresService) {}

  @Get()
  @ApiOperation({
    summary:
      'Visão de contas a pagar de fornecedor: processa o Caixa (lazy) e retorna faturas em aberto + parceiros do mês + KPIs',
  })
  overview(@Query('competencia') competencia?: string) {
    return this.fornecedores.overview(competencia);
  }

  @Post('processar')
  @ApiOperation({ summary: 'Reprocessa o Caixa manualmente (idempotente)' })
  processar() {
    return this.fornecedores.processar();
  }

  @Post('faturas/:id/fechar')
  @ApiOperation({ summary: 'Fecha a fatura do laboratório e gera a conta a pagar' })
  fechar(
    @Param('id') id: string,
    @Body() body: { contaId?: string; vencimento?: string },
  ) {
    return this.fornecedores.fecharFatura(id, body ?? {});
  }
}
