// NÚCLEO ÚNICO no backend — "qual caixa é o MEU?"
//
// Espelho de vet-crm/lib/caixaAtual.ts. A clínica opera com DOIS caixas abertos ao mesmo tempo
// (um por funcionária, decisão de 02/09/2026). O recebimento entra no caixa de QUEM recebeu.
// Antes, a venda do PDV caía no caixa aberto mais recente — e o PDV não envia caixaId, então
// era este atalho do backend que decidia: a venda de uma funcionária ia pra gaveta da outra.

export type CaixaAbertoRef = { id: string; userId: string; abertura: Date | string };

/**
 * Dentre os caixas ABERTOS, qual é o da pessoa logada. null = ela não abriu o dela.
 * Nunca devolve o caixa de outra pessoa: é melhor barrar a venda do que pôr o dinheiro
 * na gaveta errada. Se ela tiver mais de um aberto, vale o mais recente.
 */
export function escolherMeuCaixa<T extends CaixaAbertoRef>(
  abertos: T[],
  meuUserId?: string | null,
): T | null {
  if (!meuUserId || !abertos?.length) return null;
  const meus = abertos.filter((c) => c.userId === meuUserId);
  if (!meus.length) return null;
  return meus.reduce((maisNovo, c) =>
    new Date(c.abertura).getTime() > new Date(maisNovo.abertura).getTime() ? c : maisNovo,
  );
}

/** Explica sem culpar, distinguindo "ninguém abriu" de "só a colega abriu". */
export function avisoSemMeuCaixa(totalAbertos: number): string {
  return totalAbertos > 0
    ? 'Você não tem caixa aberto. O caixa aberto agora é de outra pessoa — abra o seu para receber.'
    : 'Nenhum caixa aberto. Abra o caixa antes de receber.';
}

export type ResolucaoCaixa<T> = {
  /** O caixa onde o recebimento deve entrar. null = nao da pra decidir com seguranca. */
  caixa: T | null;
  /** Preenchido so quando caixa e null: o que dizer pra pessoa. */
  erro?: string;
};

/**
 * Decide em qual caixa o recebimento entra. Uma regra so: E O MEU CAIXA, OU NAO E.
 *
 * A Cintia, em 08/09/2026: "os caixas devem ser individuais e inacessiveis por outra pessoa,
 * isto e, eles sao independentes." Quem da baixa e a recepcao (Gabriela e Victoria) e,
 * eventualmente, o administrativo — e cada uma lanca no proprio caixa, sem excecao para o adm
 * (decisao dela, 08/09: "adm abre o caixa dela tambem").
 *
 * ATE 08/09 HAVIA UM ATALHO AQUI, e ele custou caro: quando existia UM unico caixa aberto e ele
 * nao era o seu, esta funcao entregava o da colega "porque nao havia ambiguidade". So que na
 * noite de 07/09 o servico passou a exigir o dono na hora de gravar (exigirDonoDoCaixa) — entao
 * esta funcao entregava um caixa que a linha seguinte recusava. A venda ja tinha sido criada, o
 * recebimento estourava, e ninguem conseguia dar baixa. Duas regras diferentes para a mesma
 * pergunta e pior que uma regra ruim.
 *
 * Nao ter caixa proprio nao trava mais o balcao: a tela abre o caixa da pessoa ali mesmo, sem
 * sair da venda (AbrirMeuCaixaModal).
 */
export function resolverCaixaDoRecebimento<T extends CaixaAbertoRef>(
  abertos: T[],
  meuUserId?: string | null,
): ResolucaoCaixa<T> {
  const meu = escolherMeuCaixa(abertos, meuUserId);
  if (meu) return { caixa: meu };

  const outros = abertos || [];
  if (!outros.length) {
    return { caixa: null, erro: 'Nenhum caixa aberto. Abra o seu caixa para receber.' };
  }
  return {
    caixa: null,
    erro:
      outros.length === 1
        ? 'O caixa aberto e de outra pessoa. Cada um lanca no proprio caixa — abra o seu para receber.'
        : 'Ha mais de um caixa aberto e nenhum deles e o seu. Abra o seu caixa para receber.',
  };
}

