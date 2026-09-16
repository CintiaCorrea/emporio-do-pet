// ── QUANTO DE DESCONTO CADA FORMA DE PAGAMENTO PERMITE ────────────────────────────────────
//
// Cintia, 16/09/2026: "o caixa tem autorização de dar 5% de desconto nas vendas à vista e no PIX,
// temos algum lugar onde isso é definido?"
//
// NÃO TINHA. Existia um limite só, "Limite de desconto por venda" (Configuração de vendas), igual
// para qualquer forma — cartão incluído. E ele só era conferido na venda NOVA do ponto de venda:
// no recebimento do Caixa, para onde o ponto de venda manda receber desde 10/09, o campo Desconto
// não tinha limite nenhum.
//
// A REGRA: cada forma de recebimento pode ter o seu "desconto permitido" (%). A forma que não tem
// segue o limite geral. Quando o cliente divide o pagamento (parte no PIX, parte no cartão), o
// permitido é a média das formas PESADA PELO VALOR de cada uma — R$ 100 no PIX (5%) e R$ 100 no
// cartão (0%) permitem 2,5% sobre a venda. Qualquer outra conta deixaria dividir R$ 1 no PIX para
// ganhar o desconto do total.

export type FormaComDesconto = { nome?: string | null; descontoMax?: number | string | null };

const normalizar = (s?: string | null) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * O % que UMA forma permite. `null` = sem limite.
 *
 * Campo vazio na forma = "não defini, siga o geral". ZERO na forma = "nenhum desconto" — é assim
 * que se diz que cartão não tem desconto. No limite geral o zero continua significando "sem
 * limite", como a Configuração de vendas sempre explicou; por isso os dois zeros são tratados
 * em lugares diferentes.
 */
export function percentualDaForma(
  nomeDaForma: string | null | undefined,
  formasCadastradas: FormaComDesconto[],
  limiteGeral: number | string | null | undefined,
): number | null {
  const cfg = (formasCadastradas || []).find((f) => normalizar(f.nome) === normalizar(nomeDaForma));
  const proprio = cfg?.descontoMax;
  if (proprio !== undefined && proprio !== null && String(proprio).trim() !== '') {
    const n = Number(String(proprio).replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const geral = Number(limiteGeral) || 0;
  return geral > 0 ? geral : null;
}

/** O % permitido para um pagamento inteiro — média pesada pelo valor de cada forma. */
export function percentualDoPagamento(
  formas: Array<{ forma?: string | null; valor?: number | string | null }>,
  formasCadastradas: FormaComDesconto[],
  limiteGeral: number | string | null | undefined,
): number | null {
  const validas = (formas || []).filter((f) => Number(f?.valor) > 0.009);
  // Sem forma ainda (venda salva "a receber"): não se sabe como vai pagar — vale o limite geral.
  if (!validas.length) {
    const geral = Number(limiteGeral) || 0;
    return geral > 0 ? geral : null;
  }
  let soma = 0, pesado = 0;
  for (const f of validas) {
    const pct = percentualDaForma(f.forma, formasCadastradas, limiteGeral);
    if (pct === null) return null; // uma parte sem limite: não há teto a conferir
    const v = Number(f.valor);
    soma += v; pesado += v * pct;
  }
  return soma > 0 ? pesado / soma : null;
}

export type ResultadoDesconto =
  | { ok: true; percentualDado: number; percentualPermitido: number | null }
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
  limiteGeral: number | string | null | undefined;
}): ResultadoDesconto {
  const bruto = Number(p.bruto) || 0;
  const desconto = Number(p.desconto) || 0;
  const percentualDado = bruto > 0 ? (desconto / bruto) * 100 : 0;
  const permitido = percentualDoPagamento(p.formas, p.formasCadastradas, p.limiteGeral);
  if (desconto <= 0.009 || permitido === null) return { ok: true, percentualDado, percentualPermitido: permitido };
  const teto = Math.round(bruto * permitido) / 100; // em reais, arredondado ao centavo
  if (desconto <= teto + 0.01) return { ok: true, percentualDado, percentualPermitido: permitido };
  const nomes = [...new Set((p.formas || []).filter((f) => Number(f?.valor) > 0.009).map((f) => String(f.forma || '').trim()).filter(Boolean))];
  const como = nomes.length ? ` para ${nomes.join(' + ')}` : '';
  const fmt = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
  return {
    ok: false,
    percentualDado,
    percentualPermitido: permitido,
    mensagem: `Desconto de ${fmt(percentualDado)}% passa do permitido${como} (${fmt(permitido)}%). Precisa de liberação de um gerente.`,
  };
}
