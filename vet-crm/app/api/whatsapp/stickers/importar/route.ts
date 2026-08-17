import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Importa figurinhas das conversas (por messageId) pra biblioteca.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/whatsapp/stickers/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
