// Fonte ÚNICA das fases de exame — editável em Configurações › Listas (exame_fases).
// Usado por: inbox, ficha do pet, Hoje e atendimento (padrão consistente em todo lugar).
export const EXAME_FASES_PADRAO = ["Solicitar", "Retirado", "Aguardando", "Resultado", "Entregue"];

// Status "finais" (exame concluído) — usado pra sumir do "Exames a entregar" do Hoje.
// Inclui vocabulário antigo pra não quebrar dados já existentes.
export const EXAME_FASES_CONCLUIDAS = ["Entregue", "Resultado entregue ao tutor", "Pago ao laboratório"];

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
