import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return backendProxy(request, `/protocolos/${id}`, { method: 'DELETE' });
}
