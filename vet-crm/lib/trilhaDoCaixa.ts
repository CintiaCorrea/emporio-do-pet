// A TRILHA DE UM CAIXA — o que aconteceu naquela gaveta, em português.
//
// A Cintia, em 08/09/2026, sobre o botão Log do SimplesVet: "mostra que existe uma trilha de
// auditoria completa por caixa (Vendas → Caixa > Fechamento, Vendas → Baixa > Inclusão)".
//
// Nós já gravávamos tudo isso — o interceptor de auditoria registra toda escrita com usuário,
// hora, método e caminho — e nunca mostramos. O registro existia e não servia a ninguém.
//
// Este núcleo traduz a linha crua do log (POST /api/caixa/abc/recebimento) na frase que a
// pessoa lê. Mora aqui, e não no JSX, porque é a única parte que pode estar errada: se um dia
// a rota mudar, é este arquivo (e o teste dele) que cai — não a tela, calada.

export type EventoBruto = {
  id?: string;
  createdAt?: string;
  userName?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
};

export type EventoDoCaixa = {
  id: string;
  quando: string;
  quem: string;
  /** "Vendas › Caixa › Recebimento" — a trilha, como no log deles. */
  trilha: string;
  /** "Recebimento registrado" */
  texto: string;
  /** true quando o evento DESFEZ alguma coisa: merece destaque na conferência. */
  desfeito: boolean;
  /** true quando a requisição falhou — o log guarda a tentativa, e isso importa. */
  falhou: boolean;
};

type Regra = { quando: RegExp; metodo?: string; trilha: string; texto: string; desfeito?: boolean };

// A ordem importa: a primeira que casar vence.
const REGRAS: Regra[] = [
  { quando: /\/caixa\/[^/]+\/recebimento$/, metodo: 'POST', trilha: 'Vendas › Caixa › Recebimento', texto: 'Recebimento registrado' },
  { quando: /\/caixa\/[^/]+\/recebimento$/, metodo: 'DELETE', trilha: 'Vendas › Caixa › Recebimento', texto: 'Recebimento excluído — a baixa da venda foi revertida', desfeito: true },
  { quando: /\/caixa\/[^/]+\/movimento$/, metodo: 'POST', trilha: 'Vendas › Caixa › Movimentação', texto: 'Movimentação lançada (suprimento, sangria, despesa ou transferência)' },
  { quando: /\/caixa\/[^/]+\/movimento$/, metodo: 'DELETE', trilha: 'Vendas › Caixa › Movimentação', texto: 'Movimentação excluída', desfeito: true },
  { quando: /\/caixa\/[^/]+\/credito$/, metodo: 'DELETE', trilha: 'Vendas › Caixa › Crédito', texto: 'Crédito do cliente excluído', desfeito: true },
  { quando: /\/caixa\/[^/]+\/fechar$/, trilha: 'Vendas › Caixa › Fechamento', texto: 'Caixa fechado' },
  { quando: /\/caixa\/[^/]+\/reabrir$/, trilha: 'Vendas › Caixa › Fechamento', texto: 'Caixa reaberto', desfeito: true },
  { quando: /\/caixa\/[^/]+\/status$/, trilha: 'Vendas › Caixa › Situação', texto: 'Situação do caixa alterada' },
  { quando: /\/caixa\/?$/, metodo: 'POST', trilha: 'Vendas › Caixa › Abertura', texto: 'Caixa aberto' },
];

const hora = (d: any) => { try { return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export function descreverEvento(e: EventoBruto | null | undefined): EventoDoCaixa | null {
  if (!e) return null;
  const path = String(e.path || '');
  const metodo = String(e.method || '').toUpperCase();
  const regra = REGRAS.find((r) => r.quando.test(path) && (!r.metodo || r.metodo === metodo));
  const status = Number(e.statusCode || 0);
  return {
    id: String(e.id || `${e.createdAt}-${path}`),
    quando: hora(e.createdAt),
    quem: e.userName || 'sem usuário',
    // Evento que este núcleo não conhece continua aparecendo, cru. Sumir com um evento de
    // auditoria porque não soubemos nomeá-lo seria pior do que mostrá-lo feio.
    trilha: regra?.trilha || 'Vendas › Caixa',
    texto: regra?.texto || `${metodo} ${path}`,
    desfeito: !!regra?.desfeito,
    falhou: status >= 400,
  };
}

/** A trilha inteira, do mais antigo para o mais novo — conferência se lê na ordem do dia. */
export function trilhaDoCaixa(logs: EventoBruto[] | null | undefined): EventoDoCaixa[] {
  return (logs || [])
    .map(descreverEvento)
    .filter((e): e is EventoDoCaixa => !!e)
    .sort((a, b) => a.quando.localeCompare(b.quando));
}
