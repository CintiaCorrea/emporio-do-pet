"use client";

/**
 * Abre o Inbox Meta filtrado pelo telefone do contato em nova aba.
 * Aceita qualquer formato (com ou sem +/espaço/parenteses) — normaliza pra digitos.
 */
export function openWhatsAppMeta(phone?: string | null) {
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
    window.open(`/dashboard/inbox-nativo?phone=${digits}`, "_blank", "noopener");
  }
}
