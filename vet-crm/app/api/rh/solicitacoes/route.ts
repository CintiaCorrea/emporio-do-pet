import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// RH · Solicitações. GET: funcionário vê as dele; admin vê todas (filtro status).
export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/rh/solicitacoes${search}`, { method: 'GET' });
}

// POST: funcionário abre uma solicitação (pra si).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/rh/solicitacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
