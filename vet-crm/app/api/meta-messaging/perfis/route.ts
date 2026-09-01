import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Perfis de Instagram/Messenger conectados (GET lista, POST conecta — usado na hora de ligar os perfis).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/meta-messaging/perfis', { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/meta-messaging/perfis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
