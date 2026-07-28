/**
 * O cadeado do portal.
 *
 * Toda rota do portal (fora as tres de login) passa por aqui. O guard NAO confia
 * em nada que venha do navegador alem do token: quem diz de quem e a sessao e o
 * banco. O `tutorId` resolvido fica no request e e a UNICA origem de identidade
 * aceita pelos servicos — nenhuma rota do portal recebe tutorId por parametro.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PortalAuthService } from './portal-auth.service';

export const COOKIE_SESSAO = 'ptl_sessao';

/** Request com o tutor ja resolvido pelo guard. */
export interface RequestDoPortal {
  headers: Record<string, string | string[] | undefined>;
  portalTutorId?: string;
  portalToken?: string;
}

/** Le o token do cabecalho Authorization ou do cookie da sessao. */
export function tokenDoRequest(req: RequestDoPortal): string | null {
  const auth = req.headers?.authorization;
  const header = Array.isArray(auth) ? auth[0] : auth;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;

  const raw = req.headers?.cookie;
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  if (!cookie) return null;
  for (const parte of cookie.split(';')) {
    const [nome, ...resto] = parte.trim().split('=');
    if (nome === COOKIE_SESSAO) return decodeURIComponent(resto.join('=')) || null;
  }
  return null;
}

@Injectable()
export class PortalTutorGuard implements CanActivate {
  constructor(private readonly auth: PortalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestDoPortal>();
    const token = tokenDoRequest(req);
    const tutorId = await this.auth.tutorDaSessao(token);

    if (!tutorId) {
      throw new UnauthorizedException('Sessao do portal expirada ou invalida');
    }

    req.portalTutorId = tutorId;
    req.portalToken = token || undefined;
    return true;
  }
}
