/**
 * DATA DE INÍCIO DO FINANCEIRO.
 *
 * O CRM guarda a história toda de vendas/caixa; o módulo Financeiro (DRE) começa numa data.
 * Nada anterior a ela vira lançamento — nem quando o cron de rede-de-segurança reprocessa
 * vendas antigas (`recebimentos.processar`, `fornecedores.processar`).
 *
 * Nasceu em 02/09/2026: agosto foi mês de TESTE, o financeiro foi zerado pra setembro começar
 * limpo, mas as vendas e os caixas de agosto voltaram pro módulo de Vendas. Sem esta trava o
 * cron recriaria agosto no DRE sozinho. Ver memória [[incidente-wipe-comandas-abertas-01set]].
 *
 * Pra mudar sem deploy: item da lista `financeiro_inicio` no ListaItem, valor 'AAAA-MM-DD'.
 */
const PADRAO = '2026-09-01';
const FORTALEZA = '-03:00'; // Fortaleza é UTC-3 fixo (sem horário de verão)

function paraData(texto: string): Date | null {
  const d = new Date(`${texto.trim()}T00:00:00${FORTALEZA}`);
  return isNaN(d.getTime()) ? null : d;
}

export async function inicioDoFinanceiro(prisma: {
  listaItem: { findFirst: (args: any) => Promise<{ valor: string } | null> };
}): Promise<Date> {
  try {
    const item = await prisma.listaItem.findFirst({ where: { lista: 'financeiro_inicio' } });
    if (item?.valor) {
      const d = paraData(item.valor);
      if (d) return d;
    }
  } catch {
    /* sem config = usa o padrão */
  }
  return paraData(PADRAO) as Date;
}
