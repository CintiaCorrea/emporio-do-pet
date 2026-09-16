import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  // proxyToBackend NAO repassa o corpo sozinho: cada rota le e entrega. Esquecer isto faz o
  // pedido chegar vazio ao servidor, que recusa por falta de dado — e o erro parece de permissao.
  const body = await request.text();
  return proxyToBackend(request, '/caixa/itens-sem-vinculo/ligar', { method: 'POST', body });
}
