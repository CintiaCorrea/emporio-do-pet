import { NextRequest } from 'next/server';
import { chamarPortal, guardarSessao } from '@/lib/portal-proxy';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta, dados } = await chamarPortal(request, '/portal/auth/escolher', {
    method: 'POST',
    body,
  });

  if (dados?.status === 'ok') return guardarSessao(dados);
  return resposta;
}
