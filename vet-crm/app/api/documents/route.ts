import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET - Listar documentos do usuário (via backend)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyToBackend(request, `/documents${url.search}`, { method: 'GET' });
}

// POST - Criar documento (via backend)
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
