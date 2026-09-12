// REGRAS PURAS do aviso ao laboratório — isoladas aqui pra serem TESTÁVEIS e blindarem a regressão
// histórica (o envio estava preso em status.includes("coleta"), fase que NÃO existe — nunca disparava).
// Qualquer mudança que quebre essas regras faz o teste (exames.regras.spec.ts) falhar. NÃO acoplar a
// nomes mágicos de fase: a elegibilidade é "tem laboratório + não avisado + fase de solicitação".

// ── AS TRÊS COLUNAS (Cintia, 12/09/2026) ──────────────────────────────────────────────────
//
// Ela descreveu o ciclo inteiro e ele tem três paradas, não cinco:
//
//   Solicitar → o exame foi vendido, o box nasce e o laboratório é avisado (11h30 e 17h).
//   Retirado  → o laboratório veio buscar. Nasce a conta a pagar dele. Agora é só esperar.
//   Resultado → o vet anexa o laudo, o cliente é avisado; quando ele responde, o card sai.
//
// "Aguardando" saiu por ser redundante com Retirado ("vamos eliminar"), e "Entregue" deixou de
// ser coluna: entregar é o fim da linha, e o fim da linha some do quadro em vez de virar uma
// pilha que ninguém arrasta.
// A ULTIMA da lista NAO e coluna: e o fim da linha, e o quadro a usa para tirar o card de vista
// (exames-kanban monta `fases.slice(0, -1)`). Por isso "Entregue" continua aqui sem ser coluna —
// e o mesmo desenho que a Cintia descreveu: "depois que o cliente responder e considerado
// entregue e sai do quadro". Visiveis: Solicitar, Retirado, Resultado.
export const FASES_PADRAO = ['Solicitar', 'Retirado', 'Resultado', 'Entregue'];

/**
 * Nomes de coluna que não existem mais, e para onde o exame que ficou neles deve ser lido.
 *
 * "Aguardando" significava "o laboratório está com o material e o resultado não chegou" — que é
 * exatamente Retirado. Ler assim é honesto; jogar para Resultado diria que o laudo chegou.
 *
 * Isto vive no CÓDIGO e não numa migração de banco de propósito: o card guarda o texto da fase,
 * e reescrever 46 registros para mudar uma palavra é arriscar o histórico deles por nada. Aqui
 * o card antigo é LIDO na coluna certa, sem ser tocado.
 */
export const FASES_ANTIGAS: Record<string, string> = {
  aguardando: 'Retirado',
  solicitado: 'Solicitar',
  retirar: 'Retirado',
};

/** A fase como ela deve ser lida hoje — traduzindo o vocabulário que saiu. */
export function faseNormalizada(status: string | null | undefined, fases: string[]): string {
  const bruto = String(status || '').trim();
  const lista = Array.isArray(fases) ? fases : [];
  if (lista.some((f) => String(f || '').toLowerCase().trim() === bruto.toLowerCase())) return bruto;
  return FASES_ANTIGAS[bruto.toLowerCase()] || bruto;
}

// Fases finais (exame concluído) — espelha o front (lib/exameFases.ts). Inclui vocabulário antigo.
export const FASES_CONCLUIDAS = ['Entregue', 'Resultado entregue ao tutor', 'Pago ao laboratório'];

/**
 * Exame já concluído?
 *
 * A MARCA vale mais que o nome. Até 12/09/2026 isto era só uma lista fixa de três palavras, e
 * bastava um exame parar numa fase fora dela para ser lembrado 3× por dia para sempre — sem
 * ninguém conseguir tirá-lo de lá a não ser renomeando a coluna.
 *
 * Agora, com "Entregue" deixando de ser coluna, quem diz que acabou é `entregueAt`: uma data,
 * gravada quando o cliente confirma. A lista de nomes fica só para os 45 cards que já estavam
 * em "Entregue" antes desta mudança — eles não são reescritos, são lidos.
 */
export const ehFaseConcluida = (
  status?: string | null,
  entregueAt?: string | Date | null,
): boolean => {
  if (entregueAt) return true;
  return FASES_CONCLUIDAS.some((f) => f.toLowerCase() === String(status || '').toLowerCase());
};

/** Fase de "solicitação" (exame recém-vendido, ainda não retirado). Aceita a 1ª fase configurada
 *  (default "Solicitar") e o vocabulário antigo "Solicitado" — posicional, NÃO depende de "coleta". */
export const ehFaseSolicitacao = (status: string | undefined | null, inicial: string): boolean => {
  const s = String(status || '').toLowerCase().trim();
  return s === String(inicial || '').toLowerCase().trim() || s.startsWith('solicit');
};

/** REGRA ÚNICA de elegibilidade do LOTE ao laboratório: tem fornecedor (lab) vinculado, ainda não
 *  foi avisado, e está na fase de solicitação. Espelha o `podeAvisarLab` do front. */
export function exameElegivelLote(
  d: { status?: string | null; fornecedorId?: string | null; labAvisadoAt?: string | null } | null | undefined,
  inicial: string,
): boolean {
  if (!d) return false;
  return !!d.fornecedorId && !d.labAvisadoAt && ehFaseSolicitacao(d.status, inicial);
}

