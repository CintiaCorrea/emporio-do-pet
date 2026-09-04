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
