"use client";
// [EMP-COWORK] Catálogo ÚNICO "Produtos e Serviços" (Passo 1 da unificação estilo SimplesVet).
// Lista tudo num lugar: Produtos + Serviços (de /api/products, por tipo) + Exames (de /api/fornecedores/exames/lista).
// Filtro por tipo (chips) + busca + impressão. SÓ LEITURA por enquanto (add/edit continua nas telas atuais; unificação do cadastro = Passo 2).

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const markupDe = (custo?: number | null, preco?: number | null) => {
  if (!custo || custo <= 0 || preco == null) return null;
  return Math.round(((Number(preco) - Number(custo)) / Number(custo)) * 100);
};

type Grupo = "PRODUTO" | "SERVICO" | "EXAME";
interface Item { key: string; grupo: Grupo; tipo: string; nome: string; codigo?: number | string | null; custo?: number | null; preco?: number | null; estoque?: number | null; ativo: boolean; extra?: string | null; }

const TIPO_PILL: Record<Grupo, { bg: string; fg: string; emoji: string }> = {
  PRODUTO: { bg: "#E6F1FB", fg: "#0C447C", emoji: "📦" },
  SERVICO: { bg: "#E7F6EE", fg: "#1c7a47", emoji: "🛎️" },
  EXAME: { bg: "#F0E9F7", fg: "#6b3fa0", emoji: "🔬" },
};

const CHIPS: { v: string; label: string }[] = [
  { v: "", label: "Todos" },
  { v: "PRODUTO", label: "📦 Produtos" },
  { v: "SERVICO", label: "🛎️ Serviços" },
  { v: "EXAME", label: "🔬 Exames" },
];

const CSS = `
.cat-page{width:100%;padding:2px 2px 48px}
.cat-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
.cat-in{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit;min-width:220px;flex:1;max-width:360px}
.cat-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:6px}
.cat-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.cat-chip{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:999px;padding:6px 13px;font-size:12.5px;cursor:pointer;font-weight:500}
.cat-chip.on{background:#009AAC;border-color:#009AAC;color:#fff}
.cat-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.cat-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E;display:flex;justify-content:space-between;align-items:center}
.cat-scroll{overflow-x:auto}
.cat-tbl{width:100%;border-collapse:collapse;font-size:13px}
.cat-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#8A989D;font-weight:500;padding:9px 12px;background:#FBF9F4;white-space:nowrap}
.cat-tbl th.r{text-align:right}
.cat-tbl td{padding:10px 12px;border-bottom:1px solid #F0EBE0;white-space:nowrap}
.cat-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.cat-tbl tr:last-child td{border-bottom:0}
.cat-nm{color:#1F2A2E;white-space:normal;min-width:220px}
.cat-pill{font-size:11px;font-weight:500;padding:2px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}
.cat-empty{padding:40px;text-align:center;color:#8A989D;font-size:13px}
.cat-sit{font-size:11px;padding:2px 9px;border-radius:999px}
@media print{ .no-print{display:none!important} body{background:#fff} .cat-page{padding:0} }
`;

