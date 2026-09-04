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
