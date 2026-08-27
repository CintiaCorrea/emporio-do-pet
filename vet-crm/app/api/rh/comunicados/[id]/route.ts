import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// DELETE: remove um comunicado — só admin (backend valida).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/rh/comunicados/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
