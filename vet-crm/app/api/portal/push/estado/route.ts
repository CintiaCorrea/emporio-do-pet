import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

export async function GET(request: NextRequest) {
  const { resposta } = await chamarPortal(request, '/portal/push/estado');
  return resposta;
}
