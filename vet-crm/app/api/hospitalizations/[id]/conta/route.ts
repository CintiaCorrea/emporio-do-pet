import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A CONTA DA INTERNAÇÃO tem porta própria (construção B, 17/09/2026): o servidor carimba a data,
// barra lançamento repetido e atualiza a venda do dia na hora. Antes a tela gravava na lista
// genérica e a venda só aparecia quando alguém abria a ficha.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/hospitalizations/${encodeURIComponent(id)}/conta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
