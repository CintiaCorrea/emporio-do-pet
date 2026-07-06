"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · KIT DE COMPONENTES "Base44 delicada"
   Extraído FIEL da ficha do cliente (erp/tutores/[id]) — o gabarito aprovado.
   Objetivo: TODA tela usa estas peças em vez de reinventar cores/cantos/botões,
   para nunca mais desalinhar. Onde há mockup, o mockup manda; onde não há,
   segue a ficha (estas peças).
   Uso:  import { Card, Kpi, Btn, Pill, B44 } from "@/components/ui/base44";
   ───────────────────────────────────────────────────────────── */
import React, { useState } from "react";
import Link from "next/link";

/* ═══════════════════════════ TOKENS ═══════════════════════════
   Fonte da verdade das cores. Trocar aqui = trocar em todo o app. */
export const B44 = {
  // superfícies
  bgPage: "#F6F2EA",      // fundo da página (bege)
  surface: "#FFFFFF",     // cartões
  soft: "#FBF9F4",        // hover/áreas suaves
  tint: "#E0F4F6",        // água (item ativo, avatar cliente)
  // marca
  primary: "#009AAC",     // turquesa (acento, botão primário)
  primaryDark: "#00808f", // hover do turquesa
  navy: "#014D5E",        // marinho (títulos, texto forte)
  coral: "#D85A30",
  gold: "#B8860B",
  // texto
  text1: "#1F2A2E",       // corpo
  text2: "#5C6B70",       // secundário
  text3: "#8A989D",       // dica / rótulo / placeholder
  // linhas
  line: "#E8E2D6",        // borda padrão do cartão
  lineSoft: "#F0EBE0",    // divisória interna
  // raios
  rSm: "9px",   // botões, chips
  rMd: "12px",  // KPI, inputs
  rLg: "13px",  // cartões
  rXl: "16px",  // modal
} as const;

/* Tons semânticos para Pill/Badge (bg + cor do texto na mesma família). */
export const B44_TONES = {
  neutral: { bg: "#F3F1EC", color: "#5C6B70" },
  ok:      { bg: "#E7F6EE", color: "#1c7a47" },
  info:    { bg: "#E0F4F6", color: "#009AAC" },
  navy:    { bg: "#E0F4F6", color: "#014D5E" },
  warn:    { bg: "#FBF3E3", color: "#8a6400" },
  danger:  { bg: "#FDECEC", color: "#b23b39" },
} as const;
export type B44Tone = keyof typeof B44_TONES;

/* ════════════════════════ HELPERS puros ═══════════════════════ */
export const initials = (name?: string | null) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "??";
  return parts.map((p) => p[0]).join("").toUpperCase();
};

export const petEmoji = (species?: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "🐱";
  if (s === "CANINE" || s === "CACHORRO") return "🐶";
  if (s === "BIRD") return "🐦";
  if (s === "RODENT") return "🐹";
  if (s === "REPTILE") return "🦎";
  return "🐾";
};

export const especieLabel = (species?: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "Gato";
  if (s === "CANINE" || s === "CACHORRO") return "Cão";
  if (s === "BIRD") return "Ave";
  if (s === "RODENT") return "Roedor";
  if (s === "REPTILE") return "Réptil";
  if (s === "OTHER") return "Outro";
  return species || "";
};

export const fmtDataBR = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};
export const ouTraco = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");
export const diasTxt = (d?: number | null) =>
  d == null ? "—" : d === 0 ? "hoje" : d < 30 ? `${d}d` : d < 365 ? `${Math.floor(d / 30)}m` : `${Math.floor(d / 365)}a`;

export const humanizar = (s?: string | null) => {
  if (!s) return null;
  const t = s.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

/** Formata dinheiro em BRL; se hidden=true mostra "R$ ••••" (olhinho). */
export const formatMoney = (v?: number | null, hidden = false) =>
  v == null ? "—" : hidden ? "R$ ••••" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Badge de situação do cliente (mesmas cores da ficha). */
export const statusBadge = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return { label: "Em dia", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "SUSPENDED") return { label: "A recuperar", color: "#BA7517", bg: "#FCE5C8" };
  if (s === "CHURNED") return { label: "Ex-cliente", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: "Inativo", color: "#5b6470", bg: "#f0e8d4" };
};

