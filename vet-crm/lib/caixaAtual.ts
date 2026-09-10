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

export type CaixaParaReceber = {
  /** Onde o recebimento entra. null = não dá pra decidir com segurança. */
  caixa: CaixaAberto | null;
  /** Preenchido só quando caixa é null: o que dizer pra pessoa. */
  erro?: string;
  /** true quando é o caixa de outra pessoa, aceito por não haver ambiguidade. */
  deOutraPessoa?: boolean;
};

/**
 * MESMA REGRA DO SERVIDOR (backend caixa.regras.resolverCaixaDoRecebimento). Três casos:
 *
 *   1. Tenho o meu caixa aberto            -> uso o meu.
 *   2. Não tenho, mas só há UM aberto      -> uso esse. Com um caixa só é impossível
 *                                             escolher errado; bloquear aqui só trava o balcão.
 *   3. Não tenho e há MAIS DE UM aberto    -> recuso: escolher seria cara ou coroa.
 *
 * Em 04/09/2026 a tela recusava também no caso 2 e ninguém conseguia dar baixa. A regra vive
 * nos dois lados de propósito: a tela avisa antes, o servidor garante depois.
 */
export function caixaParaReceber(m: MeuCaixa): CaixaParaReceber {
  // O CAIXA É INDIVIDUAL (Cintia, 08/09/2026): "os caixas devem ser individuais e inacessíveis
  // por outra pessoa, isto é, eles são independentes".
  //
  // Até aqui, quando havia UM caixa aberto e ele não era o seu, o sistema lançava nele mesmo
  // assim (deOutraPessoa). Era conveniente e errado: o dinheiro entrava na gaveta de quem não
  // recebeu, e a diferença só aparecia no fechamento — para a pessoa errada.
  if (m?.meu) return { caixa: m.meu };
  const outros = m?.deOutros || [];
  if (!outros.length) {
    return { caixa: null, erro: 'Nenhum caixa aberto. Abra o seu em Vendas › Caixa para receber.' };
  }
  const nomes = outros.map((c) => c.operadorNome).join(', ');
  return {
    caixa: null,
    erro: outros.length === 1
      ? `O caixa aberto é de ${nomes}. Cada pessoa lança no próprio caixa — abra o seu em Vendas › Caixa.`
      : `Os caixas abertos são de ${nomes}, e nenhum é o seu. Abra o seu em Vendas › Caixa.`,
  };
}

/**
 * MEUS CAIXAS ABERTOS DE QUALQUER DIA — não só os de hoje.
 *
 * `carregarMeuCaixa` acima lê `/api/caixa`, que devolve os caixas DO DIA. Isso está certo para
 * a pergunta que ela responde ("tenho caixa aberto agora?"), e foi por isso que o problema de
 * 10/09/2026 ficou invisível: a tela nem sabia que existiam caixas abertos dos dias 01 a 04, e
 * mandava toda baixa para o de hoje. Para PERGUNTAR em qual caixa a baixa entra é preciso
 * enxergar todos — daí esta segunda leitura, pela grade, que filtra por status e por pessoa.
 */
export async function carregarMeusCaixasAbertos(meuUserId?: string | null): Promise<CaixaAberto[]> {
  if (!meuUserId) return [];
  try {
    const r = await fetch(`/api/caixa/grade?status=ABERTO&userId=${encodeURIComponent(meuUserId)}`, { cache: 'no-store' });
    if (!r.ok) return [];
    const d = await r.json();
    const arr: any[] = Array.isArray(d) ? d : (d.data || []);
    return arr
      .filter((c) => (c?.user?.id ?? c?.userId) === meuUserId)
      .map((c) => ({
        id: c.id,
        numero: Number(c.numero) || 0,
        abertura: c.abertura,
        operadorId: c.user?.id ?? c.userId ?? null,
        operadorNome: c.user?.name || 'sem nome',
      }))
      .sort((a, b) => new Date(b.abertura || 0).getTime() - new Date(a.abertura || 0).getTime());
  } catch {
    return [];
  }
}
