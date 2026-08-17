// Responsável pelo follow-up — PADRÃO ÚNICO do sistema.
// Guardado numa lista KV `fu_responsavel` (uma entrada por alvo), shape { <alvoId>, userId, nome, at }
// onde <alvoId> = petId | tutorId | leadId conforme o tipo. Quem LÊ: Meu painel/Hoje (badge 👤 +
// filtro "meus follow-ups") e a ficha do pet. Quem ESCREVE: ficha, inbox, atendimento, lead e cliente —
// todas por AQUI, pra "se comunicarem" e manterem o mesmo padrão. Sem mudar o banco (usa o KV genérico).

export type FuKind = "pet" | "tutor" | "lead";
export type FuResp = { userId: string; nome: string; entryId?: string } | null;

const campoId = (k: FuKind) => (k === "pet" ? "petId" : k === "tutor" ? "tutorId" : "leadId");
const rotulo = (k: FuKind) => (k === "pet" ? "pet" : k === "tutor" ? "cliente" : "lead");

/** Lê o responsável atual do follow-up de um alvo (pet/tutor/lead) — ou null. */
export async function loadFuRespFor(kind: FuKind, id: string): Promise<FuResp> {
  if (!id) return null;
  const kf = campoId(kind);
  try {
    const r = await fetch(`/api/listas?lista=fu_responsavel`, { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
    const mine = arr
      .map((it: any) => { try { return { entryId: it.id, ...JSON.parse(it.valor) }; } catch { return null; } })
      .filter((x: any) => x && x[kf] === id);
    return mine.length ? { userId: mine[0].userId, nome: mine[0].nome, entryId: mine[0].entryId } : null;
  } catch { return null; }
}

/** Upsert do responsável (uma entrada por alvo). userId vazio = não faz nada. */
export async function upsertFuRespFor(kind: FuKind, id: string, userId: string, nome: string): Promise<void> {
  if (!id || !userId) return;
  const existing = await loadFuRespFor(kind, id);
  const valor = JSON.stringify({ [campoId(kind)]: id, userId, nome, at: new Date().toISOString() });
  try {
    if (existing?.entryId) {
      await fetch(`/api/listas/${existing.entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor }) });
    } else {
      await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "fu_responsavel", valor }) });
    }
  } catch { /* best-effort */ }
}

/** Atribui quem ACOMPANHA o follow-up — o PADRÃO (igual em todo lugar):
 *  (1) AVISA a pessoa (recado interno = "se comunique"), (2) deixa rastro na interação (ENCAMINHAMENTO),
 *  (3) grava a KV (rota o follow-up pro Meu painel dela). alvoNome/fuLabel enriquecem o aviso. */
export async function assignFollowUpFor(opts: { kind: FuKind; id: string; userId: string; nome: string; alvoNome?: string; fuLabel?: string }): Promise<void> {
  const { kind, id, userId, nome, alvoNome, fuLabel } = opts;
  if (!id || !userId) return;
  try { await fetch(`/api/internal-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: userId, content: `Você é responsável pelo follow-up do ${rotulo(kind)} "${alvoNome || ""}"${fuLabel ? ` em ${fuLabel}` : ""}.` }) }); } catch { /* best-effort */ }
  try { await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campoId(kind)]: id, tipo: "ENCAMINHAMENTO", texto: `Follow-up encaminhado para ${nome}`, canal: "Sistema" }) }); } catch { /* best-effort */ }
  await upsertFuRespFor(kind, id, userId, nome);
}

// —— Atalhos de PET (compatibilidade com quem já usa) ——
export const loadFuResp = (petId: string) => loadFuRespFor("pet", petId);
export const upsertFuResp = (petId: string, userId: string, nome: string) => upsertFuRespFor("pet", petId, userId, nome);
export const assignFollowUp = (opts: { petId: string; userId: string; nome: string; petNome?: string; fuLabel?: string }) =>
  assignFollowUpFor({ kind: "pet", id: opts.petId, userId: opts.userId, nome: opts.nome, alvoNome: opts.petNome, fuLabel: opts.fuLabel });
