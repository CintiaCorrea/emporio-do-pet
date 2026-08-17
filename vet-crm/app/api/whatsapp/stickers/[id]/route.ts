import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Remove uma figurinha da biblioteca.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/whatsapp/stickers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
