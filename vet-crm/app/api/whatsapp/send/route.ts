import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// POST /api/whatsapp/send — envia mensagem nova pra um número
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
