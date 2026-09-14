import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Exames tirados do quadro, guardados por 45 dias (Cintia, 14/09/2026).
// Rota ESTÁTICA: precisa existir como pasta própria, senão `/api/exames/arquivados` cairia em
// `[itemId]`, que só responde DELETE — e o GET voltaria 405 sem ninguém entender por quê.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/exames/arquivados', { method: 'GET' });
}
