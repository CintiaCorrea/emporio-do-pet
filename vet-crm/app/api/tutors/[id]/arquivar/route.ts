import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// A PORTA QUE FALTAVA (18/09/2026).
//
// O botao 📦 da lista de Clientes e o "Restaurar" do arquivo chamavam esta rota desde que
// nasceram. Ela nunca existiu deste lado: o servidor tinha o PATCH /tutors/:id/arquivar, o site
// nao tinha por onde chamar, e nao ha reescrita geral de /api para o backend. Dava 404 e a tela
// dizia "Nao foi possivel arquivar" — sem dizer que o caminho nem existia.
//
// Efeito colateral do buraco: como ninguem conseguia arquivar, a visao "📦 Arquivados" ficava
// sempre vazia, e parecia que o recurso funcionava e nao tinha ninguem la.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}/arquivar`, { method: 'PATCH' });
}
