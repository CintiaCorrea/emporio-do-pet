import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A FICHA DO CLIENTE PASSA A OUVIR O QUE O SERVIDOR DIZ (18/09/2026).
//
// Este arquivo tinha um proxy proprio, copiado, com uma linha decisiva errada:
//
//     data.error || data.message      <-- o `error` do Nest e sempre "Bad Request"
//
// O Nest responde { statusCode, message, error }. `message` e a explicacao ("TEM_HISTORICO:
// este cliente tem 22 vendas...", "email must be an email"); `error` e so o rotulo seco do
// codigo HTTP. Pondo `error` na frente, a explicacao era jogada fora em TODA resposta de erro
// desta rota. Duas coisas que ja existiam e nao funcionavam por causa disso:
//
//   1. Excluir cliente com historico. O servidor recusa e explica, oferecendo arquivar. A tela
//      procurava "TEM_HISTORICO" na mensagem, nao achava (chegava "Bad Request") e caia no
//      "Nao foi possivel excluir. Tente novamente" — e o "quer arquivar agora?" nunca aparecia.
//   2. Salvar o cadastro. A ficha tem um tradutor de erro (traduzErro) para dizer "E-mail
//      invalido — confira se nao sobrou espaco". Ele nunca recebia o texto para traduzir.
//
// O proxy compartilhado (lib/backend-proxy) ja faz o certo: quando o corpo do erro e um objeto,
// repassa inteiro, sem resumir. Esta rota e proxy puro — nao traduz parametro nem remonta
// resposta — entao ela passa a ser ele. A rota de LISTA (../route.ts) nao pode: aquela traduz
// `limit` em `take` para 14 telas, e so o trecho do erro foi corrigido la.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
