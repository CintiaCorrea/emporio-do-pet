import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/cadencias/inscricoes/${id}/cancelar`, { method: 'PATCH' });
}
