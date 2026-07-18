"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuUpload, LuSparkles } from "react-icons/lu";

type CategoriaExame = "HEMATOLOGIA" | "BIOQUIMICA" | "IMAGEM" | "CITOLOGIA" | "MICROBIOLOGIA" | "ENDOCRINOLOGIA" | "HISTOPATOLOGIA" | "OUTROS";
type FornTipo = "LABORATORIO" | "PROFISSIONAL" | "PARCEIRO" | "FORNECEDOR" | "OUTRO";
const TIPO_LABEL: Record<string, string> = { LABORATORIO: "🔬 Laboratório", PROFISSIONAL: "👤 Profissional", PARCEIRO: "🤝 Parceiro", FORNECEDOR: "📦 Fornecedor", OUTRO: "• Outro" };
const TIPOS_FORN: { v: string; label: string }[] = [
  { v: "", label: "Todos" }, { v: "LABORATORIO", label: "🔬 Laboratórios" }, { v: "PARCEIRO", label: "🤝 Parceiros" },
  { v: "FORNECEDOR", label: "📦 Fornecedores" }, { v: "PROFISSIONAL", label: "👤 Profissionais" }, { v: "OUTRO", label: "• Outros" },
];
// Nomenclatura unificada: Fornecedores = laboratórios + empresas; Profissionais = parceiros + liberais.
const BUCKET_FORNECEDOR = ["LABORATORIO", "FORNECEDOR", "OUTRO"];
const BUCKET_PROFISSIONAL = ["PROFISSIONAL", "PARCEIRO"];
type ModeloPag = "LOTE_MENSAL" | "DIRETO_CLIENTE" | "REPASSE_VIA_CLINICA";

interface Fornecedor {
  id: string; nome: string; tipo: FornTipo;
  especialidade?: string | null; telefone?: string | null; email?: string | null;
  contatoResponsavel?: string | null; modeloPagamento: ModeloPag;
  diaFechamentoLote?: number | null; ativo: boolean; observacoes?: string | null;
  _count?: { exames: number };
}
interface Exame {
  id: string; fornecedorId: string; codigo?: string | null; nome: string;
  categoria: CategoriaExame; valorFornecedor?: number | null; valorClienteSugerido?: number | null;
  tempoResultadoDias?: number | null; ativo: boolean;
  fornecedor?: { id: string; nome: string } | null;
}

