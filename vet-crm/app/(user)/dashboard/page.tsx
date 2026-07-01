"use client";
/* [EMP-COWORK] Dashboard nova (Cintia 07/06): comercial do Base44 + cards operacionais + motivos de perda */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuTriangleAlert, LuCalendar, LuBuilding2, LuFlaskConical, LuTarget } from "react-icons/lu";
import { useRolePreview } from "@/lib/ui/RolePreview";

const TURQ = "#009AAC";
const j = async (u: string) => { try { const r = await fetch(u, { cache: "no-store", credentials: "include" }); return await r.json(); } catch { return null; } };
const arr = (d: any, ...keys: string[]) => { if (Array.isArray(d)) return d; for (const k of keys) if (Array.isArray(d?.[k])) return d[k]; return []; };
const brl = (n: number) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dShort = (s?: string) => s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
const hhmm = (s?: string) => s ? new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

type Period = "7d" | "30d" | "tudo";
const DONE_EXAME = ["Resultado entregue ao tutor", "Pago ao laboratório", "Entregue"];

export default function DashboardPage() {
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === "ADMIN";
  const isVet = effectiveRole === "VETERINARIAN";
  const isRecep = effectiveRole === "RECEPTIONIST";
  const verComercial = isAdmin || isRecep;
  const [financeiroVisivel, setFinanceiroVisivel] = useState(false);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [leads, setLeads] = useState<any[]>([]);
  const [estagios, setEstagios] = useState<string[]>([]);
  const [inicial, setInicial] = useState("Lead novo");
  const [appts, setAppts] = useState<any[]>([]);
  const [internacoes, setInternacoes] = useState<any[]>([]);
  const [fuList, setFuList] = useState<any[]>([]);
  const [examesPend, setExamesPend] = useState(0);
  const [motivos, setMotivos] = useState<[string, number][]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [L, P, A, H, T, Pe, Li] = await Promise.all([
        j("/api/leads"), j("/api/pipelines"), j("/api/appointments?limit=3000"),
        j("/api/hospitalizations"), j("/api/tutors?limit=1000"), j("/api/pets?limit=1000"), j("/api/listas"),
      ]);
      const la = arr(L, "leads", "data"); setLeads(la);
      const parr = arr(P, "pipelines", "data");
      const lead = parr.find((x: any) => /LEAD/.test(x.escopo || "")) || parr[0];
      const est = (lead?.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
      setEstagios(est.map((e: any) => e.nome));
      setInicial((est.find((e: any) => e.ehInicial)?.nome) || est[0]?.nome || "Lead novo");
      setAppts(arr(A, "data", "appointments", "items"));
      setInternacoes(arr(H, "data", "items"));

      const now = Date.now();
      const fu: any[] = [];
      for (const t of arr(T, "tutors", "data")) if (t.proximoFollowupAt && new Date(t.proximoFollowupAt).getTime() <= now + 86400000) fu.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.proximoFollowupAt, href: `/dashboard/erp/tutores/${t.id}` });
      for (const p of arr(Pe, "pets", "data")) if (p.proximoFollowupAt && new Date(p.proximoFollowupAt).getTime() <= now + 86400000) fu.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.proximoFollowupAt, href: `/dashboard/erp/pets/${p.id}` });
      for (const l of la) if (l.proximoFollowupAt && new Date(l.proximoFollowupAt).getTime() <= now + 86400000) fu.push({ id: "l" + l.id, tipo: "Lead", nome: l.name || "Lead", date: l.proximoFollowupAt, href: `/dashboard/crm/leads/${l.id}` });
      fu.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setFuList(fu);

      let exa = 0; const mm: Record<string, number> = {};
      for (const it of arr(Li, "itens", "data")) {
        if ((it.lista || "").startsWith("petexa_")) { try { const d = JSON.parse(it.valor); if (!DONE_EXAME.includes(d.status)) exa++; } catch {} }
        else if ((it.lista || "").startsWith("leadperda_") && it.valor) { mm[it.valor] = (mm[it.valor] || 0) + 1; }
      }
      setExamesPend(exa);
      setMotivos(Object.entries(mm).sort((a, b) => b[1] - a[1]).slice(0, 6));
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => period === "tudo" ? 0 : Date.now() - (period === "7d" ? 7 : 30) * 86400000, [period]);
  const leadsP = useMemo(() => leads.filter(l => !cutoff || new Date(l.createdAt || 0).getTime() >= cutoff), [leads, cutoff]);
  const apptsP = useMemo(() => appts.filter(a => !cutoff || new Date(a.date || 0).getTime() >= cutoff), [appts, cutoff]);

  const isConv = (l: any) => l.status === "CONVERTED" || !!l.convertedToTutorId;
  const isLost = (l: any) => l.status === "LOST" || l.status === "PERDIDO";

  const kpis = useMemo(() => {
    const total = leadsP.length;
    const conv = leadsP.filter(isConv).length;
    const aberto = leadsP.filter(l => !isConv(l) && !isLost(l)).length;
    const valAppts = apptsP.filter(a => String(a.status).toUpperCase() !== "CANCELLED");
    const receita = valAppts.reduce((s, a) => s + (Number(a.value) || 0), 0);
    const comValor = valAppts.filter(a => Number(a.value) > 0).length;
    return { total, taxa: total ? Math.round((conv / total) * 100) : 0, aberto, receita, ticket: comValor ? Math.round(receita / comValor) : 0 };
  }, [leadsP, apptsP]);

  const funil = useMemo(() => {
    const c: Record<string, number> = {}; for (const e of estagios) c[e] = 0;
    for (const l of leadsP) { const et = l.pipelineComercialEtapa || inicial; c[et] = (c[et] || 0) + 1; }
    return { c, max: Math.max(1, ...estagios.map(e => c[e] || 0)) };
  }, [leadsP, estagios, inicial]);

  const porCanal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leadsP) { const k = (l.source || l.channel || "Outro").toString(); m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [leadsP]);

  const porOrigem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leadsP) { const k = (l.utmSource || l.utmCampaign || l.sourceDetail || l.source || "Direto").toString(); m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [leadsP]);

  const tendencia = useMemo(() => {
    const base = new Date(); base.setDate(1);
    const months: { label: string; y: number; mo: number; leads: number; conv: number }[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); months.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), y: d.getFullYear(), mo: d.getMonth(), leads: 0, conv: 0 }); }
    for (const l of leads) { if (!l.createdAt) continue; const d = new Date(l.createdAt); const m = months.find(x => x.y === d.getFullYear() && x.mo === d.getMonth()); if (m) { m.leads++; if (isConv(l)) m.conv++; } }
    return { months, max: Math.max(1, ...months.map(m => m.leads)) };
  }, [leads]);

  const todayAppts = useMemo(() => {
    const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(); e.setHours(23, 59, 59, 999);
    return appts.filter(a => { const t = new Date(a.date || 0).getTime(); return t >= s.getTime() && t <= e.getTime() && String(a.status).toUpperCase() !== "CANCELLED"; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appts]);

  const internAtivas = useMemo(() => internacoes.filter(h => !["DISCHARGED", "DECEASED"].includes(String(h.status).toUpperCase())), [internacoes]);
  const fuVencidos = useMemo(() => fuList.filter(f => new Date(f.date).getTime() <= Date.now()), [fuList]);

  const Card = ({ icon, label, value, href, accent, danger }: any) => (
    <Link href={href} className="block bg-white border rounded-xl p-3 hover:shadow-sm transition" style={{ borderColor: "#E8E2D6", borderLeft: `3px solid ${accent}` }}>
      <div className="text-[12px] text-[#64748b] flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-[24px] font-semibold mt-1" style={{ color: danger && value > 0 ? "#A32D2D" : "#014D5E" }}>{value}</div>
    </Link>
  );
  const Kpi = ({ label, value }: any) => (
    <div className="bg-[#FBF9F4] border rounded-xl p-3" style={{ borderColor: "#E8E2D6" }}><div className="text-[12px] text-[#64748b]">{label}</div><div className="text-[22px] font-semibold mt-0.5 text-[#014D5E]">{value}</div></div>
  );
  const Bar = ({ label, val, max, color, bg }: any) => (
    <div><div className="flex justify-between text-[12px]"><span className="text-[#334155] truncate pr-2">{label}</span><span className="text-[#64748b]">{val}</span></div>
      <div className="h-1.5 rounded-full mt-0.5" style={{ background: bg }}><div className="h-1.5 rounded-full" style={{ width: `${Math.round((val / max) * 100)}%`, background: color }} /></div></div>
  );

  if (loading) return <div className="p-6 max-w-7xl mx-auto text-sm text-[#94a3b8]">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-[#F6F2EA]">
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-[12px] text-[#64748b]">Visão geral do CRM</span>
        <div className="flex gap-1">
          {(["7d", "30d", "tudo"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="text-[11px] font-medium px-3 py-1 rounded-full border"
              style={period === p ? { background: TURQ, color: "#fff", borderColor: TURQ } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>
              {p === "tudo" ? "Tudo" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        <Card icon={<LuTriangleAlert size={14} />} label="Retornos vencidos" value={fuVencidos.length} accent="#E24B4A" danger href="/dashboard/hoje" />
        <Card icon={<LuCalendar size={14} />} label="Agenda hoje" value={todayAppts.length} accent={TURQ} href="/dashboard/erp/agendamentos/clinico" />
        <Card icon={<LuBuilding2 size={14} />} label="Internações ativas" value={internAtivas.length} accent="#0F6E56" href="/dashboard/erp/internacoes" />
        <Card icon={<LuFlaskConical size={14} />} label="Exames a entregar" value={examesPend} accent="#BA7517" href="/dashboard/erp/pets?exames=pendentes" />
      </div>

      {verComercial && (
        <div className="text-[14px] font-semibold mb-2 flex items-center gap-2 text-[#014D5E]">📊 Indicadores</div>
      )}

      {verComercial && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mb-3">
          <Kpi label="Leads total" value={kpis.total} />
          <Kpi label="Taxa conversão" value={`${kpis.taxa}%`} />
          <Kpi label="Pipeline aberto" value={kpis.aberto} />
        </div>
      )}

      {verComercial && (
        <div className="bg-white border rounded-xl p-4 mb-3" style={{ borderColor: "#E8E2D6" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-semibold text-[#014D5E]">🎯 Meta de conversão · {kpis.taxa}% / 60%</div>
            {kpis.taxa >= 60 && <span className="text-[16px]">🔥</span>}
          </div>
          <div className="h-2.5 rounded-full" style={{ background: "#EAE3D4" }}>
            <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((kpis.taxa / 60) * 100))}%`, background: kpis.taxa >= 60 ? "#0F6E56" : "#009AAC" }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[#014D5E]">🏆 Conquistas</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F3F1EC", color: "#9a948a" }}>🔥 semana ativa · em breve</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F3F1EC", color: "#9a948a" }}>🏅 meta batida · em breve</span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white border rounded-xl p-4 mb-3" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-[14px] font-semibold mb-2 flex items-center gap-2 text-[#014D5E]">
            💰 Financeiro
            <button onClick={() => setFinanceiroVisivel(v => !v)} className="text-[15px] leading-none hover:opacity-70 transition" title={financeiroVisivel ? "Ocultar valores" : "Mostrar valores"} aria-label="Alternar visibilidade financeira">
              {financeiroVisivel ? "🙈" : "👁️"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi label="Receita (atend.)" value={financeiroVisivel ? brl(kpis.receita) : "R$ ••••"} />
            <Kpi label="Ticket médio" value={financeiroVisivel ? brl(kpis.ticket) : "R$ ••••"} />
          </div>
        </div>
      )}

      {verComercial && (
      <div className="bg-white border rounded-xl p-4 mb-3" style={{ borderColor: "#E8E2D6" }}>
        <div className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#014D5E]"><LuTarget size={15} style={{ color: TURQ }} />🎯 Funil comercial — {period === "tudo" ? "todos" : "no período"}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {estagios.length === 0 ? <div className="text-sm text-[#94a3b8]">Nenhuma etapa no pipeline de leads.</div>
            : estagios.map(e => <Bar key={e} label={e} val={funil.c[e] || 0} max={funil.max} color={TURQ} bg="#E1F5EE" />)}
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-[14px] font-semibold mb-2 flex items-center gap-2 text-[#014D5E]"><LuCalendar size={15} style={{ color: TURQ }} />📅 Agenda de hoje</div>
          {todayAppts.length === 0 ? <div className="text-[13px] text-[#94a3b8] py-3">Nenhum agendamento para hoje.</div>
            : <div className="flex flex-col gap-1.5">{todayAppts.slice(0, 6).map((a, i) => (
              <div key={i} className="flex justify-between text-[13px]"><span className="text-[#334155]"><span className="text-[#64748b]">{hhmm(a.date)}</span> · {a.pet?.name || a.tutor?.name || "—"}</span><span className="text-[#64748b]">{a.user?.name || ""}</span></div>
            ))}</div>}
        </div>
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-[14px] font-semibold mb-2 flex items-center gap-2 text-[#014D5E]"><LuTriangleAlert size={15} style={{ color: "#A32D2D" }} />⚠️ Precisa de atenção</div>
          {fuVencidos.length === 0 ? <div className="text-[13px] text-[#94a3b8] py-3">Nenhum follow-up vencido.</div>
            : <div className="flex flex-col gap-1.5">{fuVencidos.slice(0, 6).map(f => (
              <Link key={f.id} href={f.href} className="flex justify-between text-[13px] hover:text-[#009AAC]"><span className="text-[#334155]"><span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ background: "#E24B4A" }} />{f.nome} <span className="text-[#94a3b8]">· {f.tipo}</span></span><span className="text-[#64748b]">{dShort(f.date)}</span></Link>
            ))}</div>}
        </div>
      </div>

      {verComercial && (<>
      <div className="bg-white border rounded-xl p-4 mb-3" style={{ borderColor: "#E8E2D6" }}>
        <div className="text-[14px] font-semibold mb-2 text-[#014D5E]">📈 Tendência de leads (últimos 12 meses)</div>
        <svg viewBox="0 0 600 90" style={{ width: "100%", height: 70 }} preserveAspectRatio="none" role="img" aria-label="Tendência de leads">
          <polyline fill="none" stroke={TURQ} strokeWidth="2.5" points={tendencia.months.map((m, i) => `${(i / 11) * 600},${85 - (m.leads / tendencia.max) * 78}`).join(" ")} />
          <polyline fill="none" stroke="#D4537E" strokeWidth="2" points={tendencia.months.map((m, i) => `${(i / 11) * 600},${85 - (m.conv / tendencia.max) * 78}`).join(" ")} />
        </svg>
        <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">{tendencia.months.map((m, i) => <span key={i}>{m.label}</span>)}</div>
        <div className="text-[11px] text-[#64748b] mt-1 flex gap-3"><span style={{ color: TURQ }}>● Leads</span><span style={{ color: "#D4537E" }}>● Convertidos</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-[14px] font-semibold mb-3 text-[#014D5E]">📡 Leads por canal</div>
          <div className="flex flex-col gap-2">{porCanal.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem dados no período.</div> : porCanal.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...porCanal.map(x => x[1]))} color={TURQ} bg="#E1F5EE" />)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-[14px] font-semibold mb-3 text-[#014D5E]">🧭 Leads por origem / campanha</div>
          <div className="flex flex-col gap-2">{porOrigem.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem dados no período.</div> : porOrigem.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...porOrigem.map(x => x[1]))} color="#185FA5" bg="#E6F1FB" />)}</div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 mt-3" style={{ borderColor: "#E8E2D6" }}>
        <div className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#014D5E]"><LuTriangleAlert size={15} style={{ color: "#A32D2D" }} />❌ Top motivos de perda</div>
        <div className="flex flex-col gap-2">{motivos.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem motivos registrados ainda. Preencha na ficha do lead perdido.</div> : motivos.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...motivos.map(x => x[1]))} color="#E24B4A" bg="#FCEBEB" />)}</div>
      </div>
      </>)}
    </div>
    </div>
  );
}
