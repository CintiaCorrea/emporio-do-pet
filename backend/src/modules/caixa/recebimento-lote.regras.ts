// COMO UM PAGAMENTO SÓ QUITA VÁRIAS COMANDAS.
//
// Pedido da Cintia (11/09/2026): "criar uma forma de consolidarmos as comandas para recebimento
// através de um só pagamento". Antes existia o "Baixar tudo", mas era um laço: um recebimento por
// venda, todos na mesma forma de pagamento, sem transação — falhando no meio, parte ficava paga.
//
// A REGRA DA DISTRIBUIÇÃO (decisão dela): quita da MAIS ANTIGA para a mais nova. Pagou menos que
// o total? As primeiras fecham por inteiro e só a última fica parcial. É como a conta é conversada
// no balcão ("vamos fechar as de agosto") e deixa poucas contas abertas em vez de todas pela
// metade — o que importa na cobrança seguinte.
//
// Dinheiro não admite "quase": os centavos da divisão vão para a última comanda tocada, e a soma
// distribuída tem de bater EXATAMENTE com o que entrou. O teste guarda isso.

export type ComandaAberta = {
  id: string;
  /** Quanto ainda falta receber desta venda. */
  aberto: number;
  /** Usada só para ordenar: a mais antiga quita primeiro. */
  data?: string | Date | null;
};

export type ParteDoPagamento = {
  appointmentId: string;
  valor: number;
  /** true quando esta parte fecha a comanda. */
  quita: boolean;
};

const cent = (n: number) => Math.round(Number(n || 0) * 100);
const real = (c: number) => Math.round(c) / 100;

/**
 * Reparte `valorPago` entre as comandas, da mais antiga para a mais nova.
 *
 * Devolve só as comandas que receberam alguma coisa — comanda que não foi tocada não vira
 * recebimento de R$ 0,00, que seria lixo no extrato do cliente.
 */
export function distribuirPagamento(
  comandas: ComandaAberta[],
  valorPago: number,
): { partes: ParteDoPagamento[]; sobra: number } {
  const lista = (Array.isArray(comandas) ? comandas : [])
    .filter((c) => c && c.id && cent(c.aberto) > 0)
    .sort((a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime());

  let restante = cent(valorPago);
  if (restante <= 0 || !lista.length) return { partes: [], sobra: real(Math.max(0, restante)) };

  const partes: ParteDoPagamento[] = [];
  for (const c of lista) {
    if (restante <= 0) break;
    const devido = cent(c.aberto);
    const paga = Math.min(devido, restante);
    restante -= paga;
    partes.push({ appointmentId: c.id, valor: real(paga), quita: paga >= devido });
  }

  // Sobra = cliente pagou mais do que devia (troco ou crédito, decidido por quem chama).
  return { partes, sobra: real(Math.max(0, restante)) };
}

/** O total ainda em aberto das comandas escolhidas. */
export function totalEmAberto(comandas: ComandaAberta[]): number {
  return real((Array.isArray(comandas) ? comandas : []).reduce((s, c) => s + cent(c?.aberto), 0));
}

/** Uma forma de pagamento do lote (Pix, Dinheiro, Cartão…), com os campos extras que o
 *  cartão exige (NSU, AUT, operadora, parcelas) — eles viajam junto para cada parte. */
export type FormaPag = { forma?: string; valor?: number; [k: string]: unknown };

/**
 * Reparte as formas de pagamento entre as partes já calculadas.
 *
 * Consome as formas NA ORDEM em que a recepção lançou: os R$ 600 pagos como "Pix 400 +
 * Dinheiro 200", distribuídos em c1=200 e c2=400, viram c1: Pix 200; c2: Pix 200 + Dinheiro 200.
 *
 * Por que importa: cada venda precisa saber COMO foi paga — é o que liga a taxa da operadora à
 * venda certa no DRE, e o que aparece no comprovante do cliente. Uma forma genérica no lote
 * inteiro perderia isso.
 */
export function repartirFormas(
  formas: FormaPag[],
  partes: ParteDoPagamento[],
): { appointmentId: string; valor: number; quita: boolean; formas: FormaPag[] }[] {
  // Fila consumível, em centavos, preservando os campos extras de cada forma.
  const fila = (Array.isArray(formas) ? formas : [])
    .filter((f) => f && cent(f.valor as number) > 0)
    .map((f) => ({ base: f, restante: cent(f.valor as number) }));

  return partes.map((p) => {
    let faltam = cent(p.valor);
    const doMeu: FormaPag[] = [];
    for (const item of fila) {
      if (faltam <= 0) break;
      if (item.restante <= 0) continue;
      const usa = Math.min(item.restante, faltam);
      item.restante -= usa;
      faltam -= usa;
      doMeu.push({ ...item.base, valor: real(usa) });
    }
    return { appointmentId: p.appointmentId, valor: p.valor, quita: p.quita, formas: doMeu };
  });
}