const CAT_LABEL: Record<CategoriaExame, string> = {
  HEMATOLOGIA: "Hematologia", BIOQUIMICA: "Bioquímica", IMAGEM: "Imagem",
  CITOLOGIA: "Citologia", MICROBIOLOGIA: "Microbiologia", ENDOCRINOLOGIA: "Endocrinologia",
  HISTOPATOLOGIA: "Histopatologia", OUTROS: "Outros",
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;

const EMPTY_FORN: any = { nome: "", tipo: "LABORATORIO", modeloPagamento: "LOTE_MENSAL", ativo: true };
const EMPTY_EX: any = { nome: "", codigo: "", categoria: "OUTROS", fornecedorId: "", valorFornecedor: null, valorClienteSugerido: null, tempoResultadoDias: null, ativo: true };

export default function ExamesConfigPage() {
  const [tab, setTab] = useState<"exames" | "fornecedores" | "profissionais">("exames");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros do catálogo
  const [search, setSearch] = useState("");
  const [filterForn, setFilterForn] = useState<string>("");
  const [fFornTipo, setFFornTipo] = useState<string>(""); // filtro por tipo na aba Fornecedores
  const [filterCat, setFilterCat] = useState<string>("");

  // Modal Exame
  const [eModalOpen, setEModalOpen] = useState(false);
  const [eEditId, setEEditId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<any>(EMPTY_EX);

  // Modal Fornecedor
  const [fModalOpen, setFModalOpen] = useState(false);
  const [fEditId, setFEditId] = useState<string | null>(null);
  const [fForm, setFForm] = useState<any>(EMPTY_FORN);

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importUpsert, setImportUpsert] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [resF, resE] = await Promise.all([
        fetch(`/api/fornecedores?includeInactive=true`),
        fetch(`/api/fornecedores/exames/lista?includeInactive=true`),
      ]);
      setFornecedores(await resF.json());
      setExames(await resE.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const examesFilt = useMemo(() => {
    let arr = exames;
    if (filterForn) arr = arr.filter(e => e.fornecedorId === filterForn);
    if (filterCat) arr = arr.filter(e => e.categoria === filterCat);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(e => e.nome.toLowerCase().includes(s) || (e.codigo || "").toLowerCase().includes(s));
    }
    return arr;
  }, [exames, filterForn, filterCat, search]);

  // ===== Exame CRUD =====
  function openExNew() { setEEditId(null); setEForm({ ...EMPTY_EX, fornecedorId: filterForn || fornecedores[0]?.id || "" }); setEModalOpen(true); }
  function openExEdit(ex: Exame) { setEEditId(ex.id); setEForm({ ...ex }); setEModalOpen(true); }
  async function saveEx() {
    try {
      const { id, createdAt, updatedAt, fornecedor, ...payload } = eForm as any;
      if (!payload.fornecedorId) { alert("Selecione um fornecedor"); return; }
      const url = eEditId ? `/api/fornecedores/exames/${eEditId}` : "/api/fornecedores/exames";
      const method = eEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setEModalOpen(false); await load();
    } catch (er) { alert(`Erro: ${er}`); }
  }
  async function deleteEx(ex: Exame) {
    if (!(await confirmDelete({ entityLabel: "exame", itemName: ex.nome }))) return;
    try {
      const res = await fetch(`/api/fornecedores/exames/${ex.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function toggleAtivoEx(ex: Exame) {
    try {
      const res = await fetch(`/api/fornecedores/exames/${ex.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !ex.ativo }),
      });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  // ===== Fornecedor CRUD =====
  function openFornNew() { setFEditId(null); setFForm({ ...EMPTY_FORN, tipo: tab === "profissionais" ? "PROFISSIONAL" : "LABORATORIO" }); setFModalOpen(true); }
  function openFornEdit(f: Fornecedor) { setFEditId(f.id); setFForm({ ...f }); setFModalOpen(true); }
  async function saveForn() {
    try {
      const { id, createdAt, updatedAt, exames, _count, ...payload } = fForm as any;
      const url = fEditId ? `/api/fornecedores/${fEditId}` : "/api/fornecedores";
      const method = fEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setFModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteForn(f: Fornecedor) {
    if (!(await confirmDelete({ entityLabel: "fornecedor", itemName: f.nome, consequenceText: `Os ${f._count?.exames || 0} exames vinculados também serão removidos.` }))) return;
    try {
      const res = await fetch(`/api/fornecedores/${f.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      if (filterForn === f.id) setFilterForn("");
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  // ===== Import CSV =====
  function parseCSV(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const split = (line: string) => {
      const out: string[] = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if ((c === "," || c === ";") && !inQ) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const header = split(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const rows: any[] = [];
    const aliases: Record<string, string> = {
      nome_exame: "nome", exame: "nome",
      codigo_exame: "codigo", code: "codigo", cod: "codigo",
      cat: "categoria",
      lab: "fornecedor", laboratorio: "fornecedor", laborat_rio: "fornecedor",
      valor_fornecedor: "custo", valor_lab: "custo", custo_fornecedor: "custo",
      preco_cliente: "preco_venda", valor_cliente: "preco_venda", preco: "preco_venda", valor_venda: "preco_venda", venda: "preco_venda",
      prazo: "prazo_dias", dias: "prazo_dias", tempo: "prazo_dias", tempo_dias: "prazo_dias",
    };
    for (let i = 1; i < lines.length; i++) {
      const cols = split(lines[i]);
      const row: any = {};
      header.forEach((h, idx) => {
        const key = aliases[h] || h;
        let val: any = cols[idx];
        if (val == null || val === "") return;
        if (["custo", "preco_venda"].includes(key)) {
          val = parseFloat(String(val).replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
          if (isNaN(val)) return;
        } else if (key === "prazo_dias") {
          val = parseInt(String(val).replace(/\D/g, ""));
          if (isNaN(val)) return;
        } else if (key === "ativo") {
          val = /^(true|sim|s|1|yes|y|ativo)$/i.test(String(val).trim());
        }
        row[key] = val;
      });
      if (row.nome) rows.push(row);
    }
    return rows;
  }
  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setImportPreview(rows);
      setImportFileName(file.name);
    };
    reader.readAsText(file, "UTF-8");
  }
  async function executarImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/fornecedores/exames/import-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importPreview, upsert: importUpsert }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`Erro: ${data?.message || res.status}`); return; }
      alert(`✅ Importação:\n• Criados: ${data.criados}\n• Atualizados: ${data.atualizados}\n• Ignorados: ${data.ignorados}\n• Fornecedores usados: ${data.fornecedoresUsados}`);
      setImportOpen(false); setImportPreview([]); setImportFileName("");
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setImporting(false); }
  }

  // ====== RENDER ======
  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#009AAC" }}>Exames, Fornecedores e Profissionais</h1>
            <p className="text-sm text-gray-600">Catálogo de exames + fornecedores (laboratórios/empresas) e profissionais (parceiros/liberais).</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 border" style={{ borderColor: "#E5DCC9", color: "#009AAC" }}>
            <LuUpload size={16} /> Importar planilha
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          <button onClick={() => setTab("exames")} className="px-4 py-2 text-sm font-medium border-b-2"
            style={{ borderColor: tab === "exames" ? "#009AAC" : "transparent", color: tab === "exames" ? "#009AAC" : "#666" }}>
            🧪 Catálogo de Exames ({exames.length})
          </button>
          <button onClick={() => { setTab("fornecedores"); setFFornTipo(""); }} className="px-4 py-2 text-sm font-medium border-b-2"
            style={{ borderColor: tab === "fornecedores" ? "#009AAC" : "transparent", color: tab === "fornecedores" ? "#009AAC" : "#666" }}>
            📦 Fornecedores ({fornecedores.filter(f => BUCKET_FORNECEDOR.includes(f.tipo)).length})
          </button>
          <button onClick={() => { setTab("profissionais"); setFFornTipo(""); }} className="px-4 py-2 text-sm font-medium border-b-2"
            style={{ borderColor: tab === "profissionais" ? "#009AAC" : "transparent", color: tab === "profissionais" ? "#009AAC" : "#666" }}>
            👤 Profissionais ({fornecedores.filter(f => BUCKET_PROFISSIONAL.includes(f.tipo)).length})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === "exames" && (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-xl border p-4 mb-4 grid grid-cols-1 md:grid-cols-[1fr_220px_220px_auto] gap-3" style={{ borderColor: "#E5DCC9" }}>
              <div>
                <label className="text-xs text-gray-500">Buscar nome/código</label>
                <div className="relative">
                  <LuSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ex: Hemograma..."
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Fornecedor</label>
                <select value={filterForn} onChange={e => setFilterForn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Todos</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Categoria</label>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Todas</option>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-sm text-gray-500 mb-2">{examesFilt.length} exames</span>
                <button onClick={openExNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                  style={{ background: "#009AAC", color: "white" }}>
                  <LuPlus size={14} /> Novo
                </button>
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Nome</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Categoria</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Fornecedor</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Custo</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Preço Venda</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Prazo</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Ativo</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-500">Carregando...</td></tr>}
                    {!loading && examesFilt.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">Nenhum exame.</td></tr>}
                    {examesFilt.map((ex, i) => (
                      <tr key={ex.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0", opacity: ex.ativo ? 1 : 0.55 }}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{ex.nome}</div>
                          {ex.codigo && <div className="text-xs text-gray-400">{ex.codigo}</div>}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell text-gray-600">{CAT_LABEL[ex.categoria]}</td>
                        <td className="px-3 py-2 hidden md:table-cell text-gray-600">{ex.fornecedor?.nome || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtR(ex.valorFornecedor)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtR(ex.valorClienteSugerido)}</td>
                        <td className="px-3 py-2 text-center hidden md:table-cell text-gray-600">{ex.tempoResultadoDias != null ? `${ex.tempoResultadoDias}d` : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => toggleAtivoEx(ex)} title="Alternar ativo"
                            className="inline-flex items-center w-10 h-5 rounded-full transition"
                            style={{ background: ex.ativo ? "#22C55E" : "#CBD5E0" }}>
                            <span className="block w-4 h-4 rounded-full bg-white transition" style={{ marginLeft: ex.ativo ? 20 : 2 }} />
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => openExEdit(ex)} className="p-1 hover:bg-gray-200 rounded inline-block" title="Editar"><LuPencil size={14} /></button>
                          <button onClick={() => deleteEx(ex)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {(tab === "fornecedores" || tab === "profissionais") && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#E5DCC9" }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-sm font-semibold" style={{ color: "#009AAC" }}>{fornecedores.filter(f => (tab === "profissionais" ? BUCKET_PROFISSIONAL : BUCKET_FORNECEDOR).includes(f.tipo) && (!fFornTipo || f.tipo === fFornTipo)).length} cadastrado(s)</div>
                <button onClick={openFornNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#009AAC", color: "white" }}>
                  <LuPlus size={14} /> {tab === "profissionais" ? "Novo profissional" : "Novo fornecedor"}
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TIPOS_FORN.filter(t => t.v === "" || (tab === "profissionais" ? BUCKET_PROFISSIONAL : BUCKET_FORNECEDOR).includes(t.v)).map(t => (
                  <button key={t.v} onClick={() => setFFornTipo(t.v)} className="px-2.5 py-1 rounded-full text-[12px] border transition" style={fFornTipo === t.v ? { background: "#009AAC", color: "white", borderColor: "#009AAC" } : { background: "white", color: "#666", borderColor: "#E5DCC9" }}>{t.label}</button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Tipo</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Especialidade</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Exames</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Ativo</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.filter(f => (tab === "profissionais" ? BUCKET_PROFISSIONAL : BUCKET_FORNECEDOR).includes(f.tipo) && (!fFornTipo || f.tipo === fFornTipo)).length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">Nenhum registro nesse tipo.</td></tr>
                )}
                {fornecedores.filter(f => (tab === "profissionais" ? BUCKET_PROFISSIONAL : BUCKET_FORNECEDOR).includes(f.tipo) && (!fFornTipo || f.tipo === fFornTipo)).map(f => (
                  <tr key={f.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0", opacity: f.ativo ? 1 : 0.55 }}>
                    <td className="px-3 py-2 font-medium">{f.nome}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{TIPO_LABEL[f.tipo] || f.tipo}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{f.especialidade || "—"}</td>
                    <td className="px-3 py-2 text-right">{f._count?.exames || 0}</td>
                    <td className="px-3 py-2 text-center">{f.ativo ? "✅" : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openFornEdit(f)} className="p-1 hover:bg-gray-200 rounded inline-block" title="Editar"><LuPencil size={14} /></button>
                      <button onClick={() => deleteForn(f)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Exame */}
      {eModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#009AAC" }}>{eEditId ? "Editar exame" : "Novo exame"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={eForm.nome || ""} onChange={e => setEForm({ ...eForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Código</label>
                <input value={eForm.codigo || ""} onChange={e => setEForm({ ...eForm, codigo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria *</label>
                <select value={eForm.categoria} onChange={e => setEForm({ ...eForm, categoria: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Fornecedor *</label>
                <select value={eForm.fornecedorId} onChange={e => setEForm({ ...eForm, fornecedorId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Selecione...</option>
                  {fornecedores.filter(f => f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Custo (R$) — fornecedor</label>
                <input type="number" step="0.01" value={eForm.valorFornecedor ?? ""} onChange={e => setEForm({ ...eForm, valorFornecedor: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Preço Venda (R$) — cliente</label>
                <input type="number" step="0.01" value={eForm.valorClienteSugerido ?? ""} onChange={e => setEForm({ ...eForm, valorClienteSugerido: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Prazo (dias úteis)</label>
                <input type="number" min={0} value={eForm.tempoResultadoDias ?? ""} onChange={e => setEForm({ ...eForm, tempoResultadoDias: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ativo} onChange={e => setEForm({ ...eForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveEx} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#009AAC", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {fModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setFModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#009AAC" }}>{fEditId ? "Editar fornecedor" : "Novo fornecedor"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Nome *</label>
                <input value={fForm.nome || ""} onChange={e => setFForm({ ...fForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Tipo *</label>
                <select value={fForm.tipo} onChange={e => setFForm({ ...fForm, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {(tab === "profissionais" ? BUCKET_PROFISSIONAL : BUCKET_FORNECEDOR).map(tp => (
                    <option key={tp} value={tp}>{TIPO_LABEL[tp] || tp}</option>
                  ))}
                </select></div>
              <div><label className="text-xs text-gray-600">Modelo pagamento</label>
                <select value={fForm.modeloPagamento} onChange={e => setFForm({ ...fForm, modeloPagamento: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="LOTE_MENSAL">Lote mensal</option><option value="DIRETO_CLIENTE">Direto cliente</option><option value="REPASSE_VIA_CLINICA">Repasse via clínica</option>
                </select></div>
              <div><label className="text-xs text-gray-600">Especialidade</label>
                <input value={fForm.especialidade || ""} onChange={e => setFForm({ ...fForm, especialidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Telefone</label>
                <input value={fForm.telefone || ""} onChange={e => setFForm({ ...fForm, telefone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">E-mail</label>
                <input value={fForm.email || ""} onChange={e => setFForm({ ...fForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Dia fechamento (1-31)</label>
                <input type="number" min={1} max={31} value={fForm.diaFechamentoLote ?? ""} onChange={e => setFForm({ ...fForm, diaFechamentoLote: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Observações</label>
                <textarea value={fForm.observacoes || ""} onChange={e => setFForm({ ...fForm, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div className="md:col-span-2"><label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={fForm.ativo} onChange={e => setFForm({ ...fForm, ativo: e.target.checked })} /> Ativo
              </label></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveForn} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#009AAC", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importação */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setImportOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#009AAC" }}>Importar planilha de exames</h2>
            <div className="text-xs text-gray-600 mb-4">
              Exporte do Base44 (ou monte uma planilha) em <strong>CSV</strong>. Colunas aceitas:
              <code className="bg-gray-100 px-1 mx-1 rounded">nome</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">codigo</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">categoria</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">fornecedor</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">custo</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">preco_venda</code>,
              <code className="bg-gray-100 px-1 mx-1 rounded">prazo_dias</code>.
              Fornecedores novos são criados automaticamente.
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm border rounded-lg p-2 mb-3" style={{ borderColor: "#E5DCC9" }} />

            {importPreview.length > 0 && (
              <>
                <div className="text-sm mb-2">
                  📁 <strong>{importFileName}</strong> — {importPreview.length} linhas detectadas
                </div>
                <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                  <input type="checkbox" checked={importUpsert} onChange={e => setImportUpsert(e.target.checked)} />
                  Atualizar exames já existentes (match por código+fornecedor ou nome+fornecedor)
                </label>
                <div className="border rounded-lg overflow-auto max-h-60" style={{ borderColor: "#E5DCC9" }}>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                      <tr>
                        <th className="text-left px-2 py-1">Nome</th>
                        <th className="text-left px-2 py-1">Categoria</th>
                        <th className="text-left px-2 py-1">Fornecedor</th>
                        <th className="text-right px-2 py-1">Custo</th>
                        <th className="text-right px-2 py-1">Venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-2 py-1">{r.nome}</td>
                          <td className="px-2 py-1">{r.categoria || "—"}</td>
                          <td className="px-2 py-1">{r.fornecedor || "—"}</td>
                          <td className="px-2 py-1 text-right">{r.custo != null ? `R$ ${r.custo.toFixed(2)}` : "—"}</td>
                          <td className="px-2 py-1 text-right">{r.preco_venda != null ? `R$ ${r.preco_venda.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))}
                      {importPreview.length > 20 && <tr><td colSpan={5} className="text-center text-gray-500 py-2">... +{importPreview.length - 20} linhas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setImportOpen(false); setImportPreview([]); }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={executarImport} disabled={importPreview.length === 0 || importing}
                className="px-4 py-2 rounded-lg text-sm" style={{ background: "#009AAC", color: "white", opacity: importPreview.length === 0 || importing ? 0.4 : 1 }}>
                {importing ? "Importando..." : `Importar ${importPreview.length} exames`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
