import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// Encaminhar conversa para outro usuário (faz takeover na conta dele)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp/conversations/${id}/assign-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
