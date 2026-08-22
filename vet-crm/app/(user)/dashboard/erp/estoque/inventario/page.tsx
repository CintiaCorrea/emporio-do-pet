"use client";
// Inventário — contagem física → ajuste de estoque. Você digita a contagem real de cada
// item; onde diverge do sistema, aplica um ajuste (movimento ADJUSTMENT que seta o saldo).
// Dá pra imprimir a folha de contagem em branco pra contar no papel antes de digitar. Base44.
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

interface Prod { id: string; name: string; type: string; stock: number; custoPadrao?: number | null }
const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));

const CSS = `
.iv-page{width:100%;padding:2px 2px 48px}
.iv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.iv-in{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit;min-width:200px;flex:1;max-width:320px}
.iv-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.iv-btn:hover{border-color:#009AAC;color:#009AAC}
.iv-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.iv-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;padding:14px 16px}
.iv-card .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5C6B70;font-weight:600}
.iv-card .val{font-size:20px;font-weight:700;color:#014D5E;margin-top:6px;font-variant-numeric:tabular-nums}
.iv-panel{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.iv-ph{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:600;color:#014D5E;display:flex;justify-content:space-between;align-items:center;gap:8px}
.iv-scroll{overflow-x:auto}
.iv-tbl{width:100%;border-collapse:collapse;font-size:13px}
.iv-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:600;padding:9px 14px;background:#FBF9F4;white-space:nowrap}
.iv-tbl th.r{text-align:right}
.iv-tbl td{padding:8px 14px;border-bottom:1px solid #F0EBE0;white-space:nowrap;color:#1F2A2E}
.iv-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.iv-tbl tr:last-child td{border-bottom:0}
.iv-cont{width:80px;border:1px solid #E8E2D6;border-radius:8px;padding:6px 8px;font-size:13px;text-align:right;font-family:inherit;color:#014D5E}
.iv-empty{padding:40px;text-align:center;color:#374151;font-size:13px}
.iv-box{min-width:80px;border-bottom:1px solid #9aa;height:16px}
.iv-onlyprint{display:none}
.iv-print-h{display:none}
@media print{.no-print{display:none!important}body{background:#fff}.iv-page{padding:0}.iv-panel,.iv-card{break-inside:avoid;box-shadow:none}.iv-print-h{display:block;margin-bottom:14px;border-bottom:2px solid #014D5E;padding-bottom:8px}.iv-onlyprint{display:inline-block}}
`;

