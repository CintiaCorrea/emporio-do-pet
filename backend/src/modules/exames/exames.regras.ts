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

/**
 * As fases que AINDA VALEM: a lista configurada, menos os nomes aposentados.
 *
 * Existe porque as colunas moram no BANCO (lista `exame_fases`) e não aqui. Mudar FASES_PADRAO
 * não muda nada para quem já configurou as suas — foi exatamente o que aconteceu em 14/09/2026:
 * a Cintia pediu "Aguardando: vamos eliminar (redundante)", eu mudei o padrão, publiquei, e a
 * coluna continuou na tela dela. O padrão é só a rede de quem nunca configurou.
 *
 * SÓ REMOVE UM NOME APOSENTADO SE O DESTINO DELE JÁ ESTIVER NA LISTA. "Aguardando" sai porque
 * "Retirado" existe e recebe os cards dela. Mas uma casa que tenha só "Retirar" como coluna de
 * retirada não pode perdê-la — sem destino, o nome velho É a coluna, e fica.
 */
export function fasesVigentes(fases: string[]): string[] {
  const lista = (Array.isArray(fases) ? fases : []).map((f) => String(f || '').trim()).filter(Boolean);
  const presentes = new Set(lista.map((f) => f.toLowerCase()));
  return lista.filter((f) => {
    const destino = FASES_ANTIGAS[f.toLowerCase()];
    if (!destino) return true;
    return !presentes.has(destino.toLowerCase());
  });
}

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

// ── O EXAME TIRADO DO QUADRO ──────────────────────────────────────────────────────────────
//
// Cintia, 13/09/2026, escolhendo entre apagar e arquivar: "Arquivar, reversível". E no dia
// seguinte, fechando o prazo: "Pode ficar arquivado por 45 dias pode ser? Só não pode sumir das
// vendas e orçamentos".
//
// O botão da lixeira no quadro sempre quis dizer "tira isto da minha frente", não "destrói o
// registro" — mas apagava de verdade, sem volta e sem rastro. Quem limpasse o card errado num
// dia corrido perdia o acompanhamento do exame e só descobriria quando o tutor cobrasse.
//
// A segunda metade do pedido dela ("não pode sumir das vendas") já é garantida pelo desenho: o
// card é uma REFERÊNCIA ao item da venda, não o dono dele — e há um teste guardando isso
// (excluir-do-kanban-nao-apaga-a-venda.spec.ts). Arquivar mexe menos ainda no financeiro do que
// apagar mexia.

/** Quantos dias o exame arquivado espera antes de ser apagado de vez. Pedido dela, 14/09/2026. */
export const ARQUIVO_DIAS = 45;

/** Fora do quadro? Card arquivado não entra em fila, lembrete, atraso nem contagem. */
export function ehArquivado(d: { arquivadoEm?: string | null } | null | undefined): boolean {
  return !!d?.arquivadoEm;
}

/**
 * Já passou dos 45 dias e pode ser apagado de vez?
 *
 * Só olha `arquivadoEm`: card que não foi arquivado NUNCA é expurgado, por mais velho que seja.
 * Data ilegível devolve `false` — na dúvida, o expurgo não apaga. Um erro de leitura de data não
 * pode virar exclusão em massa.
 */
export function podeSerExpurgado(
  d: { arquivadoEm?: string | null } | null | undefined,
  agora?: Date | string,
): boolean {
  if (!ehArquivado(d)) return false;
  const t0 = new Date(d!.arquivadoEm as string).getTime();
  const t1 = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;
  return t1 - t0 >= ARQUIVO_DIAS * 24 * 60 * 60 * 1000;
}

/** Dias que ainda faltam para o expurgo — para a tela dizer o prazo em vez de só "arquivado". */
export function diasAteExpurgo(
  d: { arquivadoEm?: string | null } | null | undefined,
  agora?: Date | string,
): number | null {
  if (!ehArquivado(d)) return null;
  const t0 = new Date(d!.arquivadoEm as string).getTime();
  const t1 = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  const passados = Math.floor((t1 - t0) / (24 * 60 * 60 * 1000));
  return Math.max(0, ARQUIVO_DIAS - passados);
}

// ── O CLIENTE, O LAUDO E A ENTREGA ────────────────────────────────────────────────────────
//
// Cintia, 12/09/2026, descrevendo o fim do ciclo: "envia mensagem para o cliente que o exame
// está pronto e depois que o cliente responder é considerado entregue e sai do quadro". E em
// 16/09, confirmando a lógica: "assim que o vet recebe o retorno do cliente o card pode sair da
// lista, pois aí o resultado já está sendo passado".
//
// A ESCOLHA DELA QUE MANDA AQUI (13/09): "só conta se a mensagem saiu". Entrega é o par de uma
// conversa — sem a nossa mensagem ter partido, a resposta do cliente é sobre outra coisa, e
// tratá-la como recebimento do laudo marcaria entregue um exame que ninguém mandou.

