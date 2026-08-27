import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// RH · Documentos. GET: funcionário vê os dele; admin vê todos (filtros userId/tipo/status).
export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/rh/documentos${search}`, { method: 'GET' });
}

// POST: envia um documento (arquivo já subiu via /api/media/upload → manda a url).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/rh/documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
