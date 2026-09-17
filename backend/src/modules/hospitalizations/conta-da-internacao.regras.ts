/**
 * A CONTA DA INTERNAÇÃO — a porta única de lançar item (construção B, 17/09/2026).
 *
 * Até aqui a tela gravava o item direto na lista genérica (`/api/listas`), e o servidor só ficava
 * sabendo quando alguém abria a ficha da internação: a venda do dia só existia depois disso, e a
 * recepção não via o valor em tempo real (Cintia, 16/09/2026).
 *
 * Duas regras puras moram aqui, para terem teste e não dependerem da tela:
 *  1. TODO item tem data e hora. Sem `at`, o item some do dia certo e vira "cobrança de algum dia".
 *  2. A MESMA aplicação não entra duas vezes. A internação da Luna tem CERENIA das 06:15 lançada
 *     três vezes e mais três pares repetidos — mesmo item, mesmo minuto, marcado em dobro.
 */

export type ItemParaConta = {
  descricao?: string | null;
  categoria?: string | null;
  quantidade?: number | null;
  valorUnitario?: number | null;
  at?: string | null;
  /** Marca da aplicação que gerou a cobrança (prescrição): a mesma aplicação cobra uma vez só. */
  medLogId?: string | null;
  [k: string]: any;
};

/** Carimba a data: a informada, se válida; senão, agora. */
export function comData(item: ItemParaConta, agora: Date = new Date()): ItemParaConta {
  const t = item?.at ? new Date(item.at as string).getTime() : NaN;
  return { ...item, at: Number.isFinite(t) ? new Date(t).toISOString() : agora.toISOString() };
}

const semAcento = (s: unknown) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Já existe este lançamento na conta? É repetido quando:
 *  · vem da MESMA aplicação da prescrição (medLogId igual); ou
 *  · é o mesmo item no mesmo minuto — foi o clique repetido, não duas doses.
 * Duas doses do mesmo remédio em horários diferentes continuam entrando, como deve ser.
 */
export function jaEstaNaConta(itens: ItemParaConta[], novo: ItemParaConta): boolean {
  const alvoMed = String(novo?.medLogId || '').trim();
  const nome = semAcento(novo?.descricao);
  const minuto = (v: unknown) => String(v || '').slice(0, 16); // AAAA-MM-DDTHH:MM
  const quando = minuto(novo?.at);
  return (itens || []).some((i) => {
    if (alvoMed && String(i?.medLogId || '').trim() === alvoMed) return true;
    if (!nome || !quando) return false;
    return semAcento(i?.descricao) === nome && minuto(i?.at) === quando;
  });
}

/**
 * O QUE CHEGOU DEPOIS DE O DIA JÁ TER SIDO COBRADO (construção B, 17/09/2026).
 *
 * Dia fechado ou venda do dia já paga: o lançamento novo não pode entrar naquela venda (mexer em
 * dinheiro que já entrou) nem sumir — era o que acontecia, "item lançado depois de fechar o dia é
 * marcado como cobrado e não entra na venda". Ele vai para uma VENDA COMPLEMENTAR do mesmo dia.
 */
export function novosDepoisDaCobranca<T extends { baixado?: boolean; _criadoEm?: string | Date | null }>(
  itensDoDia: T[],
  cobradoEm: string | Date | null | undefined,
): T[] {
  const corte = cobradoEm ? new Date(cobradoEm as any).getTime() : NaN;
  if (!Number.isFinite(corte)) return [];
  return (itensDoDia || []).filter((i) => {
    if (i?.baixado) return false;
    const t = i?._criadoEm ? new Date(i._criadoEm as any).getTime() : NaN;
    return Number.isFinite(t) && t > corte;
  });
}

/**
 * A DIÁRIA VEM DO CADASTRO E DO PESO (construção B5, Cintia: "diária e itens só do cadastro,
 * diária por faixa de peso"). Antes era um número digitado na internação — dois pets do mesmo
 * porte podiam ter diárias diferentes, e o preço do cadastro não valia para nada aqui.
 *
 * As três respostas, no molde do ponto de venda (`lancarDoCadastro`):
 *   · item sem faixa       → o preço do cadastro;
 *   · com faixa e com peso → o preço da faixa;
 *   · com faixa e sem peso → não resolve, e diz o que fazer (registrar o peso).
 */
export type DiariaResolvida =
  | { ok: true; valor: number; custo: number | null; rotuloDaFaixa: string | null }
  | { ok: false; motivo: 'sem_peso' | 'sem_preco'; mensagem: string };

export function resolverDiaria(
  item: { nome?: string | null; preco?: number | null; custo?: number | null; faixas?: any[] | null },
  pesoKg: number | null | undefined,
  petNome?: string | null,
  precoPorPorte?: (i: any, p: number | null | undefined) => { preco: number | null; custo: number | null; faixa: any; aviso: string | null },
): DiariaResolvida {
  const nome = String(item?.nome || 'A diária').trim();
  const temFaixa = Array.isArray(item?.faixas) && item.faixas.length > 0;
  if (temFaixa && !(Number(pesoKg) > 0)) {
    return { ok: false, motivo: 'sem_peso', mensagem: `${nome} é cobrada pelo peso. Registre o peso ${petNome ? `de ${petNome} ` : 'do animal '}para internar.` };
  }
  const r = precoPorPorte
    ? precoPorPorte({ preco: item?.preco ?? null, custo: item?.custo ?? null, faixas: item?.faixas || [] }, pesoKg)
    : { preco: item?.preco ?? null, custo: item?.custo ?? null, faixa: null, aviso: null };
  if (!(Number(r.preco) > 0)) {
    return { ok: false, motivo: 'sem_preco', mensagem: `${nome} está sem preço no cadastro para este porte. Ajuste o cadastro antes de internar.` };
  }
  return { ok: true, valor: Number(r.preco), custo: r.custo != null ? Number(r.custo) : null, rotuloDaFaixa: r.faixa?.rotulo ?? null };
}
