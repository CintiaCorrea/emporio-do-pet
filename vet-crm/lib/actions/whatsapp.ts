"use client";

/**
 * Abre o Inbox Meta filtrado pelo telefone do contato em nova aba.
 * Aceita qualquer formato (com ou sem +/espaço/parenteses) — normaliza pra digitos.
 */
export function openWhatsAppMeta(phone?: string | null, ctx?: { nome?: string; pet?: string }) {
  if (!phone) {
    if (typeof window !== "undefined") alert("Sem telefone cadastrado pra esse contato.");
    return;
  }
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) {
    if (typeof window !== "undefined") alert("Telefone invalido.");
    return;
  }
  if (typeof window !== "undefined") {
    // Leva o nome do cliente e o pet — pra quando NÃO existe conversa ainda, a "Nova
    // conversa" já abrir com o cliente/pet preenchidos (não só o telefone).
    const params = new URLSearchParams({ phone: digits });
    if (ctx?.nome) params.set("nome", ctx.nome);
    if (ctx?.pet) params.set("pet", ctx.pet);
    window.open(`/dashboard/inbox-nativo?${params.toString()}`, "_blank", "noopener");
  }
}
