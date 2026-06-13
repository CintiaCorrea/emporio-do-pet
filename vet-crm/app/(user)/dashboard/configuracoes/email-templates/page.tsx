"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch, LuEye } from "react-icons/lu";

type Categoria = "TRANSACIONAL" | "BOAS_VINDAS" | "EDUCATIVO" | "PROMOCIONAL" | "ANIVERSARIO" | "REENGAJAMENTO" | "OUTRO";

interface Template { id: string; nome: string; assunto: string; corpoHtml: string; corpoTexto?: string | null; categoria: Categoria; descricao?: string | null; ativo: boolean; ordem: number; vezesEnviado: number; }
interface Variable { id: string; chave: string; label: string; descricao?: string | null; exemplo?: string | null; categoria: string; ordem: number; ativo: boolean; }

const CAT_LABEL: Record<Categoria, string> = {
  TRANSACIONAL: "Transacional", BOAS_VINDAS: "Boas-vindas", EDUCATIVO: "Educativo",
  PROMOCIONAL: "Promocional", ANIVERSARIO: "Aniversário", REENGAJAMENTO: "Reengajamento", OUTRO: "Outro",
};

const EMPTY_T: any = { nome: "", assunto: "", corpoHtml: "", corpoTexto: "", categoria: "TRANSACIONAL", descricao: "", ativo: true, ordem: 0 };
const EMPTY_V: any = { chave: "", label: "", descricao: "", exemplo: "", categoria: "Geral", ordem: 0, ativo: true };