/**
 * A pessoa ja tem caixa aberto? Serve para nao abrir um segundo por engano.
 *
 * Em 05/09/2026 a Victoria abriu TRES caixas no mesmo dia: ela abria, nao via na lista (o dia
 * estava sendo cortado no fuso errado) e abria de novo. O corte do dia ja foi consertado; esta
 * regra fecha a outra ponta — e vale mais ainda agora que dá para abrir o caixa com um clique
 * de dentro da venda.
 */
export function meuCaixaJaAberto<T extends CaixaAbertoRef>(
  abertos: T[],
  meuUserId?: string | null,
): T | null {
  return escolherMeuCaixa(abertos, meuUserId);
}

// ── O DIA DO CAIXA É O DIA DE FORTALEZA ─────────────────────────────────────────
//
// O BUG que motivou isto (06/09/2026). A Cintia: "quando a Gabriela abre o caixa a
// Victoria não consegue abrir". Os dados contaram outra história: em 05/09 a Victoria
// abriu TRÊS caixas. Ela abria, não via na tela, e abria de novo.
//
// A causa: o dia era calculado com `setHours(0,0,0,0)` no fuso do SERVIDOR, que roda em
// UTC. Fortaleza é UTC−3. Então "hoje" no servidor ia das 21h de ontem às 20h59 de hoje,
// no horário daqui — e um caixa aberto às 21h30 nascia no DIA SEGUINTE, sumindo da lista.
//
// A clínica atende à noite. Era todo dia, depois das 21h.
//
// A decisão "caixa estritamente por dia" (Cintia, 06/09) torna isto ainda mais crítico:
// o dia passa a ser a unidade de fechamento, e um dia mal cortado leva junto a conferência.

export const FUSO_CASA = '-03:00';

/**
 * O começo e o fim de um dia, no fuso da casa.
 *
 * `dateStr` no formato AAAA-MM-DD. Sem ele, vale HOJE em Fortaleza — e "hoje" tem de ser
 * lido no fuso daqui, senão às 22h o sistema já virou o dia sozinho.
 */
export function faixaDoDia(dateStr?: string): { ini: Date; fim: Date; dia: string } {
  const dia = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  return {
    dia,
    ini: new Date(`${dia}T00:00:00${FUSO_CASA}`),
    fim: new Date(`${dia}T23:59:59.999${FUSO_CASA}`),
  };
}

/** A hora de abertura de um caixa retroativo: meio-dia DAQUI, não do servidor. */
export function aberturaRetroativa(dateStr?: string): Date | undefined {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).slice(0, 10))) return undefined;
  return new Date(`${String(dateStr).slice(0, 10)}T12:00:00${FUSO_CASA}`);
}

/**
 * Quem pode abrir caixa. "Só as recepcionistas e adm" — Cintia, 06/09/2026.
 *
 * Veterinário atende; caixa é da recepção. Quem abre responde pelo dinheiro da gaveta, e
 * responsabilidade sem quem a exerça é responsabilidade de ninguém.
 */
export function podeAbrirCaixa(papel?: string | null): boolean {
  const p = String(papel || '').toUpperCase();
  return p === 'ADMIN' || p === 'RECEPTIONIST';
}

// ── O CAIXA É INDIVIDUAL ──────────────────────────────────────────────────────────────────
//
// A Cintia, em 08/09/2026: "os caixas devem ser individuais e inacessíveis por outra pessoa,
// isto é, eles são independentes."
//
// Até aqui a tela escolhia o caixa e o backend aceitava qualquer um: bastava mandar o id. Quem
// estivesse logada podia lançar na gaveta da colega sem querer — e a diferença só aparecia no
// fechamento, para a pessoa errada. Proteção que só existe na tela não é proteção.

