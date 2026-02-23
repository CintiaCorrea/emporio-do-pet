import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET - Carregar configurações de integrações (proxy para backend)
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/integrations/config', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST - Salvar configurações de uma integração (proxy para backend)
export async function POST(request: NextRequest) {
  const body = await request.text();

  return proxyToBackend(request, '/integrations/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
