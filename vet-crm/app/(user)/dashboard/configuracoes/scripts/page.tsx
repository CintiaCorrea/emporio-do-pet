"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch, LuCheck } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

interface Category { id: string; nome: string; emoji?: string | null; ordem: number; ativo: boolean; _count?: { scripts: number }; }
interface Script {
  id: string; nome: string; conteudo: string; descricao?: string | null;
  variaveis: string[]; categoryId?: string | null; ordem: number; ativo: boolean; vezesUsado: number;
  category?: { id: string; nome: string; emoji?: string | null } | null;
}

const EMPTY_S: any = { nome: "", conteudo: "", descricao: "", variaveis: [], categoryId: "", ordem: 0, ativo: true };
const EMPTY_C: any = { nome: "", emoji: "", ordem: 0, ativo: true };

function extractVars(c: string): string[] {
  const m = c.match(/\{([a-z_][a-z0-9_]*)\}/gi) || [];
  return Array.from(new Set(m.map(x => x.slice(1, -1))));
}

export default function ScriptsPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [sModalOpen, setSModalOpen] = useState(false);
  const [sEditId, setSEditId] = useState<string | null>(null);
  const [sForm, setSForm] = useState<any>(EMPTY_S);

  const [cModalOpen, setCModalOpen] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<any>(EMPTY_C);

  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [rC, rS] = await Promise.all([fetch(`/api/scripts/categories${qs}`), fetch(`/api/scripts${qs}`)]);
      setCats(await rC.json().then(d => Array.isArray(d) ? d : []));
      setScripts(await rS.json().then(d => Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = scripts;
    if (filterCat === "NONE") arr = arr.filter(s => !s.categoryId);
    else if (filterCat !== "ALL") arr = arr.filter(s => s.categoryId === filterCat);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(s => s.nome.toLowerCase().includes(q) || s.conteudo.toLowerCase().includes(q));
    }
    return arr;
  }, [scripts, filterCat, search]);

  function openSNew() { setSEditId(null); setSForm({ ...EMPTY_S, categoryId: filterCat !== "ALL" && filterCat !== "NONE" ? filterCat : "" }); setSModalOpen(true); }
  function openSEdit(s: Script) { setSEditId(s.id); setSForm({ ...s }); setSModalOpen(true); }
  async function saveS() {
    try {
      const { id, createdAt, updatedAt, category, vezesUsado, ...payload } = sForm as any;
      payload.variaveis = extractVars(payload.conteudo);
      if (!payload.categoryId) payload.categoryId = null;
      const url = sEditId ? `/api/scripts/${sEditId}` : "/api/scripts";
      const method = sEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setSModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeS(s: Script) {
    if (!confirm(`Excluir script "${s.nome}"?`)) return;
    const res = await fetch(`/api/scripts/${s.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleS(s: Script) {
    const res = await fetch(`/api/scripts/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !s.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function copyScript(s: Script) {
    try {
      await navigator.clipboard.writeText(s.conteudo);
      await fetch(`/api/scripts/${s.id}/use`, { method: "POST" });
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1500);
      await load();
    } catch (e) { alert("Erro ao copiar: " + e); }
  }

  function openCNew() { setCEditId(null); setCForm(EMPTY_C); setCModalOpen(true); }
  function openCEdit(c: Category) { setCEditId(c.id); setCForm({ ...c }); setCModalOpen(true); }
  async function saveC() {
    try {
      const { id, createdAt, updatedAt, _count, ...payload } = cForm as any;
      const url = cEditId ? `/api/scripts/categories/${cEditId}` : "/api/scripts/categories";
      const method = cEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setCModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeC(c: Category) {
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
    const res = await fetch(`/api/scripts/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    if (filterCat === c.id) setFilterCat("ALL");
    await load();
  }

  const totalSemCat = scripts.filter(s => !s.categoryId).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Scripts</h1>
            <p className="text-sm text-gray-500">Templates de resposta prontos pra recepção colar no WhatsApp</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={openCNew} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            <LuPlus size={14} /> Nova Categoria
          </button>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            Importar planilha
          </button>
        </div>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar scripts..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openSNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Script
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome / Conteúdo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-20">Usos</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum script.</td></tr>}
              {filtered.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: s.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: "#0E2244" }}>{s.nome}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.conteudo}</div>
                    {s.variaveis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.variaveis.slice(0, 4).map(v => <code key={v} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#FBF0DD", color: "#8a6313" }}>{`{${v}}`}</code>)}
                        {s.variaveis.length > 4 && <span className="text-xs text-gray-400">+{s.variaveis.length - 4}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{s.category?.emoji} {s.category?.nome || "—"}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{s.vezesUsado}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleS(s)} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: s.ativo ? "#009AAC" : "#CBD5E0" }}>
                      <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: s.ativo ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => copyScript(s)} className="px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 mr-1"
                      style={{ background: copiedId === s.id ? "#22C55E" : "#E0F4F6", color: copiedId === s.id ? "white" : "#009AAC" }}>
                      {copiedId === s.id ? <><LuCheck size={11} /> ✓</> : "Copiar"}
                    </button>
                    <button onClick={() => openSEdit(s)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                    <button onClick={() => removeS(s)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CATEGORIAS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterCat("ALL")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterCat === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterCat === "ALL" ? "#E0F4F6" : "white",
                color: filterCat === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todas <span className="text-gray-400">({scripts.length})</span>
            </button>
            <button onClick={() => setFilterCat("NONE")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterCat === "NONE" ? "#009AAC" : "#E8DFC8",
                background: filterCat === "NONE" ? "#E0F4F6" : "white",
                color: filterCat === "NONE" ? "#009AAC" : "#4B5563",
              }}>
              Sem categoria <span className="text-gray-400">({totalSemCat})</span>
            </button>
            {cats.map(c => (
              <div key={c.id} className="inline-flex items-center gap-0.5 border rounded-lg overflow-hidden"
                style={{ borderColor: filterCat === c.id ? "#009AAC" : "#E8DFC8", background: filterCat === c.id ? "#E0F4F6" : "white", opacity: c.ativo ? 1 : 0.5 }}>
                <button onClick={() => setFilterCat(c.id)} className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{ color: filterCat === c.id ? "#009AAC" : "#4B5563" }}>
                  {c.emoji} {c.nome} <span className="text-gray-400">({c._count?.scripts || 0})</span>
                </button>
                <button onClick={() => openCEdit(c)} className="p-1.5 hover:bg-gray-100 border-l text-gray-600" style={{ borderColor: "#E8DFC8" }}><LuPencil size={11} /></button>
                <button onClick={() => removeC(c)} className="p-1.5 hover:bg-gray-100 border-l" style={{ borderColor: "#E8DFC8", color: "#EF4444" }}><LuX size={11} /></button>
              </div>
            ))}
            <button onClick={openCNew} className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed flex items-center gap-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-400" style={{ borderColor: "#D1D5DB" }}>
              <LuPlus size={12} /> Nova categoria
            </button>
          </div>
        </div>
      </div>

      {sModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{sEditId ? "Editar script" : "Novo script"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={sForm.nome || ""} onChange={e => setSForm({ ...sForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="Ex: Confirmar agendamento" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria</label>
                <select value={sForm.categoryId || ""} onChange={e => setSForm({ ...sForm, categoryId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Sem categoria</option>
                  {cats.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Mensagem *</label>
                <textarea value={sForm.conteudo || ""} onChange={e => setSForm({ ...sForm, conteudo: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E8DFC8" }} placeholder="Olá, {tutor}! Tudo bem com o {pet}?" />
                <div className="text-xs text-gray-500 mt-1">Use {`{nome_da_variavel}`}. Detectadas:
                  {extractVars(sForm.conteudo || "").map(v => <code key={v} className="ml-1 px-1 rounded" style={{ background: "#FBF0DD", color: "#8a6313" }}>{`{${v}}`}</code>)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={sForm.ativo} onChange={e => setSForm({ ...sForm, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveS} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {cModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{cEditId ? "Editar categoria" : "Nova categoria"}</h2>
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div><label className="text-xs text-gray-600">Nome *</label>
                <input value={cForm.nome || ""} onChange={e => setCForm({ ...cForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Emoji</label>
                <input value={cForm.emoji || ""} onChange={e => setCForm({ ...cForm, emoji: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-center" style={{ borderColor: "#E8DFC8" }} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-3">
              <input type="checkbox" checked={cForm.ativo} onChange={e => setCForm({ ...cForm, ativo: e.target.checked })} /> Ativa
            </label>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveC} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Scripts" endpoint="/api/scripts/import-batch"
        exampleHint="Exporte de Base44 > Script. Variáveis {tutor} {pet} são auto-detectadas."
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "conteudo", label: "Conteúdo", aliases: ["corpo", "texto"], required: true },
          { key: "categoria", label: "Categoria" },
          { key: "descricao", label: "Descrição" },
          { key: "ativo", label: "Ativo", type: "boolean" },
        ]}
        onSuccess={() => load()} />
    </div>
  );
}
