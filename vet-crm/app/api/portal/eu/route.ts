import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Quem sou eu + meus pets. O tutorId nunca vem do navegador — sai da sessao. */
export async function GET(request: NextRequest) {
  const { resposta } = await chamarPortal(request, '/portal/eu');
  return resposta;
}
