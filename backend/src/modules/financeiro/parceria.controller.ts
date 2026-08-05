import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParceriaService } from './parceria.service';
import {
  CreateFaturamentoDto,
  UpdateFaturamentoDto,
  CreateEmprestimoDto,
  PagarParcelaDto,
} from './dto/parceria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/parceria')
@Controller('financeiro/parceria')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParceriaController {
  constructor(private readonly service: ParceriaService) {}

  @Get('faturamentos')
  @ApiOperation({ summary: 'Faturamentos brutos (Finpet) + resumo do período' })
  listar(@Query('unidadeId') unidadeId?: string, @Query('competencia') competencia?: string) {
    return this.service.listarFaturamentos({ unidadeId, competencia });
  }

  @Post('faturamentos')
  @ApiOperation({ summary: 'Registrar faturamento (split calculado: base = bruto − taxa)' })
  criar(@Body() dto: CreateFaturamentoDto) {
    return this.service.criarFaturamento(dto);
  }

  @Patch('faturamentos/:id')
  @ApiOperation({ summary: 'Atualizar faturamento (recalcula split se valores mudarem)' })
  atualizar(@Param('id') id: string, @Body() dto: UpdateFaturamentoDto) {
    return this.service.atualizarFaturamento(id, dto);
  }

  @Delete('faturamentos/:id')
  @ApiOperation({ summary: 'Excluir faturamento' })
  excluir(@Param('id') id: string) {
    return this.service.excluirFaturamento(id);
  }

  @Get('candidatos')
  @ApiOperation({ summary: 'Receitas da unidade no período (p/ conciliar o líquido)' })
  candidatos(@Query('unidadeId') unidadeId: string, @Query('competencia') competencia?: string) {
    return this.service.candidatosVinculo({ unidadeId, competencia });
  }
}

@ApiTags('financeiro/emprestimos')
@Controller('financeiro/emprestimos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmprestimosController {
  constructor(private readonly service: ParceriaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empréstimos internos (com parcelas e saldo)' })
  listar() {
    return this.service.listarEmprestimos();
  }

  @Post()
  @ApiOperation({ summary: 'Criar empréstimo interno (gera as parcelas)' })
  criar(@Body() dto: CreateEmprestimoDto) {
    return this.service.criarEmprestimo(dto);
  }

  @Post('parcelas/:id/pagar')
  @ApiOperation({ summary: 'Registrar devolução da parcela (cria transferência neutra)' })
  pagar(@Param('id') id: string, @Body() dto: PagarParcelaDto) {
    return this.service.pagarParcela(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir empréstimo (mantém transferências já geradas)' })
  excluir(@Param('id') id: string) {
    return this.service.excluirEmprestimo(id);
  }
}
