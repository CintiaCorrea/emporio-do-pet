import React from "react";
// 🏷️ Pílula de status com COR SEMÂNTICA consistente — fonte única (SimplesVet: aprender pela cor).
// Verde = concluído/pago · Vermelho = pendente/atrasado · Azul = em curso/agendado · Âmbar = espera ·
// Roxo = remarcado · Cinza = cancelado/neutro. Aceita status de pagamento e de atendimento.

type Tone = { bg: string; fg: string; label?: string };
const NEUTRO: Tone = { bg: "#F0EBE0", fg: "#5C6B70" };

const MAP: Record<string, Tone> = {
  // pagamento
  PAGO: { bg: "#E7F6EE", fg: "#1c7a47", label: "Pago" },
  PAID: { bg: "#E7F6EE", fg: "#1c7a47", label: "Pago" },
  "NÃO PAGO": { bg: "#FBE9E6", fg: "#B23B3B", label: "Não pago" },
  "NAO PAGO": { bg: "#FBE9E6", fg: "#B23B3B", label: "Não pago" },
  PENDING: { bg: "#FBE9E6", fg: "#B23B3B", label: "Não pago" },
  PENDENTE: { bg: "#FBE9E6", fg: "#B23B3B", label: "Não pago" },
  "A RECEBER": { bg: "#FBF1DA", fg: "#9A6C1F", label: "A receber" },
  PARCIAL: { bg: "#FBF1DA", fg: "#9A6C1F", label: "Parcial" },
  // atendimento
  AGENDADO: { bg: "#E6F1FB", fg: "#0C447C" },
  SCHEDULED: { bg: "#E6F1FB", fg: "#0C447C", label: "Agendado" },
  CONFIRMADO: { bg: "#E2F4F6", fg: "#0b7f8b" },
  "EM ESPERA": { bg: "#FBF1DA", fg: "#9A6C1F" },
  AGUARDANDO: { bg: "#FBF1DA", fg: "#9A6C1F" },
  "EM ATENDIMENTO": { bg: "#E6F1FB", fg: "#0C447C" },
  ATENDIDO: { bg: "#E7F6EE", fg: "#1c7a47" },
  REALIZADO: { bg: "#E7F6EE", fg: "#1c7a47" },
  COMPLETED: { bg: "#E7F6EE", fg: "#1c7a47", label: "Concluído" },
  "ANIMAL PRONTO": { bg: "#E7F6EE", fg: "#1c7a47" },
  DISCHARGED: { bg: "#E7F6EE", fg: "#1c7a47", label: "Alta" },
  ATRASADO: { bg: "#FBE9E6", fg: "#B23B3B" },
  REMARCADO: { bg: "#EDE9FE", fg: "#6D28D9" },
  CANCELADO: { bg: "#F0EBE0", fg: "#8A7B63" },
  CANCELLED: { bg: "#F0EBE0", fg: "#8A7B63", label: "Cancelado" },
};

export function toneDoStatus(status?: string): Tone {
  return MAP[String(status || "").trim().toUpperCase()] || NEUTRO;
}

export function StatusPill({ status, className, style }: { status?: string; className?: string; style?: React.CSSProperties }) {
  const t = toneDoStatus(status);
  return (
    <span
      className={className}
      style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: "nowrap", ...style }}
    >
      {t.label || status || "—"}
    </span>
  );
}
