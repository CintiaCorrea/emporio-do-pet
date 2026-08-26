import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Mensagem programada (tela única): manda já / agenda / segura pro cliente responder,
// com documento e abertura (template) opcional. O backend decide a regra das 24h.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/mensagem-programada', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
