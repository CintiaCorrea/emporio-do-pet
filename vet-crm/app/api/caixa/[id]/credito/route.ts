import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = request.nextUrl.searchParams.get('itemId') || '';
  return proxyToBackend(request, `/caixa/${encodeURIComponent(id)}/credito?itemId=${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}
