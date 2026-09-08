// OS RECEBIMENTOS DE UM CAIXA, AGRUPADOS POR VENDA — núcleo puro.
//
// A Cintia, em 08/09/2026, lendo a mesma aba no SimplesVet:
//
//   · "A ordenação é por venda, não por horário da baixa. Para conferência de caixa (que é
//      cronológica por natureza) isso atrapalha."
//   · "Não há total da aba — para conferir o caixa a pessoa precisa ir na aba Resumo. Essa
//      ausência de total na tela é uma lacuna real."
//   · "O código do cliente e o número da venda são texto puro, não linkam para o cadastro nem
//      para a venda — o que é um desperdício óbvio de UX."
//   · E, sobre o papel deles: "a tela mostra a condição de parcelamento e o papel não."
//
// Então aqui: agrupado por venda (que é como se lê uma conta), mas ORDENADO PELA HORA DA BAIXA
// (que é como se confere um caixa), com a condição de pagamento visível e total no fim.

export type FormaRecebida = { forma?: string | null; valor?: number | null; parcelas?: number | null };

export type RecebimentoDoCaixa = {
  id: string;
  data: string;
  valorTotal?: number | null;
  formas?: any;
  appointmentId?: string | null;
  appointment?: {
    id?: string | null;
    value?: number | null;
    numeroVenda?: number | null;
    codigoExterno?: string | null;
    pet?: { id?: string | null; name?: string | null } | null;
    tutor?: { id?: string | null; name?: string | null } | null;
  } | null;
};

export type LinhaDeBaixa = {
  recebimentoId: string;
  data: string;
  forma: string;
  /** "À vista" / "Parcelado 3x". */
  condicao: string;
  valor: number;
  /** true na primeira linha de cada baixa — é onde mora o botão de estornar. */
  primeiraDaBaixa: boolean;
};

export type GrupoDeVenda = {
  chave: string;
  appointmentId: string | null;
  numeroVenda: number | null;
  codigoExterno: string | null;
  tutorId: string | null;
  tutorNome: string;
  petNome: string;
  /** O valor da venda inteira (pode ser maior que o recebido aqui: baixa parcial). */
  valorDaVenda: number;
  /** O que este caixa recebeu dessa venda. */
  recebido: number;
  /** Hora da primeira baixa desta venda NESTE caixa — é a chave de ordenação. */
  primeiraBaixa: string;
  linhas: LinhaDeBaixa[];
};

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/**
 * "À vista" ou "Parcelado 3x". O SimplesVet mostra isso na tela e perde no papel; para nós é a
 * diferença entre conferir uma maquininha e não conferir.
 */
export function rotuloDaCondicao(parcelas?: number | null): string {
  const n = Math.trunc(num(parcelas));
  return n > 1 ? `Parcelado ${n}x` : 'À vista';
}

export function agruparRecebimentos(
  recebimentos: RecebimentoDoCaixa[] | null | undefined,
): { grupos: GrupoDeVenda[]; total: number } {
  const mapa = new Map<string, GrupoDeVenda>();

  for (const rec of recebimentos || []) {
    const ap = rec?.appointment || null;
    // Recebimento sem venda ligada existe (baixa avulsa) e não pode sumir da conferência:
    // vira um grupo só dele.
    const chave = rec?.appointmentId || ap?.id || `avulso:${rec?.id}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        appointmentId: rec?.appointmentId || ap?.id || null,
        numeroVenda: ap?.numeroVenda ?? null,
        codigoExterno: ap?.codigoExterno ?? null,
        tutorId: ap?.tutor?.id ?? null,
        tutorNome: ap?.tutor?.name || 'Cliente',
        petNome: ap?.pet?.name || '',
        valorDaVenda: num(ap?.value),
        recebido: 0,
        primeiraBaixa: rec?.data,
        linhas: [],
      });
    }
    const g = mapa.get(chave)!;
    if (rec?.data && new Date(rec.data).getTime() < new Date(g.primeiraBaixa).getTime()) g.primeiraBaixa = rec.data;

    // `formas` chega torto de recebimento antigo (ex.: [[]]) — achata e filtra.
    const fs: FormaRecebida[] = (Array.isArray(rec?.formas) ? (rec!.formas as any[]).flat() : [])
      .filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));

    let somado = 0;
    fs.forEach((f, i) => {
      const v = num(f.valor);
      somado += v;
      g.linhas.push({
        recebimentoId: rec.id, data: rec.data,
        forma: String(f.forma || '').trim() || 'Sem forma',
        condicao: rotuloDaCondicao(f.parcelas),
        valor: v,
        primeiraDaBaixa: i === 0,
      });
    });

    // Baixa sem forma (ou com forma parcial): o que sobra do valorTotal vira uma linha própria.
    // Sem isso o total da aba não bate com o do resumo, e a conferência morre aí.
    const resto = num(rec?.valorTotal) - somado;
    if (resto > 0.005 || (!fs.length && num(rec?.valorTotal) > 0.005)) {
      g.linhas.push({
        recebimentoId: rec.id, data: rec.data,
        forma: 'Sem forma', condicao: 'À vista',
        valor: resto > 0.005 ? resto : num(rec?.valorTotal),
        primeiraDaBaixa: fs.length === 0,
      });
    }
    g.recebido += num(rec?.valorTotal);
  }

  const grupos = Array.from(mapa.values()).map((g) => ({
    ...g,
    // Dentro da venda, também cronológico.
    linhas: g.linhas.slice().sort((a, b) => +new Date(a.data) - +new Date(b.data)),
  }));

  // A ORDEM É A DO DIA, não a do número da venda. Foi a primeira coisa que ela apontou.
  grupos.sort((a, b) => +new Date(a.primeiraBaixa) - +new Date(b.primeiraBaixa));

  return { grupos, total: grupos.reduce((s, g) => s + g.recebido, 0) };
}

/** "#1081", ou o código importado, ou "sem número" — o rótulo curto da venda. */
export function rotuloDaVenda(g: Pick<GrupoDeVenda, 'numeroVenda' | 'codigoExterno'>): string {
  if (g.numeroVenda) return `#${g.numeroVenda}`;
  if (g.codigoExterno) return String(g.codigoExterno);
  return 'sem número';
}
