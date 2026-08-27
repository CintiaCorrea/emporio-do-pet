import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST: admin lança um ajuste de ponto (batida corrigida) com justificativa.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/rh/ponto/ajuste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