/** Nível do cliente derivado do Score 0-100 (gamificação da ficha). */
export const nivelDoScore = (score?: number) => {
  const s = Math.max(0, Math.min(100, score ?? 0));
  if (s >= 80) return { nome: "Diamante", emoji: "💎", bar: "#7F77DD", bg: "#EDE9FA", fg: "#3C3489", min: 80, max: 100, prox: null as string | null, proxEmoji: "" };
  if (s >= 60) return { nome: "Ouro", emoji: "🥇", bar: "#E0A100", bg: "#FBEFD6", fg: "#8A5A0B", min: 60, max: 80, prox: "Diamante", proxEmoji: "💎" };
  if (s >= 40) return { nome: "Prata", emoji: "🥈", bar: "#9AA5AD", bg: "#EEF1F3", fg: "#49555C", min: 40, max: 60, prox: "Ouro", proxEmoji: "🥇" };
  return { nome: "Bronze", emoji: "🥉", bar: "#B87333", bg: "#F6E7D8", fg: "#7A4A1E", min: 0, max: 40, prox: "Prata", proxEmoji: "🥈" };
};

export const MARCA_INFO: Record<string, { label: string; emoji: string; bar: string }> = {
  EMPORIO: { label: "Empório do Pet", emoji: "🏥", bar: "#009AAC" },
  MUNDO_A_PARTE: { label: "Mundo à Parte", emoji: "🌿", bar: "#639922" },
  DRA_VIVIAN: { label: "Dra. Vivian", emoji: "✨", bar: "#7F77DD" },
};
export const marcaInfo = (m: string) => MARCA_INFO[m] || { label: m, emoji: "🏷️", bar: "#888780" };

/* pequeno utilitário pra juntar classes */
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ═══════════════════════════ LAYOUT ═══════════════════════════ */

/** Fundo bege da página inteira. Envolve o conteúdo da tela. pad = classe de padding (padrão p-4). */
export function PageShell({ children, className = "", pad = "p-4" }: { children: React.ReactNode; className?: string; pad?: string }) {
  return <div className={cx(pad, "min-h-screen", className)} style={{ background: B44.bgPage }}>{children}</div>;
}

