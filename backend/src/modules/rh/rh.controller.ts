import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RhService } from './rh.service';
import { CriarRhDocumentoDto, AtualizarStatusRhDto, CriarRhSolicitacaoDto, ResponderRhSolicitacaoDto, CriarRhComunicadoDto, BaterPontoDto, AjustePontoDto } from './dto/rh-documento.dto';

/**
 * RH — Fatia 1 (Documentos). Endpoint DEDICADO e protegido: funcionário só enxerga/mexe
 * nos DELE (o service trava por userId); admin (ADMIN/GERENTE) vê todos e muda status.
 * NUNCA expor documentos de RH pelo /api/listas genérico.
 */
@ApiTags('rh')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh')
export class RhController {
  constructor(private readonly rh: RhService) {}

  /** Perfil do funcionário logado (cabeçalho do "Meu RH"). */
  @Get('perfil')
  perfil(@CurrentUser() user: any) {
    return this.rh.meuPerfil(user);
  }

  /** Lista documentos: funcionário → só os dele; admin → todos (filtros userId/tipo/status). */
  @Get('documentos')
  listar(@CurrentUser() user: any, @Query('userId') userId?: string, @Query('tipo') tipo?: string, @Query('status') status?: string) {
    return this.rh.listarDocumentos(user, { userId, tipo, status });
  }

  /** Envia um documento (arquivo já subiu via /media/upload → manda a url). */
  @Post('documentos')
  criar(@CurrentUser() user: any, @Body() dto: CriarRhDocumentoDto) {
    return this.rh.criarDocumento(user, dto);
  }

  /** Muda o status (VISTO/APROVADO) — só admin. */
  @Patch('documentos/:id')
  status(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AtualizarStatusRhDto) {
    return this.rh.atualizarStatus(user, id, dto.status);
  }

  /** Remove um documento — admin ou o próprio dono. */
  @Delete('documentos/:id')
  remover(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rh.removerDocumento(user, id);
  }

  // ---------------- SOLICITAÇÕES (Fatia 2) ----------------
  /** Lista: funcionário → só as dele; admin → todas (filtro status). */
  @Get('solicitacoes')
  listarSolic(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.rh.listarSolicitacoes(user, { status });
  }

  /** Abre uma solicitação (funcionário, pra si). */
  @Post('solicitacoes')
  criarSolic(@CurrentUser() user: any, @Body() dto: CriarRhSolicitacaoDto) {
    return this.rh.criarSolicitacao(user, dto);
  }

  /** Responde (aprovar/negar + observação) — só admin. */
  @Patch('solicitacoes/:id')
  responderSolic(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ResponderRhSolicitacaoDto) {
    return this.rh.responderSolicitacao(user, id, dto.status, dto.resposta);
  }

  /** Cancela (dono, se pendente) ou remove (admin). */
  @Delete('solicitacoes/:id')
  removerSolic(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rh.removerSolicitacao(user, id);
  }

  // ---------------- COMUNICADOS + FUNCIONÁRIOS (Fatia 3) ----------------
  /** Lista: funcionário → os pra ele (com `lido`); admin → todos (com nº de leituras). */
  @Get('comunicados')
  listarComunicados(@CurrentUser() user: any) {
    return this.rh.listarComunicados(user);
  }

  /** Publica um comunicado (a todos ou a um) — só admin. */
  @Post('comunicados')
  criarComunicado(@CurrentUser() user: any, @Body() dto: CriarRhComunicadoDto) {
    return this.rh.criarComunicado(user, dto);
  }

  /** Funcionário confirma ciência. */
  @Post('comunicados/:id/lido')
  marcarLido(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rh.marcarLido(user, id);
  }

  /** Remove um comunicado — só admin. */
  @Delete('comunicados/:id')
  removerComunicado(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rh.removerComunicado(user, id);
  }

  /** Lista de funcionários (admin) — pro seletor de "enviar documento/holerite". */
  @Get('funcionarios')
  listarFuncionarios(@CurrentUser() user: any) {
    return this.rh.listarFuncionarios(user);
  }

  // ---------------- PONTO (Fatia 4) ----------------
  /** Estado do ponto de HOJE do funcionário logado. */
  @Get('ponto/hoje')
  pontoHoje(@CurrentUser() user: any) {
    return this.rh.pontoHoje(user);
  }

  /** Funcionário bate o ponto (próxima batida do ciclo, ou tipo explícito). */
  @Post('ponto/bater')
  baterPonto(@CurrentUser() user: any, @Body() dto: BaterPontoDto) {
    return this.rh.baterPonto(user, dto);
  }

  /** Espelho do mês. Funcionário → o dele; admin → de qualquer userId (?userId=&mes=YYYY-MM). */
  @Get('ponto/espelho')
  espelho(@CurrentUser() user: any, @Query('userId') userId?: string, @Query('mes') mes?: string) {
    return this.rh.espelho(user, { userId, mes });
  }

  /** Painel admin: ponto de HOJE de toda a equipe. */
  @Get('ponto/equipe-hoje')
  equipeHoje(@CurrentUser() user: any) {
    return this.rh.equipeHoje(user);
  }

  /** Admin lança um ajuste (batida corrigida) com justificativa. */
  @Post('ponto/ajuste')
  lancarAjuste(@CurrentUser() user: any, @Body() dto: AjustePontoDto) {
    return this.rh.lancarAjuste(user, dto);
  }
}
