import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Tira o cliente do arquivo e devolve para a lista. Gemea de ../arquivar — ver o porque la.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}/restaurar`, { method: 'PATCH' });
}
