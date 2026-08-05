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
import { LancamentosService } from './lancamentos.service';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { UpdateLancamentoDto } from './dto/update-lancamento.dto';
import { BaixarLancamentoDto } from './dto/baixar-lancamento.dto';
import { ListarLancamentosDto } from './dto/listar-lancamentos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/lancamentos')
@Controller('financeiro/lancamentos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LancamentosController {
  constructor(private readonly service: LancamentosService) {}

  // rotas estáticas ANTES de :id
  @Get('resumo')
  @ApiOperation({ summary: 'KPIs: receitas/despesas + a pagar/vencidos/a classificar' })
  resumo(@Query('competencia') competencia?: string) {
    return this.service.resumo(competencia);
  }

  @Post()
  @ApiOperation({ summary: 'Criar lançamento (aplica regras de classificação)' })
  create(@Body() dto: CreateLancamentoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lançamentos (filtros: período, dimensões, situação, busca)' })
  findAll(@Query() q: ListarLancamentosDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lançamento por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar lançamento' })
  update(@Param('id') id: string, @Body() dto: UpdateLancamentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir lançamento' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/baixar')
  @ApiOperation({ summary: 'Dar baixa (pagamento efetivo + juros/multa/desconto)' })
  baixar(@Param('id') id: string, @Body() dto: BaixarLancamentoDto) {
    return this.service.baixar(id, dto);
  }
}
