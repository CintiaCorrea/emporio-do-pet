import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST - Desconectar uma integração (proxy para backend)
export async function POST(request: NextRequest) {
  const body = await request.text();

  return proxyToBackend(request, '/integrations/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