// ── A COLUNA "RETIRAR" É O MARCO ─────────────────────────────────────────────────────────
//
// A Cintia, em 07/09/2026, corrigindo o gatilho que eu tinha usado: "o aviso para recepção e o
// a pagar só aparece depois que forem para a coluna do retirar. O pagamento do laboratório tem
// que ser criado quando for para aba retirar, pois alguns clientes só pagam quando o animal é
// retirado da internação, então ele está na comanda, mas não está pago."
//
// Duas coisas nascem nesse momento: o lembrete da recepção (11h, 15h e 17h) e a conta a pagar do
// laboratório. E é por isso que a conta do laboratório NÃO pode depender de a venda ter sido
// recebida: o serviço do laboratório já foi feito, mesmo que o cliente só pague na alta.

/** Ordem das fases configuradas. A comparação é POSICIONAL — nome de fase muda, ordem não. */
export function indiceDaFase(status: string | null | undefined, fases: string[]): number {
  const s = String(status || '').toLowerCase().trim();
  const lista = (Array.isArray(fases) ? fases : []).map((f) => String(f || '').toLowerCase().trim());
  return lista.indexOf(s);
}

/**
 * O exame já chegou na coluna alvo (ou passou dela)?
 *
 * Posicional de propósito: "Retirado" já foi "Retirar" e pode virar outra palavra amanhã. O que
 * não muda é que ela vem depois da solicitação. Fase desconhecida devolve false — na dúvida, não
 * cria conta a pagar sozinho.
 */
export function atingiuFase(status: string | null | undefined, alvo: string, fases: string[]): boolean {
  const iStatus = indiceDaFase(status, fases);
  const iAlvo = indiceDaFase(alvo, fases);
  if (iStatus < 0 || iAlvo < 0) return false;
  return iStatus >= iAlvo;
}

/** A coluna de retirada, dentro das fases configuradas. Sem ela, nada dispara. */
export function faseDeRetirada(fases: string[]): string | null {
  const achada = (Array.isArray(fases) ? fases : []).find((f) => /retir/i.test(String(f || '')));
  return achada || null;
}

export type ExameParaLembrete = {
  nome?: string | null;
  status?: string | null;
  petNome?: string | null;
  fornecedorNome?: string | null;
  /** Quando o exame entrou no ciclo. */
  date?: string | null;
};

/**
 * Precisa de lembrete? SÓ o que está parado na PRIMEIRA coluna, esperando o laboratório buscar.
 *
 * ATENÇÃO A QUEM LER ISTO DEPOIS: esta regra já foi o contrário, e a inversão é deliberada.
 *
 *   07/09/2026 — a Cintia: "o que interessa lembrar é o exame que está pronto para ser
 *   retirado, não o que acabou de ser vendido". Passou a lembrar de Retirado em diante.
 *
 *   12/09/2026 — a Cintia, depois de descrever o ciclo inteiro: "somente para e se tiver
 *   exames na coluna solicitado. NÃO É PARA REPETIR SE O EXAME ESTIVER EM OUTRA COLUNA. Quando
 *   ele vai para a coluna retirado, já sabemos que é só aguardar o resultado."
 *
 * Não é ela mudando de ideia: "Retirado" parecia significar *o tutor retirar o resultado* e
 * passou a significar, explicitamente, *o laboratório levar o material*. Sob esse nome, a única
 * coluna em que a ação é NOSSA é a primeira — o material está aqui esperando alguém buscar. Em
 * Retirado a bola está com o laboratório; em Resultado, com o cliente.
 *
 * Quem cuida do que fica parado DEPOIS é o aviso de atraso, que é outra coisa: aparece uma vez,
 * quando passa do prazo, e não fica repetindo.
 */
export function precisaLembrarSolicitacao(e: ExameParaLembrete, fases: string[]): boolean {
  if (!e) return false;
  // O MESMO filtro do quadro: exame sem nome não aparece na tela, então não pode ser lembrado.
  // Eram duas definições diferentes de "existe", e é assim que nasce o lembrete fantasma —
  // toca, a pessoa abre o quadro e não acha nada.
  if (!String(e.nome || '').trim()) return false;
  if (ehFaseConcluida(e.status, (e as any).entregueAt)) return false;
  const primeira = (Array.isArray(fases) ? fases : [])[0];
  if (!primeira) return false;
  return faseNormalizada(e.status, fases).toLowerCase().trim() === String(primeira).toLowerCase().trim();
}

/**
 * O texto do lembrete — curto, com o número e os nomes, para a pessoa saber o tamanho do
 * trabalho antes de abrir a tela.
 */
export function textoDoLembrete(exames: ExameParaLembrete[]): { titulo: string; mensagem: string } | null {
  const lista = (Array.isArray(exames) ? exames : []).filter(Boolean);
  if (!lista.length) return null;

  const nomes = lista.slice(0, 4).map((e) => {
    const pet = String(e.petNome || '').trim();
    const nome = String(e.nome || 'Exame').trim();
    return pet ? `${pet} — ${nome}` : nome;
  });
  const resto = lista.length - nomes.length;

  return {
    titulo: lista.length === 1 ? '1 exame esperando o laboratório' : `${lista.length} exames esperando o laboratório`,
    mensagem: `Ainda em Solicitar: ${nomes.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`,
  };
}
