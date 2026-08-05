import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CadastrosService } from './cadastros.service';
import { CreateContaDto, UpdateContaDto } from './dto/conta.dto';
import {
  CreateGrupoDto,
  UpdateGrupoDto,
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from './dto/categoria.dto';
import {
  CreateUnidadeDto, UpdateUnidadeDto,
  CreateMarcaDto, UpdateMarcaDto,
  CreateLinhaDto, UpdateLinhaDto,
  CreateContatoDto, UpdateContatoDto,
  CreateFormaDto, UpdateFormaDto,
} from './dto/apoios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/cadastros')
@Controller('financeiro')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CadastrosController {
  constructor(private readonly service: CadastrosService) {}

  @Get('unidades')
  @ApiOperation({ summary: 'Listar unidades' })
  unidades() {
    return this.service.unidades();
  }

  @Get('marcas')
  @ApiOperation({ summary: 'Listar marcas' })
  marcas() {
    return this.service.marcas();
  }

  @Get('linhas-servico')
  @ApiOperation({ summary: 'Listar linhas de serviço' })
  linhasServico() {
    return this.service.linhasServico();
  }

  @Get('categorias')
  @ApiOperation({ summary: 'Listar categorias (plano de contas)' })
  categorias() {
    return this.service.categorias();
  }

  @Get('contas')
  @ApiOperation({ summary: 'Listar contas ativas (para seletores)' })
  contas() {
    return this.service.contas();
  }

  // ---------- gestão de Contas (Cadastros) ----------

  @Get('contas/gestao')
  @ApiOperation({ summary: 'Listar todas as contas (inclui inativas) — tela de cadastro' })
  contasTodas() {
    return this.service.contasTodas();
  }

  @Post('contas')
  @ApiOperation({ summary: 'Criar conta' })
  criarConta(@Body() dto: CreateContaDto) {
    return this.service.criarConta(dto);
  }

  @Patch('contas/:id')
  @ApiOperation({ summary: 'Atualizar conta (editar / ativar / desativar)' })
  atualizarConta(@Param('id') id: string, @Body() dto: UpdateContaDto) {
    return this.service.atualizarConta(id, dto);
  }

  @Delete('contas/:id')
  @ApiOperation({ summary: 'Excluir conta (só se não houver lançamentos)' })
  removerConta(@Param('id') id: string) {
    return this.service.removerConta(id);
  }

  // ---------- Plano de contas ----------

  @Get('plano-de-contas')
  @ApiOperation({ summary: 'Plano de contas completo (grupos + categorias + uso)' })
  planoDeContas() {
    return this.service.planoDeContas();
  }

  @Post('grupos')
  @ApiOperation({ summary: 'Criar grupo do plano de contas' })
  criarGrupo(@Body() dto: CreateGrupoDto) {
    return this.service.criarGrupo(dto);
  }

  @Patch('grupos/:id')
  @ApiOperation({ summary: 'Atualizar grupo' })
  atualizarGrupo(@Param('id') id: string, @Body() dto: UpdateGrupoDto) {
    return this.service.atualizarGrupo(id, dto);
  }

  @Delete('grupos/:id')
  @ApiOperation({ summary: 'Excluir grupo (só se vazio)' })
  removerGrupo(@Param('id') id: string) {
    return this.service.removerGrupo(id);
  }

  @Post('categorias')
  @ApiOperation({ summary: 'Criar categoria' })
  criarCategoria(@Body() dto: CreateCategoriaDto) {
    return this.service.criarCategoria(dto);
  }

  @Patch('categorias/:id')
  @ApiOperation({ summary: 'Atualizar categoria (editar / ativar / desativar)' })
  atualizarCategoria(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.service.atualizarCategoria(id, dto);
  }

  @Delete('categorias/:id')
  @ApiOperation({ summary: 'Excluir categoria (só se não houver lançamentos)' })
  removerCategoria(@Param('id') id: string) {
    return this.service.removerCategoria(id);
  }

  // ---------- Unidades ----------
  @Get('unidades/gestao') unidadesTodas() { return this.service.unidadesTodas(); }
  @Post('unidades') criarUnidade(@Body() dto: CreateUnidadeDto) { return this.service.criarUnidade(dto); }
  @Patch('unidades/:id') atualizarUnidade(@Param('id') id: string, @Body() dto: UpdateUnidadeDto) { return this.service.atualizarUnidade(id, dto); }
  @Delete('unidades/:id') removerUnidade(@Param('id') id: string) { return this.service.removerUnidade(id); }

  // ---------- Marcas ----------
  @Get('marcas/gestao') marcasTodas() { return this.service.marcasTodas(); }
  @Post('marcas') criarMarca(@Body() dto: CreateMarcaDto) { return this.service.criarMarca(dto); }
  @Patch('marcas/:id') atualizarMarca(@Param('id') id: string, @Body() dto: UpdateMarcaDto) { return this.service.atualizarMarca(id, dto); }
  @Delete('marcas/:id') removerMarca(@Param('id') id: string) { return this.service.removerMarca(id); }

  // ---------- Linhas de serviço ----------
  @Get('linhas-servico/gestao') linhasTodas() { return this.service.linhasTodas(); }
  @Post('linhas-servico') criarLinha(@Body() dto: CreateLinhaDto) { return this.service.criarLinha(dto); }
  @Patch('linhas-servico/:id') atualizarLinha(@Param('id') id: string, @Body() dto: UpdateLinhaDto) { return this.service.atualizarLinha(id, dto); }
  @Delete('linhas-servico/:id') removerLinha(@Param('id') id: string) { return this.service.removerLinha(id); }

  // ---------- Contatos ----------
  @Get('contatos') contatos() { return this.service.contatos(); }
  @Post('contatos') criarContato(@Body() dto: CreateContatoDto) { return this.service.criarContato(dto); }
  @Patch('contatos/:id') atualizarContato(@Param('id') id: string, @Body() dto: UpdateContatoDto) { return this.service.atualizarContato(id, dto); }
  @Delete('contatos/:id') removerContato(@Param('id') id: string) { return this.service.removerContato(id); }

  // ---------- Formas de pagamento ----------
  @Get('formas-pagamento') formas() { return this.service.formas(); }
  @Post('formas-pagamento') criarForma(@Body() dto: CreateFormaDto) { return this.service.criarForma(dto); }
  @Patch('formas-pagamento/:id') atualizarForma(@Param('id') id: string, @Body() dto: UpdateFormaDto) { return this.service.atualizarForma(id, dto); }
  @Delete('formas-pagamento/:id') removerForma(@Param('id') id: string) { return this.service.removerForma(id); }
}
