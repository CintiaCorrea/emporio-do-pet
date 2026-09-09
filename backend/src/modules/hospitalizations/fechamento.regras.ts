// NUCLEO UNICO do FECHAMENTO DIARIO da internacao — "o que entra na comanda deste dia?"
//
// Decisoes da Cintia em 05-06/09/2026, todas travadas em teste aqui:
//
//   1. Na alta, COBRAR SO O QUE FALTA. Nao refazer a conta inteira.
//   2. A conta FECHA POR DIA, sozinha a meia-noite.
//   3. A DIARIA entra no dia em que o periodo de 24h COMECOU.
//   4. Cada aplicacao de medicacao ja entra na comanda quando e efetuada.
//   5. Editar comanda ja fechada: so o administrativo.
//
// POR QUE ISTO PRECISA SER UM NUCLEO. A cobranca em dobro da internacao (Problema 1 da
// auditoria de 05/09) existia porque DOIS caminhos calculavam a conta com regras diferentes:
// "Comanda do dia" descontava o que ja fora faturado, "Enviar pro Caixa" somava tudo de novo.
// Quem usasse os dois na mesma internacao cobrava o cliente duas vezes. A regra passa a ser
// uma so, com teste, e os dois caminhos chamam ela.

/** O fuso da casa. Dia de calendario em Fortaleza, nao em UTC — senao tudo o que acontece
 *  depois das 21h cai no dia seguinte e o fechamento da meia-noite cobra errado. */
export const FUSO = 'America/Fortaleza';

/** "2026-09-05" a partir de qualquer data, no fuso da casa. */
export function diaDe(quando: Date | string | number | null | undefined): string | null {
  if (quando == null || quando === '') return null;
  const d = new Date(quando as any);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: FUSO }); // en-CA = YYYY-MM-DD
}

export type ItemDaConta = {
  id?: string;
  descricao?: string;
  categoria?: string;
  quantidade?: number;
  valorUnitario?: number;
  /** Quando o item aconteceu. Item sem data e de antes do campo existir. */
  at?: string | null;
  /** Ja foi para uma comanda? */
  baixado?: boolean;
};

/**
 * ESTE ITEM E A DIARIA DO DIA?
 *
 * A diaria virou ITEM da conta (garantirDiariasComoItens roda sozinho ao abrir a ficha). Saber
 * reconhece-la entre os itens e o que impede soma-la de novo por fora — ver montarFechamento.
 * Compara sem acento e sem caixa porque "Diária", "Diaria" e "DIARIA" existem todos no banco.
 */
