import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Lista as figurinhas que já passaram pelas conversas (pra importar pra biblioteca).
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/whatsapp/stickers/das-conversas', { method: 'GET' });
}
