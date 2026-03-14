import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, docId } = await params;
  return proxyToBackend(request, `/knowledge-bases/${id}/documents/${docId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
