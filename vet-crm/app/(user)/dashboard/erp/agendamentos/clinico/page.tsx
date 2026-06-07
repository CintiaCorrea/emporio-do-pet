"use client";
// [EMP-COWORK] Calendário Clínico (FU) — objetivo do Base44 trazido pro app (Cintia 07/06)

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuTriangleAlert, LuClock, LuRefreshCcw, LuCake, LuChevronRight, LuCalendar } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Periodo = "hoje" | "7d" | "30d" | "mes" | "custom";
type TabK = "vencidos" | "proximos" | "retornos" | "aniversarios";

const TIPO: Record<string, { bg: string; fg: string }> = {
  Lead: { bg: "#E6F1FB", fg: "#0C447C" },
  Cliente: { bg: "#E0F4F6", fg: "#00798A" },
  Pet: { bg: "#E1F5EE", fg: "#0F6E56" },
  Retorno: { bg: "#FAEEDA", fg: "#854F0B" },
};

const PERIODOS: { k: Periodo; label: string }[] = [
  { k: "hoje", label: "Hoje" },
  { k: "7d", label: "7 dias" },
  { k: "30d", label: "30 dias" },
  { k: "mes", label: "Mês atual" },
  { k: "custom", label: "Personalizado" },
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

  const fmtData = (s: string) => { try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };
  const diasLabel = (s: string, ani: boolean) => {
    const d = new Date(s); const t = new Date();
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const diff = Math.round((d0 - t0) / 86400000);
    if (diff === 0) return { txt: "hoje", cor: "#0F6E56" };
    if (diff < 0) return { txt: `${Math.abs(diff)}d de atraso`, cor: "#A32D2D" };
    return { txt: `em ${diff}d`, cor: ani ? "#993556" : "#64748b" };
  };

  const cards = [
    { k: "vencidos" as TabK, n: vencidos.length, label: "Follow-ups vencidos", Icon: LuTriangleAlert, bg: "#FCEBEB", fg: "#A32D2D" },
    { k: "proximos" as TabK, n: proximos.length, label: "Próx. follow-ups", Icon: LuClock, bg: "#E1F5EE", fg: "#0F6E56" },
    { k: "retornos" as TabK, n: retornos.length, label: "Retornos vencidos", Icon: LuRefreshCcw, bg: "#FAEEDA", fg: "#854F0B" },
    { k: "aniversarios" as TabK, n: aniversarios.length, label: "Aniversários no período", Icon: LuCake, bg: "#FBEAF0", fg: "#993556" },
  ];
  const ativos = tab === "vencidos" ? vencidos : tab === "proximos" ? proximos : tab === "retornos" ? retornos : aniversarios;
  const vazioMsg: Record<TabK, string> = {
    vencidos: "Nenhum follow-up vencido. 🎉",
    proximos: "Nenhum follow-up previsto no período.",
    retornos: "Nenhum retorno vencido.",
    aniversarios: "Ninguém faz aniversário no período.",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard/erp/agendamentos/clinico" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#009AAC" }}>Clínico (FU)</Link>
        <Link href="/dashboard/erp/agendamentos" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border text-[#5F5E5A] hover:bg-[#f6f8f9]" style={{ borderColor: "#e8edf0" }}>Agendamentos</Link>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {PERIODOS.map((p) => (
          <button key={p.k} onClick={() => setPeriodo(p.k)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
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
        {cards.map((c) => (
          <button key={c.k} onClick={() => setTab(c.k)}
            className="rounded-2xl p-4 text-center transition hover:opacity-90"
            style={{ background: c.bg, outline: tab === c.k ? `2px solid ${c.fg}` : "none" }}>
            <c.Icon size={18} className="mx-auto" style={{ color: c.fg }} />
            <div className="text-[26px] font-bold leading-tight" style={{ color: c.fg }}>{loading ? "—" : c.n}</div>
            <div className="text-[11.5px]" style={{ color: c.fg }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-5 border-b mb-0 flex-wrap" style={{ borderColor: "#e8edf0" }}>
        {cards.map((c) => (
          <button key={c.k} onClick={() => setTab(c.k)}
            className="py-2.5 text-[13px] font-medium border-b-2 transition"
            style={tab === c.k ? { borderColor: "#009AAC", color: "#014D5E" } : { borderColor: "transparent", color: "#888780" }}>
            {c.label.replace("Follow-ups ", "").replace("Próx. follow-ups", "Próximos").replace(" no período", "").replace("Retornos vencidos", "Retornos")} ({c.n})
          </button>
        ))}
      </div>

      <div className="bg-white border border-t-0 rounded-b-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Carregando...</div>
        ) : ativos.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">{vazioMsg[tab]}</div>
        ) : ativos.map((e: any, i: number) => {
          const dl = diasLabel(e.date, tab === "aniversarios");
          const c = TIPO[e.tipo] || TIPO.Cliente;
          return (
            <Link key={e.id} href={e.href}
              className="flex items-center gap-3 px-[18px] py-[13px] border-b hover:bg-[#e6f6f8]/60 transition"
              style={{ borderColor: i === ativos.length - 1 ? "transparent" : "#e8edf0" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-[#1e293b] truncate">{e.nome}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: c.bg, color: c.fg }}>{e.tipo}</span>
                </div>
                <div className="text-xs text-[#64748b] truncate">{e.sub}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[12px] text-[#5F5E5A]">{fmtData(e.date)}</div>
                <div className="text-[11px]" style={{ color: dl.cor }}>{dl.txt}</div>
              </div>
              <LuChevronRight size={16} className="text-[#94a3b8] flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
