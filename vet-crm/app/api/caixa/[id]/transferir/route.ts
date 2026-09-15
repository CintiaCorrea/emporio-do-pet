import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Passa dinheiro em espécie de um caixa para outro. O corpo é repassado à mão —
// `proxyToBackend` não o carrega sozinho, e uma transferência que chega vazia ao servidor seria
// recusada sem motivo aparente.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/caixa/${encodeURIComponent(id)}/transferir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
