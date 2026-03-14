import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id, docId } = await params;
  return proxyToBackend(request, `/knowledge-bases/${id}/documents/${docId}/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}
