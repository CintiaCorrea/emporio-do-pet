import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Tela Início: pets do tutor + alerta de internação. */
export async function GET(request: NextRequest) {
  const { resposta } = await chamarPortal(request, '/portal/inicio');
  return resposta;
}
