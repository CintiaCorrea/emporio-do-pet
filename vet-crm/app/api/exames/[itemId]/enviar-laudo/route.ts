import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Envia o laudo ao cliente pelo WhatsApp e o libera no portal — a mesma ação, de propósito: o
// que autoriza o cliente a ver é a conversa com a veterinária ter acontecido, e disso quem sabe
// é a pessoa que clicou.
export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}/enviar-laudo`, { method: 'POST' });
}
