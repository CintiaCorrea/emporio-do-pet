import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Exclui um exame do Kanban.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}
