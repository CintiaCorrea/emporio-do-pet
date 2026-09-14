// Fonte ÚNICA das fases de exame — editável em Configurações › Listas (exame_fases).
// Usado por: inbox, ficha do pet, Hoje e atendimento (padrão consistente em todo lugar).
// AS TRES COLUNAS (Cintia, 12/09/2026). "Aguardando" saiu por ser redundante com Retirado, e
// "Entregue" deixou de ser coluna: entregar e o fim da linha, e o fim da linha sai do quadro em
// vez de virar uma pilha que ninguem arrasta. Espelha backend/exames.regras.FASES_PADRAO.
// A ULTIMA nao e coluna: o quadro usa `fases.slice(0, -1)` e ela tira o card de vista.
export const EXAME_FASES_PADRAO = ["Solicitar", "Retirado", "Resultado", "Entregue"];

/** Colunas que sairam, e onde o card gravado nelas deve ser LIDO (nao reescrito no banco).
 *  "Aguardando" era "o laboratorio esta com o material" — isso e Retirado. Espelha o backend. */
export const EXAME_FASES_ANTIGAS: Record<string, string> = {
  aguardando: "Retirado",
  solicitado: "Solicitar",
  retirar: "Retirado",
};

/**
 * As fases que AINDA VALEM: a configurada menos os nomes aposentados. Espelha o backend
 * (exames.regras.fasesVigentes) — se as duas listas discordarem, a tela mostra uma coluna que o
 * servidor nao reconhece, e o card fica num limbo.
 *
 * As colunas moram no BANCO, nao no codigo. Mudar EXAME_FASES_PADRAO nao muda nada para quem ja
 * configurou as suas: foi o que aconteceu em 14/09/2026, quando "Aguardando" continuou na tela
 * depois de eu ter "eliminado" a coluna.
 *
 * SO REMOVE SE O DESTINO JA ESTIVER NA LISTA: "Aguardando" sai porque "Retirado" existe e recebe
 * os cards dela. Sem destino, o nome velho E a coluna, e fica.
 */
export function fasesVigentes(fases: string[]): string[] {
  const lista = (Array.isArray(fases) ? fases : []).map((f) => String(f || "").trim()).filter(Boolean);
  const presentes = new Set(lista.map((f) => f.toLowerCase()));
  return lista.filter((f) => {
    const destino = EXAME_FASES_ANTIGAS[f.toLowerCase()];
    if (!destino) return true;
    return !presentes.has(destino.toLowerCase());
  });
}

/** A fase como ela deve ser lida hoje. Card em coluna que nao existe mais nao pode sumir da
 *  tela: some do quadro e continua cobrado em silencio, que e o pior dos dois mundos. */
export function faseNormalizada(status: string | null | undefined, fases: string[]): string {
  const bruto = String(status || "").trim();
  const lista = Array.isArray(fases) ? fases : [];
  if (lista.some((f) => String(f || "").toLowerCase().trim() === bruto.toLowerCase())) return bruto;
  return EXAME_FASES_ANTIGAS[bruto.toLowerCase()] || bruto;
}

// Status "finais" (exame concluído) — usado pra sumir do "Exames a entregar" do Hoje.
// Inclui vocabulário antigo pra não quebrar dados já existentes.
export const EXAME_FASES_CONCLUIDAS = ["Entregue", "Resultado entregue ao tutor", "Pago ao laboratório"];

/** Exame já concluído (fase final)? Comparação exata, sem caixa. */
export const ehFaseConcluida = (status?: string | null) =>
  EXAME_FASES_CONCLUIDAS.some((f) => f.toLowerCase() === String(status || "").toLowerCase());

/** REGRA ÚNICA de "avisar o laboratório" (centro): tem lab vinculado, ainda não foi avisado e o
 *  exame não está concluído. Usar em TODA tela que mostra o botão/fila (ficha, inbox, Kanban) e
 *  espelhada no backend. Trocou aqui → muda em cadeia. (Antes a regra era "fase contém coleta",
 *  que nunca batia com as fases reais Solicitar/Retirado/… — por isso o botão não aparecia.) */
