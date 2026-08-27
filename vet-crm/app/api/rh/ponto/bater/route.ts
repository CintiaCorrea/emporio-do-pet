import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST: funcionário bate o ponto (próxima batida do ciclo, ou { tipo } explícito).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/rh/ponto/bater', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