export default function CatalogoPage() {
  usePageTitle("Produtos e Serviços", "Catálogo completo — produtos, serviços e exames num lugar só.");
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<Item[]>([]);
  const [grupo, setGrupo] = useState<string>("");
  const [busca, setBusca] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, exRes] = await Promise.all([
        fetch("/api/products?limit=2000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/fornecedores/exames/lista?includeInactive=true", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const prods: any[] = Array.isArray(prodRes?.products) ? prodRes.products : (Array.isArray(prodRes) ? prodRes : []);
      const exames: any[] = Array.isArray(exRes) ? exRes : (exRes?.itens || exRes?.data || []);
      const rows: Item[] = [];
      for (const p of prods) {
        const isServ = p.type === "SERVICE";
        rows.push({
          key: `p-${p.id}`, grupo: isServ ? "SERVICO" : "PRODUTO",
          tipo: isServ ? "Serviço" : (p.type === "VACCINE" ? "Vacina" : "Produto"),
          nome: p.name, codigo: p.codigo ?? null, custo: p.custoPadrao ?? null, preco: p.price ?? null,
          estoque: isServ ? null : (p.stock ?? 0), ativo: p.ativo !== false,
        });
      }
      for (const e of exames) {
        rows.push({
          key: `e-${e.id}`, grupo: "EXAME", tipo: "Exame",
          nome: e.nome, codigo: e.codigo ?? null, custo: e.valorFornecedor ?? null, preco: e.valorClienteSugerido ?? null,
          estoque: null, ativo: e.ativo !== false, extra: e.fornecedor?.nome || null,
        });
      }
      rows.sort((a, b) => a.nome.localeCompare(b.nome));
      setItens(rows);
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((it) =>
      (!grupo || it.grupo === grupo) &&
      (!q || it.nome.toLowerCase().includes(q) || String(it.codigo ?? "").toLowerCase().includes(q)),
    );
  }, [itens, grupo, busca]);

  const cont = useMemo(() => ({
    total: itens.length,
    PRODUTO: itens.filter((i) => i.grupo === "PRODUTO").length,
    SERVICO: itens.filter((i) => i.grupo === "SERVICO").length,
    EXAME: itens.filter((i) => i.grupo === "EXAME").length,
  }), [itens]);

  return (
    <div className="cat-page">
      <style>{CSS}</style>

      <div className="cat-bar no-print">
        <input className="cat-in" placeholder="🔍 Buscar por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button className="cat-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="cat-chips no-print">
        {CHIPS.map((c) => (
          <button key={c.v} className={`cat-chip ${grupo === c.v ? "on" : ""}`} onClick={() => setGrupo(c.v)}>
            {c.label}{c.v ? ` (${(cont as any)[c.v]})` : ` (${cont.total})`}
          </button>
        ))}
      </div>

      <div className="cat-card">
        <div className="cat-ch"><span>{filtrados.length} item(ns){grupo ? "" : " no catálogo"}</span></div>
        <div className="cat-scroll">
          <table className="cat-tbl">
            <thead>
              <tr>
                <th>Tipo</th><th>Nome</th><th>Código</th><th className="r">Custo</th><th className="r">Markup</th><th className="r">Preço de venda</th><th className="r">Estoque</th><th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="cat-empty">Carregando catálogo…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={8} className="cat-empty">Nenhum item encontrado.</td></tr>}
              {!loading && filtrados.map((it) => {
                const pill = TIPO_PILL[it.grupo];
                const mk = markupDe(it.custo, it.preco);
                return (
                  <tr key={it.key}>
                    <td><span className="cat-pill" style={{ background: pill.bg, color: pill.fg }}>{pill.emoji} {it.tipo}</span></td>
                    <td className="cat-nm">{it.nome}{it.extra ? <span style={{ color: "#8A989D", fontSize: 11.5 }}> · {it.extra}</span> : null}</td>
                    <td style={{ color: "#8A989D" }}>{it.codigo ?? "—"}</td>
                    <td className="r" style={{ color: "#5C6B70" }}>{brl(it.custo)}</td>
                    <td className="r" style={{ color: mk == null ? "#8A989D" : "#5C6B70" }}>{mk == null ? "—" : `${mk}%`}</td>
                    <td className="r" style={{ color: "#014D5E", fontWeight: 500 }}>{brl(it.preco)}</td>
                    <td className="r" style={{ color: it.estoque == null ? "#8A989D" : "#1F2A2E" }}>{it.estoque == null ? "—" : it.estoque}</td>
                    <td><span className="cat-sit" style={it.ativo ? { background: "#E7F6EE", color: "#1c7a47" } : { background: "#F0EBE0", color: "#8A989D" }}>{it.ativo ? "Ativo" : "Inativo"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="no-print" style={{ fontSize: 11.5, color: "#8A989D", marginTop: 12 }}>
        📋 Lista unificada (Passo 1). Para <b>adicionar/editar</b>, use por enquanto as telas de Produtos, Serviços e Exames — o cadastro único (com o Tipo no topo) vem no Passo 2.
      </p>
    </div>
  );
}
