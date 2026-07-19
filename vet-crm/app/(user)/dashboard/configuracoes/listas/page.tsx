"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

interface ListaTipo { id: string; nome: string; label?: string | null; emoji?: string | null; descricao?: string | null; ordem: number; ativo: boolean; _count?: { itens: number }; }
interface ListaItem { id: string; lista: string; valor: string; ordem: number; ativo: boolean; }

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
const EMPTY_T: any = { nome: "", label: "", emoji: "", descricao: "", ordem: 0, ativo: true };
const EMPTY_I: any = { valor: "", lista: "", ordem: 0, ativo: true };

export default function ListasPage() {
  const [tipos, setTipos] = useState<ListaTipo[]>([]);
  const [itens, setItens] = useState<ListaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLista, setFilterLista] = useState<string>("ALL");

  const [iModalOpen, setIModalOpen] = useState(false);
  const [iEditId, setIEditId] = useState<string | null>(null);
  const [iForm, setIForm] = useState<any>(EMPTY_I);

  const [tModalOpen, setTModalOpen] = useState(false);
  const [tEditId, setTEditId] = useState<string | null>(null);
  const [tForm, setTForm] = useState<any>(EMPTY_T);
  const [autoSlug, setAutoSlug] = useState(true);

  const [importOpen, setImportOpen] = useState(false);

  // "Carregando..." so na PRIMEIRA carga: nas recargas depois de uma acao os dados
  // sao trocados por baixo, sem desmontar a tela (evita o "pulo" a cada clique).
  const jaCarregou = useRef(false);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [rT, rI] = await Promise.all([fetch(`/api/listas/tipos${qs}`), fetch(`/api/listas${qs}`)]);
      setTipos(await rT.json().then(d => Array.isArray(d) ? d : []));
      setItens(await rI.json().then(d => Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); }
    finally { jaCarregou.current = true; setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    // mostra so itens de uma lista de verdade (categoria definida); esconde dados internos do sistema
    let arr = itens.filter(i => tipos.some(t => t.nome === i.lista));
    if (filterLista !== "ALL") arr = arr.filter(i => i.lista === filterLista);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(i => i.valor.toLowerCase().includes(q));
    }
    return arr;
  }, [itens, filterLista, search, tipos]);

  function openINew() { setIEditId(null); setIForm({ ...EMPTY_I, lista: filterLista !== "ALL" ? filterLista : (tipos[0]?.nome || "") }); setIModalOpen(true); }
  function openIEdit(i: ListaItem) { setIEditId(i.id); setIForm({ ...i }); setIModalOpen(true); }
  async function saveI() {
    try {
      const { id, createdAt, updatedAt, ...payload } = iForm as any;
      const url = iEditId ? `/api/listas/${iEditId}` : "/api/listas";
      const method = iEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setIModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeI(i: ListaItem) {
    if (!(await confirmDelete({ entityLabel: "item", itemName: i.valor }))) return;
    const res = await fetch(`/api/listas/${i.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleI(i: ListaItem) {
    const res = await fetch(`/api/listas/${i.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !i.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function openTNew() { setTEditId(null); setTForm(EMPTY_T); setAutoSlug(true); setTModalOpen(true); }
  function openTEdit(t: ListaTipo) { setTEditId(t.id); setTForm({ ...t }); setAutoSlug(false); setTModalOpen(true); }
  async function saveT() {
    try {
      const { id, createdAt, updatedAt, _count, itens: _it, ...payload } = tForm as any;
      const url = tEditId ? `/api/listas/tipos/${tEditId}` : "/api/listas/tipos";
      const method = tEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setTModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeT(t: ListaTipo) {
    if (!(await confirmDelete({ entityLabel: "lista", itemName: t.label || t.nome, consequenceText: "Todos os itens dessa lista também serão removidos." }))) return;
    const res = await fetch(`/api/listas/tipos/${t.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    if (filterLista === t.nome) setFilterLista("ALL");
    await load();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Listas customizáveis</h1>
            <p className="text-sm text-gray-500">Canais, origens, motivos de perda, status clínicos — vocabulário do CRM</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <button onClick={openTNew} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
          style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          <LuPlus size={14} /> Nova Lista
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar itens..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openINew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Item
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Valor</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Lista</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-16">Ordem</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum item.</td></tr>}
              {filtered.map(i => {
                const t = tipos.find(x => x.nome === i.lista);
                return (
                  <tr key={i.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: i.ativo ? 1 : 0.5 }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "#0E2244" }}>{i.valor}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{t?.emoji} {t?.label || i.lista}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{i.ordem}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleI(i)} className="inline-flex items-center w-10 h-5 rounded-full transition"
                        style={{ background: i.ativo ? "#009AAC" : "#CBD5E0" }}>
                        <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: i.ativo ? 20 : 2 }} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openIEdit(i)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Editar"><LuPencil size={14} /></button>
                      <button onClick={() => removeI(i)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir"><LuX size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">LISTAS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterLista("ALL")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterLista === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterLista === "ALL" ? "#E0F4F6" : "white",
                color: filterLista === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todos <span className="text-gray-400">({itens.length})</span>
            </button>
            {tipos.map(t => (
              <div key={t.id} className="inline-flex items-center gap-0.5 border rounded-lg overflow-hidden"
                style={{
                  borderColor: filterLista === t.nome ? "#009AAC" : "#E8DFC8",
                  background: filterLista === t.nome ? "#E0F4F6" : "white",
                  opacity: t.ativo ? 1 : 0.5,
                }}>
                <button onClick={() => setFilterLista(t.nome)}
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{ color: filterLista === t.nome ? "#009AAC" : "#4B5563" }}>
                  {t.emoji} {t.label || t.nome} <span className="text-gray-400">({t._count?.itens || 0})</span>
                </button>
                <button onClick={() => openTEdit(t)} className="p-1.5 hover:bg-gray-100 border-l text-gray-600" style={{ borderColor: "#E8DFC8" }} title="Editar lista"><LuPencil size={11} /></button>
                <button onClick={() => removeT(t)} className="p-1.5 hover:bg-gray-100 border-l" style={{ borderColor: "#E8DFC8", color: "#EF4444" }} title="Excluir lista"><LuX size={11} /></button>
              </div>
            ))}
            <button onClick={openTNew} className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed flex items-center gap-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-400" style={{ borderColor: "#D1D5DB" }}>
              <LuPlus size={12} /> Nova lista
            </button>
          </div>
        </div>
      </div>

      {iModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{iEditId ? "Editar item" : "Novo item"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Lista *</label>
                <select value={iForm.lista || ""} onChange={e => setIForm({ ...iForm, lista: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {tipos.filter(t => t.ativo).map(t => <option key={t.id} value={t.nome}>{t.emoji} {t.label || t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Valor *</label>
                <input value={iForm.valor || ""} onChange={e => setIForm({ ...iForm, valor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Ordem</label>
                <input type="number" value={iForm.ordem || 0} onChange={e => setIForm({ ...iForm, ordem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={iForm.ativo} onChange={e => setIForm({ ...iForm, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setIModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveI} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {tModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setTModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{tEditId ? "Editar lista" : "Nova lista"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="text-xs text-gray-600">Label (visível) *</label>
                  <input value={tForm.label || ""} onChange={e => { setTForm({ ...tForm, label: e.target.value, ...(autoSlug ? { nome: slugify(e.target.value) } : {}) }); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Emoji</label>
                  <input value={tForm.emoji || ""} onChange={e => setTForm({ ...tForm, emoji: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-center" style={{ borderColor: "#E8DFC8" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Nome (snake_case) *</label>
                <input value={tForm.nome || ""} onChange={e => { setTForm({ ...tForm, nome: slugify(e.target.value) }); setAutoSlug(false); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <textarea value={tForm.descricao || ""} onChange={e => setTForm({ ...tForm, descricao: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tForm.ativo} onChange={e => setTForm({ ...tForm, ativo: e.target.checked })} /> Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setTModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveT} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
