/**
 * Rotas de entrada do Portal do Tutor — /api/portal/*
 *
 * As tres primeiras sao abertas (é o login). Da GET /eu em diante, tudo passa
 * pelo PortalTutorGuard.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PortalAuthService } from './portal-auth.service';
import { PortalEscopoService } from './portal-escopo.service';
import { PortalTutorGuard, RequestDoPortal, tokenDoRequest } from './portal-tutor.guard';

interface ReqComRede extends RequestDoPortal {
  ip?: string;
  socket?: { remoteAddress?: string };
}

function ipDoRequest(req: ReqComRede): string | undefined {
  const fwd = req.headers?.['x-forwarded-for'];
  const head = Array.isArray(fwd) ? fwd[0] : fwd;
  if (head) return head.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress;
}

function uaDoRequest(req: ReqComRede): string | undefined {
  const ua = req.headers?.['user-agent'];
  return Array.isArray(ua) ? ua[0] : ua;
}

@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly auth: PortalAuthService) {}

  /** Passo 1: manda o codigo no WhatsApp. Resposta identica para qualquer numero. */
  @Post('codigo')
  async codigo(@Body() body: { telefone?: string }, @Req() req: ReqComRede) {
    return this.auth.solicitarCodigo(body?.telefone || '', ipDoRequest(req));
  }

  /** Passo 2: confere o codigo. Pode terminar em sessao, desempate ou sem cadastro. */
  @Post('verificar')
  async verificar(
    @Body() body: { telefone?: string; codigo?: string },
    @Req() req: ReqComRede,
  ) {
    return this.auth.verificarCodigo(body?.telefone || '', body?.codigo || '', {
      ip: ipDoRequest(req),
      userAgent: uaDoRequest(req),
    });
  }

  /** Passo 3 (so quando o telefone esta em mais de um cadastro). */
  @Post('escolher')
  async escolher(
    @Body() body: { desempateToken?: string; tutorId?: string },
    @Req() req: ReqComRede,
  ) {
    return this.auth.escolherCadastro(body?.desempateToken || '', body?.tutorId || '', {
      ip: ipDoRequest(req),
      userAgent: uaDoRequest(req),
    });
  }

  /** Encerra a sessao do aparelho. */
  @Post('sair')
  async sair(@Req() req: ReqComRede) {
    await this.auth.sair(tokenDoRequest(req));
    return { ok: true };
  }
}

@Controller('portal')
@UseGuards(PortalTutorGuard)
export class PortalMeController {
  constructor(private readonly escopo: PortalEscopoService) {}

  /**
   * Quem sou eu + meus pets. O front nunca manda tutorId — ele vem do guard.
   * E a rota que a tela Inicio usa para montar tudo.
   */
  @Get('eu')
  async eu(@Req() req: RequestDoPortal) {
    const tutorId = req.portalTutorId!;
    const [tutor, pets] = await Promise.all([
      this.escopo.dadosDoTutor(tutorId),
      this.escopo.petsDoTutor(tutorId),
    ]);
    return { tutor, pets };
  }
}
