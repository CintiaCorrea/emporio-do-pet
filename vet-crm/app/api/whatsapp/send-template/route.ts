import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Inicia conversa com template aprovado do Meta (fora da janela de 24h).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/send-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
