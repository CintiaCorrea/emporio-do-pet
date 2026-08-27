import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RhService } from './rh.service';
import { CriarRhDocumentoDto, AtualizarStatusRhDto, CriarRhSolicitacaoDto, ResponderRhSolicitacaoDto } from './dto/rh-documento.dto';

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
}
