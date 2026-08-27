import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// RH · Comunicados. GET: funcionário vê os dele (com `lido`); admin vê todos (com leituras).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/rh/comunicados', { method: 'GET' });
}

// POST: publica um comunicado (a todos ou a um) — só admin (backend valida).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/rh/comunicados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
