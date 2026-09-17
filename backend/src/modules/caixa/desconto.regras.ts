// ── QUANTO DE DESCONTO CADA FORMA DE PAGAMENTO PERMITE ────────────────────────────────────
//
// Cintia, 16/09/2026: "o caixa tem autorização de dar 5% de desconto nas vendas à vista e no PIX,
// temos algum lugar onde isso é definido?" — e, na mesma noite, a regra fechada: "adm não tem
// limite e todos os outros são livres até 5% no PIX e em dinheiro. São essas as regras, qualquer
// outra coisa não."
//
// A REGRA: cada forma de recebimento tem o seu "desconto permitido" (%), em Vendas › Formas de
// recebimento. Forma sem % próprio NÃO tem desconto (até 16/09 ela seguia um "limite geral", que
// saiu). Não há liberação por senha de gerente nem perfil com desconto sem limite: acima do
// permitido, só o administrativo (a conferência do ADM fica em caixa.service, conferirDesconto).
//
// Quando o cliente divide o pagamento (parte no PIX, parte no cartão), o permitido é a média das
// formas PESADA PELO VALOR de cada uma — R$ 100 no PIX (5%) e R$ 100 no cartão (0%) permitem 2,5%
// sobre a venda. Qualquer outra conta deixaria dividir R$ 1 no PIX para ganhar o desconto do total.

export type FormaComDesconto = { nome?: string | null; descontoMax?: number | string | null };

const normalizar = (s?: string | null) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** O % que UMA forma permite. Forma sem % próprio, ou que ninguém cadastrou, permite 0. */
export function percentualDaForma(nomeDaForma: string | null | undefined, formasCadastradas: FormaComDesconto[]): number {
  const cfg = (formasCadastradas || []).find((f) => normalizar(f.nome) === normalizar(nomeDaForma));
  const bruto = String(cfg?.descontoMax ?? '').trim().replace(',', '.');
  const n = Number(bruto);
  return bruto !== '' && Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * O % permitido para um pagamento inteiro — média pesada pelo valor de cada forma.
 *
 * Sem forma ainda (venda salva "a receber"): não se sabe como vai pagar, então vale o MAIOR %
 * cadastrado. O desconto é conferido de novo na hora de receber, com a forma de verdade.
 */
export function percentualDoPagamento(
  formas: Array<{ forma?: string | null; valor?: number | string | null }>,
  formasCadastradas: FormaComDesconto[],
): number {
  const validas = (formas || []).filter((f) => Number(f?.valor) > 0.009);
  if (!validas.length) {
    return (formasCadastradas || []).reduce((m, f) => Math.max(m, percentualDaForma(f.nome, formasCadastradas)), 0);
  }
  let soma = 0, pesado = 0;
  for (const f of validas) {
    const v = Number(f.valor);
    soma += v;
    pesado += v * percentualDaForma(f.forma, formasCadastradas);
  }
  return soma > 0 ? pesado / soma : 0;
}

export type ResultadoDesconto =
  | { ok: true; percentualDado: number; percentualPermitido: number }
  | { ok: false; percentualDado: number; percentualPermitido: number; mensagem: string };

/**
 * O desconto dado cabe no que as formas permitem?
 *
 * `bruto` é o valor da venda ANTES de qualquer desconto; `desconto` é tudo o que foi abatido
 * (nos itens e no total). Um centésimo de folga: 5% de R$ 33,33 dá R$ 1,6665, e ninguém digita
 * isso — digita R$ 1,67.
 */
export function avaliarDesconto(p: {
  bruto: number;
  desconto: number;
  formas: Array<{ forma?: string | null; valor?: number | string | null }>;
  formasCadastradas: FormaComDesconto[];
}): ResultadoDesconto {
  const bruto = Number(p.bruto) || 0;
  const desconto = Number(p.desconto) || 0;
  const percentualDado = bruto > 0 ? (desconto / bruto) * 100 : 0;
  const permitido = percentualDoPagamento(p.formas, p.formasCadastradas);
  if (desconto <= 0.009) return { ok: true, percentualDado, percentualPermitido: permitido };
  const teto = Math.round(bruto * permitido) / 100; // em reais, arredondado ao centavo
  if (desconto <= teto + 0.01) return { ok: true, percentualDado, percentualPermitido: permitido };
  const nomes = [...new Set((p.formas || []).filter((f) => Number(f?.valor) > 0.009).map((f) => String(f.forma || '').trim()).filter(Boolean))];
  const como = nomes.length ? ` para ${nomes.join(' + ')}` : '';
  const fmt = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
  return {
    ok: false,
    percentualDado,
    percentualPermitido: permitido,
    mensagem: `Desconto de ${fmt(percentualDado)}% passa do permitido${como} (${fmt(permitido)}%). Desconto acima disso só pelo administrativo.`,
  };
}

/**
 * O DESCONTO GERAL DIVIDIDO ENTRE OS ITENS.
 *
 * Cintia, 16/09/2026: "Tem como deixarmos dividido?" Até ali o desconto dado no total ficava só
 * no recebimento, e a venda não batia com a soma dos itens (#1229: itens R$ 1.563, venda
 * R$ 1.484,85). Agora cada linha recebe a sua parte, proporcional ao valor dela, em centavos, e a
 * sobra do arredondamento vai para as linhas que ainda comportam. Item de convênio não entra (não
 * é o cliente que paga) e nenhuma linha fica negativa.
 */
export function ratearDesconto<T extends { valorTotal: number; desconto?: number | null; convenioId?: string | null }>(
  itens: T[],
  desconto: number,
): T[] {
  const cent = (v: unknown) => Math.round((Number(v) || 0) * 100);
  const doCliente = itens.map((it, i) => ({ i, c: cent(it.valorTotal) })).filter((x) => !itens[x.i].convenioId && x.c > 0);
  const base = doCliente.reduce((s, x) => s + x.c, 0);
  const aplicar = Math.min(cent(desconto), base);
  if (aplicar <= 0) return itens.map((it) => ({ ...it }));
  const parte = new Map<number, number>();
  for (const x of doCliente) parte.set(x.i, Math.floor((aplicar * x.c) / base));
  let sobra = aplicar - [...parte.values()].reduce((s, v) => s + v, 0);
  for (const x of doCliente) {
    if (sobra <= 0) break;
    const mais = Math.min(sobra, x.c - parte.get(x.i)!);
    parte.set(x.i, parte.get(x.i)! + mais);
    sobra -= mais;
  }
  return itens.map((it, i) => {
    const p = parte.get(i);
    if (!p) return { ...it };
    return { ...it, desconto: (cent(it.desconto) + p) / 100, valorTotal: (cent(it.valorTotal) - p) / 100 };
  });
}

/**
 * O DESCONTO DE UM PAGAMENTO QUE QUITA VÁRIAS VENDAS — quanto cabe a cada uma.
 *
 * Proporcional ao valor em aberto de cada venda, em centavos; a sobra do arredondamento vai para
 * as vendas que ainda comportam. Nenhuma venda recebe mais desconto do que tem em aberto.
 */
export function repartirDescontoDoLote(comandas: { id: string; aberto: number }[], desconto: number): { id: string; desconto: number }[] {
  const partes = ratearDesconto(comandas.map((c) => ({ id: c.id, valorTotal: Number(c.aberto) || 0, desconto: 0 })), desconto);
  return partes.filter((p) => Number(p.desconto) > 0).map((p) => ({ id: p.id, desconto: Number(p.desconto) }));
}