export function podeAvisarLab(ex: { status?: string | null; fornecedorId?: string | null; labAvisadoAt?: string | null }): boolean {
  return !!ex.fornecedorId && !ex.labAvisadoAt && !ehFaseConcluida(ex.status);
}

// ── ANEXAR O LAUDO PELO QUADRO, E NAO PELA FICHA ──────────────────────────────────────────
//
// Cintia, 12/09/2026, desenhando o ciclo: "Ao anexar o exame pelo kanban ele salva na ficha do
// pet (a principio vamos travar o salvamento do exame na ficha do pet, por 30 dias dessa forma,
// depois revisaremos — para que a equipe aprenda a utilizar o kanban)".
//
// DUAS COISAS PARA QUEM LER ISTO DEPOIS:
//
// 1. ISTO NAO E UMA TRAVA DE SEGURANCA, e nao adianta fingir que e. E um empurrao de habito: o
//    anexo grava pelo endpoint generico de listas, que mil outras telas usam, e por ali nao ha
//    onde conferir esta regra sem arriscar o resto. Quem souber chamar a API continua anexando.
//    Para o que ela existe — fazer a equipe usar o quadro — o botao desligado basta.
//
// 2. ELA VENCE SOZINHA. "Depois revisaremos" nao pode virar uma trava que ninguem lembra de
//    tirar. Em 15/10/2026 os botoes voltam sem ninguem mexer em nada, e ai se decide se volta.
export const TRAVA_ANEXO_NA_FICHA_ATE = "2026-10-14T23:59:59-03:00";

/**
 * Este exame deve ser anexado pelo QUADRO, e nao aqui?
 *
 * So vale para exame QUE ESTA NO QUADRO (escolha dela, 13/09: "travar so quem tem box"): o que
 * ja foi entregue ou arquivado nao tem card para arrastar, e travar a ficha dele seria fechar a
 * unica porta que sobrou.
 */
export function anexoDeveSerPeloQuadro(
  ex: { status?: string | null; arquivadoEm?: string | null; entregueAt?: string | null } | null | undefined,
  agora?: Date | string,
): boolean {
  if (!ex) return false;
  if (ex.arquivadoEm) return false;                       // fora do quadro: sem card, sem trava
  if (ex.entregueAt || ehFaseConcluida(ex.status)) return false;
  const t = agora ? new Date(agora as any).getTime() : Date.now();
  if (!Number.isFinite(t)) return false;                  // data ilegivel nao tranca ninguem
  return t <= new Date(TRAVA_ANEXO_NA_FICHA_ATE).getTime();
}

/** O recado do botao desligado — o mesmo texto em toda tela, para nao virar tres explicacoes. */
export const AVISO_ANEXE_PELO_QUADRO = "Anexe o laudo pelo quadro de exames (ERP › Exames). Até 14/10.";

export async function loadExameFases(): Promise<string[]> {
  try {
    const r = await fetch(`/api/listas?lista=exame_fases`, { cache: "no-store" });
    const d = await r.json();
    // O valor pode estar gravado como JSON (`{"nome":"Solicitar"}`) ou como texto puro — o quadro
    // ja lia das duas formas e o resto das telas nao, o que fazia aparecer o JSON cru no lugar do
    // nome da fase. Uma leitura so, aqui.
    const arr = (Array.isArray(d) ? d : (d.itens || d.data || []))
      .map((i: any) => { try { return JSON.parse(i.valor)?.nome || i.valor; } catch { return i.valor; } })
      .filter(Boolean);
    return arr.length ? fasesVigentes(arr) : EXAME_FASES_PADRAO;
  } catch {
    return EXAME_FASES_PADRAO;
  }
}
