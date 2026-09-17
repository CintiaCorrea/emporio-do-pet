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
