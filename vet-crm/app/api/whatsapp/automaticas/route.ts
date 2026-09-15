import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// As mensagens que o sistema mandou sozinho no dia. Nada é apagado: a lista mostra o dia
// corrente e amanhã começa vazia de novo — as linhas são as mensagens da conversa do cliente, e
// apagá-las deixaria o histórico dele com a resposta e sem a pergunta.
export async function GET(request: NextRequest) {
  const dia = request.nextUrl.searchParams.get('dia');
  return proxyToBackend(request, `/whatsapp/automaticas${dia ? `?dia=${encodeURIComponent(dia)}` : ''}`, { method: 'GET' });
}
