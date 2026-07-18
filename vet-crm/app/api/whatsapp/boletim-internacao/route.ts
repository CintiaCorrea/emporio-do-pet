import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Envia o boletim de internação pelo WhatsApp (entrega direto se a conversa está aberta,
// ou manda a abridora com botões + deixa na fila se estiver fechada).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/boletim-internacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
