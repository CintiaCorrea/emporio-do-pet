import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Devolve o exame arquivado ao quadro, na fase em que ele estava.
export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}/restaurar`, { method: 'POST' });
}
