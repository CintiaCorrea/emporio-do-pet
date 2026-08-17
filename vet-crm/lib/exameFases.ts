// Fonte ÚNICA das fases de exame — editável em Configurações › Listas (exame_fases).
// Usado por: inbox, ficha do pet, Hoje e atendimento (padrão consistente em todo lugar).
export const EXAME_FASES_PADRAO = ["Solicitar", "Retirado", "Aguardando", "Resultado", "Entregue"];

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
