import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta } = await chamarPortal(request, '/portal/push/testar', {
    method: 'POST',
    body: body || '{}',
  });
  return resposta;
}
