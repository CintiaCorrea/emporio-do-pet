import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Follow-up programado (Opção 2): guarda a "mensagem seguinte" (texto + documento)
// que dispara quando o cliente responde ou num dia/hora marcado.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
