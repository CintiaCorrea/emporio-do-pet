import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Cria exames no Kanban a partir de uma origem que não é a venda — hoje, a conta da
// internação. Até 05/09/2026 exame lançado na internação ficava só na conta: era cobrado,
// mas ninguém sabia que havia exame para coletar, mandar ao laboratório e cobrar resultado.
//
// O CORPO PRECISA SER REPASSADO À MÃO (mesmo defeito de `pets/[id]/peso`, do mesmo dia).
// Sem ele o backend recebia `{}` e chamava `iniciarExamesDaVenda(undefined, [])`: criava ZERO
// exames e respondia `{ ok: true, criados: 0 }`. Falhava em silêncio, que é pior do que falhar
// com erro — a internação cobrava o exame e o Kanban nunca ficava sabendo dele.
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, '/exames/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
