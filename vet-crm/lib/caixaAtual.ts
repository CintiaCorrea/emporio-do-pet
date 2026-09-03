// NÚCLEO ÚNICO — "qual caixa é o MEU?"
//
// A clínica opera com DOIS caixas abertos ao mesmo tempo (um por funcionária, decisão de 02/09/2026).
// As vendas aparecem para as duas; o recebimento vai pro caixa de QUEM RECEBEU. Antes, cada tela
// escolhia sozinha — PDV pegava o caixa aberto mais recente, "Em atendimento" pegava o primeiro da
// lista, Internação pegava o mais recente — e ninguém olhava quem estava logada, então a venda de uma
// caía no caixa da outra. Toda tela que registra recebimento usa este arquivo.

export type CaixaAberto = {
  id: string;
  numero: number;
  abertura: string;
  operadorId: string | null;
  operadorNome: string;
};

export type MeuCaixa = {
  /** O caixa da pessoa logada. null = ela não abriu o dela ainda. */
  meu: CaixaAberto | null;
  /** Caixas abertos de outras pessoas (para explicar na tela, nunca para receber por engano). */
  deOutros: CaixaAberto[];
};

const VAZIO: MeuCaixa = { meu: null, deOutros: [] };

/** Rótulo curto pra mostrar na tela: "Caixa 3 · Ana". */
export const rotuloCaixa = (c: CaixaAberto) => `Caixa ${c.numero} · ${c.operadorNome}`;

/**
 * Lê os caixas do dia e separa o da pessoa logada dos demais.
 * `meuUserId` vem da sessão; sem ele não dá pra saber qual é o meu, então devolve vazio
 * (a tela pede pra abrir o caixa, que é o comportamento seguro).
 */
export async function carregarMeuCaixa(meuUserId?: string | null): Promise<MeuCaixa> {
  try {
    const r = await fetch('/api/caixa', { cache: 'no-store' });
    if (!r.ok) return VAZIO;
    const d = await r.json();
    const arr: any[] = Array.isArray(d) ? d : (d.data || []);
    const abertos: CaixaAberto[] = arr
      .filter((c) => String(c?.status || '').toUpperCase() === 'ABERTO')
      .map((c) => ({
        id: c.id,
        numero: Number(c.numero) || 0,
        abertura: c.abertura,
        operadorId: c.user?.id ?? c.userId ?? null,
        operadorNome: c.user?.name || 'sem nome',
      }))
      .sort((a, b) => new Date(b.abertura || 0).getTime() - new Date(a.abertura || 0).getTime());

    if (!meuUserId) return { meu: null, deOutros: abertos };
    const meu = abertos.find((c) => c.operadorId === meuUserId) || null;
    return { meu, deOutros: abertos.filter((c) => c.id !== meu?.id) };
  } catch {
    return VAZIO;
  }
}

/** Mensagem pronta pra quando a pessoa não tem caixa aberto (explica sem culpar). */
export function avisoSemMeuCaixa(deOutros: CaixaAberto[]): string {
  const base = 'Abra o seu caixa para receber (Caixa › Novo caixa).';
  if (!deOutros.length) return base;
  const nomes = deOutros.map((c) => c.operadorNome).join(', ');
  return `${base} O caixa aberto agora é de ${nomes} — o recebimento tem que entrar no seu.`;
}

/**
 * Dentro de uma lista de caixas já carregada (a tela do Caixa carrega os do dia), qual é o MEU.
 * Usa o caixa ABERTO da pessoa; se ela não tiver um aberto, aceita o fechado dela; só então
 * cai no primeiro da lista — assim a tela nunca abre no caixa da colega por acidente.
 */
export function idDoMeuCaixa(
  lista: { id: string; status?: string; userId?: string | null; user?: { id?: string } | null }[],
  meuUserId?: string | null,
): string | null {
  if (!lista?.length) return null;
  if (!meuUserId) return lista[0].id;
  const meus = lista.filter((c) => (c.user?.id ?? c.userId) === meuUserId);
  const aberto = meus.find((c) => String(c.status || '').toUpperCase() === 'ABERTO');
  return (aberto || meus[0] || lista[0]).id;
}
