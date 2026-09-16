// Regras PURAS de dinheiro da Consulta de vendas.
//
// Existem porque a mesma conta aparece em quatro lugares da tela (card, quadro de status, linha
// do dia e total) e, no sistema de onde a clinica veio, esses quatro numeros NAO fechavam entre
// si — o quadro de status somava "quanto ja recebi" numas linhas e "quanto falta" noutras, e o
// total ficava R$ 70,26 fora de tudo. Aqui a conta e uma so.

export type RecebimentoDaVenda = { valorTotal?: number | null };

/**
 * Quanto uma venda JA RECEBEU — nunca mais do que ela vale.
 *
 * Troco e pagamento a maior sao assunto do caixa. Se entrassem aqui, a venda ficaria com saldo
 * negativo e derrubaria o "a receber" do periodo inteiro sem ninguem entender por que.
 */
export function pagoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): number {
  const total = Number(valor) || 0;
  const soma = (Array.isArray(recebimentos) ? recebimentos : []).reduce(
    (s, r) => s + (Number(r?.valorTotal) || 0),
    0,
  );
  return Math.max(0, Math.min(soma, total));
}

/** Quanto uma venda ainda deve. */
export function abertoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): number {
  return Math.max(0, (Number(valor) || 0) - pagoDaVenda(valor, recebimentos));
}

/** A situacao da venda, do jeito que a tela mostra. */
export type SituacaoVenda = 'ABERTA' | 'PARCIAL' | 'PAGA';

export function situacaoDaVenda(valor?: number | null, recebimentos?: RecebimentoDaVenda[] | null): SituacaoVenda {
  const total = Number(valor) || 0;
  const pago = pagoDaVenda(total, recebimentos);
  // Um centavo de diferenca por arredondamento nao pode deixar a venda "quase paga" pra sempre.
  if (total > 0 && pago >= total - 0.009) return 'PAGA';
  return pago > 0 ? 'PARCIAL' : 'ABERTA';
}

// ── O QUE E UMA VENDA, NO CAMPO `type` ────────────────────────────────────────────────────────
//
// A Cintia, em 08/09/2026, abrindo a Consulta de vendas: "e cade as vendas de setembro?"
//
// Nao eram so as de setembro: era TUDO o que foi vendido dentro do nosso sistema, desde sempre.
// A mesma coisa foi escrita com duas grafias e ninguem percebeu porque agosto (importado)
// aparecia normalmente:
//
//   · o importador do SimplesVet grava  type: 'VENDA'
//   · o nosso ponto de venda grava      type: 'Venda'
//   · a internacao grava                type: 'Venda'
//   · e a consulta procurava so por     type: 'VENDA'
//
// Comparacao de texto no Postgres distingue maiuscula de minuscula. Entao a tela mostrava o
// passado importado e escondia o presente — que e o pior tipo de erro, porque parece funcionar.
//
// A lista mora aqui, com teste, para a proxima grafia nao nascer solta no meio de uma query.

/** As grafias que significam VENDA no campo `type` do agendamento. */
export const TIPOS_DE_VENDA = ['VENDA', 'Venda', 'venda'] as const;

/** As grafias que significam ORCAMENTO — proposta nao e venda, e nao entra no total. */
export const TIPOS_DE_ORCAMENTO = ['ORCAMENTO', 'ORÇAMENTO', 'Orcamento', 'Orçamento', 'orcamento', 'orçamento'] as const;

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** `true` para qualquer grafia de venda. Ignora caixa alta/baixa e acento. */
export function ehTipoDeVenda(tipo?: string | null): boolean {
  return semAcento(String(tipo || '').trim()).toLowerCase() === 'venda';
}

/** `true` para qualquer grafia de orcamento. */
export function ehTipoDeOrcamento(tipo?: string | null): boolean {
  return semAcento(String(tipo || '').trim()).toLowerCase() === 'orcamento';
}

// ── O QUE É UMA VENDA: TER NÚMERO DE VENDA, NÃO O NOME DO ATENDIMENTO ──────────────────────
//
// A Cintia, 16/09/2026: "consulta também é uma venda, não estou entendendo porque do nome
// consulta ou resultado de exames, venda é venda."
//
// Até aqui a regra era o `type`. Só que venda e atendimento moram no mesmo registro, e o `type`
// é o nome do PRONTUÁRIO — diz o que aconteceu com o animal. Quando a veterinária registra a
// consulta na ficha do pet e lança ali os serviços cobrados, o registro ganha número de venda
// e continua chamado "CONSULTA". A castração da Cueia (#1130, R$ 1.052,10, paga) foi lançada
// dentro de um "Resultado de exames". Medido em 16/09: 25 vendas de verdade (24 com itens, 21
// em aberto, R$ 28.176,92) sumiam da ficha do cliente e da Consulta de vendas por causa do nome.
//
// O que decide agora é o NÚMERO DE VENDA, que só nasce quando há cobrança. Medido: as 187
// vendas chamadas "Venda" — importadas inclusive — têm número; receita e documento não têm.
//
// DUAS EXCEÇÕES, e cada uma tem motivo:
//   · ORÇAMENTO é proposta, não venda.
//   · o REGISTRO DE INTERNAÇÃO nunca é cobrado: a conta sai em vendas próprias, chamadas
//     "Venda". Dos 20 registros de internação, nenhum tem item nem recebimento — o valor dele
//     é a diária combinada. Foi ele que aparecia nas compras com o diagnóstico no lugar do
//     produto (09/09/2026), e um deles (#1174) ganhou número por engano.

/** As grafias do nome do registro de internação. */
export const TIPOS_DE_INTERNACAO = ['Internação', 'Internacao', 'INTERNAÇÃO', 'INTERNACAO', 'internação', 'internacao'] as const;

/** O registro-prontuário da internação — não é venda, mesmo com valor ou número. */
export function ehRegistroDeInternacao(a?: { type?: string | null; notes?: unknown } | null): boolean {
  if (!a) return false;
  if (semAcento(String(a.type || '').trim()).toLowerCase() === 'internacao') return true;
  return typeof a.notes === 'string' && a.notes.includes('HOSPITALIZATION');
}

/** É venda? Tem número de venda, e não é orçamento nem registro de internação. */
export function ehVenda(a?: { numeroVenda?: number | null; type?: string | null; notes?: unknown } | null): boolean {
  if (!a || a.numeroVenda == null) return false;
  if (ehTipoDeOrcamento(a.type)) return false;
  return !ehRegistroDeInternacao(a);
}

/**
 * A mesma regra, para a consulta ao banco. Vai inteira dentro de `AND`, para quem montar a
 * busca depois poder acrescentar condições sem apagar esta.
 *
 * `notes: null` precisa estar no OR: no SQL, `NOT (notes LIKE ...)` com notes vazio dá NULL e a
 * linha some — seriam justamente as vendas comuns, que não têm notes.
 */
export function ondeEVenda(): { AND: any[] } {
  return {
    AND: [
      { numeroVenda: { not: null } },
      { type: { notIn: [...TIPOS_DE_ORCAMENTO, ...TIPOS_DE_INTERNACAO] } },
      { OR: [{ notes: null }, { NOT: { notes: { contains: 'HOSPITALIZATION' } } }] },
    ],
  };
}