export const ehDiariaDeItem = (i: ItemDaConta) =>
  String(i?.categoria || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase() === 'diaria';

/** Insumo nao e cobrado: so baixa estoque. E a unica categoria que fica de fora. */
export const ehCobravel = (i: ItemDaConta) => (i?.categoria || '') !== 'Insumo';

/** O total de uma linha. */
export const totalDoItem = (i: ItemDaConta) =>
  Math.max(0, (Number(i?.quantidade) || 0) * (Number(i?.valorUnitario) || 0));

/**
 * Os itens que entram no fechamento de UM dia.
 *
 * Tres filtros, e cada um evita um erro que ja aconteceu:
 *   - `baixado` fora: item ja cobrado numa comanda anterior nao volta. E a trava da
 *     cobranca em dobro.
 *   - `Insumo` fora: gaze e seringa baixam estoque e nao viram dinheiro.
 *   - o DIA tem de bater: e o que faz o cliente conseguir conferir o que pagou em cada dia.
 *
 * ITEM SEM DATA entra no fechamento do dia pedido — sao os lancamentos de antes de o campo
 * existir, e deixa-los de fora significaria nunca cobra-los. Eles aparecem marcados pra
 * quem fecha decidir.
 */
export function itensDoDia(itens: ItemDaConta[], dia: string): ItemDaConta[] {
  return (itens || []).filter((i) => {
    if (i?.baixado) return false;
    if (!ehCobravel(i)) return false;
    const d = diaDe(i?.at);
    return d == null || d === dia;
  });
}

/**
 * Em que dia cai a N-esima diaria (N a partir de 0), dada a hora da ENTRADA.
 *
 * A diaria entra no dia em que o periodo de 24h COMECOU — decisao da Cintia em 06/09. A
 * Kate entrou 29/08 as 14:48: a 1a diaria e do dia 29 (cobre ate 30/08 14:48), a 2a e do
 * dia 30, e assim por diante.
 */
export function diaDaDiaria(entrada: Date | string, indice: number): string | null {
  const e = new Date(entrada as any);
  if (Number.isNaN(e.getTime())) return null;
  return diaDe(new Date(e.getTime() + indice * 86_400_000));
}

/** Quantas diarias ja comecaram ate `agora` (1 a cada 24h comecadas). */
export function diariasComecadas(entrada: Date | string, agora: Date | string): number {
  const e = new Date(entrada as any).getTime();
  const a = new Date(agora as any).getTime();
  if (!Number.isFinite(e) || !Number.isFinite(a)) return 0;
  return Math.max(1, Math.ceil((a - e) / 86_400_000));
}

/** A diaria do dia `dia` ja comecou e ainda nao foi faturada? */
export function diariaDoDia(
  entrada: Date | string,
  dia: string,
  jaFaturadas: number,
): { indice: number; devida: boolean } {
  for (let i = 0; i < 400; i++) {
    const d = diaDaDiaria(entrada, i);
    if (d == null) break;
    if (d === dia) return { indice: i, devida: i >= (Number(jaFaturadas) || 0) };
    if (d > dia) break;
  }
  return { indice: -1, devida: false };
}

export type Fechamento = {
  dia: string;
  itens: ItemDaConta[];
  /** A diaria entra como linha propria quando ainda nao virou item na conta. */
  diaria: { valor: number; indice: number } | null;
  total: number;
  vazio: boolean;
};

/**
 * Monta o fechamento de um dia.
 *
 * A DIARIA ENTRA UMA VEZ SO. Ela pode chegar de dois jeitos: como ITEM da conta (o normal
 * hoje — `garantirDiariasComoItens` cria sozinho ao abrir a ficha) ou como linha propria
 * somada aqui. A segunda so acontece quando a primeira nao aconteceu, e quem decide isso e
 * o proprio dado: se o dia ja tem a linha da diaria, ela nao entra de novo.
 *
 * `diariasGeradas` continua aceito para quem ja passava o sinal, mas nao e mais a unica
 * defesa — era, e ninguem escrevia essa bandeira em lugar nenhum.
 */
export function montarFechamento(params: {
  itens: ItemDaConta[];
  dia: string;
  entrada?: Date | string | null;
  diariaValor?: number;
  diariasFaturadas?: number;
  diariasGeradas?: boolean;
}): Fechamento {
  const { itens, dia, entrada, diariaValor = 0, diariasFaturadas = 0, diariasGeradas = false } = params;
  const doDia = itensDoDia(itens, dia);

  // A DIARIA JA ESTA ENTRE OS ITENS DESTE DIA? Entao nao entra de novo por fora.
  //
  // A COBRANCA EM DOBRO DE 09/09/2026 (Cintia: "a diaria da internacao esta sendo cobrada 2
  // vezes. Por que?"). A protecao existia — a bandeira `diariasGeradas` — e a regra ate
  // dizia, no comentario, que somar duas vezes era o erro a impedir. So que a bandeira era
  // LIDA em tres lugares e ESCRITA em nenhum: valia sempre `false`. Enquanto isso,
  // `garantirDiariasComoItens` passou a criar a diaria como item sozinho, ao abrir a ficha.
  // Item pelo primeiro caminho, valor pelo segundo, cliente pagando dois.
  //
  // Agora quem responde e o DADO, nao uma bandeira que alguem precisa lembrar de acender:
  // se o dia ja tem a linha da diaria, ela nao entra por fora. Isso tambem conserta sozinho
  // as internacoes antigas, sem migracao.
  const jaTemDiariaNoDia = doDia.some(ehDiariaDeItem);

  let diaria: Fechamento['diaria'] = null;
  if (!diariasGeradas && !jaTemDiariaNoDia && entrada && Number(diariaValor) > 0) {
    const d = diariaDoDia(entrada, dia, diariasFaturadas);
    if (d.devida && d.indice >= 0) diaria = { valor: Number(diariaValor), indice: d.indice };
  }
  const total = doDia.reduce((s, i) => s + totalDoItem(i), 0) + (diaria?.valor || 0);
  return { dia, itens: doDia, diaria, total, vazio: doDia.length === 0 && !diaria };
}

/**
 * Os dias que ainda estao ABERTOS numa internacao, do mais antigo pro mais novo.
 *
 * Serve pro fechamento da meia-noite e pro aviso de "tem dia de ontem em aberto". Um dia
 * so aparece se tiver algo a cobrar — dia sem lancamento nenhum nao vira comanda vazia.
 */
export function diasEmAberto(params: {
  itens: ItemDaConta[];
  entrada?: Date | string | null;
  ate: Date | string;
  diariaValor?: number;
  diariasFaturadas?: number;
  diariasGeradas?: boolean;
}): Fechamento[] {
  const { itens, entrada, ate, ...resto } = params;
  const dias = new Set<string>();
  for (const i of itens || []) {
    if (i?.baixado || !ehCobravel(i)) continue;
    const d = diaDe(i?.at);
    if (d) dias.add(d);
  }
  if (entrada && Number(resto.diariaValor) > 0 && !resto.diariasGeradas) {
    const n = diariasComecadas(entrada, ate);
    for (let i = Number(resto.diariasFaturadas) || 0; i < n; i++) {
      const d = diaDaDiaria(entrada, i);
      if (d) dias.add(d);
    }
  }
  const limite = diaDe(ate);
  return [...dias]
    .filter((d) => limite == null || d <= limite)
    .sort()
    .map((dia) => montarFechamento({ itens, dia, entrada, ...resto }))
    .filter((f) => !f.vazio);
}

/**
 * Quem pode mexer numa comanda JA FECHADA?
 *
 * "Qualquer edicao na comanda ja fechada so pode ser feita pelo administrativo" — Cintia,
 * 06/09/2026. Dia aberto e do plantao; dia fechado virou dinheiro no caixa, e mexer nele
 * sem rastro e como mexer na gaveta.
 */
export function podeEditarItem(item: ItemDaConta, papel?: string, agora?: Date | string): boolean {
  if (!item?.baixado) return true;
  if (dentroDaSemanaDeAjuste(agora)) return true;
  return String(papel || '').toUpperCase() === 'ADMIN';
}

/**
 * SEMANA DE AJUSTE — combinada com a Cintia em 06/09/2026.
 *
 * Ate 12/09 QUALQUER PERFIL edita QUALQUER item, inclusive os ja cobrados. E a semana em
 * que a equipe aprende a lancar na internacao e as contas antigas sao acertadas: travar
 * agora obrigaria a chamar a Cintia a cada correcao, e ela viraria gargalo do plantao.
 *
 * A data mora NO CODIGO, e nao numa promessa de alguem lembrar: dia 13 a trava volta
 * sozinha, e "item ja cobrado so o administrativo edita" passa a valer sem ninguem fazer
 * nada. Se a semana precisar de mais dias, muda-se esta linha — de proposito, porque
 * afrouxar trava de dinheiro tem de ser uma decisao escrita, nao um esquecimento.
 *
 * Depois disso: o relatorio das edicoes da semana (quem mexeu em que) mostra o que cada
 * perfil realmente precisa, e a regra definitiva sai de dado, nao de palpite.
 */
export const AJUSTE_ATE = '2026-09-12T23:59:59-03:00';

export function dentroDaSemanaDeAjuste(agora?: Date | string): boolean {
  const t = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t)) return false;
  return t <= new Date(AJUSTE_ATE).getTime();
}

