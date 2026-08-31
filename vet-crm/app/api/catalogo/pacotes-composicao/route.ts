import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Composição dos pacotes/kits (nome + itens que compõem, sem preço) — pros documentos impressos.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/catalogo/pacotes-composicao', { method: 'GET' });
}
