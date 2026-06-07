"use client";
// [EMP-COWORK] Funil da Semana — snapshot semanal do pipeline de leads (auto). Snapshots em Listas funilsem_<segunda> (Cintia 07/06)

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuRefreshCcw } from "react-icons/lu";

function segundaDaSemana(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; }
const keyOf = (seg: Date) => seg.toISOString().slice(0, 10);
const fmtDM = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const labelSemana = (seg: Date) => { const fim = new Date(seg); fim.setDate(fim.getDate() + 6); return `${fmtDM(seg)}–${fmtDM(fim)}`; };

export default function FunilSemanaPage() {
  usePageTitle("Funil da Semana", "Snapshot semanal do pipeline comercial");
  const [loading, setLoading] = useState(true);
  const [estagios, setEstagios] = useState<string[]>([]);
  const [inicial, setInicial] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [snaps, setSnaps] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, l, li] = await Promise.all([
        fetch("/api/pipelines", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/leads?limit=1000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const parr = Array.isArray(p) ? p : (p.pipelines || p.data || []);
      const lead = parr.find((x: any) => /LEAD/.test(x.escopo || "")) || parr[0];
      const est = (lead?.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
      setEstagios(est.map((e: any) => e.nome));
      setInicial((est.find((e: any) => e.ehInicial)?.nome) || est[0]?.nome || "Lead novo");
      setLeads(Array.isArray(l) ? l : (l.leads || l.data || []));
      const liarr = Array.isArray(li) ? li : (li.itens || li.data || []);
      setSnaps(liarr.filter((x: any) => (x.lista || "").startsWith("funilsem_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, key: (x.lista || "").replace("funilsem_", ""), ...d }; }));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const seg = useMemo(() => segundaDaSemana(new Date()), []);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of estagios) c[e] = 0;
    for (const l of leads) { const et = l.pipelineComercialEtapa || inicial; c[et] = (c[et] || 0) + 1; }
    return c;
  }, [leads, estagios, inicial]);

  const snapAnterior = useMemo(() => {
    const segPrev = new Date(seg); segPrev.setDate(segPrev.getDate() - 7);
    const kPrev = keyOf(segPrev);
    return snaps.find((s) => s.key === kPrev) || snaps.filter((s) => s.key < keyOf(seg)).sort((a, b) => b.key.localeCompare(a.key))[0];
  }, [snaps, seg]);

  const maxCount = Math.max(1, ...estagios.map((e) => counts[e] || 0));
  const avanco = (e: string) => {
    const prev = snapAnterior?.counts?.[e];
    const cur = counts[e] || 0;
    if (prev === undefined || prev === null) return null;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const calcularAgora = async () => {
    setSalvando(true);
    try {
      const k = keyOf(seg);
      const payload = { label: labelSemana(seg), counts, at: new Date().toISOString() };
      const existente = snaps.find((s) => s.key === k);
      if (existente) await fetch(`/api/listas/${existente.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `funilsem_${k}`, valor: JSON.stringify(payload) }) });
      await load();
    } catch {} finally { setSalvando(false); }
  };

  const historico = useMemo(() => snaps.slice().sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6), [snaps]);
  const corAvanco = (v: number | null) => v === null ? "#94a3b8" : v > 0 ? "#0F6E56" : v < 0 ? "#A32D2D" : "#5b6470";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <span className="text-[12.5px] text-[#64748b]">Semana de {labelSemana(seg)}</span>
        <button onClick={calcularAgora} disabled={salvando} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60"><LuRefreshCcw className="w-3.5 h-3.5" />{salvando ? "Calculando..." : "Calcular agora"}</button>
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#94a3b8]">Carregando...</div>
      ) : (
        <>
          <div className="bg-white border rounded-2xl p-4 mb-4" style={{ borderColor: "#e8dfc8" }}>
            <div className="text-[13px] font-medium text-[#014D5E] mb-3">Volume atual por etapa</div>
            <div className="flex flex-col gap-2.5">
              {estagios.map((e, i) => { const n = counts[e] || 0; const w = Math.round((n / maxCount) * 100); const fim = i >= estagios.length - 2; return (
                <div key={e} className="flex items-center gap-3">
                  <span className="w-[150px] text-[12px] text-[#5b6470] text-right truncate">{e}</span>
                  <div className="flex-1 rounded-md h-5" style={{ background: "#f1efe8" }}><div className="h-full rounded-md" style={{ width: `${w}%`, background: fim ? "#0F6E56" : "#009AAC" }} /></div>
                  <span className="w-[28px] text-[12px] font-semibold text-[#014D5E] text-right">{n}</span>
                </div>
              ); })}
              {estagios.length === 0 && <div className="text-sm text-[#94a3b8]">Nenhuma etapa configurada no pipeline de leads.</div>}
            </div>
          </div>

          <div className="text-[13px] font-medium text-[#014D5E] mb-2">Taxas de avanço — vs. semana anterior</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            {estagios.slice(0, 8).map((e) => { const v = avanco(e); return (
              <div key={e} className="bg-white border rounded-xl p-3" style={{ borderColor: "#e8dfc8" }}>
                <div className="text-[10.5px] uppercase text-[#94a3b8] truncate">{e}</div>
                <div className="text-[18px] font-bold" style={{ color: corAvanco(v) }}>{v === null ? "—" : `${v > 0 ? "+" : ""}${v}%`} <span className="text-[11px] font-normal text-[#94a3b8]">{v === null ? "" : "avanço"}</span></div>
                <div className="text-[11px] text-[#5b6470]">{counts[e] || 0} leads</div>
              </div>
            ); })}
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8dfc8" }}>
            <div className="text-[13px] font-medium text-[#014D5E] px-4 pt-3 pb-2">Histórico — últimas semanas</div>
            {historico.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#94a3b8]">Nenhum snapshot salvo ainda. Clique em "Calcular agora".</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "collapse" }}>
                  <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase text-[#6b7280]">
                    <th className="text-left font-medium px-4 py-2">Semana</th>
                    {estagios.map((e) => <th key={e} className="text-center font-medium px-2 py-2">{e}</th>)}
                  </tr></thead>
                  <tbody className="text-[12px] text-[#0E2244]">
                    {historico.map((s, idx) => (
                      <tr key={s.id} className="border-t" style={{ borderColor: "#f4eede" }}>
                        <td className="px-4 py-2 font-medium whitespace-nowrap" style={{ color: idx === 0 ? "#0E2244" : "#5b6470" }}>{s.label || s.key}</td>
                        {estagios.map((e) => <td key={e} className="text-center px-2 py-2" style={{ color: idx === 0 ? "#0E2244" : "#5b6470" }}>{s.counts?.[e] ?? 0}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
