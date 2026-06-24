import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search || '';
  return proxyToBackend(request, `/caixa/movimentos${qs}`, { method: 'GET' });
}
