import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Horários de coleta por laboratório. Rota ESTÁTICA: sem pasta própria, `/api/exames/horarios-lab`
// cairia na rota dinâmica `[itemId]` e o GET voltaria 405 sem ninguém entender por quê.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/exames/horarios-lab', { method: 'GET' });
}

// O CORPO PRECISA SER REPASSADO À MÃO — `proxyToBackend` não carrega body sozinho. Sem isto o
// backend receberia `{}`, não acharia o laboratório e responderia erro sem motivo aparente.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, '/exames/horarios-lab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
