import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const { id, rowId } = await params;
  return proxyToBackend(request, `/catalogo/inventarios/${encodeURIComponent(id)}/itens/${encodeURIComponent(rowId)}`, { method: 'DELETE' });
}
