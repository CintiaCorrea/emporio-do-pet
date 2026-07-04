import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CaixaService } from './caixa.service';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { RecebimentoDto } from './dto/recebimento.dto';
import { MovimentoDto } from './dto/movimento.dto';
import { FecharCaixaDto } from './dto/fechar-caixa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('caixa')
@Controller('caixa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CaixaController {
  constructor(private readonly service: CaixaService) {}

  @Get()
  findDoDia(@Query('date') date?: string) {
    return this.service.findDoDia(date);
  }

  @Get('recebimentos')
  listRecebimentos(@Query() query: any) {
    return this.service.listRecebimentos(query);
  }

  @Get('movimentos')
  listMovimentos(@Query() query: any) {
    return this.service.listMovimentos(query);
  }

  // Ponto de venda: cria a venda (appointment) e o recebimento de uma vez.
  @Get('vendas')
  listVendas(@Query() query: any) {
    return this.service.listVendas(query);
  }

  @Get('produtividade')
  produtividade(@Query() query: any, @CurrentUser('id') userId: string) {
    return this.service.produtividade(query, userId);
  }

  @Get('ranking-clientes')
  rankingClientes() {
    return this.service.rankingClientes();
  }

  @Get('recebimentos-resumo')
  recebimentosResumo(@Query() query: any) {
    return this.service.recebimentosResumo(query);
  }

  @Post('pdv')
  pdv(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.vendaDireta(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  abrir(@Body() dto: AbrirCaixaDto, @CurrentUser('id') userId: string) {
    return this.service.abrir(dto, userId);
  }

  @Patch(':id/fechar')
  fechar(@Param('id') id: string, @Body() dto: FecharCaixaDto) {
    return this.service.fechar(id, dto);
  }

  @Patch(':id/reabrir')
  reabrir(@Param('id') id: string) {
    return this.service.reabrir(id);
  }

  @Post(':id/recebimento')
  receber(@Param('id') id: string, @Body() dto: RecebimentoDto, @CurrentUser('id') userId: string) {
    return this.service.registrarRecebimento(id, dto, userId);
  }

  @Post(':id/movimento')
  movimento(@Param('id') id: string, @Body() dto: MovimentoDto, @CurrentUser('id') userId: string) {
    return this.service.registrarMovimento(id, dto, userId);
  }

  @Delete(':id/movimento')
  deleteMovimento(@Param('id') id: string, @Query('itemId') itemId: string) {
    return this.service.deleteMovimento(id, itemId);
  }

  @Delete(':id/recebimento')
  deleteRecebimento(@Param('id') id: string, @Query('itemId') itemId: string) {
    return this.service.deleteRecebimento(id, itemId);
  }

  @Delete(':id/credito')
  deleteCredito(@Param('id') id: string, @Query('itemId') itemId: string) {
    return this.service.deleteCredito(id, itemId);
  }
}
