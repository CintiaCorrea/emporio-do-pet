import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Fecha um dia da internação: cria a venda daquele dia no caixa e marca o que entrou nela.
// A regra de o que entra mora no backend (fechamento.regras) — a tela só escolhe o dia.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/hospitalizations/${id}/fechar-dia`, { method: 'POST' });
}
