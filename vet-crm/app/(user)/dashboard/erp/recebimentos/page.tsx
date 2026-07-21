"use client";
// [EMP-COWORK] Recebimentos analítico (Vendas · repaginação padrão "delicada"): cores SUAVES + tela inteira + barra de filtros.
// Resumo: GET /api/caixa/recebimentos-resumo?from=&to=. Lista: GET /api/caixa/recebimentos?from=&to= (linhas trazem usuario + marcas).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
const dh = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "—");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaBR = (s: string) => { try { const [, m, dd] = s.split("-"); return `${dd}/${m}`; } catch { return s; } };
const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))];

const CSS = `
.rc-page{width:100%;padding:2px 2px 48px}
/* barra de filtros — padrão suave */
.rc-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.rc-field{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #E8E2D6;border-radius:9px;padding:6px 10px;font-size:13px;color:#1F2A2E}
.rc-in{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit}
.rc-sel{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit;min-width:150px}
.rc-icon{width:38px;height:38px;border-radius:9px;border:1px solid #E8E2D6;background:#fff;color:#014D5E;display:inline-flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer}
.rc-icon.pri{background:#009AAC;border-color:#009AAC;color:#fff}
.rc-icon.funnel.on{background:#FBF3E3;border-color:#efe1c2;color:#8a6400}
.rc-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:6px}
.rc-adv{background:#FBF9F4;border:1px solid #E8E2D6;border-radius:12px;padding:14px 16px;margin-bottom:16px}
.rc-adv .row{display:flex;gap:14px;flex-wrap:wrap}
.rc-lb{font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;color:#374151;display:block;margin-bottom:4px}
.rc-tabs{display:flex;gap:24px;border-bottom:1px solid #E8E2D6;margin-bottom:16px}
.rc-tab{background:none;border:none;font-family:inherit;font-size:13.5px;color:#374151;padding:9px 2px;cursor:pointer;border-bottom:2px solid transparent}
.rc-tab.on{color:#014D5E;font-weight:500;border-bottom-color:#009AAC}
/* KPIs — cores SUAVES, largura toda */
.rc-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:18px}
@media(max-width:900px){.rc-kpis{grid-template-columns:repeat(2,1fr)}}
.rc-kpi{border-radius:14px;padding:15px 17px;border:1px solid transparent}
.rc-kpi .l{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;opacity:.92}
.rc-kpi .v{font-size:23px;font-weight:600;margin-top:8px;font-variant-numeric:tabular-nums}
.k-blue{background:#E6F1FB;border-color:#cfe0f2;color:#0C447C}
.k-gold{background:#FBF3E3;border-color:#efe1c2;color:#8a6400}
.k-gray{background:#F1EFE8;border-color:#e2ddd0;color:#5F5E5A}
.k-green{background:#E7F6EE;border-color:#c9ecd8;color:#1c7a47}
.k-red{background:#FDECEC;border-color:#f4d3d3;color:#b23b39}
/* blocos analíticos — largura toda (2 colunas amplas) */
.rc-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:820px){.rc-cards{grid-template-columns:1fr}}
.rc-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.rc-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E;display:flex;justify-content:space-between;align-items:center}
.rc-tbl{width:100%;border-collapse:collapse;font-size:13px}
.rc-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:500;padding:8px 14px;background:#FBF9F4;white-space:nowrap}
.rc-tbl th.r{text-align:right}
.rc-tbl td{padding:9px 14px;border-bottom:1px solid #F0EBE0}
.rc-tbl tr:last-child td{border-bottom:0}
.rc-tbl td.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#014D5E}
.rc-empty{padding:16px;text-align:center;color:#374151;font-size:12px}
.rc-scroll{overflow-x:auto}
.rc-print-h{display:none}
@media print{
  .no-print{display:none!important}
  .rc-page{padding:0}
  .rc-print-h{display:block;margin-bottom:14px}
  .rc-print-h h2{font-size:16px;color:#014D5E;margin:0 0 2px}
  .rc-print-h p{font-size:12px;color:#5C6B70;margin:0}
  .rc-kpi,.rc-card{break-inside:avoid}
}
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
  // filtros (refinam a lista de recebimentos)
  const [advOpen, setAdvOpen] = useState(false);
  const [fUsuario, setFUsuario] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fForma, setFForma] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fCod, setFCod] = useState("");

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
    { l: "📥 Baixas no dia da venda", v: k.noDia, cls: "k-blue" },
    { l: "🗓️ Baixas posteriores", v: k.posteriores, cls: "k-gold" },
    { l: "🐷 Adiantamento (caução)", v: k.adiantamento, cls: "k-gray" },
    { l: "✅ Receita total", v: k.receitaTotal, cls: "k-green" },
    { l: "⏳ Em aberto", v: k.emAberto, cls: "k-red" },
  ];

  // opções dos filtros derivadas das próprias linhas (nunca opção "morta")
  const optUsuarios = useMemo(() => uniq(rows.map((r) => r.usuario)).sort(), [rows]);
  const optFormas = useMemo(() => uniq(rows.flatMap((r) => (r.formas || []).map((f: any) => f.forma))).sort(), [rows]);
  const optMarcas = useMemo(() => uniq(rows.flatMap((r) => r.marcas || [])).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (fUsuario && r.usuario !== fUsuario) return false;
    if (fForma && !(r.formas || []).some((f: any) => f.forma === fForma)) return false;
    if (fMarca && !(r.marcas || []).includes(fMarca)) return false;
    if (fCliente) {
      const nm = `${r.appointment?.tutor?.name || ""} ${r.appointment?.pet?.name || ""}`.toLowerCase();
      if (!nm.includes(fCliente.toLowerCase())) return false;
    }
    if (fCod) {
      const num = r.appointment?.numeroVenda != null ? String(r.appointment.numeroVenda) : "";
      const ext = String(r.appointment?.codigoExterno || "");
      const q = fCod.trim().toLowerCase();
      if (!num.includes(q) && !ext.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, fUsuario, fForma, fMarca, fCliente, fCod]);

  const temFiltro = !!(fUsuario || fCliente || fForma || fMarca || fCod);
  const limpar = () => { setFUsuario(""); setFCliente(""); setFForma(""); setFMarca(""); setFCod(""); };
  const vendaLabel = (ap: any) => (ap?.numeroVenda != null ? `#${ap.numeroVenda}` : (ap?.codigoExterno ? `SV ${ap.codigoExterno}` : "—"));
  const totalLista = filtered.reduce((s, r) => s + Number(r.valorTotal || 0), 0);

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
    <div className="rc-page">
      <style>{CSS}</style>

      {/* cabeçalho só de impressão */}
      <div className="rc-print-h">
        <h2>Recebimentos · Empório do Pet</h2>
        <p>Período {diaBR(from)} a {diaBR(to)}{temFiltro ? " · filtros aplicados na lista" : ""}</p>
      </div>

      {/* barra de filtros */}
      <div className="rc-bar no-print">
        <span className="rc-field">📅
          <input className="rc-in" style={{ padding: "3px 6px", border: "none" }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: "#374151" }}>até</span>
          <input className="rc-in" style={{ padding: "3px 6px", border: "none" }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </span>
        <select className="rc-sel" value={fUsuario} onChange={(e) => setFUsuario(e.target.value)}>
          <option value="">Todos os usuários</option>
          {optUsuarios.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <input className="rc-in" placeholder="👤 Cliente ou pet…" value={fCliente} onChange={(e) => setFCliente(e.target.value)} style={{ minWidth: 160 }} />
        <button className="rc-icon pri" title="Consultar período" onClick={load}>🔍</button>
        <button className={`rc-icon funnel ${advOpen ? "on" : ""}`} title="Filtros avançados" onClick={() => setAdvOpen((v) => !v)}>🔻</button>
        <button className="rc-icon" title="Limpar filtros" onClick={limpar}>↺</button>
        <div style={{ flex: 1 }} />
        <button className="rc-btn" onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
        <button className="rc-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      {/* filtros avançados */}
      {advOpen && (
        <div className="rc-adv no-print">
          <div className="row">
            <div>
              <span className="rc-lb">Cód. da venda</span>
              <input className="rc-in" placeholder="Nº ou cód. SimplesVet" value={fCod} onChange={(e) => setFCod(e.target.value)} style={{ width: 170 }} />
            </div>
            <div>
              <span className="rc-lb">Forma de recebimento</span>
              <select className="rc-sel" value={fForma} onChange={(e) => setFForma(e.target.value)}>
                <option value="">Todas as formas</option>
                {optFormas.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <span className="rc-lb">Marca</span>
              <select className="rc-sel" value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
                <option value="">Todas as marcas</option>
                {optMarcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "#374151", marginTop: 10 }}>Os filtros acima refinam a <b>lista de recebimentos</b>. O resumo mostra o período inteiro.</div>
        </div>
      )}

      <div className="rc-tabs no-print">
        <button className={`rc-tab ${tab === "resumo" ? "on" : ""}`} onClick={() => setTab("resumo")}>Resumo</button>
        <button className={`rc-tab ${tab === "lista" ? "on" : ""}`} onClick={() => setTab("lista")}>Lista de recebimentos ({filtered.length})</button>
      </div>

      {loading ? (
        <div className="rc-empty" style={{ padding: 60 }}>Carregando…</div>
      ) : tab === "resumo" ? (
        <>
          <div className="rc-kpis">
            {KPIS.map((kp) => (
              <div key={kp.l} className={`rc-kpi ${kp.cls}`}>
                <div className="l">{kp.l}</div>
                <div className="v">{money(Number(kp.v) || 0)}</div>
              </div>
            ))}
          </div>
          <div className="rc-cards">
            <Quebra titulo="💳 Por forma de recebimento" dados={resumo?.porForma} />
            <Quebra titulo="🧑 Por quem realizou a baixa" dados={resumo?.porUsuario} />
            <Quebra titulo="📅 Por dia" dados={(resumo?.porDia || []).map((d: any) => ({ nome: diaBR(d.nome), valor: d.valor }))} />
            <Quebra titulo="🏷️ Por marca" dados={resumo?.porMarca} />
          </div>
        </>
      ) : (
        <div className="rc-card">
          <div className="rc-ch">
            <span>{filtered.length} recebimento(s){temFiltro ? " (filtrados)" : ""}</span>
            <span style={{ fontWeight: 400, color: "#5C6B70" }}>Total <b style={{ color: "#014D5E" }}>{money(totalLista)}</b></span>
          </div>
          <div className="rc-scroll">
            <table className="rc-tbl">
              <thead><tr><th>Venda</th><th>Data</th><th>Cliente · Pet</th><th>Responsável</th><th>Formas</th><th className="r">Valor</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="rc-empty">Nenhum recebimento no período{temFiltro ? " com esses filtros" : ""}.</td></tr>}
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: "#014D5E", fontWeight: 500, whiteSpace: "nowrap" }}>{vendaLabel(r.appointment)}</td>
                    <td style={{ color: "#374151", whiteSpace: "nowrap" }}>{dh(r.data)}</td>
                    <td style={{ color: "#1F2A2E" }}>{r.appointment?.tutor?.id ? (<Link href={`/dashboard/erp/tutores/${r.appointment.tutor.id}`} style={{ color: "#014D5E", textDecoration: "none", fontWeight: 500 }}>{r.appointment?.tutor?.name || "Cliente"}</Link>) : (r.appointment?.tutor?.name || "Cliente")} · {r.appointment?.pet?.name || "Pet"}</td>
                    <td style={{ color: "#5C6B70" }}>{r.usuario || "—"}</td>
                    <td style={{ color: "#374151" }}>{(r.formas || []).map((f: any) => f.forma).join(" + ") || "—"}</td>
                    <td className="r">{money(Number(r.valorTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
