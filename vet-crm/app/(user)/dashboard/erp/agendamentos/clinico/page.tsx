"use client";
// [EMP-COWORK] Calendário Clínico (FU) — objetivo + paleta do Base44 (Cintia 07/06)
// Roupagem repaginada Base44 delicada — LOGICA 100% preservada.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Periodo = "hoje" | "7d" | "30d" | "mes" | "custom";
type TabK = "vencidos" | "proximos" | "retornos" | "aniversarios";

const TIPO: Record<string, { bg: string; fg: string }> = {
  Lead: { bg: "#DBEAFE", fg: "#1D4ED8" },
  Cliente: { bg: "#E0F4F6", fg: "#00798A" },
  Pet: { bg: "#E1F5EE", fg: "#0F6E56" },
  Retorno: { bg: "#FFF7ED", fg: "#C2410C" },
};

type Tema = { cardBg: string; cardBorder: string; num: string; label: string; icon: string; rowBg: string; rowBorder: string; dateBg: string; dayColor: string };
const TEMA: Record<TabK, Tema> = {
  vencidos:     { cardBg: "#FEF2F2", cardBorder: "#FECACA", num: "#DC2626", label: "#B91C1C", icon: "#DC2626", rowBg: "#FEF2F2", rowBorder: "#FECACA", dateBg: "#CC3366", dayColor: "#CC3366" },
  proximos:     { cardBg: "#FFFFFF", cardBorder: "#E8E2D6", num: "#014D5E", label: "#5C6B70", icon: "#009AAC", rowBg: "#FFFFFF", rowBorder: "#E8E2D6", dateBg: "#009AAC", dayColor: "#0F6E56" },
  retornos:     { cardBg: "#FFF7ED", cardBorder: "#FED7AA", num: "#C2410C", label: "#C2410C", icon: "#C2410C", rowBg: "#FFF7ED", rowBorder: "#FED7AA", dateBg: "#C2410C", dayColor: "#C2410C" },
  aniversarios: { cardBg: "#FFFBEB", cardBorder: "#FDE68A", num: "#D97706", label: "#B45309", icon: "#D97706", rowBg: "#FFFBEB", rowBorder: "#FDE68A", dateBg: "#D97706", dayColor: "#B45309" },
};

const CATS: { k: TabK; card: string; tab: string; emoji: string }[] = [
  { k: "vencidos", card: "Follow-ups vencidos", tab: "Vencidos", emoji: "⚠️" },
  { k: "proximos", card: "Próx. follow-ups", tab: "Próximos", emoji: "🕐" },
  { k: "retornos", card: "Retornos vencidos", tab: "Retornos", emoji: "📅" },
  { k: "aniversarios", card: "Aniversários", tab: "Aniversários", emoji: "🎂" },
];

const PERIODOS: { k: Periodo; label: string }[] = [
  { k: "hoje", label: "Hoje" }, { k: "7d", label: "7 dias" }, { k: "30d", label: "30 dias" }, { k: "mes", label: "Mês atual" }, { k: "custom", label: "Personalizado" },
];

