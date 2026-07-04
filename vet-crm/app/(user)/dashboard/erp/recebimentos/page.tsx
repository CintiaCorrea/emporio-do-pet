"use client";
// [EMP-COWORK] Recebimentos analítico (Vendas · Fase 3). FIEL ao mockup recebimentos-mockup.html (CSS portado, prefixo rc-).
// Resumo: GET /api/caixa/recebimentos-resumo?from=&to=. Lista: GET /api/caixa/recebimentos?from=&to=.

import { useCallback, useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
const dh = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "—");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaBR = (s: string) => { try { const [, m, dd] = s.split("-"); return `${dd}/${m}`; } catch { return s; } };

const CSS = `
.rc-wrap{max-width:900px;margin:0 auto;padding:2px 0 40px}
.rc-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.rc-in{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:13px;background:#fff;color:#1F2A2E}
.rc-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.rc-btn.pri{background:#009AAC;border-color:#009AAC;color:#fff}
.rc-tabs{display:flex;gap:2px;border-bottom:1px solid #E8E2D6;margin-bottom:14px}
.rc-tab{padding:8px 14px;font-size:12.5px;color:#8A989D;border-bottom:2px solid transparent;cursor:pointer;background:none;font-weight:400}
.rc-tab.on{color:#014D5E;border-bottom-color:#009AAC;font-weight:500}
.rc-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}
@media(max-width:720px){.rc-kpis{grid-template-columns:repeat(2,1fr)}}
.rc-kpi{border-radius:12px;padding:12px 13px;color:#fff}
.rc-kpi .v{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums}
.rc-kpi .l{font-size:10.5px;opacity:.95;margin-top:3px}
.rc-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:680px){.rc-cards{grid-template-columns:1fr}}
.rc-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.rc-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E;display:flex;justify-content:space-between;align-items:center}
.rc-tbl{width:100%;border-collapse:collapse;font-size:13px}
.rc-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#8A989D;font-weight:500;padding:8px 14px;background:#FBF9F4;white-space:nowrap}
.rc-tbl th.r{text-align:right}
.rc-tbl td{padding:9px 14px;border-bottom:1px solid #F0EBE0}
.rc-tbl tr:last-child td{border-bottom:0}
.rc-tbl td.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#014D5E}
.rc-empty{padding:16px;text-align:center;color:#8A989D;font-size:12px}
.rc-scroll{overflow-x:auto}
`;

export default function RecebimentosPage() {
  usePageTitle("Recebimentos", "O que entrou no caixa, por origem, forma e responsável.");
  const hoje = new Date(); const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [tab, setTab] = useState<"resumo" | "lista">("resumo");
  const [olho, setOlho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, lst] = await Promise.all([
        fetch(`/api/caixa/recebimentos-resumo?from=${from}&to=${to}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`/api/caixa/recebimentos?from=${from}&to=${to}`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setResumo(res);
      setRows(Array.isArray(lst) ? lst : (lst.data || []));
    } catch {}
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const money = (v: number) => (olho ? brl(v) : "R$ •••");
  const k = resumo?.kpis || {};
  const KPIS = [
    { l: "💵 Baixas no dia da venda", v: k.noDia, c: "#0C447C" },
    { l: "⏳ Baixas posteriores", v: k.posteriores, c: "#8a6400" },
    { l: "🏦 Adiantamento (caução)", v: k.adiantamento, c: "#5C6B70" },
    { l: "✅ Receita total", v: k.receitaTotal, c: "#0F6E56" },
    { l: "🔴 Em aberto", v: k.emAberto, c: "#b23b39" },
  ];

  const Quebra = ({ titulo, dados }: { titulo: string; dados: any[] }) => (
    <div className="rc-card">
      <div className="rc-ch">{titulo}</div>
      {(!dados || dados.length === 0) ? (
        <div className="rc-empty">Sem dados no período.</div>
      ) : (
        <table className="rc-tbl"><tbody>
          {dados.map((d: any) => (<tr key={d.nome}><td style={{ color: "#5C6B70" }}>{d.nome}</td><td className="r">{money(d.valor)}</td></tr>))}
        </tbody></table>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="rc-wrap">
        <div className="rc-bar">
          <input className="rc-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: "#8A989D" }}>a</span>
          <input className="rc-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="rc-btn pri" onClick={load}>🔍 Consultar</button>
          <button className="rc-btn" style={{ marginLeft: "auto" }} onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
        </div>

        <div className="rc-tabs">
          <button className={`rc-tab ${tab === "resumo" ? "on" : ""}`} onClick={() => setTab("resumo")}>Resumo</button>
          <button className={`rc-tab ${tab === "lista" ? "on" : ""}`} onClick={() => setTab("lista")}>Lista de recebimentos ({rows.length})</button>
        </div>

        {loading ? (
          <div className="rc-empty" style={{ padding: 60 }}>Carregando…</div>
        ) : tab === "resumo" ? (
          <>
            <div className="rc-kpis">
              {KPIS.map((kp) => (
                <div key={kp.l} className="rc-kpi" style={{ background: kp.c }}>
                  <div className="v">{money(Number(kp.v) || 0)}</div>
                  <div className="l">{kp.l}</div>
                </div>
              ))}
            </div>
            <div className="rc-cards">
              <Quebra titulo="💳 Por forma de recebimento" dados={resumo?.porForma} />
              <Quebra titulo="🧑 Por quem realizou a baixa" dados={resumo?.porUsuario} />
              <Quebra titulo="📅 Por dia" dados={(resumo?.porDia || []).map((d: any) => ({ nome: diaBR(d.nome), valor: d.valor }))} />
              <Quebra titulo="🏥 Por marca" dados={resumo?.porMarca} />
            </div>
          </>
        ) : (
          <div className="rc-card">
            <div className="rc-ch"><span>{rows.length} recebimento(s)</span><span style={{ fontWeight: 400, color: "#5C6B70" }}>Total <b style={{ color: "#014D5E" }}>{money(rows.reduce((s, r) => s + Number(r.valorTotal || 0), 0))}</b></span></div>
            <div className="rc-scroll">
              <table className="rc-tbl">
                <thead><tr><th>Data</th><th>Cliente · Pet</th><th>Formas</th><th className="r">Valor</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={4} className="rc-empty">Nenhum recebimento no período.</td></tr>}
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: "#8A989D", whiteSpace: "nowrap" }}>{dh(r.data)}</td>
                      <td style={{ color: "#1F2A2E" }}>{r.appointment?.tutor?.name || "Cliente"} · {r.appointment?.pet?.name || "Pet"}</td>
                      <td style={{ color: "#8A989D" }}>{(r.formas || []).map((f: any) => f.forma).join(" + ") || "—"}</td>
                      <td className="r">{money(Number(r.valorTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
