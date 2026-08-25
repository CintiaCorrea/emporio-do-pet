"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { assignFollowUpFor } from "@/lib/followup";
import { agendaDoDia as agendaDoDiaLib } from "@/lib/agenda";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuRefreshCcw, LuPhone, LuPackage,
  LuFlaskConical, LuPill, LuCake, LuChevronRight, LuClipboardCheck, LuShare2, LuFileText,
} from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import ExamesResumoCard from "@/components/exames/ExamesResumoCard";
import { roleShort } from "@/lib/ui/role";
import { PageShell, ProgressBar, B44 } from "@/components/ui/base44";
import { loadExameFases, EXAME_FASES_PADRAO, EXAME_FASES_CONCLUIDAS } from "@/lib/exameFases";

interface HojeData {
  retornosVencidos: { id: string }[];
  toques: { id: string }[];
  tutoresAcompanhar: number;
  examesAEntregar: number;
  pacotesEmRisco: number;
  aniversariantes?: number;
}

interface Pendencia {
  key: string;
  title: string;
  sub: string;
  count: number;
  link: string;
  href: string;
  Icon: any;
  emoji: string;
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

function fmtDate(d: Date) {
  const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const dd = d.getDate();
  const mes = d.toLocaleDateString("pt-BR", { month: "long" });
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${dd} de ${mes}`;
}

/* ── Metas (Fatia 2): rótulo e formatação por tipo/medida ── */
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
const metaLabel = (m: any) => {
  const t = String(m.tipo || "");
  if (!m.profissionalId) return t === "FATURAMENTO_GERAL" ? "🏥 Meta da clínica" : "🏥 Meta geral";
  if (t === "SERVICO_ESPECIFICO") return "🎯 Meta de serviço";
  if (t === "CONVERSOES") return "🎯 Conversão de leads";
  if (t === "ATENDIMENTOS") return "🩺 Atendimentos";
  if (t === "NPS") return "⭐ NPS";
  return m.medida === "QUANTIDADE" ? "📦 Vendas (quantidade)" : "💰 Faturamento";
};
const metaFmt = (m: any, n: number) => (m.medida === "QUANTIDADE" || m.tipo === "ATENDIMENTOS") ? `${Math.round(n)}` : brl(n);

/* CSS do "Meu painel" (fiel ao mockup cb6015f4) — compartilhado pelos 3 perfis, escopo .mpv */
const MPV_CSS = `
  .mpv .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
  .mpv .kpis.k3{grid-template-columns:repeat(3,1fr)}
  .mpv .kpis.k6{grid-template-columns:repeat(3,1fr)}
  @media(max-width:640px){.mpv .kpis,.mpv .kpis.k3,.mpv .kpis.k6{grid-template-columns:repeat(2,1fr)}}
  .mpv .kpi{background:#fff;border:1px solid #E8E2D6;border-radius:12px;padding:12px 13px}
  .mpv .kpi .l{font-size:10.5px;color:#8A938F;display:flex;gap:5px;align-items:center}
  .mpv .kpi .n{font-size:22px;font-weight:700;color:#014D5E;margin-top:5px;font-variant-numeric:tabular-nums}
  .mpv .kpi .d{font-size:10.5px;color:#0F6E56;margin-top:1px}
  .mpv .card{background:#fff;border:1px solid #E8E2D6;border-radius:16px;overflow:hidden;margin-bottom:12px}
  .mpv .card-h{display:flex;align-items:center;gap:8px;padding:11px 15px;border-bottom:1px solid #F0EBE0}
  .mpv .card-h .ttl{font-size:13px;font-weight:600;color:#014D5E}
  .mpv .card-h .r{margin-left:auto;font-size:11.5px;color:#8A938F}
  .mpv .att{display:flex;align-items:center;gap:11px;padding:10px 15px;border-bottom:1px solid #F0EBE0}
  .mpv .att:last-child{border-bottom:none}
  .mpv .att .ic{width:33px;height:33px;border-radius:9px;background:#FBF9F4;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid #F0EBE0}
  .mpv .att .tx{flex:1;min-width:0}.mpv .att .tx b{font-size:13px;color:#014D5E;font-weight:600;display:block}.mpv .att .tx small{display:block;font-size:11.5px;color:#5C6B70}
  .mpv .att .cnt{font-size:12px;font-weight:700;color:#D85A30;background:#FBF3E3;border-radius:999px;padding:2px 10px}
  .mpv .att .go{font-size:11.5px;font-weight:600;color:#fff;background:#009AAC;border:none;border-radius:8px;padding:6px 11px;cursor:pointer;flex-shrink:0;text-decoration:none;display:inline-block}
  .mpv .att .go.ghost{background:#fff;border:1px solid #E8E2D6;color:#009AAC}
  .mpv .lote{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#fff;background:#6A4FB0;border:none;border-radius:999px;padding:6px 12px;cursor:pointer;margin:0 15px 12px}
  .mpv .hero{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #E8E2D6;border-radius:16px;padding:16px;margin-bottom:14px}
  .mpv .ring{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}
  .mpv .ring::before{content:"";position:absolute;inset:9px;background:#fff;border-radius:50%}
  .mpv .ring .in{position:relative;text-align:center}.mpv .ring .in b{font-size:19px;font-weight:700;color:#014D5E;display:block;line-height:1}.mpv .ring .in small{font-size:9px;color:#8A938F}
  .mpv .nivel{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:4px 12px;border-radius:999px}
  .mpv .streak{color:#D85A30;font-weight:700;font-size:12px;margin-left:8px}
  .mpv .selos{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
  .mpv .selo{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;background:#FBF9F4;border:1px solid #E8E2D6;border-radius:999px;padding:4px 10px;color:#5C6B70}
  .mpv .selo.lock{opacity:.45}
  .mpv .metabar{height:10px;background:#F0EBE0;border-radius:999px;overflow:hidden}.mpv .metabar i{display:block;height:100%;border-radius:999px;background:#009AAC}
  .mpv .miss{font-size:12px;color:#5C6B70}.mpv .miss b{color:#014D5E}
  .mpv .sec{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#8A938F;font-weight:700;margin:20px 2px 8px}
  .mpv .atalhos{display:flex;gap:8px;flex-wrap:wrap;padding:13px 15px}
  .mpv .atalhos a{font-size:12px;font-weight:600;color:#014D5E;background:#FBF9F4;border:1px solid #E8E2D6;border-radius:9px;padding:7px 12px;text-decoration:none}
  .mpv .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:720px){.mpv .grid2{grid-template-columns:1fr}}
  .mpv .sow{display:flex;flex-direction:column;gap:9px;padding:13px 15px}.mpv .sow .row{display:flex;align-items:center;gap:10px;font-size:12.5px}.mpv .sow .nm{width:150px;color:#1F2A2E}.mpv .sow .bar{flex:1;height:9px;border-radius:999px;background:#F0EBE0;overflow:hidden}.mpv .sow .bar i{display:block;height:100%}.mpv .sow .pc{width:64px;text-align:right;color:#5C6B70;font-variant-numeric:tabular-nums}
  .mpv .funil{padding:13px 15px}.mpv .funil .fr{display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:12.5px}.mpv .funil .fr .fn{width:130px;color:#1F2A2E}.mpv .funil .fr .fb{flex:1;height:8px;border-radius:999px;background:#F0EBE0;overflow:hidden}.mpv .funil .fr .fb i{display:block;height:100%;background:#009AAC}.mpv .funil .fr .fv{width:34px;text-align:right;color:#5C6B70}
  .mpv table{width:100%;border-collapse:collapse}
  .mpv th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#8A938F;font-weight:600;text-align:left;padding:8px 12px;border-bottom:1px solid #E8E2D6}
  .mpv th.r,.mpv td.r{text-align:right}
  .mpv td{padding:9px 12px;border-bottom:1px solid #F0EBE0;font-size:13px;color:#1F2A2E}
  .mpv tr:last-child td{border-bottom:none}
  .mpv tr.total td{border-top:1px solid #E8E2D6;background:#FBF9F4;font-weight:700;color:#014D5E}
  .mpv .pill{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px}
`;

/* ── Peças de apresentação do Hoje (usam os tokens do kit B44) ────────
   Cores por tipo de entidade — as mesmas já aprovadas nesta tela. */
const TIPO_CHIP: Record<string, { bg: string; color: string }> = {
  Cliente: { bg: B44.tint, color: "#00798A" },
  Pet: { bg: "#E1F5EE", color: "#0F6E56" },
  Lead: { bg: "#E6F1FB", color: "#0C447C" },
};
const TipoChip = ({ tipo }: { tipo: string }) => {
  const c = TIPO_CHIP[tipo] || TIPO_CHIP.Cliente;
  return <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: c.bg, color: c.color }}>{tipo}</span>;
};
/* Bolha de contagem (número branco). */
const CountBadge = ({ n, color }: { n: number; color?: string }) => (
  <span className="text-[13px] font-medium text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: color || (n > 0 ? B44.primary : "#D3D1C7") }}>{n}</span>
);
/* Casca de um cartão-seção (Boletins, Entradas, Encaminhados). */
const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: B44.line }}>{children}</div>
);
/* Cabeçalho de um cartão-seção. */
const SectionHeader = ({ emoji, tileBg, title, sub, count, countColor }: { emoji: string; tileBg: string; title: string; sub: string; count: number; countColor?: string }) => (
  <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: B44.lineSoft }}>
    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: tileBg }}><span style={{ fontSize: "19px" }}>{emoji}</span></div>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium" style={{ color: B44.text1 }}>{title}</div>
      <div className="text-xs" style={{ color: B44.text2 }}>{sub}</div>
    </div>
    <CountBadge n={count} color={countColor} />
  </div>
);

/* 🧾 Aba Comissionamento (Fatia 4) — resumo compacto por pessoa (reusa /api/commissions/minhas) */
function ComissaoAba({ isAdmin }: { isAdmin: boolean }) {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let a = true;
    (async () => {
      const r = await safeJson<any>(await fetch("/api/commissions/minhas", { cache: "no-store" }), null);
      if (a) { setD(r); setLoading(false); }
    })();
    return () => { a = false; };
  }, []);

  const resumo = d?.resumo || { itens: 0, base: 0, comissao: 0, pctMedio: 0 };
  const grupos: any[] = d?.porGrupo || [];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: B44.line }}>
        <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: B44.lineSoft }}>
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: B44.tint }}><span style={{ fontSize: 19 }}>🧾</span></div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium" style={{ color: B44.text1 }}>Suas comissões em aberto</div>
            <div className="text-xs" style={{ color: B44.text2 }}>{resumo.itens} item(ns) · base {brl(resumo.base)}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: B44.navy }}>{brl(resumo.comissao)}</div>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: B44.text3 }}>Carregando suas comissões…</div>
        ) : grupos.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: B44.text3 }}>Sem comissões em aberto no período. 🎉</div>
        ) : (
          <div className="px-[6px] py-1 overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead><tr style={{ color: B44.text3 }} className="text-[10.5px] uppercase tracking-wide text-left">
                <th className="px-3 py-2">Grupo</th><th className="px-3 py-2 text-right">Base</th><th className="px-3 py-2 text-right">%</th><th className="px-3 py-2 text-right">Comissão</th>
              </tr></thead>
              <tbody>
                {grupos.map((g, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${B44.lineSoft}` }} className="text-[13px]">
                    <td className="px-3 py-2" style={{ color: B44.text1 }}>{g.grupo || "—"}</td>
                    <td className="px-3 py-2 text-right" style={{ color: B44.text2, fontVariantNumeric: "tabular-nums" }}>{brl(g.base)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: B44.text2 }}>{Math.round(g.pctMedio || 0)}%</td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: B44.navy, fontVariantNumeric: "tabular-nums" }}>{brl(g.comissao)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `1px solid ${B44.line}`, background: B44.soft }} className="text-[13px] font-bold">
                  <td className="px-3 py-2" style={{ color: B44.navy }}>Total</td>
                  <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{brl(resumo.base)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{Math.round(resumo.pctMedio || 0)}%</td>
                  <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{brl(resumo.comissao)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/dashboard/erp/comissoes/extratos" className="text-[12.5px] font-medium px-3 py-2 rounded-lg border" style={{ borderColor: B44.line, color: B44.navy }}>📁 Meus extratos</Link>
        {isAdmin && <Link href="/dashboard/erp/comissoes" className="text-[12.5px] font-medium px-3 py-2 rounded-lg text-white" style={{ background: B44.primary }}>📂 Comissões de todos · fechar período</Link>}
      </div>
      <p className="text-[11.5px]" style={{ color: B44.text3 }}>💡 Bater as metas gera <b style={{ color: B44.text2 }}>bônus</b> na comissão (regra definida pelo Admin) — chega numa próxima fatia.</p>
    </div>
  );
}

/* 👥 Metas do time (Fatia 5, admin) — pessoa · vendas · meta · % · comissão (metas + /commissions/aberto) */
function MetasTimeCard({ metas }: { metas: any[] }) {
  const [aberto, setAberto] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    let a = true;
    (async () => {
      const [ab, us] = await Promise.all([
        safeJson<any>(await fetch("/api/commissions/aberto", { cache: "no-store" }), null),
        safeJson<any>(await fetch("/api/users", { cache: "no-store" }), []),
      ]);
      if (a) { setAberto(ab); setUsers(Array.isArray(us) ? us : (us.users || us.data || [])); }
    })();
    return () => { a = false; };
  }, []);

  const ini = (nome: string) => (nome || "—").trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const rows = useMemo(() => {
    const nomeDe = (id: string) => users.find((u: any) => u.id === id)?.name || "";
    const map = new Map<string, { nome: string; ini: string; meta: number; real: number; comissao: number }>();
    for (const m of metas) {
      if (!m.profissionalId) continue;
      const cur = map.get(m.profissionalId) || { nome: nomeDe(m.profissionalId), ini: "", meta: 0, real: 0, comissao: 0 };
      cur.meta += Number(m.valorMeta || 0); cur.real += Number(m.valorRealizado || 0);
      map.set(m.profissionalId, cur);
    }
    for (const r of (aberto?.resumo || [])) {
      const cur = map.get(r.userId) || { nome: r.nome, ini: r.iniciais, meta: 0, real: 0, comissao: 0 };
      cur.comissao = Number(r.comissao || 0);
      if (!cur.nome) cur.nome = r.nome; if (!cur.ini) cur.ini = r.iniciais;
      map.set(r.userId, cur);
    }
    return [...map.values()].map((v) => ({ ...v, ini: v.ini || ini(v.nome) })).sort((a, b) => b.real - a.real);
  }, [metas, aberto, users]);

  if (rows.length === 0) return null;
  const tot = rows.reduce((a, r) => ({ meta: a.meta + r.meta, real: a.real + r.real, comissao: a.comissao + r.comissao }), { meta: 0, real: 0, comissao: 0 });

  return (
    <SectionCard>
      <SectionHeader emoji="👥" tileBg={B44.tint} title="👥 Metas do time" sub="sem ranking — acompanhamento por pessoa" count={rows.length} />
      <div className="px-[6px] py-1 overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ color: B44.text3 }} className="text-[10.5px] uppercase tracking-wide text-left">
            <th className="px-3 py-2">Funcionário</th><th className="px-3 py-2 text-right">Vendas</th><th className="px-3 py-2 text-right">Meta</th><th className="px-3 py-2 text-right">%</th><th className="px-3 py-2 text-right">Comissão</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = r.meta > 0 ? Math.min(999, Math.round((r.real / r.meta) * 100)) : null;
              const pcor = pct == null ? B44.text3 : pct >= 100 ? "#0F6E56" : pct >= 70 ? "#8A6400" : "#B45309";
              const pbg = pct == null ? B44.soft : pct >= 100 ? "#E7F6EE" : pct >= 70 ? "#FBF3E3" : "#FBEDE3";
              return (
                <tr key={i} style={{ borderTop: `1px solid ${B44.lineSoft}` }} className="text-[13px]">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold flex-shrink-0" style={{ background: B44.tint, color: B44.navy }}>{r.ini}</span>
                      <span style={{ color: B44.text1 }}>{r.nome}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: B44.text1, fontVariantNumeric: "tabular-nums" }}>{brl(r.real)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: B44.text2, fontVariantNumeric: "tabular-nums" }}>{r.meta > 0 ? brl(r.meta) : "—"}</td>
                  <td className="px-3 py-2 text-right">{pct == null ? <span style={{ color: B44.text3 }}>—</span> : <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: pbg, color: pcor }}>{pct}%</span>}</td>
                  <td className="px-3 py-2 text-right font-medium" style={{ color: B44.navy, fontVariantNumeric: "tabular-nums" }}>{brl(r.comissao)}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: `1px solid ${B44.line}`, background: B44.soft }} className="text-[13px] font-bold">
              <td className="px-3 py-2" style={{ color: B44.navy }}>Total</td>
              <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{brl(tot.real)}</td>
              <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{tot.meta > 0 ? brl(tot.meta) : "—"}</td>
              <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{tot.meta > 0 ? `${Math.round((tot.real / tot.meta) * 100)}%` : "—"}</td>
              <td className="px-3 py-2 text-right" style={{ color: B44.navy }}>{brl(tot.comissao)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 flex-wrap px-[15px] py-3 border-t" style={{ borderColor: B44.lineSoft }}>
        <Link href="/dashboard/configuracoes/metas" className="text-[12px] font-medium px-3 py-1.5 rounded-lg text-white" style={{ background: B44.primary }}>⚙️ Configurar metas</Link>
        <Link href="/dashboard/erp/vendas-graficos" className="text-[12px] font-medium px-3 py-1.5 rounded-lg border" style={{ borderColor: B44.line, color: B44.navy }}>📊 Marcas · funil · faturamento</Link>
      </div>
    </SectionCard>
  );
}

export default function HojePage() {
  const { data: session } = useSession();
  const { effectiveRole, isPreviewing } = useRolePreview();
  const meId = (session as any)?.user?.id as string | undefined;
  const userName = session?.user?.name || "Usuário";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const hora = today.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const partes = userName.trim().split(/\s+/);
  const primeiroNome = partes[0]
    ? partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase()
    : "Usuário";
  const escopo = effectiveRole === "ADMIN" ? "Visão geral da clínica" : "Seu dia";
  usePageTitle(`${saudacao}, ${primeiroNome}`, `${escopo} · ${fmtDate(today)}`);

  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [examesPend, setExamesPend] = useState<any[]>([]);
  const [examFases, setExamFases] = useState<string[]>(EXAME_FASES_PADRAO);
  const [dosesPend, setDosesPend] = useState<any[]>([]);
  const [examesOpen, setExamesOpen] = useState(false);
  const [saudeOpen, setSaudeOpen] = useState(false); // Saúde das automações começa recolhida (Fig 1)
  const [boletinsPend, setBoletinsPend] = useState<any[]>([]);
  const [fuDue, setFuDue] = useState<any[]>([]);
  const [fuDueOpen, setFuDueOpen] = useState(false);
  const [fuFilter, setFuFilter] = useState<"meus" | "revisar" | "todos">("meus"); // Meus (dono=eu) · A revisar (sem dono) · Todos
  const [fuResolving, setFuResolving] = useState<any>(null); // FU sendo resolvido (abre modal de observação)
  const [fuObs, setFuObs] = useState("");
  const [fuSaving, setFuSaving] = useState(false);
  const [vets, setVets] = useState<any[]>([]); // equipe (p/ encaminhar follow-up)
  const [encaminhando, setEncaminhando] = useState<any | null>(null); // FU sendo encaminhado → abre o seletor de pessoa
  const [toques, setToques] = useState<any[]>([]);
  const [toquesOpen, setToquesOpen] = useState(false);
  const [aniv, setAniv] = useState<any[]>([]);
  const [anivOpen, setAnivOpen] = useState(false);
  const [pacRisco, setPacRisco] = useState<any[]>([]);
  const [pacOpen, setPacOpen] = useState(false);
  const [entradas, setEntradas] = useState<any[]>([]);
  // Gaps do plano: orçamentos abertos (tarefa) + funil de leads inline (Recepção) + agendamentos de hoje (KPI).
  const [orcAbertos, setOrcAbertos] = useState(0);
  const [agendHoje, setAgendHoje] = useState(0);
  const [funil, setFunil] = useState<{ novos: number; qualif: number; convertido: number; perdido: number; total: number; convPct: number } | null>(null);
  const [entConf, setEntConf] = useState<Record<string, string>>({});
  const [entConfOpen, setEntConfOpen] = useState(false);
  const [encMine, setEncMine] = useState<any[]>([]);
  const [aba, setAba] = useState<"painel" | "comissao" | "metas">("painel"); // Meu painel (Fatia 1)
  const [metas, setMetas] = useState<any[]>([]); // Minhas metas (Fatia 2)
  const [streak, setStreak] = useState(0); // 🔥 dias seguidos com atividade (Recepção painel)
  const [prodLista, setProdLista] = useState<any[]>([]); // atendimentos do usuário (Vet: "hoje")
  const [resumoVendas, setResumoVendas] = useState<any>(null); // Admin: faturamento/marcas/ticket
  const [saudeAuto, setSaudeAuto] = useState<any>(null); // Admin: saúde das automações (crons)

  useEffect(() => {
    if (!meId) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/listas?lista=encfila`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        const mine = arr
          .map((it: any) => { try { return { entryId: it.id, ...JSON.parse(it.valor) }; } catch { return null; } })
          .filter((x: any) => x && x.toUserId === meId && x.status === "PENDENTE")
          .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
        if (alive) setEncMine(mine);
      } catch {}
    };
    load();
    const onCh = () => load();
    window.addEventListener("encfila:changed", onCh);
    const tid = setInterval(load, 30000);
    return () => { alive = false; window.removeEventListener("encfila:changed", onCh); clearInterval(tid); };
  }, [meId]);

  // Minhas metas (Fatia 2): reusa GET /api/metas (traz valorRealizado calculado)
  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await safeJson<any>(await fetch("/api/metas", { cache: "no-store" }), []);
      const arr = Array.isArray(d) ? d : (d.metas || d.data || []);
      if (alive) setMetas(arr);
    })();
    return () => { alive = false; };
  }, []);

  const minhasMetas = useMemo(() => {
    const mine = metas.filter((m: any) => m.profissionalId === meId && (m.status ?? "EM_ANDAMENTO") !== "CANCELADA");
    const gerais = effectiveRole === "ADMIN" ? metas.filter((m: any) => !m.profissionalId) : [];
    return [...mine, ...gerais];
  }, [metas, meId, effectiveRole]);

  // 🔥 Streak real: dias seguidos com atividade (atendimentos do usuário). Best-effort; 0 = não mostra.
  useEffect(() => {
    let alive = true;
    (async () => {
      const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 40);
      const qs = `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
      const d = await safeJson<any>(await fetch(`/api/caixa/produtividade?${qs}`, { cache: "no-store" }), null);
      const lista = d?.lista || d?.appointments || [];
      const dias = new Set<string>(lista.map((a: any) => new Date(a.date).toDateString()));
      let s = 0; const day = new Date();
      for (let i = 0; i < 40; i++) {
        const k = day.toDateString();
        if (dias.has(k)) s++;
        else if (i > 0) break; // hoje pode não ter atividade ainda; começa a contar de ontem
        day.setDate(day.getDate() - 1);
      }
      if (alive) { setStreak(s); setProdLista(lista); }
    })();
    return () => { alive = false; };
  }, [meId]);

  // Admin: saúde das automações (crons) — atualiza a cada minuto
  useEffect(() => {
    if (effectiveRole !== "ADMIN") return;
    let a = true;
    const load = async () => { const d = await safeJson<any>(await fetch("/api/health/automations", { cache: "no-store" }), null); if (a) setSaudeAuto(d); };
    load();
    const t = setInterval(load, 60000);
    return () => { a = false; clearInterval(t); };
  }, [effectiveRole]);

  // Admin: resumo de vendas do mês (faturamento, ticket, marcas) — reusa o BI
  useEffect(() => {
    if (effectiveRole !== "ADMIN") return;
    let alive = true;
    (async () => {
      const n = new Date();
      const de = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
      const ate = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
      const d = await safeJson<any>(await fetch(`/api/caixa/vendas-resumo?de=${de}&ate=${ate}`, { cache: "no-store" }), null);
      if (alive) setResumoVendas(d);
    })();
    return () => { alive = false; };
  }, [effectiveRole]);

  // Gamificação (Fatia 3): score = média do atingimento das SUAS metas (sem inventar nada)
  const gamif = useMemo(() => {
    const soIndiv = minhasMetas.filter((m: any) => m.profissionalId === meId);
    const base = soIndiv.length ? soIndiv : minhasMetas;
    if (!base.length) return null;
    const pcts = base.map((m: any) => { const meta = Number(m.valorMeta || 0), real = Number(m.valorRealizado || 0); return meta > 0 ? Math.min(100, (real / meta) * 100) : 0; });
    const score = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
    const nivel = score >= 90 ? { lbl: "Diamante", emoji: "💎", bg: "#E7F0FB", fg: "#0C447C" }
      : score >= 70 ? { lbl: "Ouro", emoji: "🥇", bg: "#FBF3E3", fg: "#8A6400" }
        : score >= 40 ? { lbl: "Prata", emoji: "🥈", bg: "#EEF1F3", fg: "#49555C" }
          : { lbl: "Bronze", emoji: "🥉", bg: "#F3EBE3", fg: "#8A5A2B" };
    const batidas = base.filter((m: any) => { const meta = Number(m.valorMeta || 0); return meta > 0 && Number(m.valorRealizado || 0) >= meta; }).length;
    const prox = score >= 90 ? null : score >= 70 ? { emoji: "💎", lbl: "Diamante", falta: 90 - score }
      : score >= 40 ? { emoji: "🥇", lbl: "Ouro", falta: 70 - score } : { emoji: "🥈", lbl: "Prata", falta: 40 - score };
    const cor = score >= 90 ? "#2C7BE5" : score >= 70 ? "#E0A100" : score >= 40 ? "#9AA5AD" : "#B87333";
    return { score, nivel, batidas, prox, cor };
  }, [minhasMetas, meId]);

  const encHref = (e: any) => e.tipo === "pet" ? `/dashboard/erp/pets/${e.id}` : e.tipo === "lead" ? `/dashboard/crm/leads/${e.id}` : `/dashboard/erp/tutores/${e.id}`;
  async function concluirEnc(e: any) {
    try {
      const { entryId, ...data } = e;
      await fetch(`/api/listas/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...data, status: "CONCLUIDO", concluidoEm: new Date().toISOString() }) }) });
      setEncMine((prev) => prev.filter((x) => x.entryId !== entryId));
      window.dispatchEvent(new Event("encfila:changed"));
    } catch {}
  }

  // Avança a fase de um exame direto do Hoje (mesmo dado das outras telas).
  async function mudarFaseExameHoje(id: string, data: any, novo: string) {
    setExamesPend((l) =>
      EXAME_FASES_CONCLUIDAS.includes(novo)
        ? l.filter((x) => x.id !== id) // concluído → sai de "a entregar"
        : l.map((x) => (x.id === id ? { ...x, status: novo, data: { ...x.data, status: novo } } : x)),
    );
    try {
      const r = await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...data, status: novo }) }) });
      if (!r.ok) throw new Error();
    } catch { toast.error("Erro ao atualizar a fase do exame"); }
  }
  // Fase que representa "retirado pelo laboratório" (config exame_fases; fallback "Retirado")
  const faseRetirado = examFases.find((f) => /retir/i.test(f)) || "Retirado";
  const idxRetirado = examFases.indexOf(faseRetirado);
  // Exame ainda AGUARDANDO retirada = da clínica (não externo) e numa fase ANTES de "Retirado".
  function aguardandoRetirada(e: any): boolean {
    if (e?.data?.externo) return false;
    const i = examFases.indexOf(e.status);
    if (idxRetirado < 0) return i <= 0;
    return i >= 0 ? i < idxRetirado : true;
  }
  // 🧪 Baixa em LOTE: o laboratório retirou → todos aqueles exames vão pra "Retirado" de uma vez.
  // O resto do acompanhamento (Aguardando → Resultado → Entregue) segue individual.
  async function baixarLoteRetirada(lab: string, exs: any[]) {
    if (!exs.length) return;
    const ids = new Set(exs.map((e) => e.id));
    setExamesPend((l) => l.map((x) => (ids.has(x.id) ? { ...x, status: faseRetirado, data: { ...x.data, status: faseRetirado } } : x)));
    let ok = 0;
    for (const e of exs) {
      try {
        const novaData = { ...e.data, status: faseRetirado, historico: { ...(e.data?.historico || {}), [faseRetirado]: { at: new Date().toISOString(), por: "Recepção (lote)" } } };
        const r = await fetch(`/api/listas/${e.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify(novaData) }) });
        if (r.ok) ok++;
      } catch {}
    }
    toast.success(`${ok} exame(s) de ${lab} → ${faseRetirado} 🧪`);
  }

  // 📤 Tirar boletim do painel SEM apagar. Marca dispensadoPainel no JSON → some do painel mas
  // continua salvo na ficha do pet (não é enviado ao tutor). Boletim = listaItem petboletim_<pet>.
  async function dispensarBoletim(id: string, dd: any, nome?: string) {
    if (!window.confirm(`Tirar o boletim${nome ? ` de ${nome}` : ""} do painel?\n\nEle NÃO é enviado ao tutor e continua salvo na ficha do pet.`)) return;
    const antes = boletinsPend;
    setBoletinsPend((prev) => prev.filter((b) => b.id !== id));
    try {
      const novo = { ...(dd || {}), dispensadoPainel: true, dispensadoAt: new Date().toISOString() };
      const r = await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify(novo) }) });
      if (!r.ok) throw new Error();
      toast.success("Tirado do painel — segue salvo na ficha ✓");
    } catch { toast.error("Erro ao tirar do painel"); setBoletinsPend(antes); }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/hoje");
      const d = await safeJson<HojeData | null>(res, null);
      setData(d);
      try {
        const [lst, pts, tts, lds, cds, usr] = await Promise.all([
          safeJson<any>(await fetch("/api/listas"), []),
          safeJson<any>(await fetch("/api/pets?limit=1000"), []),
          safeJson<any>(await fetch("/api/tutors?limit=1000"), []),
          safeJson<any>(await fetch("/api/leads?limit=1000"), []),
          safeJson<any>(await fetch("/api/cadencias"), []),
          safeJson<any>(await fetch("/api/users"), []),
        ]);
        const usrArr = Array.isArray(usr) ? usr : (usr.users || usr.data || []);
        setVets(usrArr.filter((u: any) => !u.isBlocked));
        const listArr = Array.isArray(lst) ? lst : (lst.itens || lst.data || []);
        const petArr = Array.isArray(pts) ? pts : (pts.pets || pts.data || []);
        const petMap: Record<string, string> = {};
        petArr.forEach((p: any) => { petMap[p.id] = p.name; });
        const ex: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petexa_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            const st = dd.status || EXAME_FASES_PADRAO[0];
            if (!EXAME_FASES_CONCLUIDAS.includes(st)) {
              const petId = it.lista.replace("petexa_", "");
              ex.push({ id: it.id, petId, petName: petMap[petId] || "Pet", nome: dd.nome, status: st, data: dd });
            }
          }
        }
        setExamesPend(ex);
        loadExameFases().then(setExamFases).catch(() => {});
        // 📋 Boletins de fisio pendentes = salvos com enviadoAt === null (rascunhos/não enviados)
        // Fase 2: detectar "sessao feita sem boletim" via agenda
        const bol: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petboletim_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            if (!dd.enviadoAt && !dd.dispensadoPainel) {
              const petId = it.lista.replace("petboletim_", "");
              bol.push({ id: it.id, petId, petName: petMap[petId] || dd.animal || "Pet", sessao: dd.sessaoNumero || "", mv: dd.mvResponsavel || "", date: dd.sessaoData || dd.createdAt, data: dd });
            }
          }
        }
        bol.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setBoletinsPend(bol);
        try { const dz = await safeJson<any>(await fetch("/api/protocolos/doses/pendentes?dias=7"), []); setDosesPend(Array.isArray(dz) ? dz : []); } catch {}
        const tutorArr = Array.isArray(tts) ? tts : (tts.tutors || tts.data || []);
        const leadArr = Array.isArray(lds) ? lds : (lds.leads || lds.data || []);
        // 🎯 Funil de leads (inline na Recepção) — pelo status do lead.
        {
          const st = (l: any) => String(l.status || "").toUpperCase();
          const novos = leadArr.filter((l: any) => ["NEW", "AGUARDANDO_TRIAGEM", "ENRICHING", "ENRICHED"].includes(st(l))).length;
          const qualif = leadArr.filter((l: any) => ["QUALIFIED", "CONTACTED"].includes(st(l))).length;
          const convertido = leadArr.filter((l: any) => st(l) === "CONVERTED").length;
          const perdido = leadArr.filter((l: any) => st(l) === "LOST").length;
          const total = leadArr.length;
          setFunil({ novos, qualif, convertido, perdido, total, convPct: total > 0 ? Math.round((convertido / total) * 100) : 0 });
        }
        // 📄 Orçamentos abertos (aguardando resposta) — status não resolvido.
        try {
          const oc = await safeJson<any>(await fetch("/api/orcamentos"), []);
          const ocArr = Array.isArray(oc) ? oc : (oc.orcamentos || oc.data || []);
          setOrcAbertos(ocArr.filter((o: any) => !["APROVADO", "RECUSADO", "EXPIRADO"].includes(String(o.status || "").toUpperCase())).length);
        } catch { /* segue sem orçamentos */ }
        // 📅 Agendamentos de HOJE (mesma regra da agenda: sem cancelado/remarcado/artefato).
        try {
          const ap = await safeJson<any>(await fetch("/api/appointments?limit=1000", { cache: "no-store" }), []);
          const apArr = Array.isArray(ap) ? ap : (ap.appointments || ap.data || []);
          const hojeISO = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
          setAgendHoje(agendaDoDiaLib(apArr, hojeISO).length);
        } catch { /* segue sem agendamentos */ }
        const tutorMap: Record<string, string> = {};
        tutorArr.forEach((t: any) => { tutorMap[t.id] = t.name; });
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        // Janela do cronograma de mensagem: some da lista quem passou de 15 dias de atraso (fim da cadência).
        const limiteAtraso = new Date(startToday); limiteAtraso.setDate(limiteAtraso.getDate() - 15);
        const noPrazoFU = (d?: string) => { if (!d) return false; const t = new Date(d); return t <= endToday && t >= limiteAtraso; };
        // 👤 responsável pelo FU (KV fu_responsavel) — mapa petId → {userId,nome}
        const fuRespMap: Record<string, { userId: string; nome: string }> = {};
        const fuRespTutorMap: Record<string, { userId: string; nome: string }> = {};
        const fuRespLeadMap: Record<string, { userId: string; nome: string }> = {};
        for (const it of listArr) {
          if ((it.lista || "") === "fu_responsavel") {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            if (dd.userId) {
              if (dd.petId) fuRespMap[dd.petId] = { userId: dd.userId, nome: dd.nome || "" };
              if (dd.tutorId) fuRespTutorMap[dd.tutorId] = { userId: dd.userId, nome: dd.nome || "" };
              if (dd.leadId) fuRespLeadMap[dd.leadId] = { userId: dd.userId, nome: dd.nome || "" };
            }
          }
        }
        const fu: any[] = [];
        for (const t of tutorArr) if (noPrazoFU(t.proximoFollowupAt)) { const rr = fuRespTutorMap[t.id]; fu.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.proximoFollowupAt, href: `/dashboard/erp/tutores/${t.id}`, respUserId: rr?.userId, respNome: rr?.nome }); }
        for (const p of petArr) if (noPrazoFU(p.proximoFollowupAt)) { const rr = fuRespMap[p.id]; fu.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.proximoFollowupAt, href: `/dashboard/erp/pets/${p.id}`, respUserId: rr?.userId, respNome: rr?.nome }); }
        for (const l of leadArr) if (noPrazoFU(l.proximoFollowupAt)) { const rr = fuRespLeadMap[l.id]; fu.push({ id: "l" + l.id, tipo: "Lead", nome: l.name || "Lead", date: l.proximoFollowupAt, href: `/dashboard/crm/leads/${l.id}`, respUserId: rr?.userId, respNome: rr?.nome }); }
        fu.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setFuDue(fu);
        // Toques de cadencia: passos das cadencias (clientes/pets) que vencem hoje
        const cadArr = Array.isArray(cds) ? cds : (cds.cadencias || cds.data || []);
        const cadById: Record<string, any> = {};
        cadArr.forEach((c: any) => { cadById[c.id] = c; });
        const msUnid: Record<string, number> = { MINUTOS: 60000, HORAS: 3600000, DIAS: 86400000, SEMANAS: 604800000, MESES: 2592000000 };
        const tq: any[] = [];
        for (const it of listArr) {
          const lista = it.lista || "";
          const isPet = lista.startsWith("petcad_"), isCli = lista.startsWith("tutcad_");
          if (!isPet && !isCli) continue;
          let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
          const cad = cadById[dd.cadenciaId]; if (!cad || !dd.startedAt) continue;
          const start = new Date(dd.startedAt).getTime();
          for (const passo of (cad.passos || [])) {
            if (passo.ativo === false) continue;
            const ms = (msUnid[passo.atrasoUnidade] || 86400000) * (Number(passo.atrasoValor) || 0);
            const due = new Date(start + ms);
            if (due >= startToday && due <= endToday) {
              const ownerId = lista.replace(isPet ? "petcad_" : "tutcad_", "");
              tq.push({ id: it.id + "_" + passo.id, tipo: isPet ? "Pet" : "Cliente", nome: isPet ? (petMap[ownerId] || "Pet") : (tutorMap[ownerId] || "Cliente"), cadencia: cad.nome, passo: passo.titulo || passo.tipo, canal: passo.tipo, href: isPet ? `/dashboard/erp/pets/${ownerId}` : `/dashboard/erp/tutores/${ownerId}` });
            }
          }
        }
        setToques(tq);
        // Aniversariantes (cliente.birthDate + pet.birthDate)
        const td = new Date(); const dd2 = td.getDate(), mm2 = td.getMonth();
        const an: any[] = [];
        for (const t of tutorArr) if (t.birthDate) { const b = new Date(t.birthDate); if (b.getDate() === dd2 && b.getMonth() === mm2) an.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.birthDate, href: `/dashboard/erp/tutores/${t.id}` }); }
        for (const p of petArr) if (p.birthDate) { const b = new Date(p.birthDate); if (b.getDate() === dd2 && b.getMonth() === mm2) an.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.birthDate, href: `/dashboard/erp/pets/${p.id}` }); }
        setAniv(an);
        const pac: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petpac_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            const total = Number(dd.total) || 0, used = Number(dd.used) || 0;
            if (total > 0 && (total - used) <= 1) {
              const petId = it.lista.replace("petpac_", "");
              pac.push({ id: it.id, petId, petName: petMap[petId] || "Pet", nome: dd.nome, used, total, remaining: total - used });
            }
          }
        }
        setPacRisco(pac);
        // Entradas do dia (leads + clientes novos cadastrados hoje)
        try {
          const ldNP = await safeJson<any>(await fetch("/api/leads"), []);
          const leadNew = Array.isArray(ldNP) ? ldNP : (ldNP.leads || ldNP.data || []);
          // Só as entradas de HOJE — zera sozinha à meia-noite (antes usava um marco fixo
          // que ia acumulando: chegou a 4 mil pendências de mais de um mês).
          const floor = new Date(); floor.setHours(0, 0, 0, 0);
          const baixados = new Set(listArr.filter((it: any) => (it.lista || "") === "acompbaixa").map((it: any) => it.valor));
          const isToday = (dt: any) => { if (!dt) return false; return new Date(dt).getTime() >= floor.getTime(); };
          const ent: any[] = [];
          for (const t of tutorArr) if (isToday(t.createdAt)) ent.push({ key: `cli:${t.id}`, tipo: "Cliente", nome: t.name || "Cliente", sub: t.phone || "", at: t.createdAt, href: `/dashboard/erp/tutores/${t.id}` });
          for (const l of leadNew) if (isToday(l.createdAt)) ent.push({ key: `lead:${l.id}`, tipo: "Lead", nome: l.name || "Lead", sub: l.origem || l.canal || "", at: l.createdAt, href: `/dashboard/crm/leads/${l.id}` });
          // Tambem: quem teve contato no Inbox (BC) hoje, mesmo ja cadastrado antes
          try {
            const riBC = await safeJson<any>(await fetch(`/api/interacoes?canal=${encodeURIComponent("WhatsApp BC")}&limit=1000`), []);
            const bcArr = Array.isArray(riBC) ? riBC : (riBC.interacoes || riBC.data || []);
            const tById: Record<string, any> = {}; for (const t of tutorArr) tById[t.id] = t;
            const lById: Record<string, any> = {}; for (const l of leadNew) lById[l.id] = l;
            const jaTem = new Set(ent.map((e) => e.key));
            for (const it of bcArr) {
              if (!isToday(it.createdAt)) continue;
              if (it.tutorId) {
                const k = `cli:${it.tutorId}`; if (jaTem.has(k)) continue; jaTem.add(k);
                const t = tById[it.tutorId];
                ent.push({ key: k, tipo: "Cliente", nome: t?.name || "Cliente", sub: (t?.contacts?.[0]?.number) || t?.phone || "WhatsApp BC", at: it.createdAt, href: `/dashboard/erp/tutores/${it.tutorId}` });
              } else if (it.leadId) {
                const k = `lead:${it.leadId}`; if (jaTem.has(k)) continue; jaTem.add(k);
                const l = lById[it.leadId];
                ent.push({ key: k, tipo: "Lead", nome: l?.name || "Lead", sub: "WhatsApp BC", at: it.createdAt, href: `/dashboard/crm/leads/${it.leadId}` });
              }
            }
          } catch {}
          const visiveis = ent.filter((e) => !baixados.has(e.key)).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
          setEntradas(visiveis);
        } catch {}
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function baixarEntrada(e: any) {
    setEntradas(prev => prev.filter(x => x.key !== e.key));
    try { await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "acompbaixa", valor: e.key }) }); } catch {}
  }
  async function desconferirEntrada(e: any) {
    setEntConf(m => { const n = { ...m }; delete n[e.key]; return n; });
    try {
      const r = await fetch(`/api/listas?lista=${encodeURIComponent("entradadia_" + todayKey)}`, { cache: "no-store" });
      const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const row = arr.find((x: any) => x.valor === e.key);
      if (row) await fetch(`/api/listas/${row.id}`, { method: "DELETE" });
    } catch {}
  }

  const dosesView = useMemo(() => {
    const arr = Array.isArray(dosesPend) ? dosesPend : [];
    return (effectiveRole === "VETERINARIAN" && meId) ? arr.filter((d: any) => d.vetId === meId) : arr;
  }, [dosesPend, effectiveRole, meId]);
  // Retornos separados: "Meus" = dono sou eu · "A revisar" = SEM dono (você dá destino) · "Todos" = tudo
  const fuShown = useMemo(() => {
    if (fuFilter === "todos") return fuDue;
    if (fuFilter === "revisar") return fuDue.filter((f: any) => !f.respUserId);
    return fuDue.filter((f: any) => f.respUserId === meId);
  }, [fuDue, fuFilter, meId]);
  const fuCounts = useMemo(() => ({
    meus: fuDue.filter((f: any) => f.respUserId === meId).length,
    revisar: fuDue.filter((f: any) => !f.respUserId).length,
    todos: fuDue.length,
  }), [fuDue, meId]);
  // Admin acompanha a clínica inteira → o FU já abre em "Todos" (os dele seriam quase nenhum).
  useEffect(() => { if (effectiveRole === "ADMIN") setFuFilter("todos"); }, [effectiveRole]);
  // Encaminhar um follow-up para outra pessoa: grava responsável + avisa (assignFollowUpFor) e move na lista.
  async function encaminharFU(fu: any, userId: string, nome: string) {
    const kind = fu.id?.[0] === "t" ? "tutor" : fu.id?.[0] === "p" ? "pet" : "lead";
    const rawId = String(fu.id).slice(1);
    setFuDue((prev) => prev.map((x) => (x.id === fu.id ? { ...x, respUserId: userId, respNome: nome } : x)));
    setEncaminhando(null);
    try { await assignFollowUpFor({ kind: kind as any, id: rawId, userId, nome, alvoNome: fu.nome }); toast.success(`Encaminhado para ${String(nome).split(" ")[0]} 👤`); }
    catch { toast.error("Erro ao encaminhar"); }
  }

  const items: Pendencia[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "retornos",
        title: "Retornos vencidos",
        sub: "Follow-ups vencidos e de hoje (Cliente/Pet/Lead)",
        // Admin vê TODOS os follow-ups da clínica (não só os dele); recepção/vet veem os seus + a revisar.
        count: effectiveRole === "ADMIN" ? fuCounts.todos : fuCounts.meus + fuCounts.revisar,
        link: "Follow-up",
        href: "#",
        Icon: LuRefreshCcw,
        emoji: "🔁",
      },
      {
        key: "toques",
        title: "Toques de cadência",
        sub: "Passos de cadência (clientes/pets) previstos para hoje",
        count: toques.length,
        link: "Cadências",
        href: "#",
        Icon: LuPhone,
        emoji: "📞",
      },
      {
        key: "pacotes",
        title: "Pacotes em risco",
        sub: "Fisio na penúltima/última sessão",
        count: pacRisco.length,
        link: "Pacotes",
        href: "/dashboard/erp/pacotes?risco=1",
        Icon: LuPackage,
        emoji: "📦",
      },
      // "Exames a entregar" removido da lista de tarefas (11/08): o Kanban de exames já cobre isso.
      {
        key: "doses",
        title: "Doses a aplicar",
        sub: "Vacinas/protocolos vencidos e dos próximos 7 dias",
        count: dosesView.length,
        link: "Calendário",
        href: "/dashboard/erp/agendamentos/clinico",
        Icon: LuPill,
        emoji: "💉",
      },
      {
        key: "aniversariantes",
        title: "Aniversariantes do dia",
        sub: "Clientes e pets que fazem aniversário hoje",
        count: aniv.length,
        link: "Parabéns",
        href: "#",
        Icon: LuCake,
        emoji: "🎂",
      },
      {
        key: "orcamentos",
        title: "Orçamentos abertos",
        sub: "Aguardando resposta do cliente",
        count: orcAbertos,
        link: "Orçamentos",
        href: "/dashboard/erp/orcamentos",
        Icon: LuFileText,
        emoji: "📄",
      },
    ];
  }, [data, examesPend, dosesView, fuCounts, toques, aniv, pacRisco, orcAbertos, effectiveRole]);

  const total = items.reduce((s, t) => s + t.count, 0);

  const isRecep = effectiveRole === "RECEPTIONIST";

  // ✓ Resolver o follow-up: abre o modal pra escrever a observação (individualizada — autor = quem resolve).
  function resolverFu(e: any, ev: any) { ev.preventDefault(); ev.stopPropagation(); setFuObs(""); setFuResolving(e); }
  // Confirma: registra a observação (NOTA, autor = usuário logado) e zera o proximoFollowupAt (pet ou lead).
  async function confirmarResolverFu() {
    const e = fuResolving; if (!e) return;
    const isPet = String(e.id).startsWith("p");
    const rawId = String(e.id).slice(1);
    setFuSaving(true);
    try {
      const obs = fuObs.trim();
      if (obs) {
        await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(isPet ? { petId: rawId } : { leadId: rawId }), tipo: "NOTA", texto: `Follow-up resolvido: ${obs}`, canal: "Follow-up" }) }).catch(() => {});
      }
      const r = isPet
        ? await fetch(`/api/pets/${rawId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) })
        : await fetch(`/api/leads/${rawId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) });
      if (!r.ok) throw new Error();
      setFuDue((prev: any[]) => prev.filter((x: any) => x.id !== e.id));
      toast.success("Follow-up resolvido ✓");
      setFuResolving(null); setFuObs("");
    } catch { toast.error("Não consegui resolver."); }
    finally { setFuSaving(false); }
  }

  // Linha de tarefa dos cards "Minhas tarefas" / "Recepção & execução". Para "Retornos vencidos"
  // (que não tem página própria), abre a LISTA de follow-ups INLINE ali mesmo (antes não abria).
  function renderTarefaRow(p: Pendencia) {
    const ehRetornos = p.key === "retornos";
    const aberto = ehRetornos && fuDueOpen;
    return (
      <div key={p.key}>
        <div className="att" style={ehRetornos ? { cursor: "pointer" } : undefined} onClick={ehRetornos ? () => setFuDueOpen((o) => !o) : undefined}>
          <div className="ic">{p.emoji}</div>
          <div className="tx"><b>{p.title}</b><small>{p.sub}</small></div>
          <span className="cnt">{p.count}</span>
          {p.href !== "#"
            ? <Link className="go" href={p.href} onClick={(e) => e.stopPropagation()}>Abrir</Link>
            : ehRetornos ? <span className="go" style={{ cursor: "pointer" }}>{aberto ? "Fechar" : "Abrir"}</span> : null}
        </div>
        {aberto && (
          <div style={{ background: "#FBF9F4" }}>
            <div className="flex items-center gap-1.5 border-b flex-wrap" style={{ padding: "8px 15px 8px 58px", borderColor: "#F0EBE0" }} onClick={(ev) => ev.stopPropagation()}>
              <span className="text-[11px] mr-1" style={{ color: "#8A938F" }}>Mostrar:</span>
              {(([["meus", "Meus"], ["revisar", "A revisar"], ["todos", "Todos"]]) as [any, string][]).map(([v, lbl]) => (
                <button key={v} onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setFuFilter(v); }} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={fuFilter === v ? { background: "#009AAC", color: "#fff" } : { background: "#fff", border: "1px solid #E8E2D6", color: "#5C6B70" }}>{lbl} · {(fuCounts as any)[v]}</button>
              ))}
            </div>
            {fuShown.length === 0
              ? <div style={{ padding: "10px 15px 10px 58px", fontSize: 12, color: "#8A938F" }}>Nenhum follow-up para hoje neste filtro.</div>
              : fuShown.slice(0, 40).map((e: any) => (
                <Link key={e.id} href={e.href} className="flex items-center gap-2 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ padding: "8px 15px 8px 58px", borderColor: "#F0EBE0", color: "#1F2A2E" }}>
                  <TipoChip tipo={e.tipo} />
                  <span className="font-medium truncate">{e.nome}</span>
                  {e.respNome && <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#E0F4F6", color: "#00798A" }}>👤 {String(e.respNome).split(" ")[0]}</span>}
                  {e.date && <span className="ml-auto whitespace-nowrap" style={{ color: "#5C6B70" }}>{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
                  <button onClick={(ev) => resolverFu(e, ev)} title="Marcar follow-up como resolvido" className="whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "#1c7a47", color: "#1c7a47", background: "#E7F6EE", marginLeft: e.date ? 8 : "auto" }}>✓ resolver</button>
                </Link>
              ))}
          </div>
        )}
      </div>
    );
  }

  // 🏠 Painel da RECEPÇÃO — fiel ao mockup cb6015f4 (herói + KPIs + tarefas + meta + gestão).
  function renderPainelRecep() {
    const tarefas = items.filter((p) => p.count > 0);
    const aguardando = examesPend.filter(aguardandoRetirada);
    const byLab: Record<string, any[]> = {};
    aguardando.forEach((e) => { const lab = e?.data?.laboratorio || e?.data?.lab || "Laboratório"; (byLab[lab] = byLab[lab] || []).push(e); });
    const lotes = Object.entries(byLab);
    return (
      <div className="mpv">
        <style>{`
          .mpv .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
          @media(max-width:640px){.mpv .kpis{grid-template-columns:repeat(2,1fr)}}
          .mpv .kpi{background:#fff;border:1px solid #E8E2D6;border-radius:12px;padding:12px 13px}
          .mpv .kpi .l{font-size:10.5px;color:#8A938F;display:flex;gap:5px;align-items:center}
          .mpv .kpi .n{font-size:22px;font-weight:700;color:#014D5E;margin-top:5px;font-variant-numeric:tabular-nums}
          .mpv .kpi .d{font-size:10.5px;color:#0F6E56;margin-top:1px}
          .mpv .card{background:#fff;border:1px solid #E8E2D6;border-radius:16px;overflow:hidden;margin-bottom:12px}
          .mpv .card-h{display:flex;align-items:center;gap:8px;padding:11px 15px;border-bottom:1px solid #F0EBE0}
          .mpv .card-h .ttl{font-size:13px;font-weight:600;color:#014D5E}
          .mpv .card-h .r{margin-left:auto;font-size:11.5px;color:#8A938F}
          .mpv .att{display:flex;align-items:center;gap:11px;padding:10px 15px;border-bottom:1px solid #F0EBE0}
          .mpv .att:last-child{border-bottom:none}
          .mpv .att .ic{width:33px;height:33px;border-radius:9px;background:#FBF9F4;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid #F0EBE0}
          .mpv .att .tx{flex:1;min-width:0}.mpv .att .tx b{font-size:13px;color:#014D5E;font-weight:600;display:block}.mpv .att .tx small{display:block;font-size:11.5px;color:#5C6B70}
          .mpv .att .cnt{font-size:12px;font-weight:700;color:#D85A30;background:#FBF3E3;border-radius:999px;padding:2px 10px}
          .mpv .att .go{font-size:11.5px;font-weight:600;color:#fff;background:#009AAC;border:none;border-radius:8px;padding:6px 11px;cursor:pointer;flex-shrink:0;text-decoration:none;display:inline-block}
          .mpv .lote{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#fff;background:#6A4FB0;border:none;border-radius:999px;padding:6px 12px;cursor:pointer;margin:0 15px 12px}
          .mpv .hero{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #E8E2D6;border-radius:16px;padding:16px;margin-bottom:14px}
          .mpv .ring{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}
          .mpv .ring::before{content:"";position:absolute;inset:9px;background:#fff;border-radius:50%}
          .mpv .ring .in{position:relative;text-align:center}.mpv .ring .in b{font-size:19px;font-weight:700;color:#014D5E;display:block;line-height:1}.mpv .ring .in small{font-size:9px;color:#8A938F}
          .mpv .nivel{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:4px 12px;border-radius:999px}
          .mpv .streak{color:#D85A30;font-weight:700;font-size:12px;margin-left:8px}
          .mpv .selos{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
          .mpv .selo{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;background:#FBF9F4;border:1px solid #E8E2D6;border-radius:999px;padding:4px 10px;color:#5C6B70}
          .mpv .selo.lock{opacity:.45}
          .mpv .metabar{height:10px;background:#F0EBE0;border-radius:999px;overflow:hidden}.mpv .metabar i{display:block;height:100%;border-radius:999px;background:#009AAC}
          .mpv .miss{font-size:12px;color:#5C6B70}.mpv .miss b{color:#014D5E}
          .mpv .sec{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#8A938F;font-weight:700;margin:20px 2px 8px}
          .mpv .atalhos{display:flex;gap:8px;flex-wrap:wrap;padding:13px 15px}
          .mpv .atalhos a{font-size:12px;font-weight:600;color:#014D5E;background:#FBF9F4;border:1px solid #E8E2D6;border-radius:9px;padding:7px 12px;text-decoration:none}
        `}</style>

        {/* Herói: gamificação */}
        <div className="hero">
          <div className="ring" style={{ background: gamif ? `conic-gradient(${gamif.cor} ${gamif.score}%, #F0EBE0 0)` : "#F0EBE0" }}>
            <div className="in"><b>{gamif ? gamif.score : "—"}</b><small>score</small></div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            {gamif
              ? <><span className="nivel" style={{ background: gamif.nivel.bg, color: gamif.nivel.fg }}>{gamif.nivel.emoji} Nível {gamif.nivel.lbl}</span>{streak >= 2 && <span className="streak">🔥 {streak} dias seguidos</span>}</>
              : <span className="miss">Defina metas (Configurações › Metas) pra ativar seu nível.</span>}
            <div className="selos">
              {gamif && gamif.batidas > 0 && <span className="selo" style={{ background: "#E7F6EE", borderColor: "#BFE6CE", color: "#0F6E56" }}>🎯 {gamif.batidas} meta(s) batida(s)</span>}
              {gamif && <span className="selo">🏅 {gamif.score}% das metas</span>}
              {gamif && gamif.prox && <span className="selo lock">🔒 {gamif.prox.emoji} {gamif.prox.lbl}</span>}
            </div>
            {gamif && gamif.prox && <p className="miss" style={{ marginTop: 7 }}>Faltam <b>{gamif.prox.falta} pts</b> pro {gamif.prox.emoji} {gamif.prox.lbl}. Sem ranking — só a <b>sua evolução</b>.</p>}
          </div>
        </div>

        {/* KPIs */}
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <div className="kpi"><div className="l">📞 Follow-ups hoje</div><div className="n">{fuShown.length}</div><div className="d">a tocar</div></div>
          <div className="kpi"><div className="l">📅 Agendamentos hoje</div><div className="n">{agendHoje}</div><div className="d">na agenda</div></div>
          <div className="kpi"><div className="l">🧲 Entradas hoje</div><div className="n">{entradas.length}</div><div className="d">leads/clientes</div></div>
          <div className="kpi"><div className="l">🔬 Exames a entregar</div><div className="n">{examesPend.length}</div><div className="d">acompanhar</div></div>
          <div className="kpi"><div className="l">🎂 Aniversariantes</div><div className="n">{aniv.length}</div><div className="d">parabenizar</div></div>
        </div>

        <div style={{ marginBottom: 12 }}><ExamesResumoCard /></div>

        {/* Minhas tarefas de hoje */}
        <div className="card">
          <div className="card-h"><span>⚠️</span><span className="ttl">Minhas tarefas de hoje</span><span className="r">{loading ? "carregando…" : `${total} pendências`}</span></div>
          {tarefas.length === 0 && !lotes.length
            ? <div style={{ padding: 18, textAlign: "center", color: "#8A938F", fontSize: 13 }}>Tudo em ordem por aqui. 🎉</div>
            : <>
              {tarefas.map(renderTarefaRow)}
              {lotes.map(([lab, exs]) => (
                <button key={lab} className="lote" onClick={() => baixarLoteRetirada(lab, exs as any[])}>🧪 {lab} retirou — dar baixa em lote ({(exs as any[]).length})</button>
              ))}
            </>}
        </div>

        {/* Minha meta do mês */}
        {minhasMetas.length > 0 && (
          <div className="card">
            <div className="card-h"><span>🎯</span><span className="ttl">Minha meta do mês</span><span className="r">definida pelo Admin</span></div>
            <div style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 13 }}>
              {minhasMetas.map((m: any) => {
                const meta = Number(m.valorMeta || 0), real = Number(m.valorRealizado || 0);
                const pct = meta > 0 ? Math.min(100, Math.round((real / meta) * 100)) : 0;
                const falta = Math.max(0, meta - real);
                return (
                  <div key={m.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6, color: "#5C6B70" }}><span style={{ color: "#014D5E", fontWeight: 500 }}>{metaLabel(m)}</span><span>{metaFmt(m, real)} / <b style={{ color: "#014D5E" }}>{metaFmt(m, meta)}</b></span></div>
                    <div className="metabar"><i style={{ width: `${pct}%`, background: pct >= 100 ? "#0F6E56" : pct >= 70 ? "#009AAC" : "#B45309" }} /></div>
                    <div className="miss" style={{ marginTop: 5 }}>{pct}% {pct >= 100 ? "· meta batida 🎉" : <>· faltam <b>{metaFmt(m, falta)}</b> — bater a meta <b>conta na comissão</b>.</>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gestão & inteligência — funil de leads INLINE (do plano) + atalhos dos BIs completos */}
        <div className="sec">📊 Gestão &amp; inteligência</div>
        {funil && (
          <>
            <div className="kpis k3">
              <div className="kpi"><div className="l">📊 Leads total</div><div className="n">{funil.total}</div></div>
              <div className="kpi"><div className="l">🎯 Taxa conversão</div><div className="n">{funil.convPct}%</div></div>
              <div className="kpi"><div className="l">📈 Pipeline aberto</div><div className="n">{funil.novos + funil.qualif}</div></div>
            </div>
            {funil.total > 0 && (
              <div className="card">
                <div className="card-h"><span>🎯</span><span className="ttl">Funil comercial</span><span className="r">seus leads</span></div>
                <div className="funil">
                  {([["Lead novo", funil.novos], ["Em qualificação", funil.qualif], ["Convertido", funil.convertido], ["Perdido", funil.perdido]] as [string, number][]).map(([nm, v]) => (
                    <div className="fr" key={nm}><span className="fn">{nm}</span><span className="fb"><i style={{ width: `${Math.round((v / Math.max(1, funil.total)) * 100)}%`, background: nm === "Perdido" ? "#B45309" : "#009AAC" }} /></span><span className="fv">{v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="card">
          <div className="card-h"><span>💡</span><span className="ttl">Painéis completos (BI)</span><span className="r">dados reais</span></div>
          <div className="atalhos">
            <Link href="/dashboard/erp/vendas-graficos">📊 BI de Vendas</Link>
            <Link href="/dashboard/erp/relacionamento">💎 Relacionamento (RFM)</Link>
            <Link href="/dashboard/erp/retencao">🔄 Retenção e Churn</Link>
            <Link href="/dashboard/erp/ranking-clientes">🏆 Ranking de clientes</Link>
          </div>
        </div>
      </div>
    );
  }

  const isVet = effectiveRole === "VETERINARIAN";
  const isAdmin = effectiveRole === "ADMIN";

  // Herói de gamificação (reusado por Vet/Admin) — mesma cara do mockup.
  function heroGamif() {
    return (
      <div className="hero">
        <div className="ring" style={{ background: gamif ? `conic-gradient(${gamif.cor} ${gamif.score}%, #F0EBE0 0)` : "#F0EBE0" }}>
          <div className="in"><b>{gamif ? gamif.score : "—"}</b><small>score</small></div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {gamif
            ? <><span className="nivel" style={{ background: gamif.nivel.bg, color: gamif.nivel.fg }}>{gamif.nivel.emoji} Nível {gamif.nivel.lbl}</span>{streak >= 2 && <span className="streak">🔥 {streak} dias seguidos</span>}</>
            : <span className="miss">Defina metas (Configurações › Metas) pra ativar seu nível.</span>}
          <div className="selos">
            {gamif && gamif.batidas > 0 && <span className="selo" style={{ background: "#E7F6EE", borderColor: "#BFE6CE", color: "#0F6E56" }}>🎯 {gamif.batidas} meta(s) batida(s)</span>}
            {gamif && <span className="selo">🏅 {gamif.score}% das metas</span>}
            {gamif && gamif.prox && <span className="selo lock">🔒 {gamif.prox.emoji} {gamif.prox.lbl}</span>}
          </div>
          {gamif && gamif.prox && <p className="miss" style={{ marginTop: 7 }}>Faltam <b>{gamif.prox.falta} pts</b> pro {gamif.prox.emoji} {gamif.prox.lbl}. Sem ranking — só a <b>sua evolução</b>.</p>}
        </div>
      </div>
    );
  }

  // 🩺 Painel do VETERINÁRIO — agenda/atendimentos do dia + tarefas + desempenho por produto.
  function renderPainelVet() {
    const hojeStr = new Date().toDateString();
    const atendHoje = prodLista.filter((a: any) => { try { return new Date(a.date).toDateString() === hojeStr; } catch { return false; } });
    const aguardando = examesPend.filter(aguardandoRetirada);
    const byLab: Record<string, any[]> = {};
    aguardando.forEach((e) => { const lab = e?.data?.laboratorio || e?.data?.lab || "Laboratório"; (byLab[lab] = byLab[lab] || []).push(e); });
    const lotes = Object.entries(byLab);
    const tarefasVet = items.filter((p) => p.count > 0 && ["retornos", "doses", "exames", "toques"].includes(p.key));
    const metaPct = gamif ? gamif.score : 0;
    return (
      <div className="mpv">
        <style>{MPV_CSS}</style>
        {heroGamif()}
        <div className="kpis">
          <div className="kpi"><div className="l">🩺 Atendimentos hoje</div><div className="n">{atendHoje.length}</div><div className="d">seus</div></div>
          <div className="kpi"><div className="l">🎯 Minha meta do mês</div><div className="n">{metaPct}%</div><div className="d">atingido</div></div>
          <div className="kpi"><div className="l">💉 Doses a aplicar</div><div className="n">{dosesView.length}</div><div className="d">hoje/semana</div></div>
          <div className="kpi"><div className="l">🔬 Exames a entregar</div><div className="n">{examesPend.length}</div><div className="d">acompanhar</div></div>
        </div>
        <div style={{ marginBottom: 12 }}><ExamesResumoCard /></div>
        <div className="grid2">
          <div className="card">
            <div className="card-h"><span>📅</span><span className="ttl">Meus atendimentos de hoje</span><span className="r">{atendHoje.length}</span></div>
            {atendHoje.length === 0
              ? <div style={{ padding: 16, textAlign: "center", color: "#8A938F", fontSize: 12.5 }}>Nenhum atendimento lançado hoje ainda.</div>
              : atendHoje.slice(0, 8).map((a: any, i: number) => (
                <div className="att" key={i}>
                  <div className="ic">🐾</div>
                  <div className="tx"><b>{a.pet || a.tutor || "Atendimento"}</b><small>{a.tutor || ""}{a.valor ? ` · ${brl(Number(a.valor))}` : ""}</small></div>
                  {a.id && <Link className="go ghost" href={`/dashboard/erp/atendimentos/${a.id}`}>Abrir</Link>}
                </div>
              ))}
            <div className="atalhos"><Link href="/dashboard/calendario">📅 Ver minha agenda completa</Link></div>
          </div>
          <div className="card">
            <div className="card-h"><span>🔔</span><span className="ttl">Minhas tarefas</span><span className="r">{loading ? "…" : `${tarefasVet.reduce((s, p) => s + p.count, 0)}`}</span></div>
            {tarefasVet.length === 0 && !lotes.length
              ? <div style={{ padding: 16, textAlign: "center", color: "#8A938F", fontSize: 12.5 }}>Tudo em ordem. 🎉</div>
              : <>
                {tarefasVet.map(renderTarefaRow)}
                {lotes.map(([lab, exs]) => (
                  <button key={lab} className="lote" onClick={() => baixarLoteRetirada(lab, exs as any[])}>🧪 {lab} retirou — baixa em lote ({(exs as any[]).length})</button>
                ))}
              </>}
          </div>
        </div>
        <div className="sec">📊 Meu desempenho por produto e valor</div>
        {minhasMetas.length > 0 ? (
          <div className="card"><div style={{ overflowX: "auto" }}><table>
            <thead><tr><th>Meta</th><th className="r">Realizado</th><th className="r">Meta</th><th className="r">%</th></tr></thead>
            <tbody>
              {minhasMetas.map((m: any) => {
                const meta = Number(m.valorMeta || 0), real = Number(m.valorRealizado || 0);
                const pct = meta > 0 ? Math.round((real / meta) * 100) : 0;
                const pc = pct >= 100 ? { bg: "#E7F6EE", fg: "#0F6E56" } : pct >= 70 ? { bg: "#FBF3E3", fg: "#8A6400" } : { bg: "#FBEDE3", fg: "#B45309" };
                return (<tr key={m.id}><td>{metaLabel(m)}</td><td className="r">{metaFmt(m, real)}</td><td className="r">{metaFmt(m, meta)}</td><td className="r"><span className="pill" style={{ background: pc.bg, color: pc.fg }}>{pct}%</span></td></tr>);
              })}
            </tbody>
          </table></div></div>
        ) : (
          <div className="card"><div style={{ padding: 16, fontSize: 12.5, color: "#5C6B70" }}>Sem metas definidas ainda. O Admin define em <b>Configurações › Metas</b> escolhendo você como profissional.</div></div>
        )}
      </div>
    );
  }

  // 👑 Painel do ADMIN — visão da clínica (KPIs + meta + marcas + funil). Time = MetasTimeCard abaixo.
  function renderPainelAdmin() {
    const tot = resumoVendas?.totais || {};
    // Fig 4 — acompanhar recepção/execução: mesmas tarefas do painel da recepção (retornos/pacotes/exames/doses/aniversários)
    const tarefasAdmin = items.filter((p) => p.count > 0);
    const totalAdmin = items.reduce((s, p) => s + p.count, 0);
    const aguardandoAdmin = examesPend.filter(aguardandoRetirada);
    const byLabAdmin: Record<string, any[]> = {};
    aguardandoAdmin.forEach((e) => { const lab = e?.data?.laboratorio || e?.data?.lab || "Laboratório"; (byLabAdmin[lab] = byLabAdmin[lab] || []).push(e); });
    const lotesAdmin = Object.entries(byLabAdmin);
    const marcas: any[] = resumoVendas?.porMarca || [];
    const maxMarca = Math.max(1, ...marcas.map((m: any) => Number(m.valor ?? m.liquido ?? m.total ?? 0)));
    const metaClinica = metas.find((m: any) => !m.profissionalId && (String(m.tipo).includes("GERAL") || String(m.tipo).includes("FATURAMENTO")));
    const mcMeta = Number(metaClinica?.valorMeta || 0), mcReal = Number(metaClinica?.valorRealizado || 0);
    const mcPct = mcMeta > 0 ? Math.min(100, Math.round((mcReal / mcMeta) * 100)) : 0;
    const marcaCor = (i: number) => ["#009AAC", "#639922", "#7F77DD", "#D85A30"][i % 4];
    return (
      <div className="mpv">
        <style>{MPV_CSS}</style>
        {saudeAuto && (!saudeAuto.cronVivo || (saudeAuto.resumo?.parado > 0)) && (
          <div style={{ background: "#FBEDE3", border: "1px solid #E5A48A", borderRadius: 12, padding: "12px 15px", marginBottom: 14, color: "#B91C1C", fontSize: 13, fontWeight: 600 }}>
            ⚠️ {!saudeAuto.cronVivo
              ? "O MOTOR de automações está PARADO — nenhuma mensagem/rotina automática está saindo. Veja em \"Saúde das automações\" abaixo."
              : `${saudeAuto.resumo.parado} rotina(s) automática(s) parada(s) — confira em "Saúde das automações" abaixo.`}
          </div>
        )}
        <div className="kpis k6">
          <div className="kpi"><div className="l">💰 Faturamento (mês)</div><div className="n">{brl(Number(tot.liquido || 0))}</div><div className="d">líquido</div></div>
          <div className="kpi"><div className="l">🧾 Ticket médio</div><div className="n">{brl(Number(tot.ticket || 0))}</div></div>
          <div className="kpi"><div className="l">🛒 Vendas (mês)</div><div className="n">{Number(tot.qtdVendas || 0)}</div></div>
          <div className="kpi"><div className="l">📦 Itens vendidos</div><div className="n">{Number(tot.qtdItens || 0)}</div></div>
          <div className="kpi"><div className="l">🔬 Exames a entregar</div><div className="n">{examesPend.length}</div></div>
          <div className="kpi"><div className="l">🎂 Aniversariantes</div><div className="n">{aniv.length}</div></div>
        </div>

        <div style={{ marginBottom: 12 }}><ExamesResumoCard /></div>

        {/* Fig 4 — Recepção & execução: o admin acompanha as tarefas da recepção (retornos/pacotes/exames/doses/aniversários) */}
        <div className="card">
          <div className="card-h"><span>⚠️</span><span className="ttl">Recepção &amp; execução</span><span className="r">{loading ? "carregando…" : `${totalAdmin} pendências`}</span></div>
          {tarefasAdmin.length === 0 && !lotesAdmin.length
            ? <div style={{ padding: 18, textAlign: "center", color: "#8A938F", fontSize: 13 }}>Tudo em ordem por aqui. 🎉</div>
            : <>
              {tarefasAdmin.map(renderTarefaRow)}
              {lotesAdmin.map(([lab, exs]) => (
                <button key={lab} className="lote" onClick={() => baixarLoteRetirada(lab, exs as any[])}>🧪 {lab} retirou — dar baixa em lote ({(exs as any[]).length})</button>
              ))}
            </>}
        </div>

        {/* 🩺 Saúde das automações */}
        {saudeAuto && (() => {
          const stUI = (s: string) => s === "ok" ? { e: "🟢", c: "#0F6E56", l: "OK" } : s === "atrasado" ? { e: "🟡", c: "#8A6400", l: "Atrasado" } : s === "parado" ? { e: "🔴", c: "#B91C1C", l: "Parado" } : { e: "⚪", c: "#8A938F", l: "Aguardando 1ª" };
          const fmtId = (m: number | null) => m == null ? "sem dados" : m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`;
          const motorSt = saudeAuto.cronVivo ? "ok" : "parado";
          const temProblema = !saudeAuto.cronVivo || (saudeAuto.resumo?.parado > 0) || (saudeAuto.jobs || []).some((j: any) => j.status === "parado" || j.status === "atrasado");
          return (
            <div className="card">
              <div className="card-h" style={{ cursor: "pointer" }} onClick={() => setSaudeOpen((o) => !o)}><span>🩺</span><span className="ttl">Saúde das automações</span>{temProblema && <span title="Há automação com problema" style={{ width: 9, height: 9, borderRadius: "50%", background: "#DC2626", display: "inline-block", flexShrink: 0, boxShadow: "0 0 0 3px #FBEDE3" }} />}<span className="r">{temProblema ? (saudeAuto.cronVivo ? "🔴 ver problema" : "🔴 motor PARADO") : "tudo OK"} · {saudeOpen ? "▲ recolher" : "▼ abrir"}</span></div>
              {saudeOpen && (
              <div style={{ padding: "4px 15px 8px" }}>
                {/* motor (batida-mestre) */}
                <div className="att" style={{ borderBottom: "1px solid #F0EBE0" }}>
                  <div className="ic" style={{ fontSize: 16 }}>{stUI(motorSt).e}</div>
                  <div className="tx"><b>Motor de automações (batida-mestre)</b><small>{saudeAuto.cronVivo ? `viva ${fmtId(saudeAuto.motor?.idadeMin)}` : "sem batida — os crons pararam"}</small></div>
                  <span className="pill" style={{ background: motorSt === "ok" ? "#E7F6EE" : "#FBEDE3", color: stUI(motorSt).c }}>{stUI(motorSt).l}</span>
                </div>
                {(saudeAuto.jobs || []).map((j: any) => { const u = stUI(j.status); return (
                  <div className="att" key={j.key}>
                    <div className="ic" style={{ fontSize: 16 }}>{u.e}</div>
                    <div className="tx"><b>{j.label}</b><small>última execução {fmtId(j.idadeMin)}</small></div>
                    <span className="pill" style={{ background: j.status === "ok" ? "#E7F6EE" : j.status === "atrasado" ? "#FBF3E3" : j.status === "parado" ? "#FBEDE3" : "#F3F1EC", color: u.c }}>{u.l}</span>
                  </div>
                ); })}
              </div>
              )}
            </div>
          );
        })()}

        <div className="grid2">
          <div className="card">
            <div className="card-h"><span>🎯</span><span className="ttl">Meta da clínica</span></div>
            {metaClinica ? (
              <div className="hero" style={{ border: "none", margin: 0 }}>
                <div className="ring" style={{ background: `conic-gradient(#009AAC ${mcPct}%, #F0EBE0 0)` }}><div className="in"><b>{mcPct}%</b><small>da meta</small></div></div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, color: "#1F2A2E" }}>{brl(mcReal)} <span style={{ color: "#8A938F" }}>de</span> {brl(mcMeta)}</div>
                  <div className="miss" style={{ marginTop: 4 }}>Faltam <b style={{ color: "#D85A30" }}>{brl(Math.max(0, mcMeta - mcReal))}</b> pra bater a meta do mês.</div>
                </div>
              </div>
            ) : <div style={{ padding: 16, fontSize: 12.5, color: "#5C6B70" }}>Defina a meta da clínica em <b>Configurações › Metas</b> (sem profissional = meta geral).</div>}
          </div>
          <div className="card">
            <div className="card-h"><span>🏷️</span><span className="ttl">Onde o cliente gasta (marcas)</span></div>
            {marcas.length === 0
              ? <div style={{ padding: 16, fontSize: 12.5, color: "#5C6B70" }}>Sem vendas com marca no mês.</div>
              : <div className="sow">{marcas.slice(0, 5).map((m: any, i: number) => {
                const v = Number(m.valor ?? m.liquido ?? m.total ?? 0);
                return (<div className="row" key={i}><span className="nm">{m.marca || m.nome || m.label || "—"}</span><span className="bar"><i style={{ width: `${Math.round(v / maxMarca * 100)}%`, background: marcaCor(i) }} /></span><span className="pc">{brl(v)}</span></div>);
              })}</div>}
          </div>
        </div>
        <div className="sec">📈 Análise comercial</div>
        <div className="card"><div className="atalhos">
          <Link href="/dashboard/erp/vendas-graficos">📊 BI de Vendas (funil · turno · produtos)</Link>
          <Link href="/dashboard/erp/retencao">🔄 Retenção e Churn</Link>
          <Link href="/dashboard/erp/relacionamento">💎 Relacionamento (RFM)</Link>
        </div></div>
      </div>
    );
  }

  return (
    <PageShell pad="p-6">
      {/* Abas do "Meu painel" (Fatia 1) — perfil vem de quem está logado */}
      <div className="flex gap-1 border-b mb-4" style={{ borderColor: B44.line }}>
        {(([["painel", "🏠 Meu painel"], ["comissao", "🧾 Comissionamento"], ...(effectiveRole === "ADMIN" ? [["metas", "⚙️ Metas"]] : [])]) as [string, string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setAba(k as any)} className="text-[13.5px] px-3.5 py-2.5 -mb-px border-b-2 transition" style={{ borderColor: aba === k ? B44.primary : "transparent", color: aba === k ? B44.primary : B44.text3, fontWeight: aba === k ? 600 : 400, background: "none", cursor: "pointer" }}>{lbl}</button>
        ))}
      </div>

      {aba === "painel" && (<>
      {isRecep && renderPainelRecep()}
      {isVet && renderPainelVet()}
      {isAdmin && renderPainelAdmin()}
      {!isRecep && !isVet && !isAdmin && (<>
      {/* 🏆 Gamificação (Fatia 3) — score/nível/selos a partir das metas; sem ranking */}
      {!loading && gamif && (
        <div className="mb-4 bg-white border rounded-[16px] p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: B44.line }}>
          <div style={{ width: 78, height: 78, borderRadius: "50%", background: `conic-gradient(${gamif.cor} ${gamif.score}%, ${B44.lineSoft} 0)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 9, background: "#fff", borderRadius: "50%" }} />
            <div style={{ position: "relative", textAlign: "center" }}><b style={{ fontSize: 19, color: B44.navy, display: "block", lineHeight: 1 }}>{gamif.score}</b><small style={{ fontSize: 9, color: B44.text3 }}>score</small></div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1 rounded-full" style={{ background: gamif.nivel.bg, color: gamif.nivel.fg }}>{gamif.nivel.emoji} Nível {gamif.nivel.lbl}</span>
            <div className="flex gap-1.5 flex-wrap mt-2">
              {gamif.batidas > 0 && <span className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full" style={{ background: "#E7F6EE", color: "#0F6E56", border: "1px solid #BFE6CE" }}>🎯 {gamif.batidas} meta(s) batida(s)</span>}
              <span className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full" style={{ background: B44.soft, color: B44.text2, border: `1px solid ${B44.line}` }}>🏅 {gamif.score}% das metas</span>
              {gamif.prox && <span className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full" style={{ background: B44.soft, color: B44.text3, border: `1px solid ${B44.line}`, opacity: .55 }}>🔒 {gamif.prox.emoji} {gamif.prox.lbl}</span>}
            </div>
            {gamif.prox
              ? <p className="text-[11.5px] mt-2" style={{ color: B44.text2 }}>Faltam <b style={{ color: B44.navy }}>{gamif.prox.falta} pts</b> pro {gamif.prox.emoji} {gamif.prox.lbl}. Sem ranking — só a <b>sua evolução</b>.</p>
              : <p className="text-[11.5px] mt-2" style={{ color: B44.text2 }}>🎉 Nível máximo do mês! Sem ranking — só a sua evolução.</p>}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-medium" style={{ color: B44.navy }}>{effectiveRole === "ADMIN" ? "O que a clínica precisa de atenção hoje" : "O que você precisa atender hoje"}</h2>
        <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: B44.tint, color: "#00798A" }}>
          {loading ? "carregando..." : `${total} pendências`}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: B44.text3 }}>
          Perfil: {roleShort(effectiveRole)}{isPreviewing && <span style={{ color: "#d97706" }}> · preview</span>}
        </span>
      </div>

      <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: B44.line }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: B44.text3 }}>Carregando seu dia...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: B44.text3 }}>Tudo em ordem por aqui. 🎉</div>
        ) : (
          items.map((p, i) => {
            const inner = (
              <>
                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: B44.tint }}>
                  <span style={{ fontSize: "19px" }}>{p.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium" style={{ color: B44.text1 }}>{p.title}</div>
                  <div className="text-xs" style={{ color: B44.text2 }}>{p.sub}</div>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide hidden sm:block" style={{ color: B44.primary }}>{p.link}</span>
                <CountBadge n={p.count} />
                <span style={{ fontSize: "16px", color: B44.text3 }} className="flex-shrink-0">›</span>
              </>
            );
            const rowCls = "flex items-center gap-3.5 px-[18px] py-[13px] border-b hover:bg-[#E0F4F6]/60 transition cursor-pointer";
            const rowStyle = { borderColor: i === items.length - 1 && !(p.key === "exames" && examesOpen) ? "transparent" : B44.lineSoft } as any;
            if (p.key === "pacotes") {
              return (
                <div key={p.key}>
                  <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setPacOpen(o => !o)}>{inner}</div>
                  {pacOpen && (
                    <div style={{ background: B44.soft }}>
                      {pacRisco.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum pacote perto de acabar.</div>
                      ) : pacRisco.map((e: any) => { const done = e.remaining <= 0; return (
                        <Link key={e.id} href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                          <span className="font-medium" style={{ color: B44.text1 }}>{e.petName}</span>
                          <span className="truncate max-w-[120px]" style={{ color: B44.text2 }}>· {e.nome}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <div style={{ width: 64 }}><ProgressBar value={e.used} max={e.total || 1} height={6} color={done ? "#0F6E56" : "#BA7517"} /></div>
                            <span className="text-[10px]" style={{ color: B44.text2 }}>{e.used}/{e.total}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={done ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#FCE5C8", color: "#8A5A0F" }}>{done ? "Concluído" : "Penúltima"}</span>
                          </div>
                        </Link>
                      ); })}
                    </div>
                  )}
                </div>
              );
            }
            const fuExpand = (list: any[], open: boolean, setOpen: (f: (o: boolean) => boolean) => void, emptyMsg: string, topNode?: any, onEnc?: (e: any) => void) => (
              <div key={p.key}>
                <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setOpen(o => !o)}>{inner}</div>
                {open && (
                  <div style={{ background: B44.soft }}>
                    {topNode}
                    {list.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>{emptyMsg}</div>
                    ) : list.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                        <Link href={e.href} className="flex items-center gap-2 flex-1 min-w-0">
                          <TipoChip tipo={e.tipo} />
                          <span className="font-medium truncate" style={{ color: B44.text1 }}>{e.nome}</span>
                          {e.respNome && <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#E0F4F6", color: "#00798A" }}>👤 {String(e.respNome).split(" ")[0]}</span>}
                        </Link>
                        {e.date && <span className="whitespace-nowrap" style={{ color: B44.text2 }}>{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
                        {onEnc && <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onEnc(e); }} title="Encaminhar para outra pessoa" className="text-[10.5px] px-2 py-1 rounded-md border whitespace-nowrap hover:bg-white" style={{ borderColor: B44.line, color: B44.primary }}>Encaminhar →</button>}
                        {onEnc && <button onClick={(ev) => resolverFu(e, ev)} title="Marcar follow-up como resolvido" className="text-[10.5px] px-2 py-1 rounded-md border whitespace-nowrap font-semibold" style={{ borderColor: "#1c7a47", color: "#1c7a47", background: "#E7F6EE" }}>✓ resolver</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            if (p.key === "retornos") return fuExpand(
              fuShown, fuDueOpen, setFuDueOpen,
              fuFilter === "meus" ? "Nenhum follow-up seu para hoje." : fuFilter === "revisar" ? "Nada a revisar — todos os retornos já têm dono. 🎉" : "Nenhum follow-up vencido ou de hoje.",
              (
                <div className="flex items-center gap-1.5 px-[58px] py-2 border-b flex-wrap" style={{ borderColor: B44.lineSoft }}>
                  <span className="text-[11px] mr-1" style={{ color: B44.text3 }}>Mostrar:</span>
                  {(([["meus", "Meus"], ["revisar", "A revisar"], ["todos", "Todos"]]) as [any, string][]).map(([v, lbl]) => (
                    <button key={v} onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setFuFilter(v); }} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={fuFilter === v ? { background: "#009AAC", color: "#fff" } : { background: "#fff", border: "1px solid " + B44.line, color: B44.text2 }}>{lbl} · {(fuCounts as any)[v]}</button>
                  ))}
                </div>
              ),
              (e: any) => setEncaminhando(e),
            );
            if (p.key === "aniversariantes") return fuExpand(aniv, anivOpen, setAnivOpen, "Ninguém faz aniversário hoje.");
            if (p.key === "toques") return (
              <div key={p.key}>
                <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setToquesOpen(o => !o)}>{inner}</div>
                {toquesOpen && (
                  <div style={{ background: B44.soft }}>
                    {toques.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum toque de cadência para hoje.</div>
                    ) : toques.map((e: any) => (
                      <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                        <TipoChip tipo={e.tipo} />
                        <span className="font-medium" style={{ color: B44.text1 }}>{e.nome}</span>
                        <span className="truncate max-w-[200px]" style={{ color: B44.text2 }}>· {e.cadencia} — {e.passo}</span>
                        {e.canal && <span className="ml-auto text-[10px] font-medium" style={{ color: B44.primary }}>{e.canal}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
            if (p.key === "exames") {
              return (
                <div key={p.key}>
                  <div className={rowCls} style={rowStyle} onClick={() => setExamesOpen(o => !o)}>{inner}</div>
                  {examesOpen && (
                    <div style={{ background: B44.soft }}>
                      {(() => {
                        const porLab: Record<string, any[]> = {};
                        examesPend.filter(aguardandoRetirada).forEach((e: any) => { const lab = e.data?.fornecedorNome || "Sem laboratório"; (porLab[lab] ||= []).push(e); });
                        const labs = Object.entries(porLab);
                        if (!labs.length) return null;
                        return labs.map(([lab, exs]: any) => (
                          <div key={"lote-" + lab} className="flex items-center gap-2 px-[58px] py-2 border-b" style={{ borderColor: B44.lineSoft, background: "#F3F0FA" }}>
                            <span className="text-[11.5px] font-medium" style={{ color: "#4B3B8F" }}>🧪 {lab}: {exs.length} aguardando retirada</span>
                            <button onClick={() => baixarLoteRetirada(lab, exs)} className="ml-auto text-[11px] px-3 py-1 rounded-full font-semibold text-white hover:opacity-90 flex-shrink-0" style={{ background: "#6A4FB0" }} title={`Marcar os ${exs.length} exames de ${lab} como ${faseRetirado}`}>Laboratório retirou — baixa em lote</button>
                          </div>
                        ));
                      })()}
                      {examesPend.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum exame em acompanhamento.</div>
                      ) : examesPend.map((e: any) => (
                        <div key={e.id} className="flex items-center gap-2 px-[58px] py-2.5 border-b text-xs" style={{ borderColor: B44.lineSoft }}>
                          <Link href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 min-w-0 hover:underline">
                            <span className="font-medium truncate" style={{ color: B44.text1 }}>{e.petName}</span>
                            <span className="truncate" style={{ color: B44.text2 }}>· {e.nome}</span>
                          </Link>
                          <select value={e.status} onChange={(ev) => mudarFaseExameHoje(e.id, e.data, ev.target.value)} className="ml-auto text-[11px] border rounded-md px-2 py-1 bg-white flex-shrink-0" style={{ borderColor: B44.lineSoft, color: "#00798A" }}>
                            {(examFases.includes(e.status) ? examFases : [e.status, ...examFases]).map((f: string) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link key={p.key} href={p.href} className={rowCls} style={{ borderColor: i === items.length - 1 ? "transparent" : B44.lineSoft }}>{inner}</Link>
            );
          })
        )}
      </div>

      {/* 🎯 Minhas metas do mês (Fatia 2) */}
      {!loading && minhasMetas.length > 0 && (
        <SectionCard>
          <SectionHeader emoji="🎯" tileBg={B44.tint} title="🎯 Minhas metas do mês" sub="definidas pelo Admin — bater a meta conta na sua comissão" count={minhasMetas.length} />
          <div className="px-[18px] py-3.5 flex flex-col gap-3.5">
            {minhasMetas.map((m: any) => {
              const meta = Number(m.valorMeta || 0), real = Number(m.valorRealizado || 0);
              const pct = meta > 0 ? Math.min(100, Math.round((real / meta) * 100)) : 0;
              const falta = Math.max(0, meta - real);
              const cor = pct >= 100 ? "#0F6E56" : pct >= 70 ? B44.primary : "#B45309";
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-[13px] mb-1.5">
                    <span style={{ color: B44.text1, fontWeight: 500 }}>{metaLabel(m)}</span>
                    <span style={{ color: B44.text2 }}>{metaFmt(m, real)} / <b style={{ color: B44.navy }}>{metaFmt(m, meta)}</b></span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: B44.lineSoft }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
                  </div>
                  <div className="text-[11.5px] mt-1" style={{ color: B44.text3 }}>{pct}% {pct >= 100 ? "· meta batida 🎉" : `· faltam ${metaFmt(m, falta)}`}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      </>)}

      {/* 👥 Metas do time (Fatia 5) — só admin */}
      {!loading && effectiveRole === "ADMIN" && <MetasTimeCard metas={metas} />}

      {/* 📋 Boletins pendentes — VET e ADMIN */}
      {!loading && (effectiveRole === "VETERINARIAN" || effectiveRole === "ADMIN") && (
        <SectionCard>
          <SectionHeader emoji="📋" tileBg="#EAF3DE" title="📋 Boletins pendentes" sub="Boletins de fisioterapia salvos e ainda não enviados ao tutor" count={boletinsPend.length} />
          {boletinsPend.length === 0 ? (
            <div className="px-[18px] py-8 text-center text-sm" style={{ color: B44.text3 }}>Nenhum boletim pendente. 🎉</div>
          ) : boletinsPend.map((b) => (
            <div key={b.id} className="flex items-center gap-2.5 px-[18px] py-2.5 border-b hover:bg-[#E0F4F6]/40" style={{ borderColor: B44.lineSoft }}>
              <Link href={`/dashboard/erp/pets/${b.petId}/fisio/boletim/novo?id=${b.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                {b.sessao && <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#EAF3DE", color: "#3B6D11" }}>#{b.sessao}</span>}
                <span className="font-medium text-[13px] truncate" style={{ color: B44.text1 }}>{b.petName}</span>
                {b.mv && <span className="text-xs hidden sm:block truncate" style={{ color: B44.text2 }}>· 🧑‍⚕️ {b.mv}</span>}
                {b.date && <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>{new Date(b.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
                <span className="text-[11px] flex-shrink-0" style={{ color: B44.primary }}>abrir / enviar →</span>
              </Link>
              <button onClick={() => dispensarBoletim(b.id, b.data, b.petName)} title="Tira do painel. O boletim continua salvo na ficha do pet (não é enviado ao tutor)." className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md border hover:bg-[#F4F1EA]" style={{ color: B44.text2, borderColor: B44.lineSoft, lineHeight: 1 }}>tirar do painel</button>
            </div>
          ))}
        </SectionCard>
      )}

      {!loading && effectiveRole === "ADMIN" && (() => {
        const hhmm = (dt: any) => { try { return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
        const fmtDia = (dt: any) => { const d = new Date(dt), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1); const k = (x: Date) => x.toDateString(); if (k(d) === k(h)) return "Hoje"; if (k(d) === k(o)) return "Ontem"; return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
        const grupos: { dia: string; itens: any[] }[] = [];
        for (const e of entradas) { const dk = new Date(e.at).toDateString(); let g = grupos.find(x => x.dia === dk); if (!g) { g = { dia: dk, itens: [] }; grupos.push(g); } g.itens.push(e); }
        return (
          <SectionCard>
            <SectionHeader emoji="📋" tileBg={B44.tint} title="📋 Acompanhamento de entradas" sub="Leads e clientes que entraram — dê baixa ao conferir o atendimento" count={entradas.length} />
            {entradas.length === 0 ? (
              <div className="px-[18px] py-8 text-center text-sm" style={{ color: B44.text3 }}>Nenhuma entrada pendente de baixa.</div>
            ) : grupos.map((g) => (
              <div key={g.dia}>
                <div className="px-[18px] py-1.5 text-[11px] font-medium border-b" style={{ color: B44.text2, background: B44.soft, borderColor: B44.lineSoft }}>{fmtDia(g.itens[0].at)} ({g.itens.length})</div>
                {g.itens.map((e: any) => (
                  <div key={e.key} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#E0F4F6]/40" style={{ borderColor: B44.lineSoft }}>
                    <input type="checkbox" checked={false} onChange={() => baixarEntrada(e)} className="w-4 h-4 flex-shrink-0 cursor-pointer accent-[#009AAC]" title="Dar baixa (sai da lista, fica na ficha)" />
                    <TipoChip tipo={e.tipo} />
                    <Link href={e.href} className="font-medium text-[13px] hover:underline truncate" style={{ color: B44.text1 }}>{e.nome}</Link>
                    {e.sub && <span className="text-xs truncate hidden sm:block" style={{ color: B44.text2 }}>. {e.sub}</span>}
                    <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>{hhmm(e.at)}</span>
                  </div>
                ))}
              </div>
            ))}
          </SectionCard>
        );
      })()}
      {!loading && encMine.length > 0 && (
        <SectionCard>
          <SectionHeader emoji="↔️" tileBg="#fef3c7" title="↔️ Encaminhados para mim" sub="Clientes, pets e leads que precisam do seu atendimento" count={encMine.length} countColor="#D97706" />
          {encMine.map((e) => (
            <div key={e.entryId} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#fef9ec]" style={{ borderColor: B44.lineSoft }}>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: "#FEF3C7", color: "#92611A" }}>{e.tipo}</span>
              <Link href={encHref(e)} className="font-medium text-[13px] hover:underline truncate" style={{ color: B44.text1 }}>{e.nome}</Link>
              {e.obs && <span className="text-xs truncate hidden sm:block" style={{ color: B44.text2 }}>. {e.obs}</span>}
              {e.byName && <span className="text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>por {e.byName}</span>}
              <button onClick={() => concluirEnc(e)} className="ml-auto text-[11px] font-medium text-[#0F6E56] hover:underline flex-shrink-0">Concluir</button>
            </div>
          ))}
        </SectionCard>
      )}
      <div className="mt-6 text-xs text-center" style={{ color: B44.text3 }}>
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
        Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
      </div>
      </>)}

      {aba === "comissao" && <ComissaoAba isAdmin={effectiveRole === "ADMIN"} />}

      {aba === "metas" && effectiveRole === "ADMIN" && (
        <div className="bg-white border rounded-[14px] p-6" style={{ borderColor: B44.line }}>
          <div className="text-[15px] font-medium mb-1" style={{ color: B44.navy }}>⚙️ Metas</div>
          <p className="text-sm mb-4" style={{ color: B44.text2 }}>Aqui você vai definir as metas por perfil que alimentam a gamificação e a comissão. Por ora, a configuração está na tela atual:</p>
          <Link href="/dashboard/configuracoes/metas" className="text-[13px] font-medium px-3.5 py-2 rounded-lg text-white inline-block" style={{ background: B44.primary }}>🎯 Configurar metas</Link>
        </div>
      )}

      {/* Encaminhar follow-up → escolhe quem vai resolver (grava responsável + avisa a pessoa). */}
      {encaminhando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.30)" }} onClick={() => setEncaminhando(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col" style={{ border: "1px solid " + B44.line }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b" style={{ borderColor: B44.lineSoft }}>
              <div className="text-[14px] font-semibold" style={{ color: B44.navy }}>Encaminhar follow-up</div>
              <div className="text-[12px]" style={{ color: B44.text2 }}>{encaminhando.tipo} · {encaminhando.nome} — escolha quem vai resolver</div>
            </div>
            <div className="overflow-y-auto p-2">
              {vets.length === 0 ? (
                <div className="px-3 py-4 text-xs" style={{ color: B44.text3 }}>Carregando equipe…</div>
              ) : vets.map((u: any) => (
                <button key={u.id} onClick={() => encaminharFU(encaminhando, u.id, u.name)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#E0F4F6]/60 text-[13px] flex items-center gap-2" style={{ color: B44.text1 }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ background: "#E0F4F6", color: "#00798A" }}>{String(u.name || "?").charAt(0).toUpperCase()}</span>
                  <span className="flex-1">{u.name}</span>
                  {u.id === meId && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#E8F0E0", color: "#3B6D11" }}>eu</span>}
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t text-right" style={{ borderColor: B44.lineSoft }}>
              <button onClick={() => setEncaminhando(null)} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: B44.line, color: B44.text2 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolver follow-up → registra a observação (individualizada, autor = você) e zera o retorno. */}
      {fuResolving && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.30)" }} onClick={() => !fuSaving && setFuResolving(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" style={{ border: "1px solid " + B44.line }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b" style={{ borderColor: B44.lineSoft }}>
              <div className="text-[14px] font-semibold" style={{ color: B44.navy }}>✓ Resolver follow-up</div>
              <div className="text-[12px]" style={{ color: B44.text2 }}>{fuResolving.tipo} · {fuResolving.nome}</div>
            </div>
            <div className="p-4">
              <label className="text-[11px] font-medium" style={{ color: B44.text3 }}>Observação (o que aconteceu no retorno)</label>
              <textarea value={fuObs} onChange={(e) => setFuObs(e.target.value)} rows={3} autoFocus placeholder="Ex.: cliente retornou, pet bem; ou não atendeu, remarcar…" className="w-full mt-1 border rounded-lg px-2.5 py-2 text-[13px]" style={{ borderColor: B44.line }} />
              <div className="text-[10.5px] mt-1" style={{ color: B44.text3 }}>Fica registrada na ficha (autor: você). Pode deixar em branco.</div>
            </div>
            <div className="px-4 py-2.5 border-t flex justify-end gap-2" style={{ borderColor: B44.lineSoft }}>
              <button onClick={() => setFuResolving(null)} disabled={fuSaving} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: B44.line, color: B44.text2 }}>Cancelar</button>
              <button onClick={confirmarResolverFu} disabled={fuSaving} className="text-[12px] px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: "#1c7a47" }}>{fuSaving ? "Salvando…" : "✓ Resolver"}</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
