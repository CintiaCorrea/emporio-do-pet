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

export async function loadExameFases(): Promise<string[]> {
  try {
    const r = await fetch(`/api/listas?lista=exame_fases`, { cache: "no-store" });
    const d = await r.json();
    const arr = (Array.isArray(d) ? d : (d.itens || d.data || []))
      .map((i: any) => i.valor)
      .filter(Boolean);
    return arr.length ? arr : EXAME_FASES_PADRAO;
  } catch {
    return EXAME_FASES_PADRAO;
  }
}
