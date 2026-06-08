import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
// [EMP-COWORK] excluir nota interna (lixeira no chat interno)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/internal-notes/${id}`, { method: 'DELETE' });
}
