import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // proxyToBackend não repassa o corpo sozinho: sem isto a forma chegaria vazia ao servidor.
  const body = await request.text();
  return proxyToBackend(request, `/caixa/recebimento/${encodeURIComponent(id)}/forma`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
  });
}