/** Quem pode LANÇAR dinheiro num caixa: só o dono. */
export function podeLancarNoCaixa(donoId?: string | null, quemId?: string | null): boolean {
  const dono = String(donoId || '').trim();
  const quem = String(quemId || '').trim();
  if (!dono || !quem) return false; // sem saber de quem é, não lança
  return dono === quem;
}

/**
 * Quem pode FECHAR um caixa: o dono ou o administrativo.
 *
 * O fechamento é conferência de gaveta, e alguém precisa poder fechar o caixa que ficou aberto
 * de quem não veio trabalhar hoje — senão o dia trava. Lançar dinheiro continua sendo só do dono.
 */
export function podeFecharCaixa(donoId?: string | null, quemId?: string | null, papel?: string | null): boolean {
  if (podeLancarNoCaixa(donoId, quemId)) return true;
  return String(papel || '').toUpperCase() === 'ADMIN';
}

// ── APAGAR UM CAIXA ───────────────────────────────────────────────────────────────────────
//
// A Cintia, em 09/09/2026: "pode ter um botao para deletar o caixa somente para o adm".
//
// O pedido nasceu de uma limpeza real: em 09/09 havia NOVE caixas abertos e nunca usados desde
// o dia 1o — gente que abriu, nao lancou nada, e o caixa ficou ali. Lista cheia de caixa vazio
// atrapalha quem precisa achar o caixa certo.
//
// DUAS CONDICOES, e a segunda e minha, nao dela:
//
//   1. So o ADMINISTRATIVO. Foi o que ela pediu.
//   2. So caixa SEM MOVIMENTO. Caixa com recebimento, movimentacao ou credito nao e sobra: e
//      registro de dinheiro. Apagar isso nao e limpeza, e apagar historia — e ninguem consegue
//      explicar depois por que a conferencia de um dia nao fecha. Para esse caso existem
//      reabrir, corrigir e fechar de novo, que deixam rastro.

export type ResultadoApagar = { pode: boolean; motivo?: string };

export function podeApagarCaixa(params: {
  papel?: string | null;
  recebimentos?: number;
  movimentos?: number;
  creditos?: number;
  suprimento?: number;
}): ResultadoApagar {
  const { papel, recebimentos = 0, movimentos = 0, creditos = 0, suprimento = 0 } = params;

  if (String(papel || '').toUpperCase() !== 'ADMIN') {
    return { pode: false, motivo: 'So o administrativo apaga caixa.' };
  }

  const partes: string[] = [];
  if (recebimentos > 0) partes.push(`${recebimentos} recebimento(s)`);
  if (movimentos > 0) partes.push(`${movimentos} movimentação(oes)`);
  if (creditos > 0) partes.push(`${creditos} crédito(s)`);
  if (Number(suprimento) > 0) partes.push('suprimento de abertura');

  if (partes.length) {
    return {
      pode: false,
      motivo: `Este caixa tem ${partes.join(', ')}. Caixa com movimento nao se apaga — reabra, corrija e feche de novo, que deixa rastro.`,
    };
  }
  return { pode: true };
}

/**
 * O NÚMERO DO PRÓXIMO CAIXA É O MAIOR JÁ USADO + 1 — nunca a contagem de linhas.
 *
 * O BUG (10/09/2026): existiam DOIS caixas nº 11 no banco, um de 04/09 e um de 10/09. O número
 * era `count + 1`, e em 09/09 nove caixas zerados foram apagados a pedido da Cintia. A contagem
 * voltou atrás e passou de novo por números já entregues. Número de caixa é identidade — é por
 * ele que se procura o caixa na grade e é ele que sai no relatório em papel; dois caixas com o
 * mesmo número tornam a busca ambígua e a conferência impossível.
 *
 * Sempre para frente: apagar caixa não devolve o número ao estoque.
 */
export function numeroDoProximoCaixa(numerosJaUsados: (number | null | undefined)[]): number {
  let maior = 0;
  for (const n of numerosJaUsados || []) {
    const v = Number(n);
    if (Number.isFinite(v) && v > maior) maior = Math.trunc(v);
  }
  return maior + 1;
}
