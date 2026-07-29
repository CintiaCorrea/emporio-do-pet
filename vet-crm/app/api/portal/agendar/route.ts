import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Marca de verdade — cai na agenda da equipe. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta } = await chamarPortal(request, '/portal/agendar', { method: 'POST', body });
  return resposta;
}
