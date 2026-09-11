import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Registra um peso: entra no histórico clínico (linha do tempo) e atualiza o peso atual.
//
// O CORPO PRECISA SER REPASSADO À MÃO. `proxyToBackend` monta a requisição a partir do `init`
// que recebe — ele não copia o corpo do pedido original. Esta rota nasceu em 05/09/2026 sem a
// leitura do corpo, e por isso o backend recebia `{}`: `body.peso` chegava `undefined`, virava
// NaN, e a regra respondia "Peso inválido.". A tela mostrava só "Erro ao salvar peso".
//
// A veterinária ficou seis dias sem conseguir registrar peso, e peso é o que decide a faixa de
// cobrança de diária, medicação e caução desde 04/09 — o defeito não parava numa tela, parava
// o preço. No banco: 3.054 pontos de peso, TODOS da importação do SimplesVet, nenhum criado
// pelo sistema desde o lançamento.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/pets/${id}/peso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
