import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ histId: string }> }) {
  const { histId } = await params;
  return proxyToBackend(request, `/pets/historico/${encodeURIComponent(histId)}`, { method: 'GET' });
}
