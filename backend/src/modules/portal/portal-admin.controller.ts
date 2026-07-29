/**
 * Rotas do painel da EQUIPE sobre o portal — /api/portal/admin/*
 *
 * Atencao ao guard: aqui e `JwtAuthGuard` (login de funcionario), NAO o
 * PortalTutorGuard. Sao dois publicos diferentes no mesmo modulo, e nenhuma
 * dessas rotas pode ser alcancada com sessao de tutor.
 */
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalAgendaRegrasService } from './portal-agenda-regras.service';

interface ReqComUsuario {
  user?: { name?: string; email?: string };
}

@UseGuards(JwtAuthGuard)
@Controller('portal/admin/agenda')
export class PortalAdminController {
  constructor(private readonly regras: PortalAgendaRegrasService) {}

  /** Tudo que a tela de regras precisa: config + serviços + agendas disponíveis. */
  @Get('regras')
  async ler() {
    return this.regras.paraTela();
  }

  @Put('regras')
  async salvar(@Body() corpo: any, @Req() req: ReqComUsuario) {
    return this.regras.salvar(corpo, req?.user?.name || req?.user?.email);
  }
}
