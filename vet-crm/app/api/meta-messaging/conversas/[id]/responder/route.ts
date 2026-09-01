import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Responde uma conversa de Instagram/Messenger (envia pelo canal certo).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/meta-messaging/conversas/${encodeURIComponent(id)}/responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
