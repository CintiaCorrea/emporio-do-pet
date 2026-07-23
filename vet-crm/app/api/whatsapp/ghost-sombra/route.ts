import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Feed da tela "👻 Agente Sombra" (sugestões do modo sombra + resposta real da equipe).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/whatsapp/ghost-sombra', { method: 'GET' });
}
