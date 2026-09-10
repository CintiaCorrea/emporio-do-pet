import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// APAGAR O CAIXA. A regra mora no servidor (backend/src/modules/caixa/caixa.regras →
// podeApagarCaixa): só o administrativo, e só caixa SEM movimento. Esta rota é só o caminho.
//
// Existe como `/apagar` e não como DELETE em `/api/caixa/[id]` porque aquele endereço já é o
// proxy genérico de leitura do caixa — misturar leitura e exclusão no mesmo arquivo é como um
// dia alguém apaga chamando o que achava que era um GET.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/caixa/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
