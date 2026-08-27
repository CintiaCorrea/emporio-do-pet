import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// PATCH: admin responde (aprovar/negar + observação).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/rh/solicitacoes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// DELETE: cancela (dono, se pendente) ou remove (admin).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/rh/solicitacoes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
