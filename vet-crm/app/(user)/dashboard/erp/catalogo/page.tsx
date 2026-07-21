"use client";
// [EMP-COWORK] Catálogo ÚNICO "Produtos e Serviços" (Passo 1 da unificação estilo SimplesVet).
// Lista tudo num lugar: Produtos + Serviços (de /api/products, por tipo) + Exames (de /api/fornecedores/exames/lista).
// Filtro por tipo (chips) + busca + impressão. SÓ LEITURA por enquanto (add/edit continua nas telas atuais; unificação do cadastro = Passo 2).

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import ItemFormModal from "@/components/catalogo/ItemFormModal";

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const markupDe = (custo?: number | null, preco?: number | null) => {
  if (!custo || custo <= 0 || preco == null) return null;
  return Math.round(((Number(preco) - Number(custo)) / Number(custo)) * 100);
};

type Grupo = "PRODUTO" | "SERVICO" | "EXAME";
interface Item { key: string; rawId?: string; grupo: Grupo; tipo: string; nome: string; codigo?: number | string | null; custo?: number | null; preco?: number | null; estoque?: number | null; ativo: boolean; fornecedor?: string | null; categoria?: string | null; marca?: string | null; controlaValidade?: boolean | null; validade?: string | null; }

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
.cat-filtros{background:#FBF9F4;border:1px solid #E8E2D6;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.cat-fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px 14px}
.cat-flbl{display:block;font-size:11px;color:#374151;font-weight:500;margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em}
.cat-fin{width:100%;border:1px solid #E8E2D6;border-radius:9px;padding:8px 10px;font-size:13px;font-family:inherit;background:#fff;color:#1F2A2E;box-sizing:border-box}
.cat-seg{display:inline-flex;border:1px solid #E8E2D6;border-radius:9px;overflow:hidden;width:100%}
.cat-seg button{flex:1;border:none;background:#fff;font-family:inherit;font-size:12px;font-weight:500;color:#5C6B70;padding:8px 4px;cursor:pointer}
.cat-seg button.on{background:#014D5E;color:#fff}
.cat-factions{display:flex;justify-content:flex-end;margin-top:12px}
.cat-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.cat-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E;display:flex;justify-content:space-between;align-items:center}
.cat-scroll{overflow-x:auto}
.cat-tbl{width:100%;border-collapse:collapse;font-size:13px}
.cat-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:500;padding:9px 12px;background:#FBF9F4;white-space:nowrap}
.cat-tbl th.r{text-align:right}
.cat-tbl td{padding:9px 11px;border-bottom:1px solid #F0EBE0;white-space:nowrap}
.cat-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.cat-tbl tr:last-child td{border-bottom:0}
.cat-nm{color:#1F2A2E;white-space:normal;min-width:150px}
.cat-cod{font-size:11px;color:#374151;margin-top:1px}
.cat-forn{max-width:130px;overflow:hidden;text-overflow:ellipsis}
/* Custo/Markup somem cedo (notebook) p/ Estoque e Situação sempre caberem; Fornecedor some só em telas bem estreitas */
@media(max-width:1400px){ .col-sec{display:none} }
@media(max-width:1080px){ .col-sec2{display:none} }
.cat-pill{font-size:11px;font-weight:500;padding:2px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}
.cat-empty{padding:40px;text-align:center;color:#374151;font-size:13px}
.cat-sit{font-size:11px;padding:2px 9px;border-radius:999px}
@media print{ .no-print{display:none!important} body{background:#fff} .cat-page{padding:0} }
`;

export default function CatalogoPage() {
  usePageTitle("Produtos e Serviços", "Catálogo completo — produtos, serviços e exames num lugar só.");
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<Item[]>([]);
  const [grupo, setGrupo] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // filtros
  const [showFiltros, setShowFiltros] = useState(false);
  const [fSit, setFSit] = useState<"" | "ativo" | "inativo">("");
  const [fGrupo, setFGrupo] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fForn, setFForn] = useState("");
  const [fCtrlVal, setFCtrlVal] = useState<"" | "sim" | "nao">("");
  const [valDe, setValDe] = useState("");
  const [valAte, setValAte] = useState("");
  const limparFiltros = () => { setFSit(""); setFGrupo(""); setFMarca(""); setFForn(""); setFCtrlVal(""); setValDe(""); setValAte(""); };
  const nFiltros = [fSit, fGrupo, fMarca, fForn, fCtrlVal, valDe, valAte].filter(Boolean).length;

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
          key: `p-${p.id}`, rawId: p.id, grupo: isServ ? "SERVICO" : "PRODUTO",
          tipo: isServ ? "Serviço" : (p.type === "VACCINE" ? "Vacina" : "Produto"),
          nome: p.name, codigo: p.codigo ?? null, custo: p.custoPadrao ?? null, preco: p.price ?? null,
          estoque: isServ ? null : (p.stock ?? 0), ativo: p.ativo !== false, fornecedor: p.fornecedor?.nome ?? null,
          categoria: p.category?.nome ?? null, marca: p.marca ?? null, controlaValidade: p.controlaValidade ?? null, validade: p.validadeMaisAntiga ?? null,
        });
      }
      for (const e of exames) {
        rows.push({
          key: `e-${e.id}`, grupo: "EXAME", tipo: "Exame",
          nome: e.nome, codigo: e.codigo ?? null, custo: e.valorFornecedor ?? null, preco: e.valorClienteSugerido ?? null,
          estoque: null, ativo: e.ativo !== false, fornecedor: e.fornecedor?.nome || null,
          categoria: e.categoria ?? null, marca: null, controlaValidade: null, validade: null,
        });
      }
      rows.sort((a, b) => a.nome.localeCompare(b.nome));
      setItens(rows);
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const opts = useMemo(() => ({
    grupos: [...new Set(itens.map((i) => i.categoria).filter(Boolean))].sort() as string[],
    marcas: [...new Set(itens.map((i) => i.marca).filter(Boolean))].sort() as string[],
    forns: [...new Set(itens.map((i) => i.fornecedor).filter(Boolean))].sort() as string[],
  }), [itens]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((it) => {
      if (grupo && it.grupo !== grupo) return false;
      if (q && !(it.nome.toLowerCase().includes(q) || String(it.codigo ?? "").toLowerCase().includes(q))) return false;
      if (fSit === "ativo" && !it.ativo) return false;
      if (fSit === "inativo" && it.ativo) return false;
      if (fGrupo && it.categoria !== fGrupo) return false;
      if (fMarca && it.marca !== fMarca) return false;
      if (fForn && it.fornecedor !== fForn) return false;
      if (fCtrlVal === "sim" && it.controlaValidade !== true) return false;
      if (fCtrlVal === "nao" && it.controlaValidade === true) return false;
      if (valDe && (!it.validade || String(it.validade).slice(0, 10) < valDe)) return false;
      if (valAte && (!it.validade || String(it.validade).slice(0, 10) > valAte)) return false;
      return true;
    });
  }, [itens, grupo, busca, fSit, fGrupo, fMarca, fForn, fCtrlVal, valDe, valAte]);

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
        <button className="cat-btn" onClick={() => setShowFiltros((v) => !v)} style={nFiltros ? { borderColor: "#009AAC", color: "#009AAC", fontWeight: 600 } : undefined}>🔎 Filtros{nFiltros ? ` (${nFiltros})` : ""}</button>
        <div style={{ flex: 1 }} />
        <button className="cat-btn" style={{ background: "#009AAC", borderColor: "#009AAC", color: "#fff" }} onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo item</button>
        <button className="cat-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="cat-chips no-print">
        {CHIPS.map((c) => (
          <button key={c.v} className={`cat-chip ${grupo === c.v ? "on" : ""}`} onClick={() => setGrupo(c.v)}>
            {c.label}{c.v ? ` (${(cont as any)[c.v]})` : ` (${cont.total})`}
          </button>
        ))}
      </div>

      {showFiltros && (
        <div className="cat-filtros no-print">
          <div className="cat-fgrid">
            <div>
              <label className="cat-flbl">Situação</label>
              <div className="cat-seg">
                {([["", "Todos"], ["ativo", "Ativo"], ["inativo", "Inativo"]] as const).map(([v, l]) => (
                  <button key={v} className={fSit === v ? "on" : ""} onClick={() => setFSit(v as any)}>{l}</button>
                ))}
              </div>
            </div>
            <div><label className="cat-flbl">Grupo</label>
              <select className="cat-fin" value={fGrupo} onChange={(e) => setFGrupo(e.target.value)}><option value="">Todos</option>{opts.grupos.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
            <div><label className="cat-flbl">Marca</label>
              <select className="cat-fin" value={fMarca} onChange={(e) => setFMarca(e.target.value)}><option value="">Todas</option>{opts.marcas.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="cat-flbl">Fornecedor</label>
              <select className="cat-fin" value={fForn} onChange={(e) => setFForn(e.target.value)}><option value="">Todos</option>{opts.forns.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className="cat-flbl">Controla validade</label>
              <select className="cat-fin" value={fCtrlVal} onChange={(e) => setFCtrlVal(e.target.value as any)}><option value="">Todos</option><option value="sim">Sim</option><option value="nao">Não</option></select></div>
            <div><label className="cat-flbl">Validade — de</label><input type="date" className="cat-fin" value={valDe} onChange={(e) => setValDe(e.target.value)} /></div>
            <div><label className="cat-flbl">Validade — até</label><input type="date" className="cat-fin" value={valAte} onChange={(e) => setValAte(e.target.value)} /></div>
          </div>
          <div className="cat-factions">
            <button className="cat-btn" onClick={limparFiltros} disabled={!nFiltros} style={{ opacity: nFiltros ? 1 : .5 }}>Limpar filtros</button>
          </div>
        </div>
      )}

      <div className="cat-card">
        <div className="cat-ch"><span>{filtrados.length} item(ns){grupo ? "" : " no catálogo"}</span></div>
        <div className="cat-scroll">
          <table className="cat-tbl">
            <thead>
              <tr>
                <th>Tipo</th><th>Nome</th><th className="col-sec2">Fornecedor</th><th className="r col-sec">Custo</th><th className="r col-sec">Markup</th><th className="r">Preço</th><th className="r">Estoque</th><th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="cat-empty">Carregando catálogo…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={8} className="cat-empty">Nenhum item encontrado.</td></tr>}
              {!loading && filtrados.map((it) => {
                const pill = TIPO_PILL[it.grupo];
                const mk = markupDe(it.custo, it.preco);
                return (
                  <tr key={it.key} onClick={() => { if (it.rawId) { setEditId(it.rawId); setModalOpen(true); } }} style={{ cursor: it.rawId ? "pointer" : "default" }}>
                    <td><span className="cat-pill" style={{ background: pill.bg, color: pill.fg }}>{pill.emoji} {it.tipo}</span></td>
                    <td className="cat-nm">{it.nome}{it.codigo != null && it.codigo !== "" ? <div className="cat-cod">cód. {it.codigo}</div> : null}</td>
                    <td className="cat-forn col-sec2" style={{ color: it.fornecedor ? "#5C6B70" : "#374151" }}>{it.fornecedor || "—"}</td>
                    <td className="r col-sec" style={{ color: "#5C6B70" }}>{brl(it.custo)}</td>
                    <td className="r col-sec" style={{ color: mk == null ? "#374151" : "#5C6B70" }}>{mk == null ? "—" : `${mk}%`}</td>
                    <td className="r" style={{ color: "#014D5E", fontWeight: 500 }}>{brl(it.preco)}</td>
                    <td className="r" style={{ color: it.estoque == null ? "#374151" : "#1F2A2E" }}>{it.estoque == null ? "—" : it.estoque}</td>
                    <td><span className="cat-sit" style={it.ativo ? { background: "#E7F6EE", color: "#1c7a47" } : { background: "#F0EBE0", color: "#374151" }}>{it.ativo ? "Ativo" : "Inativo"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="no-print" style={{ fontSize: 11.5, color: "#374151", marginTop: 12 }}>
        📋 Clique num <b>Produto</b> ou <b>Serviço</b> pra editar, ou <b>➕ Novo item</b> pra cadastrar. Exames são editados na tela de Exames (têm laboratório).
      </p>

      {modalOpen && <ItemFormModal editId={editId} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
    </div>
  );
}