/** Dá para avisar o cliente de que o laudo chegou? */
export function podeAvisarCliente(
  d: { resultadoUrl?: string | null; clienteAvisadoAt?: string | null; entregueAt?: string | null; arquivadoEm?: string | null } | null | undefined,
): boolean {
  if (!d) return false;
  if (!String(d.resultadoUrl || '').trim()) return false;   // sem laudo não há o que avisar
  if (d.clienteAvisadoAt) return false;                     // já avisado: não insiste
  if (d.entregueAt || ehArquivado(d)) return false;
  return true;
}

/**
 * Esta resposta do cliente fecha este exame?
 *
 * `quando` é a hora da mensagem recebida. A comparação com `clienteAvisadoAt` não é preciosismo:
 * sem ela, uma conversa que o cliente já tinha puxado ANTES de mandarmos o laudo fecharia o
 * exame no instante em que o aviso saísse — entregue sem ninguém ter lido nada.
 */
export function respostaMarcaEntregue(
  d: { clienteAvisadoAt?: string | null; entregueAt?: string | null; arquivadoEm?: string | null } | null | undefined,
  quando?: Date | string,
): boolean {
  if (!d || !d.clienteAvisadoAt) return false;              // a mensagem não saiu: não conta
  if (d.entregueAt || ehArquivado(d)) return false;
  const tAviso = new Date(d.clienteAvisadoAt).getTime();
  if (!Number.isFinite(tAviso)) return false;
  const tResp = quando ? new Date(quando as any).getTime() : Date.now();
  if (!Number.isFinite(tResp)) return false;
  return tResp >= tAviso;
}

// ── CADA LABORATÓRIO NO SEU HORÁRIO ───────────────────────────────────────────────────────
//
// Cintia, 12/09/2026, no desenho do ciclo: "avisa o laboratório (nos horários já estipulados,
// CONFORME O LABORATÓRIO do exame solicitado)".
//
// Até aqui todos os laboratórios eram avisados às 11h30 e 17h. Mas a hora do aviso é a hora em
// que o motoboy daquele laboratório passa — mandar às 17h para quem coleta às 9h faz o material
// dormir aqui, e o resultado atrasa um dia inteiro sem ninguém ter errado nada.

/** O que vale para o laboratório que ninguém configurou. São os horários de sempre. */
export const HORARIOS_PADRAO_LAB = ['11:30', '17:00'];

