import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Devolução: devolve ao estoque, retira a comissão e lança o estorno no caixa do dia.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/caixa/${encodeURIComponent(id)}/devolucao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body || '{}' });
}
