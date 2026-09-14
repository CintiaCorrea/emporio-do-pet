import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Avisa o tutor de que o laudo chegou. É o mesmo aviso que sai sozinho ao anexar — este é o
// caminho de quando o automático não conseguiu (template em aprovação, tutor sem WhatsApp).
export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}/avisar-cliente`, { method: 'POST' });
}