/** Trilha de navegação: Clientes / <b>Nome</b> */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <div className="text-[12px] mb-2 px-1" style={{ color: B44.text3 }}>
      {trail.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && " / "}
          {t.href ? (
            <Link href={t.href} className="hover:text-[#009AAC]">{t.label}</Link>
          ) : (
            <b className="font-medium" style={{ color: B44.primary }}>{t.label}</b>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Casca do cartão-cabeçalho da tela (avatar + nome + ações ficam DENTRO). */
export function HeaderCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("bg-white mb-3", className)} style={{ border: `1px solid ${B44.line}`, borderRadius: "14px", padding: "14px 16px" }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════ AVATAR ═══════════════════════════ */
export function Avatar({
  kind = "emoji", name, species, emoji, size = 46,
}: {
  kind?: "client" | "pet" | "emoji";
  name?: string | null; species?: string; emoji?: string; size?: number;
}) {
  const radius = Math.round(size * 0.28);
  const isClient = kind === "client";
  const content = isClient ? initials(name) : kind === "pet" ? petEmoji(species) : (emoji || "🐾");
  return (
    <div
      className="flex items-center justify-center shrink-0 font-medium"
      style={{
        width: size, height: size, borderRadius: radius,
        background: B44.tint,
        color: isClient ? B44.navy : undefined,
        fontSize: isClient ? Math.round(size * 0.34) : Math.round(size * 0.46),
      }}
    >
      {content}
    </div>
  );
}

/* ════════════════════════════ ABAS ════════════════════════════ */
export function Tabs<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { k: T; label: string }[]; active: T; onChange: (k: T) => void;
}) {
  return (
    <div className="flex mb-3" style={{ borderBottom: `1px solid ${B44.line}` }}>
      {tabs.map((t) => {
        const on = active === t.k;
        return (
          <button
            key={t.k}
            onClick={() => onChange(t.k)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition -mb-px"
            style={{ borderColor: on ? B44.primary : "transparent", color: on ? B44.primary : B44.text3 }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ CARTÃO ═══════════════════════════ */
/** Cartão branco padrão. Passe title/emoji para ganhar o cabeçalho com divisória. */
export function Card({
  title, emoji, count, badge, action, children, pad = "13px 14px", className = "",
}: {
  title?: string; emoji?: string; count?: number;
  badge?: { label: string; color: string; bg: string };
  action?: React.ReactNode; children?: React.ReactNode;
  pad?: string; className?: string;
}) {
  const hasHeader = !!(title || action);
  return (
    <div className={cx("bg-white", className)} style={{ border: `1px solid ${B44.line}`, borderRadius: B44.rLg }}>
      {hasHeader && (
        <div className="flex items-center justify-between" style={{ borderBottom: `1px solid ${B44.lineSoft}`, padding: "11px 14px" }}>
          <h3 className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: B44.navy }}>
            {emoji && <span>{emoji}</span>}{title}
            {typeof count === "number" && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#E7F6EE", color: "#1c7a47" }}>{count}</span>}
            {badge && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
          </h3>
          {action}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

/** Cartão-acordeão (abre/fecha), como os blocos da ficha. */
export function Accordion({
  title, emoji, count, badge, action, defaultOpen = true, children,
}: {
  title: string; emoji?: string; count?: number;
  badge?: { label: string; color: string; bg: string };
  action?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white overflow-hidden" style={{ border: `1px solid ${B44.line}`, borderRadius: B44.rLg }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between hover:bg-[#FBF9F4]" style={{ borderBottom: `1px solid ${B44.lineSoft}`, padding: "11px 14px" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: B44.text3 }}>{open ? "▼" : "▶"}</span>
          {emoji && <span>{emoji}</span>}
          <span className="text-[13px] font-medium" style={{ color: B44.navy }}>{title}</span>
          {typeof count === "number" && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#E7F6EE", color: "#1c7a47" }}>{count}</span>}
          {badge && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
        </div>
        {action}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

/* ══════════════════════ TÍTULOS / RÓTULOS ═════════════════════ */
/** Micro-título de seção em MAIÚSCULA (marinho por padrão). */
export function SectionTitle({ children, emoji, tone = "navy", className = "" }: { children: React.ReactNode; emoji?: string; tone?: "navy" | "muted"; className?: string }) {
  return (
    <div className={cx("text-[12px] font-medium uppercase tracking-wide", className)} style={{ color: tone === "navy" ? B44.navy : B44.text3 }}>
      {emoji && <span>{emoji} </span>}{children}
    </div>
  );
}

/** Rótulo pequeno cinza (overline) usado em cima de valores/campos. */
export function Overline({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-wide" style={{ color: B44.text3 }}>{children}</div>;
}

/* ═══════════════════════════ KPIs ═════════════════════════════ */
/** KPI: emoji + rótulo cinza + número grande marinho (cartão branco). */
export function Kpi({ emoji, label, value }: { emoji?: string; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white" style={{ border: `1px solid ${B44.line}`, borderRadius: B44.rMd, padding: "11px 13px" }}>
      <div className="text-[11px]" style={{ color: B44.text3 }}>{emoji && `${emoji} `}{label}</div>
      <div className="text-[19px] font-medium mt-0.5" style={{ color: B44.navy }}>{value}</div>
    </div>
  );
}

/** Grade de KPIs responsiva (quebra sozinha conforme a largura). min = largura mínima de cada KPI. */
export function KpiGrid({ min = 150, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}

/* ════════════════════════ PILL / BADGE ════════════════════════ */
export function Pill({
  children, tone = "neutral", bg, color, className = "",
}: {
  children: React.ReactNode; tone?: B44Tone; bg?: string; color?: string; className?: string;
}) {
  const t = B44_TONES[tone];
  return (
    <span className={cx("text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", className)} style={{ background: bg ?? t.bg, color: color ?? t.color }}>
      {children}
    </span>
  );
}

/* ═══════════════════════════ BOTÃO ════════════════════════════ */
type BtnVariant = "primary" | "ghost" | "soft" | "danger" | "link";
export function Btn({
  variant = "primary", children, className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base = "inline-flex items-center gap-1.5 text-[12.5px] transition disabled:opacity-50";
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: B44.primary, color: "#fff", borderRadius: B44.rSm, padding: "8px 14px" },
    ghost:   { background: "#fff", color: B44.text2, border: `1px solid ${B44.line}`, borderRadius: B44.rSm, padding: "8px 12px" },
    soft:    { background: B44.tint, color: B44.navy, borderRadius: "8px", padding: "6px 10px", fontSize: "11px" },
    danger:  { background: "#fff", color: "#b23b39", border: `1px solid ${B44.line}`, borderRadius: B44.rSm, padding: "8px 12px" },
    link:    { background: "transparent", color: B44.primary, padding: 0 },
  };
  const hover: Record<BtnVariant, string> = {
    primary: "hover:brightness-95", ghost: "hover:border-[#009AAC] hover:text-[#009AAC]",
    soft: "hover:brightness-95", danger: "hover:border-[#b23b39]", link: "hover:underline",
  };
  return (
    <button {...rest} className={cx(base, hover[variant], className)} style={{ ...styles[variant], ...(rest.style || {}) }}>
      {children}
    </button>
  );
}

/* ════════════════════ BARRA DE PROGRESSO ══════════════════════ */
export function ProgressBar({ value, max = 100, color = B44.primary, height = 9 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: B44.lineSoft }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ════════════════════════ ANEL DE SCORE ═══════════════════════ */
export function ScoreRing({ value, max = 100, size = 62, color = B44.primary }: { value: number; max?: number; size?: number; color?: string }) {
  const r = size * 0.42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  const center = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke={B44.lineSoft} strokeWidth="6" />
        <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - pct * c} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-medium" style={{ color: B44.navy, fontSize: Math.round(size * 0.29) }}>{value}</div>
    </div>
  );
}

/* ══════════════════ CAMPO (rótulo + valor) ════════════════════ */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Overline>{label}</Overline>
      <div className="text-[13px]" style={{ color: B44.text1 }}>{children ?? "—"}</div>
    </div>
  );
}

/** Grade de campos (2/3/4 colunas conforme a largura). */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">{children}</div>;
}

/* ═══════════════════════ CONTROLES DE FORM ════════════════════ */
const fieldStyle: React.CSSProperties = { border: `1px solid ${B44.line}`, borderRadius: "6px", color: B44.text1 };

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-wide" style={{ color: B44.text3 }}>{children}</label>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("w-full mt-0.5 px-2 py-1 text-[13px]", props.className)} style={{ ...fieldStyle, ...(props.style || {}) }} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx("w-full mt-0.5 px-2 py-1 text-[13px]", props.className)} style={{ ...fieldStyle, ...(props.style || {}) }} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx("w-full mt-0.5 px-2 py-1 text-[13px]", props.className)} style={{ ...fieldStyle, ...(props.style || {}) }} />;
}

/* ═════════════════════════ LINHA DE LISTA ═════════════════════ */
/** Linha clicável: avatar + título + subtítulo + chevron (pets, resultados…). */
export function ListRow({
  avatar, title, subtitle, right, href, onClick, last = false,
}: {
  avatar?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode;
  href?: string; onClick?: () => void; last?: boolean;
}) {
  const inner = (
    <>
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium truncate" style={{ color: B44.navy }}>{title}</div>
        {subtitle != null && <div className="text-[12px] truncate" style={{ color: B44.text2 }}>{subtitle}</div>}
      </div>
      {right ?? <span className="text-[16px]" style={{ color: B44.text3 }}>›</span>}
    </>
  );
  const cls = "flex items-center gap-3 py-2 hover:bg-[#FBF9F4] rounded-[9px]";
  const style: React.CSSProperties = { borderBottom: last ? "none" : `1px solid ${B44.lineSoft}` };
  if (href) return <Link href={href} className={cls} style={style}>{inner}</Link>;
  return <div className={cls} style={{ ...style, cursor: onClick ? "pointer" : undefined }} onClick={onClick}>{inner}</div>;
}

/* ═════════════════════════ ESTADO VAZIO ═══════════════════════ */
export function EmptyState({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={cx("text-[12px] py-3 text-center", className)} style={{ color: B44.text3 }}>{children}</p>;
}

/* ═══════════════════════════ MODAL ════════════════════════════ */
export function Modal({
  open, onClose, title, subtitle, width = 400, children, footer,
}: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string;
  width?: number; children?: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full p-5" style={{ maxWidth: width, background: B44.soft, border: `1px solid ${B44.line}`, borderRadius: B44.rXl }} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="text-[15px] font-medium mb-1" style={{ color: B44.navy }}>{title}</h3>}
        {subtitle && <p className="text-[12px] mb-3" style={{ color: B44.text3 }}>{subtitle}</p>}
        {children}
        {footer && <div className="flex justify-end gap-2 mt-4">{footer}</div>}
      </div>
    </div>
  );
}
