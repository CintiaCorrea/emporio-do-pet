/**
 * O QUE ENTRA NA COBRANÇA — uma regra só para todo "em aberto", "deve" e "a receber".
 *
 * Cintia, 17/09/2026:
 *  · "Data do corte 31/08 às 23:59" — agosto foi mês de teste. Venda até o corte fica como
 *    HISTÓRICO: aparece para consulta, com os itens, mas não vira cobrança (nem "Deve R$", nem
 *    gaveta de receber, nem total a receber).
 *  · Os R$ 150,00 do registro de internação da Vanessa (Reginaldo, 05/09) apareciam como "a
 *    receber". Registro de internação não é venda (consulta-vendas.regras.ehVenda); o que a
 *    internação cobra está nas vendas de cada dia.
 *  · Venda cancelada sai (decisão de 17/09 sobre "o que é venda").
 *
 * Até aqui cada tela tinha a sua conta (umas pelo campo paga/pendente com o valor cheio, outras
 * pela soma dos recebimentos). Aberto, aqui, é sempre valor menos o que foi recebido.
 */
import { ehVenda, ondeEVenda } from '../modules/crm/consulta-vendas.regras';

/** Última hora do mês de teste, no fuso da clínica. */
export const CORTE_DA_COBRANCA = '2026-08-31T23:59:59-03:00';

/** Venda do mês de teste: só consulta, nunca cobrança. */
export function ehHistorico(data: Date | string | null | undefined): boolean {
  if (!data) return false;
  const t = new Date(data as any).getTime();
  return Number.isFinite(t) && t <= new Date(CORTE_DA_COBRANCA).getTime();
}

type VendaParaCobrar = { numeroVenda?: number | null; type?: string | null; notes?: unknown; date?: Date | string | null; status?: string | null };

/** Esta venda pode aparecer como devida? */
export function entraNaCobranca(a?: VendaParaCobrar | null): boolean {
  if (!a || !ehVenda(a)) return false;
  if (ehHistorico(a.date)) return false;
  return String(a.status || '').toUpperCase() !== 'CANCELLED';
}

/** A mesma regra para a consulta ao banco. Vai inteira dentro de `AND`. */
export function ondeEntraNaCobranca(): { AND: any[] } {
  return {
    AND: [
      ...ondeEVenda().AND,
      { date: { gt: new Date(CORTE_DA_COBRANCA) } },
      { status: { not: 'CANCELLED' } },
    ],
  };
}

/** Quanto falta receber: valor menos a soma dos recebimentos, nunca negativo. */
export function abertoDaCobranca(valor: unknown, recebimentos?: { valorTotal?: unknown }[] | null): number {
  const pago = (recebimentos || []).reduce((s, r) => s + (Number(r?.valorTotal) || 0), 0);
  return Math.max(0, Math.round(((Number(valor) || 0) - pago) * 100) / 100);
}
