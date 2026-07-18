import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Salva as etiquetas de uma conversa (guardadas em metadata.tags no backend).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp/conversations/${id}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