/** "HH:MM" no fuso da clínica. O servidor roda em UTC; comparar sem converter erra por 3 horas. */
export function horaDaClinica(agora?: Date | string): string {
  const d = agora ? new Date(agora as any) : new Date();
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

/** Normaliza o que a pessoa digitou: "9:5" vira "09:05"; lixo some. */
export function horariosLimpos(bruto: unknown): string[] {
  const lista = Array.isArray(bruto) ? bruto : String(bruto || '').split(/[,;\s]+/);
  const vistos = new Set<string>();
  for (const x of lista) {
    const m = String(x || '').trim().match(/^(\d{1,2}):?(\d{2})$/);
    if (!m) continue;
    const h = Number(m[1]), min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    vistos.add(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return [...vistos].sort();
}

/** Os horários deste laboratório — os dele, ou o padrão da casa. */
export function horariosDoLab(mapa: Record<string, string[]> | null | undefined, fornecedorId?: string | null): string[] {
  const id = String(fornecedorId || '').trim();
  const meus = id && mapa ? horariosLimpos(mapa[id]) : [];
  return meus.length ? meus : [...HORARIOS_PADRAO_LAB];
}

/**
 * É a hora de avisar este laboratório?
 *
 * A comparação é exata, e a cron bate de meia em meia hora. Um horário digitado fora da grade
 * (09:20, por exemplo) NUNCA dispararia, e o laboratório ficaria sem aviso em silêncio — por
 * isso `horariosLimpos` não é o bastante e a tela precisa oferecer as opções, não um campo livre.
 */
export function ehHoraDeAvisar(horarios: string[], agora?: Date | string): boolean {
  const hhmm = horaDaClinica(agora);
  if (!hhmm) return false;
  return (horarios || []).includes(hhmm);
}

export type ExameParaLembrete = {
  nome?: string | null;
  status?: string | null;
  petNome?: string | null;
  fornecedorNome?: string | null;
  /** Laboratório do exame. Vazio = feito na casa (imagem) — não há coleta a pedir. */
  fornecedorId?: string | null;
  /** Quando o exame entrou no ciclo. */
  date?: string | null;
  /** Preenchido = tirado do quadro (arquivado). */
  arquivadoEm?: string | null;
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
  // EXAME SEM LABORATÓRIO NÃO SE LEMBRA — não há a quem pedir coleta.
  //
  // Cintia, 15/09/2026, liberando a imagem para o quadro: "os exames de imagem podem entrar no
  // kanban, mas não são necessários avisos, pois os profissionais vêm fazer aqui".
  //
  // Raio-x, ultrassom e eco são feitos na casa: o card serve para o laudo e para avisar o
  // cliente, não para cobrar coleta de ninguém. O lembrete diz "esperando o laboratório" — sobre
  // um exame que ninguém vai buscar, ele é só barulho, e alerta que é barulho a equipe aprende
  // a ignorar (inclusive os que importam).
  if (!String((e as any).fornecedorId || '').trim()) return false;
  // Arquivado não é lembrado. A checagem mora AQUI e não em quem chama: `lembrarRecepcao` roda a
  // regra em dois pontos do mesmo método, e uma checagem esquecida num deles faria o lembrete
  // tocar por um exame que não está mais no quadro — o aviso fantasma que já nos custou caro.
  if (ehArquivado(e)) return false;
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

// ── O EXAME QUE O LABORATÓRIO NÃO DEVOLVEU ────────────────────────────────────────────────
//
// A Cintia, 12/09/2026, ao fechar o desenho do ciclo: "o aviso de atraso pode aparecer para os
// veterinários, assim mesmo que o veterinário responsável não esteja os outros podem checar e o
// box pode ficar de outra cor para mostrar que está atrasado".
//
// Ele existe porque o lembrete diário passou a cobrir SÓ a primeira coluna, a pedido dela. Em
// "Retirado" a bola está com o laboratório e não há o que lembrar todo dia — mas se o laudo não
// volta, ninguém percebe. O cliente pagou e espera em silêncio.
//
// Atraso é coisa diferente de lembrete: aparece UMA vez, quando vira atraso, e não insiste.

/** Sem prazo cadastrado no exame, este é o palpite — e ele viaja marcado como palpite. */
export const PRAZO_PADRAO_DIAS = 3;

export type ExameParaAtraso = ExameParaLembrete & {
  entregueAt?: string | null;
  /** Prazo do laboratório, do cadastro do exame (tempoResultadoDias). */
  prazoDias?: number | null;
  /** Mapa fase → { at } gravado a cada movimento no quadro. */
  historico?: Record<string, { at?: string }> | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Quando o laboratório levou o material. É daí que o relógio do prazo começa a contar — e não
 * da venda: exame vendido sexta e coletado segunda não está três dias atrasado na segunda.
 *
 * Sem registro da passagem pela coluna, cai na data do card, que é o melhor que se tem.
 */
export function levouEm(e: ExameParaAtraso, fases: string[]): string | null {
  const retirar = faseDeRetirada(fases);
  const h = e?.historico || {};
  if (retirar) {
    const achado = Object.keys(h).find((k) => k.toLowerCase().trim() === retirar.toLowerCase().trim());
    if (achado && h[achado]?.at) return h[achado].at as string;
  }
  return e?.date || null;
}

export type Atraso = {
  atrasado: boolean;
  /** Dias inteiros passados do prazo. 0 quando não está atrasado. */
  dias: number;
  /** O prazo usado; `estimado` quando o exame não tem prazo cadastrado. */
  prazoDias: number;
  estimado: boolean;
};

/**
 * O exame passou do prazo do laboratório?
 *
 * SÓ vale enquanto o material está COM o laboratório — depois que o laudo chega (Resultado) ou
 * o exame é entregue, não há atraso de laboratório nenhum: a bola passou para o cliente, e essa
 * espera é outro assunto.
 *
 * Exame sem prazo cadastrado usa PRAZO_PADRAO_DIAS e volta com `estimado: true`, para o aviso
 * poder dizer que é palpite. Avisar "atrasado" com uma certeza que não se tem é o caminho mais
 * curto para a equipe aprender a ignorar o aviso.
 */
export function atrasoDoExame(e: ExameParaAtraso, fases: string[], agora?: Date | string): Atraso {
  const prazoCru = Number(e?.prazoDias);
  const estimado = !Number.isFinite(prazoCru) || prazoCru <= 0;
  const prazoDias = estimado ? PRAZO_PADRAO_DIAS : Math.round(prazoCru);
  const nada: Atraso = { atrasado: false, dias: 0, prazoDias, estimado };

  // Arquivado não atrasa: o exame saiu do quadro, e cobrar prazo de quem já foi tirado de vista
  // é o alarme que ninguém consegue desligar.
  if (!e || ehArquivado(e) || ehFaseConcluida(e.status, e.entregueAt)) return nada;

  // Só entre "o laboratório levou" e "o laudo chegou".
  const retirar = faseDeRetirada(fases);
  if (!retirar) return nada;
  const atual = faseNormalizada(e.status, fases);
  const iAtual = indiceDaFase(atual, fases);
  const iRetirar = indiceDaFase(retirar, fases);
  if (iAtual < 0 || iRetirar < 0 || iAtual !== iRetirar) return nada;

  const desde = levouEm(e, fases);
  if (!desde) return nada;
  const t0 = new Date(desde).getTime();
  const t1 = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return nada;

  const dias = Math.floor((t1 - t0) / DIA_MS) - prazoDias;
  return dias > 0 ? { atrasado: true, dias, prazoDias, estimado } : nada;
}