export default function InventarioPage() {
  usePageTitle("Inventário", "Contagem física do estoque e ajuste automático das diferenças.");
  const podeEditar = usePodeEditar();
  const canSeeCost = useCanSeeCost();
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [soDiverg, setSoDiverg] = useState(false);
  const [cont, setCont] = useState<Record<string, string>>({});
  const [aplicando, setAplicando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pr = await fetch("/api/products?limit=2000&excludeService=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
      const list: any[] = Array.isArray(pr?.products) ? pr.products : (Array.isArray(pr) ? pr : []);
      setProds(list.filter((p) => p.type !== "SERVICE").map((p) => ({ id: p.id, name: p.name, type: p.type, stock: p.stock ?? 0, custoPadrao: p.custoPadrao ?? null })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch { setProds([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const difDe = (p: Prod): number | null => { const v = cont[p.id]; if (v == null || v === "") return null; const n = Number(v); if (!Number.isFinite(n)) return null; return Math.trunc(n) - p.stock; };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return prods.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!soDiverg || (difDe(p) ?? 0) !== 0));
  }, [prods, busca, soDiverg, cont]);

  const stats = useMemo(() => {
    let contados = 0, diverg = 0, valorDif = 0;
    for (const p of prods) {
      const d = difDe(p);
      if (d == null) continue;
      contados++;
      if (d !== 0) { diverg++; valorDif += d * (p.custoPadrao ?? 0); }
    }
    return { contados, diverg, valorDif };
  }, [prods, cont]);

  const aplicar = async () => {
    const alvos = prods.filter((p) => { const d = difDe(p); return d != null && d !== 0; });
    if (alvos.length === 0) { toast.error("Nenhuma divergência pra ajustar. Preencha a contagem onde diferir do sistema."); return; }
    if (!confirm(`Aplicar ajuste em ${alvos.length} item(ns)?\n\nO estoque desses itens vai passar a valer a contagem que você digitou. Fica registrado como "Ajuste de inventário".`)) return;
    setAplicando(true);
    let ok = 0, erro = 0;
    for (const p of alvos) {
      const novo = Math.trunc(Number(cont[p.id]));
      try {
        const r = await fetch("/api/stock/movements", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ productId: p.id, type: "ADJUSTMENT", quantity: novo, reason: "Ajuste de inventário" }),
        });
        r.ok ? ok++ : erro++;
      } catch { erro++; }
    }
    setAplicando(false);
    setCont({});
    toast.success(`${ok} ajuste(s) aplicado(s)${erro ? ` · ${erro} com erro` : ""}.`);
    load();
  };

  return (
    <div className="iv-page">
      <style>{CSS}</style>

      <div className="iv-print-h">
        <div style={{ fontSize: 18, fontWeight: 700, color: "#014D5E" }}>Inventário — folha de contagem — Empório do Pet</div>
        <div style={{ fontSize: 12, color: "#5C6B70" }}>Data: ____/____/______ · Responsável: ______________________ · {filtrados.length} item(ns)</div>
      </div>

      <div className="iv-bar no-print">
        <input className="iv-in" placeholder="🔍 Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="iv-btn" onClick={() => setSoDiverg((v) => !v)} style={soDiverg ? { borderColor: "#009AAC", color: "#009AAC", fontWeight: 600 } : undefined}>⚖️ Só divergências</button>
        <div style={{ flex: 1 }} />
        <button className="iv-btn" onClick={() => window.print()}>🖨️ Imprimir folha</button>
        {podeEditar && <button className="iv-btn" onClick={aplicar} disabled={aplicando || stats.diverg === 0} style={{ background: stats.diverg ? "#009AAC" : "#cbd2d0", borderColor: stats.diverg ? "#009AAC" : "#cbd2d0", color: "#fff", opacity: aplicando ? 0.6 : 1 }}>{aplicando ? "Aplicando…" : `✔️ Aplicar ajustes (${stats.diverg})`}</button>}
      </div>

      <div className="iv-cards">
        <div className="iv-card"><div className="lbl">📦 Produtos</div><div className="val">{prods.length}</div></div>
        <div className="iv-card"><div className="lbl">✍️ Contados</div><div className="val">{stats.contados}</div></div>
        <div className="iv-card"><div className="lbl">⚖️ Divergências</div><div className="val" style={{ color: stats.diverg ? "#8a6400" : "#014D5E" }}>{stats.diverg}</div></div>
        {canSeeCost && <div className="iv-card"><div className="lbl">💰 Diferença (a custo)</div><div className="val" style={{ fontSize: 16, color: stats.valorDif < 0 ? "#b23b39" : stats.valorDif > 0 ? "#1c7a47" : "#014D5E" }}>{stats.valorDif === 0 ? "—" : brl(stats.valorDif)}</div></div>}
      </div>

      <div className="iv-panel">
        <div className="iv-ph"><span>Contagem</span><span style={{ fontWeight: 400, fontSize: 12, color: "#5C6B70" }}>{filtrados.length} item(ns) · digite a contagem onde diferir</span></div>
        <div className="iv-scroll">
          <table className="iv-tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="r">Estoque sistema</th>
                <th className="r">Contagem física</th>
                <th className="r">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="iv-empty">Carregando…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={4} className="iv-empty">Nenhum produto.</td></tr>}
              {!loading && filtrados.map((p) => {
                const d = difDe(p);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "normal" }}>{p.name}</td>
                    <td className="r" style={{ color: "#5C6B70" }}>{p.stock}</td>
                    <td className="r">
                      <input className="iv-cont no-print" type="number" min={0} step={1} inputMode="numeric" value={cont[p.id] ?? ""} placeholder="—"
                        onChange={(e) => setCont((m) => ({ ...m, [p.id]: e.target.value }))} />
                      <span className="iv-box iv-onlyprint" />
                    </td>
                    <td className="r" style={{ fontWeight: 700, color: d == null || d === 0 ? "#94a3a0" : d < 0 ? "#b23b39" : "#1c7a47" }}>{d == null ? "—" : d === 0 ? "0" : d > 0 ? `+${d}` : d}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="no-print" style={{ fontSize: 11.5, color: "#374151", marginTop: 12 }}>
        💡 Dica: use <b>🖨️ Imprimir folha</b> pra contar no papel primeiro, depois digite a contagem aqui e clique em <b>Aplicar ajustes</b>. Só os itens com diferença são ajustados — cada um fica gravado no histórico como “Ajuste de inventário”.
      </p>
    </div>
  );
}
