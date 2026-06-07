"use client";
// [EMP-COWORK] Calendário Clínico (FU) — objetivo + paleta do Base44 (Cintia 07/06)

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuTriangleAlert, LuClock, LuCalendar, LuCake, LuChevronRight } from "react-icons/lu";
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
  proximos:     { cardBg: "#FFFFFF", cardBorder: "#E5E7EB", num: "#0F2643", label: "#476385", icon: "#009AAC", rowBg: "#FFFFFF", rowBorder: "#E5E7EB", dateBg: "#009AAC", dayColor: "#0F6E56" },
  retornos:     { cardBg: "#FFF7ED", cardBorder: "#FED7AA", num: "#C2410C", label: "#C2410C", icon: "#C2410C", rowBg: "#FFF7ED", rowBorder: "#FED7AA", dateBg: "#C2410C", dayColor: "#C2410C" },
  aniversarios: { cardBg: "#FFFBEB", cardBorder: "#FDE68A", num: "#D97706", label: "#B45309", icon: "#D97706", rowBg: "#FFFBEB", rowBorder: "#FDE68A", dateBg: "#D97706", dayColor: "#B45309" },
};

const CATS: { k: TabK; card: string; tab: string; Icon: any }[] = [
  { k: "vencidos", card: "Follow-ups vencidos", tab: "Vencidos", Icon: LuTriangleAlert },
  { k: "proximos", card: "Próx. follow-ups", tab: "Próximos", Icon: LuClock },
  { k: "retornos", card: "Retornos vencidos", tab: "Retornos", Icon: LuCalendar },
  { k: "aniversarios", card: "Aniversários", tab: "Aniversários", Icon: LuCake },
];

const PERIODOS: { k: Periodo; label: string }[] = [
  { k: "hoje", label: "Hoje" }, { k: "7d", label: "7 dias" }, { k: "30d", label: "30 dias" }, { k: "mes", label: "Mês atual" }, { k: "custom", label: "Personalizado" },
];

export default function CalendarioClinicoPage() {
  usePageTitle("Calendário Clínico", "Retornos, follow-ups e datas importantes");
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard/erp/agendamentos/clinico" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#009AAC" }}>Clínico (FU)</Link>
        <Link href="/dashboard/erp/agendamentos" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border text-[#5F5E5A] hover:bg-[#f6f8f9]" style={{ borderColor: "#e8edf0" }}>Agendamentos</Link>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {PERIODOS.map((p) => (
          <button key={p.k} onClick={() => setPeriodo(p.k)} className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
            style={periodo === p.k ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5F5E5A", border: "1px solid #e8edf0" }}>
            {p.label}
          </button>
        ))}
        {periodo === "custom" && (
          <span className="flex items-center gap-1.5 ml-1">
            <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: "#e8edf0" }} />
            <span className="text-xs text-[#94a3b8]">até</span>
            <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{ borderColor: "#e8edf0" }} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {CATS.map((c) => {
          const th = TEMA[c.k]; const ativa = tab === c.k;
          return (
            <button key={c.k} onClick={() => setTab(c.k)} className="rounded-2xl p-4 text-center transition hover:brightness-[0.98]"
              style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: ativa ? `0 0 0 2px ${th.num}` : "none" }}>
              <c.Icon size={18} className="mx-auto" style={{ color: th.icon }} />
              <div className="text-[26px] font-bold leading-tight" style={{ color: th.num }}>{loading ? "—" : listas[c.k].length}</div>
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
              style={ativa ? { background: th.cardBg, color: th.num, border: `1px solid ${th.cardBorder}` } : { background: "transparent", color: "#476385", border: "1px solid transparent" }}>
              <c.Icon size={14} style={{ color: ativa ? th.icon : "#94a3b8" }} />
              {c.tab} ({listas[c.k].length})
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: tm.rowBorder }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8] bg-white">Carregando...</div>
        ) : ativos.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8] bg-white">{vazio[tab]}</div>
        ) : ativos.map((e: any, i: number) => {
          const c = TIPO[e.tipo] || TIPO.Cliente;
          return (
            <Link key={e.id} href={e.href} className="flex items-center gap-3 px-[18px] py-[13px] transition hover:brightness-[0.97]"
              style={{ background: tm.rowBg, borderBottom: i === ativos.length - 1 ? "none" : `1px solid ${tm.rowBorder}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-[#1e293b] truncate">{e.nome}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: c.bg, color: c.fg }}>{e.tipo}</span>
                </div>
                <div className="text-xs text-[#64748b] truncate">{e.sub}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block text-[11px] font-semibold text-white px-2 py-0.5 rounded-md" style={{ background: tm.dateBg }}>{fmtData(e.date)}</span>
                <div className="text-[11px] mt-0.5" style={{ color: tm.dayColor }}>{diasTxt(e.date)}</div>
              </div>
              <LuChevronRight size={16} className="text-[#94a3b8] flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
