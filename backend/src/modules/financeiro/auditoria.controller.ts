import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import {
  ImportarTaxasDto,
  ImportarVendasDto,
  AtribuirVendaDto,
  TaxaContratadaDto,
  UpdateTaxaDto,
  ClonarVigenciaDto,
} from './dto/auditoria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/auditoria')
@Controller('financeiro/auditoria')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Auditar vendas do período (cobrada × esperada) + resumo' })
  auditar(
    @Query('competencia') competencia?: string,
    @Query('status') status?: 'CONFORME' | 'DIVERGENTE' | 'A_CONFERIR',
    @Query('adquirente') adquirente?: string,
  ) {
    return this.service.auditar({ competencia, status, adquirente });
  }

  @Get('taxas')
  @ApiOperation({ summary: 'Tabela de taxas contratadas' })
  taxas() {
    return this.service.listarTaxas();
  }

  @Get('taxas/vigencias')
  @ApiOperation({ summary: 'Datas de vigência distintas (opcional: por adquirente)' })
  vigencias(@Query('adquirente') adquirente?: string) {
    return this.service.vigencias(adquirente);
  }

  @Post('taxas')
  @ApiOperation({ summary: 'Importar tabela de taxas contratadas (CSV parseado)' })
  importarTaxas(@Body() dto: ImportarTaxasDto) {
    return this.service.importarTaxas(dto);
  }

  @Post('taxas/uma')
  @ApiOperation({ summary: 'Criar uma linha de taxa' })
  criarTaxa(@Body() dto: TaxaContratadaDto) {
    return this.service.criarTaxa(dto);
  }

  @Post('taxas/clonar-vigencia')
  @ApiOperation({ summary: 'Clonar uma vigência para uma nova data (renegociação)' })
  clonarVigencia(@Body() dto: ClonarVigenciaDto) {
    return this.service.clonarVigencia(dto);
  }

  @Patch('taxas/:id')
  @ApiOperation({ summary: 'Editar uma linha de taxa (ex.: alíquota)' })
  atualizarTaxa(@Param('id') id: string, @Body() dto: UpdateTaxaDto) {
    return this.service.atualizarTaxa(id, dto);
  }

  @Delete('taxas/:id')
  @ApiOperation({ summary: 'Remover uma linha de taxa' })
  removerTaxa(@Param('id') id: string) {
    return this.service.removerTaxa(id);
  }

  @Post('vendas')
  @ApiOperation({ summary: 'Importar vendas do cartão (OFX maquineta ou relatório)' })
  importarVendas(@Body() dto: ImportarVendasDto) {
    return this.service.importarVendas(dto);
  }

  @Patch('vendas/:id')
  @ApiOperation({ summary: 'Atribuir bandeira/forma/parcelas/plano a uma venda' })
  atribuir(@Param('id') id: string, @Body() dto: AtribuirVendaDto) {
    return this.service.atribuir(id, dto);
  }

  @Delete('vendas/:id')
  @ApiOperation({ summary: 'Remover uma venda' })
  remover(@Param('id') id: string) {
    return this.service.removerVenda(id);
  }
}
