"use client";
/* [EMP-COWORK] Análise comercial embutida no Dashboard (Cintia 30/06): seções analíticas que vieram de /dashboard/relatorios, sem duplicar o painel gamificado */

import { useEffect, useMemo, useState } from "react";
import { useRolePreview } from "@/lib/ui/RolePreview";

const TURQ = "#009AAC";
const j = async (u: string) => { try { const r = await fetch(u, { cache: "no-store", credentials: "include" }); return await r.json(); } catch { return null; } };
const arr = (d: any, ...keys: string[]) => { if (Array.isArray(d)) return d; for (const k of keys) if (Array.isArray(d?.[k])) return d[k]; return []; };

type Period = "7d" | "30d" | "tudo";

export default function AnaliseComercial() {
  const { effectiveRole } = useRolePreview();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [leads, setLeads] = useState<any[]>([]);
  const [estagios, setEstagios] = useState<string[]>([]);
  const [inicial, setInicial] = useState("Lead novo");
  const [motivos, setMotivos] = useState<[string, number][]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [L, P, Li] = await Promise.all([
        j("/api/leads"), j("/api/pipelines"), j("/api/listas"),
      ]);
      const la = arr(L, "leads", "data"); setLeads(la);
      const parr = arr(P, "pipelines", "data");
      const lead = parr.find((x: any) => /LEAD/.test(x.escopo || "")) || parr[0];
      const est = (lead?.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
      setEstagios(est.map((e: any) => e.nome));
      setInicial((est.find((e: any) => e.ehInicial)?.nome) || est[0]?.nome || "Lead novo");

      const mm: Record<string, number> = {};
      for (const it of arr(Li, "itens", "data")) {
        if ((it.lista || "").startsWith("leadperda_") && it.valor) { mm[it.valor] = (mm[it.valor] || 0) + 1; }
      }
      setMotivos(Object.entries(mm).sort((a, b) => b[1] - a[1]).slice(0, 6));
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => period === "tudo" ? 0 : Date.now() - (period === "7d" ? 7 : 30) * 86400000, [period]);
  const leadsP = useMemo(() => leads.filter(l => !cutoff || new Date(l.createdAt || 0).getTime() >= cutoff), [leads, cutoff]);

  const isConv = (l: any) => l.status === "CONVERTED" || !!l.convertedToTutorId;
  const isLost = (l: any) => l.status === "LOST" || l.status === "PERDIDO";

  const kpis = useMemo(() => {
    const total = leadsP.length;
    const conv = leadsP.filter(isConv).length;
    const aberto = leadsP.filter(l => !isConv(l) && !isLost(l)).length;
    return { total, taxa: total ? Math.round((conv / total) * 100) : 0, aberto };
  }, [leadsP]);

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

  const Bar = ({ label, val, max, color, bg }: any) => (
    <div><div className="flex justify-between text-[12px]"><span className="text-[#334155] truncate pr-2">{label}</span><span className="text-[#64748b]">{val}</span></div>
      <div className="h-1.5 rounded-full mt-0.5" style={{ background: bg }}><div className="h-1.5 rounded-full" style={{ width: `${Math.round((val / max) * 100)}%`, background: color }} /></div></div>
  );

  // Role gate: só Admin e Recepção veem análise comercial
  if (effectiveRole === "VETERINARIAN") return null;

  if (loading) return <div className="mt-4 text-sm text-[#94a3b8]">Carregando análise comercial...</div>;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[14px] font-semibold text-[#014D5E]">📊 Análise comercial</span>
        <div className="flex gap-1">
          {(["7d", "30d", "tudo"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="text-[11px] font-medium px-3 py-1 rounded-full border"
              style={period === p ? { background: TURQ, color: "#fff", borderColor: TURQ } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>
              {p === "tudo" ? "Tudo" : p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[14px] font-semibold mb-2 flex items-center gap-2 text-[#014D5E]">📊 Indicadores comerciais</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="bg-[#FBF9F4] border border-[#E8E2D6] rounded-xl p-3"><div className="text-[12px] text-[#64748b]">Leads total</div><div className="text-[22px] font-semibold mt-0.5 text-[#014D5E]">{kpis.total}</div></div>
          <div className="bg-[#FBF9F4] border border-[#E8E2D6] rounded-xl p-3"><div className="text-[12px] text-[#64748b]">Taxa conversão</div><div className="text-[22px] font-semibold mt-0.5 text-[#014D5E]">{kpis.taxa}%</div></div>
          <div className="bg-[#FBF9F4] border border-[#E8E2D6] rounded-xl p-3"><div className="text-[12px] text-[#64748b]">Pipeline aberto</div><div className="text-[22px] font-semibold mt-0.5 text-[#014D5E]">{kpis.aberto}</div></div>
        </div>
      </div>

      <div className="bg-white border border-[#E8E2D6] rounded-xl p-4">
        <div className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#014D5E]">🎯 Funil comercial — {period === "tudo" ? "todos" : "no período"}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {estagios.length === 0 ? <div className="text-sm text-[#94a3b8]">Nenhuma etapa no pipeline de leads.</div>
            : estagios.map(e => <Bar key={e} label={e} val={funil.c[e] || 0} max={funil.max} color={TURQ} bg="#E1F5EE" />)}
        </div>
      </div>

      <div className="bg-white border border-[#E8E2D6] rounded-xl p-4">
        <div className="text-[14px] font-semibold mb-2 text-[#014D5E]">📈 Tendência de leads (últimos 12 meses)</div>
        <svg viewBox="0 0 600 90" style={{ width: "100%", height: 70 }} preserveAspectRatio="none" role="img" aria-label="Tendência de leads">
          <polyline fill="none" stroke={TURQ} strokeWidth="2.5" points={tendencia.months.map((m, i) => `${(i / 11) * 600},${85 - (m.leads / tendencia.max) * 78}`).join(" ")} />
          <polyline fill="none" stroke="#D4537E" strokeWidth="2" points={tendencia.months.map((m, i) => `${(i / 11) * 600},${85 - (m.conv / tendencia.max) * 78}`).join(" ")} />
        </svg>
        <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">{tendencia.months.map((m, i) => <span key={i}>{m.label}</span>)}</div>
        <div className="text-[11px] text-[#64748b] mt-1 flex gap-3"><span style={{ color: TURQ }}>● Leads</span><span style={{ color: "#D4537E" }}>● Convertidos</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-[#E8E2D6] rounded-xl p-4">
          <div className="text-[14px] font-semibold mb-3 text-[#014D5E]">📡 Leads por canal</div>
          <div className="flex flex-col gap-2">{porCanal.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem dados no período.</div> : porCanal.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...porCanal.map(x => x[1]))} color={TURQ} bg="#E1F5EE" />)}</div>
        </div>
        <div className="bg-white border border-[#E8E2D6] rounded-xl p-4">
          <div className="text-[14px] font-semibold mb-3 text-[#014D5E]">🧭 Leads por origem / campanha</div>
          <div className="flex flex-col gap-2">{porOrigem.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem dados no período.</div> : porOrigem.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...porOrigem.map(x => x[1]))} color="#185FA5" bg="#E6F1FB" />)}</div>
        </div>
      </div>

      <div className="bg-white border border-[#E8E2D6] rounded-xl p-4">
        <div className="text-[14px] font-semibold mb-3 flex items-center gap-2 text-[#014D5E]">❌ Top motivos de perda</div>
        <div className="flex flex-col gap-2">{motivos.length === 0 ? <div className="text-[13px] text-[#94a3b8]">Sem motivos registrados ainda. Preencha na ficha do lead perdido.</div> : motivos.map(([k, v]) => <Bar key={k} label={k} val={v} max={Math.max(1, ...motivos.map(x => x[1]))} color="#E24B4A" bg="#FCEBEB" />)}</div>
      </div>
    </div>
  );
}
