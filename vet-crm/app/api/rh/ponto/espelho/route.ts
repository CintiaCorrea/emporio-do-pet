import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET: espelho de ponto do mês. Funcionário → o dele; admin → ?userId=&mes=YYYY-MM.
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search || '';
  return proxyToBackend(request, `/rh/ponto/espelho${qs}`, { method: 'GET' });
}
