import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Um pagamento só quitando várias comandas do mesmo cliente.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/caixa/${encodeURIComponent(id)}/recebimento-lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
