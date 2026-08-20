import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Sugestão livre do tutor → lista lida pela equipe. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta } = await chamarPortal(request, '/portal/sugestao', { method: 'POST', body });
  return resposta;
}
