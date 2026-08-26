import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Detalhe do orçamento (com os itens) — usado ao expandir no "Histórico de vendas" da ficha.
// Faltava este GET: sem ele o detalhe voltava vazio e a ficha mostrava "Sem itens".
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/orcamentos/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/orcamentos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/orcamentos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
