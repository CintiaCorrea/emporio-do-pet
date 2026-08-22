"use client";
// Análise de estoque — relatório SÓ LEITURA montado de /api/products + /api/stock/movements.
// Cards de valor · Curva ABC · Estoque parado · Ponto de reposição · Giro. Base44, imprimir.
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

interface Prod { id: string; name: string; type: string; stock: number; price?: number | null; custoPadrao?: number | null; estoqueMin?: number | null }
interface Mov { productId: string; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; createdAt: string }

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const pct = (v: number) => `${v.toFixed(1)}%`;
const diasEntre = (a: number, b: number) => Math.floor((a - b) / 86400000);

const CSS = `
.an-page{width:100%;padding:2px 2px 48px}
.an-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:16px}
.an-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.an-btn:hover{border-color:#009AAC;color:#009AAC}
.an-num{width:64px;border:1px solid #E8E2D6;border-radius:8px;padding:6px 8px;font-size:13px;text-align:right;font-family:inherit;color:#1F2A2E}
.an-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:18px}
.an-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;padding:14px 16px}
.an-card .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5C6B70;font-weight:600}
.an-card .val{font-size:19px;font-weight:700;color:#014D5E;margin-top:6px;font-variant-numeric:tabular-nums}
.an-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
@media(max-width:1000px){.an-grid{grid-template-columns:1fr}}
.an-panel{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden;margin-bottom:16px}
.an-ph{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:600;color:#014D5E;display:flex;justify-content:space-between;align-items:center;gap:8px}
.an-scroll{overflow-x:auto;max-height:440px;overflow-y:auto}
.an-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.an-tbl th{position:sticky;top:0;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:600;padding:8px 12px;background:#FBF9F4;white-space:nowrap;z-index:1}
.an-tbl th.r{text-align:right}
.an-tbl td{padding:8px 12px;border-bottom:1px solid #F0EBE0;white-space:nowrap;color:#1F2A2E}
.an-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.an-tbl tr:last-child td{border-bottom:0}
.an-abc{font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px}
.an-empty{padding:34px;text-align:center;color:#374151;font-size:13px}
.an-print-h{display:none}
@media print{.no-print{display:none!important}body{background:#fff}.an-page{padding:0}.an-panel,.an-card{break-inside:avoid;box-shadow:none}.an-scroll{max-height:none;overflow:visible}.an-print-h{display:block;margin-bottom:14px;border-bottom:2px solid #014D5E;padding-bottom:8px}}
`;

const ABC_COR: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#E7F6EE", fg: "#1c7a47" }, B: { bg: "#FBF3D9", fg: "#8a6400" }, C: { bg: "#FCE9E7", fg: "#b23b39" },
};

