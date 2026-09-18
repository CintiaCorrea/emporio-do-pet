import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A VOLTA: venda sem dinheiro vira orçamento (Cintia, 17/09/2026) — sem refazer os itens.
export async function POST(request: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return proxyToBackend(request, `/orcamentos/da-venda/${encodeURIComponent(appointmentId)}`, { method: 'POST' });
}
