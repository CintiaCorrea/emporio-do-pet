import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Gera a comanda do dia da internação (diária + itens abertos) como venda no caixa.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/hospitalizations/${encodeURIComponent(id)}/comanda-dia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
