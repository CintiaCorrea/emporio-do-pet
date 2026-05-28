// Compat layer: rota /api/clients/* mantida temporariamente — proxy aponta pra
// /tutors no backend (Client foi unificado em Tutor com classificacao='Cliente').
// TODO: migrar UIs pra /api/tutors/* e deletar este arquivo.
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/tutors${search}`, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, `/tutors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
