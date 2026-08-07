import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Marca a conversa como "não lida" (lembrete pra responder depois).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/whatsapp/conversations/${encodeURIComponent(id)}/mark-unread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
