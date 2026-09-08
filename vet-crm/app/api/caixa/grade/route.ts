import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A GRADE PRECISA DA ROTA PRÓPRIA POR CAUSA DOS FILTROS.
//
// Sem este arquivo, /api/caixa/grade caía no proxy genérico de /api/caixa/[id] (com id="grade"),
// que monta a URL do backend só com o caminho e JOGA A QUERY FORA. O backend recebia
// /caixa/grade pelado e devolvia os últimos 300 caixas — período, status, operador, número:
// tudo ignorado, em silêncio. A tela mostrava uma lista plausível e errada.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return proxyToBackend(request, `/caixa/grade${url.search}`, { method: 'GET' });
}