export default function EmailTemplatesPage() {
  const [tpls, setTpls] = useState<Template[]>([]);
  const [vars, setVars] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<"ALL" | Categoria>("ALL");

  const [tModalOpen, setTModalOpen] = useState(false);
  const [tEditId, setTEditId] = useState<string | null>(null);
  const [tForm, setTForm] = useState<any>(EMPTY_T);

  const [varModalOpen, setVarModalOpen] = useState(false);
  const [varEditId, setVarEditId] = useState<string | null>(null);
  const [varForm, setVarForm] = useState<any>(EMPTY_V);
  const [varDrawerOpen, setVarDrawerOpen] = useState(false);

  const [previewId, setPreviewId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [rT, rV] = await Promise.all([
        fetch(`/api/email-templates${qs}`),
        fetch(`/api/email-templates/variables/lista${qs}`),
      ]);
      setTpls(await rT.json().then(d => Array.isArray(d) ? d : []));
      setVars(await rV.json().then(d => Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = tpls;
    if (filterCat !== "ALL") arr = arr.filter(t => t.categoria === filterCat);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t => t.nome.toLowerCase().includes(q) || t.assunto.toLowerCase().includes(q));
    }
    return arr;
  }, [tpls, filterCat, search]);

  const varsGrouped = useMemo(() => {
    const g: Record<string, Variable[]> = {};
    for (const v of vars) { if (!g[v.categoria]) g[v.categoria] = []; g[v.categoria].push(v); }
    return g;
  }, [vars]);

  function openTNew() { setTEditId(null); setTForm(EMPTY_T); setTModalOpen(true); }
  function openTEdit(t: Template) { setTEditId(t.id); setTForm({ ...t }); setTModalOpen(true); }
  async function saveT() {
    try {
      const { id, createdAt, updatedAt, vezesEnviado, ...payload } = tForm as any;
      const url = tEditId ? `/api/email-templates/${tEditId}` : "/api/email-templates";
      const method = tEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setTModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeT(t: Template) {
    if (!(await confirmDelete({ entityLabel: "template", itemName: t.nome }))) return;
    const res = await fetch(`/api/email-templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleT(t: Template) {
    const res = await fetch(`/api/email-templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !t.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function openVarNew() { setVarEditId(null); setVarForm(EMPTY_V); setVarModalOpen(true); }
  function openVarEdit(v: Variable) { setVarEditId(v.id); setVarForm({ ...v }); setVarModalOpen(true); }
  async function saveVar() {
    try {
      const { id, createdAt, updatedAt, ...payload } = varForm as any;
      const url = varEditId ? `/api/email-templates/variables/${varEditId}` : "/api/email-templates/variables";
      const method = varEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setVarModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeVar(v: Variable) {
    if (!(await confirmDelete({ entityLabel: "variável", itemName: v.label }))) return;
    const res = await fetch(`/api/email-templates/variables/${v.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: tpls.length };
  for (const t of tpls) counts[t.categoria] = (counts[t.categoria] || 0) + 1;
  const preview = tpls.find(t => t.id === previewId);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Templates de E-mail</h1>
            <p className="text-sm text-gray-500">Templates HTML com variáveis pra disparos automáticos</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setVarDrawerOpen(true)} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          Variáveis ({vars.length})
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar templates..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openTNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Template
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome / Assunto</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-20">Envios</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum template.</td></tr>}
              {filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: t.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: "#0E2244" }}>{t.nome}</div>
                    <div className="text-xs text-gray-500 mt-0.5">📧 {t.assunto}</div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{CAT_LABEL[t.categoria]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{t.vezesEnviado}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleT(t)} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: t.ativo ? "#009AAC" : "#CBD5E0" }}>
                      <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: t.ativo ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setPreviewId(t.id)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Visualizar"><LuEye size={14} /></button>
                    <button onClick={() => openTEdit(t)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600 ml-1" title="Editar"><LuPencil size={14} /></button>
                    <button onClick={() => removeT(t)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir"><LuX size={14} /></button>
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
            <button onClick={() => setFilterCat("ALL")} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterCat === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterCat === "ALL" ? "#E0F4F6" : "white",
                color: filterCat === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todos <span className="text-gray-400">({tpls.length})</span>
            </button>
            {(Object.keys(CAT_LABEL) as Categoria[]).filter(k => counts[k]).map(k => (
              <button key={k} onClick={() => setFilterCat(k)} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterCat === k ? "#009AAC" : "#E8DFC8",
                  background: filterCat === k ? "#E0F4F6" : "white",
                  color: filterCat === k ? "#009AAC" : "#4B5563",
                }}>
                {CAT_LABEL[k]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {varDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setVarDrawerOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
              <h2 className="font-semibold" style={{ color: "#0E2244" }}>Variáveis</h2>
              <button onClick={openVarNew} className="px-2 py-1 rounded text-xs flex items-center gap-1 text-white" style={{ background: "#009AAC" }}><LuPlus size={12} /> Nova</button>
            </div>
            <div className="p-4 space-y-4">
              {Object.entries(varsGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold mb-2 uppercase text-gray-500">{cat}</h3>
                  <div className="space-y-1">
                    {items.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-2 border rounded" style={{ borderColor: "#E8DFC8", opacity: v.ativo ? 1 : 0.5 }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#FBF0DD", color: "#8a6313" }}>{`{{${v.chave}}}`}</code>
                            <span className="text-xs font-medium">{v.label}</span></div>
                          {v.exemplo && <div className="text-xs text-gray-500 mt-0.5">ex: {v.exemplo}</div>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openVarEdit(v)} className="p-1 hover:bg-gray-100 rounded"><LuPencil size={11} /></button>
                          <button onClick={() => removeVar(v)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#EF4444" }}><LuX size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setTModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{tEditId ? "Editar template" : "Novo template"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Nome *</label>
                <input value={tForm.nome || ""} onChange={e => setTForm({ ...tForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Categoria</label>
                <select value={tForm.categoria} onChange={e => setTForm({ ...tForm, categoria: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Descrição</label>
                <input value={tForm.descricao || ""} onChange={e => setTForm({ ...tForm, descricao: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Assunto *</label>
                <input value={tForm.assunto || ""} onChange={e => setTForm({ ...tForm, assunto: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Corpo HTML *</label>
                <textarea value={tForm.corpoHtml || ""} onChange={e => setTForm({ ...tForm, corpoHtml: e.target.value })} rows={10} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Corpo texto (fallback)</label>
                <textarea value={tForm.corpoTexto || ""} onChange={e => setTForm({ ...tForm, corpoTexto: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={tForm.ativo} onChange={e => setTForm({ ...tForm, ativo: e.target.checked })} /> Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setTModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveT} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {varModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVarModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{varEditId ? "Editar variável" : "Nova variável"}</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-600">Chave (snake_case) *</label>
                <input value={varForm.chave || ""} onChange={e => setVarForm({ ...varForm, chave: e.target.value.toLowerCase().replace(/\s+/g, '_') })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Label *</label>
                <input value={varForm.label || ""} onChange={e => setVarForm({ ...varForm, label: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Categoria</label>
                <input value={varForm.categoria || ""} onChange={e => setVarForm({ ...varForm, categoria: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="Tutor, Pet..." /></div>
              <div><label className="text-xs text-gray-600">Exemplo</label>
                <input value={varForm.exemplo || ""} onChange={e => setVarForm({ ...varForm, exemplo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={varForm.ativo} onChange={e => setVarForm({ ...varForm, ativo: e.target.checked })} /> Ativa</label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setVarModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveVar} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold truncate" style={{ color: "#0E2244" }}>{preview.nome}</h2>
                <div className="text-xs text-gray-500 truncate">📧 {preview.assunto}</div>
              </div>
              <button onClick={() => setPreviewId(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="overflow-y-auto p-4 bg-gray-50">
              <iframe srcDoc={preview.corpoHtml} className="w-full" style={{ minHeight: "60vh", background: "white", border: "1px solid #E8DFC8", borderRadius: 8 }} title="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
