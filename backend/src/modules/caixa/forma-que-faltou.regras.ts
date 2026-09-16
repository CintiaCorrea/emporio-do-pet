// ── A FORMA DE PAGAMENTO QUE O SISTEMA PERDEU ─────────────────────────────────────────────
//
// Cintia, 16/09/2026: "tem alguns recebimentos que estão entrando como Outros. O que seria esse
// outros, não são recebimentos no Nubank?"
//
// Não era o Nubank: era um defeito. A validação do servidor apagava a forma no caminho, e 34 dos
// 59 recebimentos de setembro foram gravados sem ela. O defeito foi corrigido no mesmo dia, mas o
// que já estava gravado não tem conserto automático — o sistema não guardou em lugar nenhum o que
// a tela mandou. Só quem recebeu sabe se foi Nubank, PIX, dinheiro ou cartão.
//
// Estas regras dizem o que o administrativo pode escrever ao preencher a forma que faltou. A
// promessa é estreita, de propósito: PREENCHER, não EDITAR. Valor, desconto, troco, data e venda
// ficam como estão. Recebimento que já tem forma não passa por aqui — trocar a forma de um
// recebimento certo é outra operação (reabrir a venda), com outro rastro.

type FormaLinha = { forma?: string | null; valor?: number | string | null; [k: string]: any };

const objetos = (formas: unknown): FormaLinha[] =>
  (Array.isArray(formas) ? (formas as any[]).flat(3) : [])
    .filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));

/**
 * Este recebimento está sem forma?
 *
 * É o formato que o defeito deixava no banco: `[]` ou `[[]]`, sem nenhum objeto dentro. Um objeto
 * sem nome também conta — no resumo do caixa ele cai em "Outros" do mesmo jeito.
 */
export function estaSemForma(formas: unknown): boolean {
  const lista = objetos(formas);
  if (!lista.length) return true;
  return lista.every((f) => !String(f.forma || '').trim());
}

/**
 * As formas informadas podem ser gravadas? Devolve a mensagem de erro, ou null.
 *
 * A soma tem de fechar com o que o recebimento guardou: valor aplicado MAIS troco, que é o que o
 * cliente entregou. Um centavo de folga para arredondamento.
 */
export function erroNasFormasPreenchidas(
  formas: FormaLinha[],
  valorTotal: number,
  troco: number,
): string | null {
  const lista = objetos(formas);
  if (!lista.length) return 'Informe como o cliente pagou.';
  if (lista.some((f) => !String(f.forma || '').trim())) return 'Toda linha precisa da forma de pagamento.';
  if (lista.some((f) => !(Number(f.valor) > 0))) return 'Toda linha precisa de um valor maior que zero.';
  const soma = lista.reduce((s, f) => s + Number(f.valor), 0);
  const esperado = (Number(valorTotal) || 0) + (Number(troco) || 0);
  if (Math.abs(soma - esperado) > 0.011) {
    const brl = (n: number) => n.toFixed(2).replace('.', ',');
    return `A soma das formas (R$ ${brl(soma)}) precisa ser igual ao que o cliente entregou (R$ ${brl(esperado)}).`;
  }
  return null;
}

/** Só "Crédito do cliente" debita o saldo — a mesma regra do recebimento normal (não casa com "Cartão crédito"). */
export const ehCreditoDoCliente = (forma?: string | null) =>
  /cr[eé]dito d[oe] (pet|client)/i.test(String(forma || ''));
