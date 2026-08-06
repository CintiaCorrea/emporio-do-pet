"use client";
// View reutilizável das movimentações de estoque, filtrada por tipo:
//   tipo="IN"  → "Compras" (entradas, com custo/fornecedor/total)
//   tipo="OUT" → "Outras saídas de estoque" (saídas manuais: perda, quebra, uso interno)
// Base44, largura cheia, com filtro de período, busca e impressão.
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

interface Mov {
  id: string; productId: string; productName: string; type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number; previousStock: number; newStock: number; reason?: string;
  custoUnitario?: number | null; fornecedor?: string | null; origem?: string;
  userId?: string | null; userName?: string | null; createdAt: string;
}

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const CSS = `
.mv-page{width:100%;padding:2px 2px 48px}
.mv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.mv-in{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit;min-width:200px;flex:1;max-width:320px}
.mv-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:6px}
.mv-btn:hover{border-color:#009AAC;color:#009AAC}
.mv-date{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:12.5px;font-family:inherit;color:#1F2A2E;background:#fff}
.mv-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.mv-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;padding:14px 16px}
.mv-card .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5C6B70;font-weight:600}
.mv-card .val{font-size:20px;font-weight:700;color:#014D5E;margin-top:6px;font-variant-numeric:tabular-nums}
.mv-panel{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.mv-ph{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:600;color:#014D5E}
.mv-scroll{overflow-x:auto}
.mv-tbl{width:100%;border-collapse:collapse;font-size:13px}
.mv-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:600;padding:9px 14px;background:#FBF9F4;white-space:nowrap}
.mv-tbl th.r{text-align:right}
.mv-tbl td{padding:9px 14px;border-bottom:1px solid #F0EBE0;white-space:nowrap;color:#1F2A2E}
.mv-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.mv-tbl tr:last-child td{border-bottom:0}
.mv-empty{padding:40px;text-align:center;color:#374151;font-size:13px}
.mv-print-h{display:none}
@media print{.no-print{display:none!important}body{background:#fff}.mv-page{padding:0}.mv-card,.mv-panel{break-inside:avoid;box-shadow:none}.mv-print-h{display:block;margin-bottom:14px;border-bottom:2px solid #014D5E;padding-bottom:8px}}
`;

export default function MovimentosView({ tipo }: { tipo: "IN" | "OUT" }) {
  const compra = tipo === "IN";
  usePageTitle(compra ? "Compras" : "Outras saídas de estoque",
    compra ? "Entradas de estoque (compras) com custo e fornecedor." : "Saídas manuais de estoque — perda, quebra, uso interno.");
  const canSeeCost = useCanSeeCost();

  const [movs, setMovs] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/stock/movements?limit=2000", { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      const list: Mov[] = (d.movements || d || []).filter((m: Mov) => m.type === tipo);
      setMovs(list);
    } catch { setMovs([]); }
    setLoading(false);
  }, [tipo]);
  useEffect(() => { load(); }, [load]);

  const dentro = (s: string) => { const x = String(s).slice(0, 10); if (de && x < de) return false; if (ate && x > ate) return false; return true; };
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return movs.filter((m) => (!q || m.productName.toLowerCase().includes(q) || (m.reason || "").toLowerCase().includes(q)) && dentro(m.createdAt));
  }, [movs, busca, de, ate]);

  const totalItens = filtrados.reduce((a, m) => a + (m.quantity || 0), 0);
  const totalValor = filtrados.reduce((a, m) => a + (m.custoUnitario ? m.custoUnitario * m.quantity : 0), 0);

  return (
    <div className="mv-page">
      <style>{CSS}</style>

      <div className="mv-print-h">
        <div style={{ fontSize: 18, fontWeight: 700, color: "#014D5E" }}>{compra ? "Compras" : "Outras saídas de estoque"} — Empório do Pet</div>
        <div style={{ fontSize: 12, color: "#5C6B70" }}>Emitido em {new Date().toLocaleString("pt-BR")} · {filtrados.length} lançamento(s){de || ate ? ` · período ${de || "…"} a ${ate || "…"}` : ""}</div>
      </div>

      <div className="mv-bar no-print">
        <input className="mv-in" placeholder="🔍 Buscar produto ou motivo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span style={{ fontSize: 11.5, color: "#5C6B70" }}>Período:</span>
        <input type="date" className="mv-date" value={de} onChange={(e) => setDe(e.target.value)} />
        <span style={{ color: "#5C6B70" }}>→</span>
        <input type="date" className="mv-date" value={ate} onChange={(e) => setAte(e.target.value)} />
        {(de || ate) && <button className="mv-btn" onClick={() => { setDe(""); setAte(""); }}>limpar</button>}
        <div style={{ flex: 1 }} />
        <button className="mv-btn" onClick={load}>↻ Atualizar</button>
        <button className="mv-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="mv-cards">
        <div className="mv-card"><div className="lbl">{compra ? "🛒 Compras" : "📤 Saídas"}</div><div className="val">{filtrados.length}</div></div>
        <div className="mv-card"><div className="lbl">🔢 Itens no total</div><div className="val">{totalItens}</div></div>
        {compra && canSeeCost && <div className="mv-card"><div className="lbl">💰 Valor comprado</div><div className="val" style={{ fontSize: 17 }}>{brl(totalValor)}</div></div>}
      </div>

      <div className="mv-panel">
        <div className="mv-ph">{compra ? "🛒 Entradas de compra" : "📤 Outras saídas"} — {filtrados.length} lançamento(s)</div>
        <div className="mv-scroll">
          <table className="mv-tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                {compra && <th>Fornecedor</th>}
                <th className="r">Qtd</th>
                {compra && canSeeCost && <th className="r">Custo unit.</th>}
                {compra && canSeeCost && <th className="r">Total</th>}
                <th>Motivo</th>
                <th>Quem</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={compra ? 8 : 5} className="mv-empty">Carregando…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={compra ? 8 : 5} className="mv-empty">Nenhum lançamento{de || ate ? " no período" : ""}.</td></tr>}
              {!loading && filtrados.map((m) => (
                <tr key={m.id}>
                  <td style={{ color: "#5C6B70" }}>{dt(m.createdAt)}</td>
                  <td style={{ fontWeight: 600 }}>{m.productName}</td>
                  {compra && <td style={{ color: m.fornecedor ? "#5C6B70" : "#94a3a0" }}>{m.fornecedor || "—"}</td>}
                  <td className="r"><b style={{ color: compra ? "#1c7a47" : "#b23b39" }}>{compra ? "+" : "−"}{m.quantity}</b></td>
                  {compra && canSeeCost && <td className="r" style={{ color: "#5C6B70" }}>{brl(m.custoUnitario)}</td>}
                  {compra && canSeeCost && <td className="r" style={{ color: "#014D5E", fontWeight: 600 }}>{m.custoUnitario ? brl(m.custoUnitario * m.quantity) : "—"}</td>}
                  <td style={{ color: "#5C6B70", whiteSpace: "normal" }}>{m.reason || "—"}</td>
                  <td style={{ color: "#94a3a0", fontSize: 12 }}>{m.userName || "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="no-print" style={{ fontSize: 11.5, color: "#374151", marginTop: 12 }}>
        {compra
          ? "💡 As compras entram pelo botão “Entrada” na tela de Estoque (preencha o custo unitário pra recalcular o custo médio)."
          : "💡 As saídas manuais entram pelo botão “Saída” na tela de Estoque (informe o motivo: perda, quebra, uso interno…)."}
      </p>
    </div>
  );
}
