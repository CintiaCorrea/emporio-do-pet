// O RESUMO DE UM CAIXA — núcleo puro, uma conta só.
//
// A Cintia, em 08/09/2026, sobre a mesma tela no SimplesVet: "uso de crédito é invisível no
// total do caixa. É a pegadinha mais séria da tela: um caixa pode exibir 'Caixa sem movimento'
// e ainda assim ter tido quase mil reais de serviço prestado."
//
// Nós tínhamos o MESMO buraco, e mais um: o resumo mostrava Vendas + Suprimentos e chamava a
// soma de "Resultado". Sangria, despesa e transferência só apareciam na aba de Movimentações —
// então o resumo anunciava um resultado MAIOR do que o que havia na gaveta. Quem confere o
// caixa lê o resumo; se ele mente, a conferência mente junto.
//
// Duas decisões que valem mais que o código:
//
// 1. AS COLUNAS SÃO FIXAS. Ela reparou que no SimplesVet a tabela muda de largura conforme o
//    caixa ("quebra comparação visual entre dois caixas") e que o PDF deles usa colunas fixas.
//    Aqui vale o PDF: as colunas são sempre as mesmas, com 0,00 onde não houve nada.
//
// 2. O QUE NÃO É DINHEIRO DA GAVETA FICA FORA DO TOTAL, MAS APARECE. Uso de crédito e
//    adiantamento não somam no total — e é justamente por isso que precisam estar escritos.
//    Somar seria contar duas vezes; omitir foi o erro que ela apontou.

export type LinhaDeForma = {
  forma: string;
  vendas: number;
  suprimentos: number;
  sangrias: number;
  despesas: number;
  transferencias: number;
  /** Movimento de tipo que este núcleo não conhece. Nunca some calado — ver `tiposDesconhecidos`. */
  outras: number;
  /** vendas + suprimentos − (sangrias + despesas + transferências + outras). */
  total: number;
};

export type EntradaDoCaixa = {
  suprimento?: number | null;
  recebimentos?: { valorTotal?: number | null; formas?: any }[] | null;
  movimentos?: { tipo?: string | null; forma?: string | null; valor?: number | null }[] | null;
  creditosUtilizados?: { valor?: number | null }[] | null;
  creditosGerados?: { valor?: number | null }[] | null;
};

export type ResumoDoCaixa = {
  linhas: LinhaDeForma[];
  total: LinhaDeForma;
  /** Serviço prestado que NÃO entrou dinheiro aqui: o cliente pagou antes, em crédito. */
  usoDeCredito: number;
  /** Crédito/caução que nasceu neste caixa. O dinheiro já está contado em Suprimentos. */
  adiantamentos: number;
  /** Tipos de movimento que o núcleo não reconheceu — a tela avisa em vez de calar. */
  tiposDesconhecidos: string[];
};

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const zero = (forma: string): LinhaDeForma =>
  ({ forma, vendas: 0, suprimentos: 0, sangrias: 0, despesas: 0, transferencias: 0, outras: 0, total: 0 });

/** Onde cada tipo de movimento entra. Suprimento soma; o resto sai da gaveta. */
const COLUNA_DO_MOVIMENTO: Record<string, keyof LinhaDeForma> = {
  SUPRIMENTO: 'suprimentos',
  SANGRIA: 'sangrias',
  DESPESA: 'despesas',
  TRANSFERENCIA: 'transferencias',
};

const fecharLinha = (l: LinhaDeForma): LinhaDeForma => ({
  ...l,
  total: l.vendas + l.suprimentos - (l.sangrias + l.despesas + l.transferencias + l.outras),
});

export function montarResumoDoCaixa(caixa: EntradaDoCaixa | null | undefined): ResumoDoCaixa {
  const mapa = new Map<string, LinhaDeForma>();
  const linha = (forma: string) => {
    const nome = String(forma || '').trim() || 'Outros';
    if (!mapa.has(nome)) mapa.set(nome, zero(nome));
    return mapa.get(nome)!;
  };

  // ── VENDAS, por forma de recebimento ────────────────────────────────────────────────────
  for (const rec of caixa?.recebimentos || []) {
    // `formas` chega torto do banco em recebimento antigo (ex.: [[]] de baixa sem forma).
    const fs = (Array.isArray(rec?.formas) ? (rec!.formas as any[]).flat() : [])
      .filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));
    let somado = 0;
    for (const f of fs) { const v = num(f.valor); somado += v; linha(f.forma || 'Outros').vendas += v; }
    // O que o valorTotal tem a mais do que as formas explicam NÃO some: vira "Outros".
    const resto = num(rec?.valorTotal) - somado;
    if (resto > 0.005) linha('Outros').vendas += resto;
  }

  // ── SUPRIMENTO DE ABERTURA — o fundo de troco é dinheiro na gaveta desde o minuto zero ──
  if (num(caixa?.suprimento) > 0) linha('Dinheiro').suprimentos += num(caixa!.suprimento);

  // ── MOVIMENTAÇÕES ───────────────────────────────────────────────────────────────────────
  const desconhecidos = new Set<string>();
  for (const m of caixa?.movimentos || []) {
    const tipo = String(m?.tipo || '').toUpperCase();
    const col = COLUNA_DO_MOVIMENTO[tipo];
    const alvo = linha(m?.forma || 'Dinheiro');
    if (col) (alvo[col] as number) += num(m?.valor);
    else { alvo.outras += num(m?.valor); if (tipo) desconhecidos.add(tipo); }
  }

  const linhas = Array.from(mapa.values())
    .map(fecharLinha)
    .filter((l) => l.vendas || l.suprimentos || l.sangrias || l.despesas || l.transferencias || l.outras)
    .sort((a, b) => b.total - a.total || a.forma.localeCompare(b.forma));

  const total = fecharLinha(linhas.reduce((s, l) => ({
    ...s,
    vendas: s.vendas + l.vendas,
    suprimentos: s.suprimentos + l.suprimentos,
    sangrias: s.sangrias + l.sangrias,
    despesas: s.despesas + l.despesas,
    transferencias: s.transferencias + l.transferencias,
    outras: s.outras + l.outras,
  }), zero('Total')));

  const soma = (arr: any[] | null | undefined) => (arr || []).reduce((s, c) => s + num(c?.valor), 0);

  return {
    linhas,
    total,
    usoDeCredito: soma(caixa?.creditosUtilizados),
    adiantamentos: soma(caixa?.creditosGerados),
    tiposDesconhecidos: Array.from(desconhecidos).sort(),
  };
}

/**
 * A frase que explica o uso de crédito na tela. Existe aqui, e não no JSX, porque é ela que
 * impede a leitura errada — e leitura errada de caixa vira diferença de gaveta.
 */
export function avisoDoUsoDeCredito(valor: number): string | null {
  if (!(valor > 0.005)) return null;
  return 'Serviço prestado com crédito do cliente. Não entra no total porque o dinheiro entrou antes, em outro caixa.';
}

/** Idem para adiantamento: o dinheiro entrou, mas já está contado como suprimento. */
export function avisoDoAdiantamento(valor: number): string | null {
  if (!(valor > 0.005)) return null;
  return 'Crédito comprado hoje pelo cliente. O dinheiro já está somado em Suprimentos — aqui é só para você saber que aquele suprimento tem dono.';
}