export default function CalendarioClinicoPage() {
  usePageTitle("Calendário Clínico", "Retornos, follow-ups e datas importantes");
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");
  const [tab, setTab] = useState<TabK>("vencidos");
  const [loading, setLoading] = useState(true);
  const [tutors, setTutors] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [t, p, l, a] = await Promise.all([
          fetch("/api/tutors?limit=1000").then((r) => r.json()).catch(() => []),
          fetch("/api/pets?limit=1000").then((r) => r.json()).catch(() => []),
          fetch("/api/leads?limit=1000").then((r) => r.json()).catch(() => []),
          fetch("/api/appointments?limit=1000").then((r) => r.json()).catch(() => []),
        ]);
        setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
        setPets(Array.isArray(p) ? p : (p.pets || p.data || []));
        setLeads(Array.isArray(l) ? l : (l.leads || l.data || []));
        setAppts(Array.isArray(a) ? a : (a.appointments || a.data || []));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const periodStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (periodo === "custom" && customIni) { const x = new Date(customIni); x.setHours(0, 0, 0, 0); return x; }
    return d;
  }, [periodo, customIni]);

  const periodEnd = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999);
    if (periodo === "hoje") return d;
    if (periodo === "7d") { d.setDate(d.getDate() + 7); return d; }
    if (periodo === "30d") { d.setDate(d.getDate() + 30); return d; }
    if (periodo === "mes") return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    if (periodo === "custom" && customFim) { const x = new Date(customFim); x.setHours(23, 59, 59, 999); return x; }
    return d;
  }, [periodo, customFim]);

  const { vencidos, proximos, retornos, aniversarios } = useMemo(() => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const venc: any[] = [], prox: any[] = [];
    const addFu = (arr: any[], tipo: string, pre: string, sub: (x: any) => string, href: (x: any) => string) => {
      for (const x of arr) {
        if (!x.proximoFollowupAt) continue;
        const dt = new Date(x.proximoFollowupAt);
        const item = { id: pre + x.id, tipo, nome: x.name || tipo, sub: sub(x), date: x.proximoFollowupAt, href: href(x) };
        if (dt < startToday) venc.push(item);
        else if (dt >= periodStart && dt <= periodEnd) prox.push(item);
      }
    };
    addFu(tutors, "Cliente", "t", (x) => x.estadoRelacionamento || "Follow-up", (x) => `/dashboard/erp/tutores/${x.id}`);
    addFu(pets, "Pet", "p", (x) => x.species || x.pipelineClinicoEtapa || "Follow-up", (x) => `/dashboard/erp/pets/${x.id}`);
    addFu(leads, "Lead", "l", (x) => x.pipelineComercialEtapa || "Lead", (x) => `/dashboard/crm/leads/${x.id}`);

    const ret: any[] = [];
    for (const a of appts) {
      if (!a.nextReturnDate) continue;
      const dt = new Date(a.nextReturnDate);
      if (dt < startToday) {
        const petName = a.pet?.name; const who = petName || a.tutor?.name || "Retorno";
        ret.push({ id: "a" + a.id, tipo: "Retorno", nome: who, sub: petName ? "Retorno clínico" : "Retorno", date: a.nextReturnDate, href: a.pet?.id ? `/dashboard/erp/pets/${a.pet.id}` : (a.tutor?.id ? `/dashboard/erp/tutores/${a.tutor.id}` : "#") });
      }
    }

    const ani: any[] = [];
    const inRange = (bd: string): Date | null => {
      if (!bd) return null;
      const b = new Date(bd);
      for (let y = periodStart.getFullYear(); y <= periodEnd.getFullYear() + 1; y++) {
        const occ = new Date(y, b.getMonth(), b.getDate(), 12, 0, 0, 0);
        if (occ >= periodStart && occ <= periodEnd) return occ;
      }
      return null;
    };
    for (const t of tutors) { const occ = inRange(t.birthDate); if (occ) ani.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", sub: "Aniversário", date: occ.toISOString(), href: `/dashboard/erp/tutores/${t.id}` }); }
    for (const p of pets) { const occ = inRange(p.birthDate); if (occ) ani.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", sub: "Aniversário do pet", date: occ.toISOString(), href: `/dashboard/erp/pets/${p.id}` }); }

    const byDate = (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime();
    venc.sort(byDate); prox.sort(byDate); ret.sort(byDate); ani.sort(byDate);
    return { vencidos: venc, proximos: prox, retornos: ret, aniversarios: ani };
  }, [tutors, pets, leads, appts, periodStart, periodEnd]);

  const listas: Record<TabK, any[]> = { vencidos, proximos, retornos, aniversarios };
  const fmtData = (s: string) => { try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };
  const situacao = (s: string) => {
    const d = new Date(s); const t = new Date();
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
    if (diff === 0) return { txt: "hoje", cor: "#0F6E56" };
    if (diff < 0) return { txt: `${Math.abs(diff)}d de atraso`, cor: "#CC3366" };
    return { txt: `em ${diff}d`, cor: "#8A989D" };
  };
  const diasTxt = (s: string) => {
    const d = new Date(s); const t = new Date();
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
    if (diff === 0) return "hoje";
    if (diff < 0) return `${Math.abs(diff)}d de atraso`;
    return `em ${diff}d`;
  };

  const ativos = listas[tab];
  const vazio: Record<TabK, string> = {
    vencidos: "Nenhum follow-up vencido. 🎉",
    proximos: "Nenhum follow-up previsto no período.",
    retornos: "Nenhum retorno vencido.",
    aniversarios: "Ninguém faz aniversário no período.",
  };
  const tm = TEMA[tab];

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ background: "#F6F2EA", minHeight: "100%" }}>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard/erp/agendamentos/clinico" className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#009AAC" }}>🩺 Clínico (FU)</Link>
        <Link href="/dashboard/erp/agendamentos/calendario" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border text-[#5C6B70] hover:bg-[#FBF9F4]" style={{ borderColor: "#E8E2D6" }}>📅 Agenda</Link>
        <Link href="/dashboard/erp/agendamentos" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border text-[#5C6B70] hover:bg-[#FBF9F4]" style={{ borderColor: "#E8E2D6" }}>Lista</Link>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {PERIODOS.map((p) => (
          <button key={p.k} onClick={() => setPeriodo(p.k)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
            style={periodo === p.k ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70", border: "1px solid #E8E2D6" }}>
            {p.label}
          </button>
        ))}
        {periodo === "custom" && (
          <span className="flex items-center gap-1.5 ml-1">
            <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6" }} />
            <span className="text-xs text-[#8A989D]">até</span>
            <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6" }} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {CATS.map((c) => {
          const th = TEMA[c.k]; const ativa = tab === c.k;
          return (
            <button key={c.k} onClick={() => setTab(c.k)} className="rounded-2xl p-4 text-center transition hover:brightness-[0.98]"
              style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: ativa ? `0 0 0 2px ${th.num}` : "none" }}>
              <span className="block mx-auto" style={{ fontSize: 18, lineHeight: 1 }}>{c.emoji}</span>
              <div className="text-[26px] font-medium leading-tight" style={{ color: th.num }}>{loading ? "—" : listas[c.k].length}</div>
              <div className="text-[11.5px]" style={{ color: th.label }}>{c.card}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {CATS.map((c) => {
          const th = TEMA[c.k]; const ativa = tab === c.k;
          return (
            <button key={c.k} onClick={() => setTab(c.k)} className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition"
              style={ativa ? { background: th.cardBg, color: th.num, border: `1px solid ${th.cardBorder}` } : { background: "transparent", color: "#5C6B70", border: "1px solid transparent" }}>
              <span style={{ fontSize: 14, lineHeight: 1, opacity: ativa ? 1 : 0.6 }}>{c.emoji}</span>
              {c.tab} ({listas[c.k].length})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[#E8E2D6] overflow-hidden">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-[11.5px] uppercase tracking-wide text-[#8A989D]" style={{ borderBottom: "1px solid #E8E2D6" }}>
              <th className="text-left font-medium px-3.5 py-1.5">Cliente / Pet</th>
              <th className="text-left font-medium px-2 py-1.5">Tipo</th>
              <th className="text-left font-medium px-2 py-1.5">Contexto</th>
              <th className="text-left font-medium px-2 py-1.5">Data</th>
              <th className="text-right font-medium px-3.5 py-1.5">Situação</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px] text-[#1F2A2E]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#8A989D]">Carregando...</td></tr>
            ) : ativos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#8A989D]">{vazio[tab]}</td></tr>
            ) : ativos.map((e: any) => {
              const c = TIPO[e.tipo] || TIPO.Cliente; const sit = situacao(e.date);
              return (
                <tr key={e.id} onClick={() => e.href && e.href !== "#" && router.push(e.href)} className="border-t border-[#F0EBE0] hover:bg-[#FBF9F4] transition cursor-pointer">
                  <td className="px-3.5 py-1.5 whitespace-nowrap"><span className="inline-block w-[7px] h-[7px] rounded-full align-middle mr-2" style={{ background: sit.cor }} />{e.nome}</td>
                  <td className="px-2 py-1.5"><span className="text-[9.5px] px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>{e.tipo}</span></td>
                  <td className="px-2 py-1.5 text-[#5C6B70] truncate max-w-[220px]">{e.sub}</td>
                  <td className="px-2 py-1.5 text-[#5C6B70] whitespace-nowrap">{fmtData(e.date)}</td>
                  <td className="px-3.5 py-1.5 text-right font-medium whitespace-nowrap" style={{ color: sit.cor }}>{sit.txt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 flex gap-3.5 flex-wrap text-[11px] text-[#8A989D]">
        <span className="inline-flex items-center gap-1.5"><span className="w-[7px] h-[7px] rounded-full" style={{ background: "#CC3366" }} />Em atraso</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-[7px] h-[7px] rounded-full" style={{ background: "#0F6E56" }} />Hoje</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-[7px] h-[7px] rounded-full" style={{ background: "#8A989D" }} />Próximo</span>
      </div>
    </div>
  );
}
