import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

/**
 * Botão "Aparece no portal" na ficha do item (profissional/sala): liga/desliga quais
 * serviços esse item atende no portal. Painel da EQUIPE (token do funcionário).
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/portal/admin/agenda/item-servicos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
