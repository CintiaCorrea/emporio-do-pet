"use client";
// [EMP-COWORK] Vendas — gráficos (Vendas · Fase 3). FIEL ao mockup (CSS portado, prefixo vg-). Base44 + olhinho.
// Backend: GET /api/caixa/vendas-resumo?from=&to= (total/ticket + evolução bucketizada + por grupo/marca + top itens).

import { useCallback, useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MARCA: Record<string, { lbl: string; cls: string }> = {
  EMPORIO: { lbl: "🏥 Empório", cls: "e" }, MUNDO_A_PARTE: { lbl: "🌿 Mundo à Parte", cls: "m" }, DRA_VIVIAN: { lbl: "✨ Dra. Vivian", cls: "v" },
};

const CSS = `
.vg-wrap{max-width:900px;margin:0 auto;padding:2px 0 40px}
.vg-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.vg-in{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:13px;background:#fff;color:#1F2A2E}
.vg-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.vg-btn.pri{background:#009AAC;border-color:#009AAC;color:#fff}
.vg-sub{font-size:12.5px;color:#8A989D;margin-bottom:14px}
.vg-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.vg-kpi{background:#fff;border:1px solid #E8E2D6;border-radius:12px;padding:12px 14px}
.vg-kpi .l{font-size:10.5px;color:#8A989D;text-transform:uppercase;letter-spacing:.3px}
.vg-kpi .v{font-size:22px;font-weight:500;color:#014D5E;margin-top:3px;font-variant-numeric:tabular-nums}
.vg-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden;margin-bottom:14px}
.vg-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E}
.vg-cb{padding:14px 16px}
.vg-chart{display:flex;align-items:flex-end;gap:6px;height:130px}
.vg-chart .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.vg-chart .b{width:100%;max-width:26px;background:#009AAC;border-radius:5px 5px 0 0;min-height:2px}
.vg-chart .x{font-size:9.5px;color:#8A989D}
.vg-hbar{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.vg-hbar:last-child{margin-bottom:0}
.vg-hbar .nm{width:150px;font-size:12.5px;color:#5C6B70;flex-shrink:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vg-hbar .track{flex:1;background:#F0EBE0;border-radius:999px;height:16px;overflow:hidden}
.vg-hbar .fill{height:100%;background:#009AAC;border-radius:999px}
.vg-hbar .val{width:88px;text-align:right;font-size:12px;font-weight:500;color:#014D5E;font-variant-numeric:tabular-nums;flex-shrink:0}
.vg-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:680px){.vg-cols{grid-template-columns:1fr}}
.vg-tbl{width:100%;border-collapse:collapse;font-size:13px}
.vg-tbl td{padding:8px 14px;border-bottom:1px solid #F0EBE0}
.vg-tbl tr:last-child td{border-bottom:0}
.vg-tbl td.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#014D5E}
.vg-hbar .nm.e .dummy,.vg-mk{width:150px}
.vg-fill.e{background:#009AAC}.vg-fill.m{background:#639922}.vg-fill.v{background:#7F77DD}
.vg-empty{padding:26px;text-align:center;color:#8A989D;font-size:13px}
`;

export default function VendasGraficosPage() {
  usePageTitle("Vendas — gráficos", "Como as vendas evoluem e de onde vêm");
  const hoje = new Date(); const ini = new Date(); ini.setDate(1);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [olho, setOlho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`/api/caixa/vendas-resumo?from=${from}&to=${to}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setD(r); } catch {}
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const money = (v: number) => (olho ? brl(v) : "R$ •••");
  const evol = d?.evolucao || [];
  const maxEvol = Math.max(1, ...evol.map((e: any) => Number(e.valor) || 0));
  const grupos = d?.porGrupo || [];
  const maxGrupo = Math.max(1, ...grupos.map((g: any) => Number(g.valor) || 0));
  const marcas = d?.porMarca || [];
  const maxMarca = Math.max(1, ...marcas.map((m: any) => Number(m.valor) || 0));
  const semVendas = !loading && (!d || (Number(d.total) || 0) === 0);

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="vg-wrap">
        <div className="vg-sub">Como as vendas evoluem e de onde vêm (grupo, marca, top itens). Valores ocultáveis pelo 👁️.</div>
        <div className="vg-bar">
          <input className="vg-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span style={{ color: "#8A989D" }}>a</span>
          <input className="vg-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="vg-btn pri" onClick={load}>🔍 Consultar</button>
          <button className="vg-btn" style={{ marginLeft: "auto" }} onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
        </div>

        {loading ? (
          <div className="vg-card"><div className="vg-empty">Carregando...</div></div>
        ) : semVendas ? (
          <div className="vg-card"><div className="vg-empty">📊 Sem vendas no período para gráficos.<br /><span style={{ fontSize: 12 }}>Conforme as vendas forem lançadas, os gráficos aparecem aqui.</span></div></div>
        ) : (
          <>
            <div className="vg-kpis">
              <div className="vg-kpi"><div className="l">💰 Total vendido</div><div className="v">{money(Number(d.total) || 0)}</div></div>
              <div className="vg-kpi"><div className="l">🧾 Nº de vendas</div><div className="v">{d.count || 0}</div></div>
              <div className="vg-kpi"><div className="l">🎯 Ticket médio</div><div className="v">{money(Number(d.ticket) || 0)}</div></div>
            </div>

            <div className="vg-card">
              <div className="vg-ch">📈 Evolução no período</div>
              <div className="vg-cb">
                <div className="vg-chart">
                  {evol.map((e: any, i: number) => (
                    <div className="col" key={i}><div className="b" style={{ height: `${Math.max(2, (Number(e.valor) || 0) / maxEvol * 100)}%` }} title={money(Number(e.valor) || 0)} /><div className="x">{e.label}</div></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="vg-cols">
              <div className="vg-card">
                <div className="vg-ch">🗂️ Vendas por grupo</div>
                <div className="vg-cb">
                  {grupos.length === 0 ? <div style={{ fontSize: 12, color: "#8A989D" }}>Sem dados.</div> : grupos.slice(0, 8).map((g: any) => (
                    <div className="vg-hbar" key={g.nome}><span className="nm">{g.nome}</span><div className="track"><div className="fill" style={{ width: `${(Number(g.valor) || 0) / maxGrupo * 100}%` }} /></div><span className="val">{money(Number(g.valor) || 0)}</span></div>
                  ))}
                </div>
              </div>
              <div className="vg-card">
                <div className="vg-ch">🏥 Vendas por marca</div>
                <div className="vg-cb">
                  {marcas.length === 0 ? <div style={{ fontSize: 12, color: "#8A989D" }}>Sem dados.</div> : marcas.map((m: any) => { const info = MARCA[m.nome] || { lbl: m.nome, cls: "" }; return (
                    <div className="vg-hbar" key={m.nome}><span className="nm">{info.lbl}</span><div className="track"><div className={`fill ${info.cls}`} style={{ width: `${(Number(m.valor) || 0) / maxMarca * 100}%` }} /></div><span className="val">{money(Number(m.valor) || 0)}</span></div>
                  ); })}
                </div>
              </div>
            </div>

            <div className="vg-card">
              <div className="vg-ch">🏆 Top serviços / produtos</div>
              <table className="vg-tbl"><tbody>
                {(d.topItens || []).length === 0 ? <tr><td className="vg-empty" colSpan={2}>Sem itens no período.</td></tr> : (d.topItens || []).map((t: any) => (
                  <tr key={t.nome}><td>{t.nome}</td><td className="r">{money(Number(t.valor) || 0)}</td></tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