export default function AnaliseEstoquePage() {
  usePageTitle("Análise de estoque", "Valor, curva ABC, estoque parado, reposição e giro.");
  const canSeeCost = useCanSeeCost();
  const [prods, setProds] = useState<Prod[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [paradoDias, setParadoDias] = useState(60);
  const [giroDias, setGiroDias] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, mv] = await Promise.all([
        fetch("/api/products?limit=2000&excludeService=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/stock/movements?limit=2000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      const list: any[] = Array.isArray(pr?.products) ? pr.products : (Array.isArray(pr) ? pr : []);
      setProds(list.filter((p) => p.type !== "SERVICE").map((p) => ({ id: p.id, name: p.name, type: p.type, stock: p.stock ?? 0, price: p.price ?? null, custoPadrao: p.custoPadrao ?? null, estoqueMin: p.estoqueMin ?? null })));
      setMovs((mv.movements || mv || []).map((m: any) => ({ productId: m.productId, type: m.type, quantity: m.quantity, createdAt: m.createdAt })));
    } catch { setProds([]); setMovs([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const analise = useMemo(() => {
    const agora = Date.now();
    // saídas por produto: última saída + soma no período de giro
    const ultimaSaida: Record<string, number> = {};
    const saidasGiro: Record<string, number> = {};
    for (const m of movs) {
      if (m.type !== "OUT") continue;
      const t = new Date(m.createdAt).getTime();
      if (!ultimaSaida[m.productId] || t > ultimaSaida[m.productId]) ultimaSaida[m.productId] = t;
      if (diasEntre(agora, t) <= giroDias) saidasGiro[m.productId] = (saidasGiro[m.productId] || 0) + m.quantity;
    }

    const enriquecidos = prods.map((p) => {
      const custo = p.custoPadrao ?? null;
      const valorCusto = p.stock * (custo ?? 0);
      const valorVenda = p.stock * (p.price ?? 0);
      const valorBase = p.stock * (custo ?? p.price ?? 0);
      const ult = ultimaSaida[p.id] ?? null;
      const diasSemSaida = ult ? diasEntre(agora, ult) : null;
      const parado = p.stock > 0 && (ult == null || diasSemSaida! >= paradoDias);
      const precisaRepor = p.stock === 0 || (p.estoqueMin != null && p.estoqueMin > 0 && p.stock <= p.estoqueMin);
      return { ...p, custo, valorCusto, valorVenda, valorBase, ult, diasSemSaida, parado, precisaRepor, giro: saidasGiro[p.id] || 0 };
    });

    const totalCusto = enriquecidos.reduce((a, x) => a + x.valorCusto, 0);
    const totalVenda = enriquecidos.reduce((a, x) => a + x.valorVenda, 0);
    const totalBase = enriquecidos.reduce((a, x) => a + x.valorBase, 0);

    // Curva ABC: ordena por valor desc, acumula %
    const abc = [...enriquecidos].filter((x) => x.valorBase > 0).sort((a, b) => b.valorBase - a.valorBase);
    let acum = 0;
    const abcRows = abc.map((x) => {
      const pctItem = totalBase > 0 ? (x.valorBase / totalBase) * 100 : 0;
      acum += pctItem;
      const classe = acum <= 80 ? "A" : acum <= 95 ? "B" : "C";
      return { ...x, pctItem, acum, classe };
    });
    const contAbc = { A: abcRows.filter((r) => r.classe === "A").length, B: abcRows.filter((r) => r.classe === "B").length, C: abcRows.filter((r) => r.classe === "C").length };

    const parados = enriquecidos.filter((x) => x.parado).sort((a, b) => b.valorBase - a.valorBase);
    const repor = enriquecidos.filter((x) => x.precisaRepor).sort((a, b) => a.stock - b.stock);
    const giroTop = [...enriquecidos].filter((x) => x.giro > 0).sort((a, b) => b.giro - a.giro).slice(0, 15);

    return { totalCusto, totalVenda, abcRows, contAbc, parados, repor, giroTop, nItens: enriquecidos.length };
  }, [prods, movs, paradoDias, giroDias]);

  const fmtData = (t: number | null) => (t ? new Date(t).toLocaleDateString("pt-BR") : "nunca");

  return (
    <div className="an-page">
      <style>{CSS}</style>

      <div className="an-print-h">
        <div style={{ fontSize: 18, fontWeight: 700, color: "#014D5E" }}>Análise de estoque — Empório do Pet</div>
        <div style={{ fontSize: 12, color: "#5C6B70" }}>Emitido em {new Date().toLocaleString("pt-BR")} · {analise.nItens} produto(s)</div>
      </div>

      <div className="an-bar no-print">
        <span style={{ fontSize: 12.5, color: "#5C6B70" }}>Parado sem saída há</span>
        <input className="an-num" type="number" min={1} value={paradoDias} onChange={(e) => setParadoDias(Math.max(1, Number(e.target.value) || 0))} />
        <span style={{ fontSize: 12.5, color: "#5C6B70" }}>dias · Giro dos últimos</span>
        <input className="an-num" type="number" min={1} value={giroDias} onChange={(e) => setGiroDias(Math.max(1, Number(e.target.value) || 0))} />
        <span style={{ fontSize: 12.5, color: "#5C6B70" }}>dias</span>
        <div style={{ flex: 1 }} />
        <button className="an-btn" onClick={load}>↻ Atualizar</button>
        <button className="an-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      {/* Cards */}
      <div className="an-cards">
        {canSeeCost && <div className="an-card"><div className="lbl">💰 Valor a custo</div><div className="val" style={{ fontSize: 17 }}>{brl(analise.totalCusto)}</div></div>}
        <div className="an-card"><div className="lbl">🏷️ Valor a venda</div><div className="val" style={{ fontSize: 17 }}>{brl(analise.totalVenda)}</div></div>
        <div className="an-card"><div className="lbl">📦 Produtos</div><div className="val">{analise.nItens}</div></div>
        <div className="an-card"><div className="lbl">🔻 Repor / zerado</div><div className="val" style={{ color: analise.repor.length ? "#b23b39" : "#014D5E" }}>{analise.repor.length}</div></div>
        <div className="an-card"><div className="lbl">🐌 Parados (+{paradoDias}d)</div><div className="val" style={{ color: analise.parados.length ? "#8a6400" : "#014D5E" }}>{analise.parados.length}</div></div>
      </div>

      {loading ? (
        <div className="an-panel"><div className="an-empty">Carregando análise…</div></div>
      ) : (
        <>
          {/* Curva ABC */}
          <div className="an-panel">
            <div className="an-ph">
              <span>📊 Curva ABC (concentração de valor)</span>
              <span style={{ fontWeight: 400, fontSize: 11.5, color: "#5C6B70" }}>A: {analise.contAbc.A} · B: {analise.contAbc.B} · C: {analise.contAbc.C} — A concentra ~80% do valor</span>
            </div>
            <div className="an-scroll">
              <table className="an-tbl">
                <thead>
                  <tr>
                    <th>Classe</th><th>Produto</th><th className="r">Estoque</th>
                    {canSeeCost && <th className="r">Custo méd.</th>}
                    <th className="r">Valor</th><th className="r">% do total</th><th className="r">% acum.</th><th className="r">Giro ({giroDias}d)</th>
                  </tr>
                </thead>
                <tbody>
                  {analise.abcRows.length === 0 && <tr><td colSpan={canSeeCost ? 8 : 7} className="an-empty">Sem produtos com valor de estoque.</td></tr>}
                  {analise.abcRows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="an-abc" style={{ background: ABC_COR[r.classe].bg, color: ABC_COR[r.classe].fg }}>{r.classe}</span></td>
                      <td style={{ fontWeight: 600, whiteSpace: "normal" }}>{r.name}</td>
                      <td className="r">{r.stock}</td>
                      {canSeeCost && <td className="r" style={{ color: "#5C6B70" }}>{brl(r.custo)}</td>}
                      <td className="r" style={{ color: "#014D5E", fontWeight: 600 }}>{brl(r.valorBase)}</td>
                      <td className="r" style={{ color: "#5C6B70" }}>{pct(r.pctItem)}</td>
                      <td className="r" style={{ color: "#5C6B70" }}>{pct(r.acum)}</td>
                      <td className="r">{r.giro || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="an-grid">
            {/* Estoque parado */}
            <div className="an-panel">
              <div className="an-ph"><span>🐌 Estoque parado (sem saída há +{paradoDias} dias)</span><span style={{ fontWeight: 400, fontSize: 11.5, color: "#5C6B70" }}>{analise.parados.length}</span></div>
              <div className="an-scroll">
                <table className="an-tbl">
                  <thead><tr><th>Produto</th><th className="r">Estoque</th><th className="r">Valor</th><th>Última saída</th></tr></thead>
                  <tbody>
                    {analise.parados.length === 0 && <tr><td colSpan={4} className="an-empty">Nenhum produto parado. 👏</td></tr>}
                    {analise.parados.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, whiteSpace: "normal" }}>{r.name}</td>
                        <td className="r">{r.stock}</td>
                        <td className="r" style={{ color: "#014D5E", fontWeight: 600 }}>{brl(r.valorBase)}</td>
                        <td style={{ color: "#8a6400" }}>{fmtData(r.ult)}{r.diasSemSaida != null ? ` (${r.diasSemSaida}d)` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ponto de reposição */}
            <div className="an-panel">
              <div className="an-ph"><span>🔻 Ponto de reposição</span><span style={{ fontWeight: 400, fontSize: 11.5, color: "#5C6B70" }}>{analise.repor.length}</span></div>
              <div className="an-scroll">
                <table className="an-tbl">
                  <thead><tr><th>Produto</th><th className="r">Estoque</th><th className="r">Mínimo</th><th>Situação</th></tr></thead>
                  <tbody>
                    {analise.repor.length === 0 && <tr><td colSpan={4} className="an-empty">Ninguém abaixo do mínimo. 👏</td></tr>}
                    {analise.repor.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, whiteSpace: "normal" }}>{r.name}</td>
                        <td className="r"><b style={{ color: r.stock === 0 ? "#b23b39" : "#8a6400" }}>{r.stock}</b></td>
                        <td className="r" style={{ color: "#5C6B70" }}>{r.estoqueMin ?? "—"}</td>
                        <td>{r.stock === 0 ? <span style={{ color: "#b23b39", fontWeight: 600 }}>Zerado</span> : <span style={{ color: "#8a6400" }}>Abaixo do mínimo</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
