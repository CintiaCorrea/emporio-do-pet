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
  /** true quando caiu no caixa de outra pessoa por nao haver ambiguidade (so um aberto). */
  deOutraPessoa?: boolean;
};

/**
 * Decide em qual caixa o recebimento entra. Tres casos, nesta ordem:
 *
 * 1. A pessoa tem o proprio caixa aberto  -> usa o dela. E a regra que importa: com duas
 *    recepcionistas e dois caixas abertos, a venda de uma nao pode cair na gaveta da outra.
 * 2. Ela nao tem, mas so existe UM caixa aberto -> usa esse. Nao ha ambiguidade: com um
 *    caixa so, e impossivel escolher errado. E o caso da administradora que vende sem ter
 *    aberto caixa proprio -- bloquear aqui so trava o balcao sem proteger nada.
 * 3. Ela nao tem e existe MAIS DE UM aberto -> ai sim recusa. Escolher seria cara ou coroa
 *    com o dinheiro dos outros.
 *
 * (Em 04/09/2026 a regra recusava tambem no caso 2, e isso travava vendas legitimas.)
 */
export function resolverCaixaDoRecebimento<T extends CaixaAbertoRef>(
  abertos: T[],
  meuUserId?: string | null,
): ResolucaoCaixa<T> {
  const meu = escolherMeuCaixa(abertos, meuUserId);
  if (meu) return { caixa: meu };

  if (!abertos?.length) {
    return { caixa: null, erro: 'Nenhum caixa aberto. Abra o caixa antes de receber.' };
  }
  if (abertos.length === 1) {
    return { caixa: abertos[0], deOutraPessoa: true };
  }
  return {
    caixa: null,
    erro:
      'Ha mais de um caixa aberto e nenhum deles e o seu — o sistema nao tem como saber ' +
      'em qual lancar. Abra o seu caixa (Vendas > Caixa) para receber.',
  };
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
