import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Envia mensagem + anexos (exames/receitas do prontuário) pro WhatsApp do tutor.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/whatsapp/enviar-documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
