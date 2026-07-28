import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

export async function GET(request: NextRequest) {
  const { resposta } = await chamarPortal(request, '/portal/ficha');
  return resposta;
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  const { resposta } = await chamarPortal(request, '/portal/ficha', {
    method: 'PATCH',
    body,
  });
  return resposta;
}