/**
 * O QUE FAZER COM A VENDA DE UM DIA DA INTERNACAO.
 *
 * A Cintia, em 07/09/2026: "e para puxar TODOS os lancamentos feitos na internacao. As
 * informacoes devem aparecer em TODOS os lugares. Venda por data."
 *
 * Ate aqui, os lancamentos do dia so viravam venda quando alguem clicava "Fechar o dia". Antes
 * disso nao existiam fora da internacao: o caixa nao via, o relatorio nao contava, e quem abria
 * a linha da internacao no caixa encontrava valor sem item nenhum.
 *
 * Agora a conta do dia em aberto E uma venda em aberto, que segue os lancamentos. Fechar o dia
 * deixou de criar venda: ele so TRAVA a que ja existe.
 *
 * As duas travas que importam:
 *   · dia que ja recebeu dinheiro nao e mais tocado — sincronizar por cima de um recebimento
 *     mudaria o valor de uma conta ja paga;
 *   · dia fechado tambem nao — ele virou dinheiro no caixa.
 */
export type AcaoDaVendaDoDia = 'CRIAR' | 'ATUALIZAR' | 'APAGAR' | 'NADA';

export function acaoDaVendaDoDia(p: {
  temAlgoACobrar: boolean;
  vendaId?: string | null;
  vendaRecebeu?: boolean;
  diaFechado?: boolean;
}): AcaoDaVendaDoDia {
  if (p?.diaFechado) return 'NADA';
  if (p?.vendaRecebeu) return 'NADA';
  const tem = !!p?.temAlgoACobrar;
  const id = p?.vendaId || null;
  if (tem) return id ? 'ATUALIZAR' : 'CRIAR';
  return id ? 'APAGAR' : 'NADA';
}
