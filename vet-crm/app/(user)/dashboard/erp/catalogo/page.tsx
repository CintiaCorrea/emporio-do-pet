"use client";
// [EMP-COWORK] Catálogo ÚNICO "Produtos e Serviços" (Passo 1 da unificação estilo SimplesVet).
// Lista tudo num lugar: Produtos + Serviços (de /api/products, por tipo) + Exames (de /api/fornecedores/exames/lista).
// Filtro por tipo (chips) + busca + impressão. SÓ LEITURA por enquanto (add/edit continua nas telas atuais; unificação do cadastro = Passo 2).

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import ItemFormModal from "@/components/catalogo/ItemFormModal";
import ExameFormModal, { type ExameEdit } from "@/components/catalogo/ExameFormModal";
import CategoriasModal from "@/components/catalogo/CategoriasModal";
import toast from "react-hot-toast";

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const markupDe = (custo?: number | null, preco?: number | null) => {
  if (!custo || custo <= 0 || preco == null) return null;
  return Math.round(((Number(preco) - Number(custo)) / Number(custo)) * 100);
};

type Grupo = "PRODUTO" | "SERVICO" | "EXAME";
interface Item { key: string; rawId?: string; grupo: Grupo; tipo: string; nome: string; codigo?: number | string | null; custo?: number | null; preco?: number | null; estoque?: number | null; ativo: boolean; fornecedor?: string | null; categoria?: string | null; comissao?: string | null; marca?: string | null; controlaValidade?: boolean | null; validade?: string | null; tempo?: number | null; }
const COM_LABEL: Record<string, string> = { VALOR_CHEIO: "Valor cheio", MARGEM: "Margem", SEM_COMISSAO: "Sem comissão", HERDAR: "Herdar" };

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
  // Preço de CUSTO (e o Markup, que o revela) só aparece para o ADMINISTRATIVO.
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<Item[]>([]);
  const [grupo, setGrupo] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [exameEdit, setExameEdit] = useState<ExameEdit | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;
  // % padrão dos exames (precificação em lote)
  const [percExame, setPercExame] = useState("100");
  const [sobrescrever, setSobrescrever] = useState(false);
  const [aplicandoPerc, setAplicandoPerc] = useState(false);
  const [percEdits, setPercEdits] = useState<Record<string, string>>({}); // % editada inline por linha
  const [savingPerc, setSavingPerc] = useState<string | null>(null);
  // filtros
  const [showFiltros, setShowFiltros] = useState(false);
  // seleção em massa
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [fSit, setFSit] = useState<"" | "ativo" | "inativo">("");
  const [fGrupo, setFGrupo] = useState("");
  const [fMarca, setFMarca] = useState("");
  const [fForn, setFForn] = useState("");
  const [fCtrlVal, setFCtrlVal] = useState<"" | "sim" | "nao">("");
  const [valDe, setValDe] = useState("");
  const [valAte, setValAte] = useState("");
  const limparFiltros = () => { setFSit(""); setFGrupo(""); setFMarca(""); setFForn(""); setFCtrlVal(""); setValDe(""); setValAte(""); };
  const nFiltros = [fSit, fGrupo, fMarca, fForn, fCtrlVal, valDe, valAte].filter(Boolean).length;
  // Estilo dos seletores de filtro que ficam embaixo do título de cada coluna.
  const thfStyle = { width: "100%", fontWeight: 400, fontSize: 11, padding: "3px 4px", border: "1px solid #E8E2D6", borderRadius: 6, background: "#fff", color: "#374151" } as const;

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
          categoria: p.category?.nome ?? null, comissao: p.comissaoBaseDefault ?? "HERDAR", marca: p.marca ?? null, controlaValidade: p.controlaValidade ?? null, validade: p.validadeMaisAntiga ?? null,
        });
      }
      for (const e of exames) {
        rows.push({
          key: `e-${e.id}`, rawId: e.id, grupo: "EXAME", tipo: "Exame",
          nome: e.nome, codigo: e.codigo ?? null, custo: e.valorFornecedor ?? null, preco: e.valorClienteSugerido ?? null,
          estoque: null, ativo: e.ativo !== false, fornecedor: e.fornecedor?.nome || null,
          categoria: e.categoria ?? null, comissao: null, marca: null, controlaValidade: null, validade: null, tempo: e.tempoResultadoDias ?? null,
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

  // Paginação: volta pra página 1 sempre que a busca/filtros mudam.
  useEffect(() => { setPage(1); }, [grupo, busca, fSit, fGrupo, fMarca, fForn, fCtrlVal, valDe, valAte]);
  const totalPag = Math.max(1, Math.ceil(filtrados.length / PER_PAGE));
  const pagAtual = Math.min(page, totalPag);
  const paginados = filtrados.slice((pagAtual - 1) * PER_PAGE, pagAtual * PER_PAGE);
  const ini = filtrados.length === 0 ? 0 : (pagAtual - 1) * PER_PAGE + 1;
  const fim = Math.min(pagAtual * PER_PAGE, filtrados.length);

  // Precifica exames em lote: custo do lab × (1 + %/100) → preço ao cliente.
  const aplicarPercExame = async () => {
    const p = Number(String(percExame).replace(",", "."));
    if (!isFinite(p)) { toast.error("Informe uma porcentagem válida."); return; }
    setAplicandoPerc(true);
    try {
      const r = await fetch("/api/fornecedores/exames/precificar-lote", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ percent: p, sobrescrever }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Erro ao precificar");
      toast.success(`${d.atualizados ?? 0} exame(s) precificado(s) com ${p}% de markup.`);
      load();
    } catch (e: any) { toast.error(e.message || "Erro ao precificar"); }
    finally { setAplicandoPerc(false); }
  };

  // Edição inline da % de UM exame: preço = custo do lab × (1 + %/100), salvo na hora.
  const salvarPercExame = async (it: Item, percStr: string) => {
    const p = Number(String(percStr).replace(",", "."));
    if (!isFinite(p)) { toast.error("Informe uma porcentagem válida."); return; }
    if (!it.custo || it.custo <= 0) { toast.error("Este exame está sem custo do laboratório."); return; }
    const preco = Math.round(Number(it.custo) * (1 + p / 100) * 100) / 100;
    setSavingPerc(it.key);
    try {
      const r = await fetch(`/api/fornecedores/exames/${it.rawId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valorClienteSugerido: preco }) });
      if (!r.ok) throw new Error();
      setItens((prev) => prev.map((x) => (x.key === it.key ? { ...x, preco } : x)));
      setPercEdits((m) => { const n = { ...m }; delete n[it.key]; return n; });
    } catch { toast.error("Erro ao salvar o preço."); }
    finally { setSavingPerc(null); }
  };

  // ── Seleção em massa (excluir / inativar vários) ──
  const endpointDe = (it: Item) => (it.grupo === "EXAME" ? `/api/fornecedores/exames/${it.rawId}` : `/api/products/${it.rawId}`);
  const toggleSel = (key: string) => setSel((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const keysVisiveis = filtrados.filter((i) => i.rawId).map((i) => i.key);
  const todosVisSel = keysVisiveis.length > 0 && keysVisiveis.every((k) => sel.has(k));
  const toggleTodosVis = () => setSel((s) => { const n = new Set(s); if (todosVisSel) keysVisiveis.forEach((k) => n.delete(k)); else keysVisiveis.forEach((k) => n.add(k)); return n; });
  async function bulkAcao(acao: "inativar" | "excluir") {
    const alvos = filtrados.filter((i) => i.rawId && sel.has(i.key));
    if (alvos.length === 0) return;
    const verbo = acao === "excluir" ? "EXCLUIR de vez" : "inativar (tirar da lista)";
    const aviso = acao === "excluir" ? "\n\n⚠️ Excluir apaga de vez — não dá pra desfazer. Se você só quer sumir da lista, use INATIVAR (que é reversível)." : "";
    if (!window.confirm(`Confirma ${verbo} ${alvos.length} item(ns)?${aviso}`)) return;
    setBulkBusy(true);
    let ok = 0, erro = 0;
    for (const it of alvos) {
      try {
        const url = endpointDe(it);
        const r = acao === "excluir"
          ? await fetch(url, { method: "DELETE", credentials: "include" })
          : await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ativo: false }) });
        r.ok ? ok++ : erro++;
      } catch { erro++; }
    }
    setBulkBusy(false);
    setSel(new Set());
    window.alert(`${ok} item(ns) ${acao === "excluir" ? "excluídos" : "inativados"}${erro ? ` · ${erro} deram erro` : ""}.`);
    load();
  }

  // ── Ações por linha ──
  const abrirEdicao = (it: Item) => {
    if (!it.rawId) return;
    if (it.grupo === "EXAME") setExameEdit({ id: it.rawId, nome: it.nome, codigo: it.codigo, fornecedor: it.fornecedor, valorFornecedor: it.custo, valorClienteSugerido: it.preco, tempo: it.tempo, ativo: it.ativo });
    else { setEditId(it.rawId); setModalOpen(true); }
  };
  async function toggleAtivo(it: Item) {
    if (!it.rawId) return;
    try {
      const r = await fetch(endpointDe(it), { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ativo: !it.ativo }) });
      if (!r.ok) throw new Error();
      setItens((prev) => prev.map((x) => (x.key === it.key ? { ...x, ativo: !it.ativo } : x)));
    } catch { toast.error("Não consegui mudar a situação."); }
  }
  async function excluirUm(it: Item) {
    if (!it.rawId) return;
    if (!window.confirm(`Excluir "${it.nome}" de vez?\n\n⚠️ Não dá pra desfazer. Pra só tirar da lista, use o interruptor "Ativo".`)) return;
    try {
      const r = await fetch(endpointDe(it), { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
      setItens((prev) => prev.filter((x) => x.key !== it.key));
      toast.success("Item excluído");
    } catch { toast.error("Erro ao excluir."); }
  }

  return (
    <div className="cat-page">
      <style>{CSS}</style>

      <div className="cat-bar no-print">
        <input className="cat-in" placeholder="🔍 Buscar por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="cat-btn" onClick={() => setShowFiltros((v) => !v)} style={nFiltros ? { borderColor: "#009AAC", color: "#009AAC", fontWeight: 600 } : undefined}>🔎 Filtros{nFiltros ? ` (${nFiltros})` : ""}</button>
        <div style={{ flex: 1 }} />
        <button className="cat-btn" style={{ background: "#009AAC", borderColor: "#009AAC", color: "#fff" }} onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo item</button>
        <button className="cat-btn" onClick={() => setCatModalOpen(true)}>🏷️ Categorias</button>
        <a className="cat-btn" href="/dashboard/erp/catalogo/importar" style={{ textDecoration: "none" }}>📥 Importar CSV</a>
        <button className="cat-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="cat-chips no-print">
        {CHIPS.map((c) => (
          <button key={c.v} className={`cat-chip ${grupo === c.v ? "on" : ""}`} onClick={() => setGrupo(c.v)}>
            {c.label}{c.v ? ` (${(cont as any)[c.v]})` : ` (${cont.total})`}
          </button>
        ))}
      </div>

      {grupo === "EXAME" && isAdmin && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#F0E9F7", border: "1px solid #E8E2D6", borderLeft: "4px solid #6b3fa0", borderRadius: 12, padding: "11px 15px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: "#1F2A2E" }}>🔬 <b style={{ color: "#6b3fa0" }}>% padrão dos exames:</b></span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #d9c98f", background: "#fffdf5", borderRadius: 8, padding: "5px 9px" }}>
            <input value={percExame} onChange={(e) => setPercExame(e.target.value)} inputMode="decimal" style={{ width: 52, border: "none", background: "transparent", fontSize: 13, textAlign: "right", color: "#1F2A2E", outline: "none", fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: "#5C6B70" }}>%</span>
          </div>
          <button onClick={aplicarPercExame} disabled={aplicandoPerc} className="cat-btn" style={{ background: "#6b3fa0", borderColor: "#6b3fa0", color: "#fff", opacity: aplicandoPerc ? 0.6 : 1 }}>
            {aplicandoPerc ? "Aplicando…" : "Aplicar"}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5C6B70", cursor: "pointer" }}>
            <input type="checkbox" checked={sobrescrever} onChange={(e) => setSobrescrever(e.target.checked)} />
            {sobrescrever ? "em todos (reescreve preços)" : "só nos que ainda não têm preço"}
          </label>
          <span style={{ fontSize: 11.5, color: "#8a6400" }}>preço = custo do lab × (1 + %). Depois ajuste item a item.</span>
        </div>
      )}

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
        <div className="cat-ch" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span>{filtrados.length} item(ns){grupo ? "" : " no catálogo"}{filtrados.length > PER_PAGE ? ` · mostrando ${ini}–${fim}` : ""}</span>
          {sel.size > 0 && (
            <span className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <b style={{ color: "#014D5E" }}>{sel.size} selecionado(s)</b>
              <button className="cat-btn" disabled={bulkBusy} onClick={() => bulkAcao("inativar")} style={{ borderColor: "#8a6400", color: "#8a6400" }}>🚫 Inativar</button>
              <button className="cat-btn" disabled={bulkBusy} onClick={() => bulkAcao("excluir")} style={{ borderColor: "#b23b39", color: "#b23b39" }}>🗑️ Excluir</button>
              <button className="cat-btn" disabled={bulkBusy} onClick={() => setSel(new Set())}>limpar</button>
            </span>
          )}
        </div>
        <div className="cat-scroll">
          <table className="cat-tbl">
            <thead>
              <tr>
                <th className="no-print" style={{ width: 34, textAlign: "center" }}><input type="checkbox" checked={todosVisSel} onChange={toggleTodosVis} title="Selecionar todos (os filtrados)" /></th>
                <th>Nome</th><th className="col-sec2">Fornecedor</th><th>Categoria</th>{isAdmin && <th className="r col-sec">Custo</th>}<th className="r">Preço</th><th>Comissão</th><th style={{ textAlign: "center" }}>Ativo</th><th className="no-print" style={{ textAlign: "center" }}>Ações</th>
              </tr>
              {/* Filtros direto na coluna (estilo planilha) — Fornecedor, Categoria e Ativo. */}
              <tr className="no-print" style={{ background: "#FBF9F4" }}>
                <th></th>
                <th></th>
                <th className="col-sec2">
                  <select value={fForn} onChange={(e) => setFForn(e.target.value)} title="Filtrar por fornecedor" style={thfStyle}>
                    <option value="">Todos</option>{opts.forns.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </th>
                <th>
                  <select value={fGrupo} onChange={(e) => setFGrupo(e.target.value)} title="Filtrar por categoria" style={thfStyle}>
                    <option value="">Todas</option>{opts.grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </th>
                {isAdmin && <th className="col-sec"></th>}
                <th></th>
                <th></th>
                <th style={{ textAlign: "center" }}>
                  <select value={fSit} onChange={(e) => setFSit(e.target.value as any)} title="Filtrar por situação" style={thfStyle}>
                    <option value="">Todos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option>
                  </select>
                </th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={isAdmin ? 9 : 8} className="cat-empty">Carregando catálogo…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={isAdmin ? 9 : 8} className="cat-empty">Nenhum item encontrado.</td></tr>}
              {!loading && paginados.map((it) => {
                const pill = TIPO_PILL[it.grupo];
                const mk = markupDe(it.custo, it.preco);
                return (
                  <tr key={it.key} onClick={() => abrirEdicao(it)} style={{ cursor: it.rawId ? "pointer" : "default", background: sel.has(it.key) ? "#EAF6F7" : undefined }}>
                    <td className="no-print" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                      {it.rawId ? <input type="checkbox" checked={sel.has(it.key)} onChange={() => toggleSel(it.key)} /> : null}
                    </td>
                    <td className="cat-nm"><span className="cat-pill" style={{ background: pill.bg, color: pill.fg, marginRight: 6 }}>{pill.emoji} {it.tipo}</span>{it.nome}{it.codigo != null && it.codigo !== "" ? <div className="cat-cod">cód. {it.codigo}</div> : null}</td>
                    <td className="cat-forn col-sec2" style={{ color: it.fornecedor ? "#5C6B70" : "#374151" }}>{it.fornecedor || "—"}</td>
                    <td style={{ color: it.categoria ? "#5C6B70" : "#374151" }}>{it.categoria || "—"}</td>
                    {isAdmin && <td className="r col-sec" style={{ color: "#5C6B70" }}>{brl(it.custo)}</td>}
                    <td className="r" style={{ color: "#014D5E", fontWeight: 500 }}>{brl(it.preco)}</td>
                    <td style={{ color: "#5C6B70" }}>{it.grupo === "EXAME" ? "—" : (COM_LABEL[it.comissao || "HERDAR"] || "Herdar")}</td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      {it.rawId ? (
                        <button onClick={() => toggleAtivo(it)} title={it.ativo ? "Ativo — clique pra inativar" : "Inativo — clique pra ativar"} style={{ width: 38, height: 20, borderRadius: 999, border: "none", cursor: "pointer", background: it.ativo ? "#1c7a47" : "#cbd2d0", position: "relative", verticalAlign: "middle" }}>
                          <span style={{ position: "absolute", top: 2, left: it.ativo ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                        </button>
                      ) : "—"}
                    </td>
                    <td className="no-print" style={{ textAlign: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {it.rawId ? (<>
                        <button onClick={() => abrirEdicao(it)} title="Editar" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, padding: 4 }}>✏️</button>
                        <button onClick={() => excluirUm(it)} title="Excluir" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, padding: 4, color: "#c0392b" }}>✕</button>
                      </>) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && totalPag > 1 && (
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 15px", borderTop: "1px solid #F0EBE0" }}>
            <button className="cat-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagAtual <= 1} style={{ opacity: pagAtual <= 1 ? .5 : 1 }}>‹ Anterior</button>
            <span style={{ fontSize: 12.5, color: "#5C6B70" }}>Página <b>{pagAtual}</b> de {totalPag}</span>
            <button className="cat-btn" onClick={() => setPage((p) => Math.min(totalPag, p + 1))} disabled={pagAtual >= totalPag} style={{ opacity: pagAtual >= totalPag ? .5 : 1 }}>Próxima ›</button>
          </div>
        )}
      </div>

      <p className="no-print" style={{ fontSize: 11.5, color: "#374151", marginTop: 12 }}>
        📋 Clique num <b>Produto</b> ou <b>Serviço</b> pra editar, num <b>Exame</b> pra precificar, ou <b>➕ Novo item</b> pra cadastrar.
      </p>

      {modalOpen && <ItemFormModal editId={editId} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />}
      {exameEdit && <ExameFormModal exame={exameEdit} onClose={() => setExameEdit(null)} onSaved={() => { setExameEdit(null); load(); }} />}
      {catModalOpen && <CategoriasModal onClose={() => setCatModalOpen(false)} onChanged={load} />}
    </div>
  );
}
