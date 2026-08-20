import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Avaliação da clínica (estrelas) → NPS do sistema. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta } = await chamarPortal(request, '/portal/avaliacao', { method: 'POST', body });
  return resposta;
}
