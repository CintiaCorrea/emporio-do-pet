"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CsvImporter from "@/components/import/CsvImporter";
import { usePodeEditar } from "@/lib/permissions/context";

interface ListaTipo { id: string; nome: string; label?: string | null; emoji?: string | null; descricao?: string | null; ordem: number; ativo: boolean; _count?: { itens: number }; }
interface ListaItem { id: string; lista: string; valor: string; ordem: number; ativo: boolean; }

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
const EMPTY_T: any = { nome: "", label: "", emoji: "", descricao: "", ordem: 0, ativo: true };
const EMPTY_I: any = { valor: "", lista: "", ordem: 0, ativo: true };

export default function ListasPage() {
  const podeEditar = usePodeEditar();
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

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [rT, rI] = await Promise.all([fetch(`/api/listas/tipos${qs}`), fetch(`/api/listas${qs}`)]);
      setTipos(await rT.json().then(d => Array.isArray(d) ? d : []));
      setItens(await rI.json().then(d => Array.isArray(d) ? d : []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    <div className="min-h-screen" style={{ background: "#F6F2EA" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E8E2D6" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-[#FBF9F4]"><span style={{ fontSize: 22, lineHeight: 1, color: "#5C6B70" }}>‹</span></Link>
          <div className="flex-1">
            <h1 className="text-xl font-medium" style={{ color: "#014D5E" }}>Listas customizáveis</h1>
            <p className="text-sm" style={{ color: "#5C6B70" }}>Canais, origens, motivos de perda, status clínicos — vocabulário do CRM</p>
          </div>
          {!podeEditar && <span className="text-sm" style={{ color: "#8A989D" }}>👁️ Somente leitura</span>}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#5C6B70" }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        {podeEditar && (
          <button onClick={openTNew} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            <span>➕</span> Nova Lista
          </button>
        )}
        <div className="relative flex-1 max-w-md mx-3">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: 13, color: "#8A989D" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar itens..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }} />
        </div>
        {podeEditar && (
          <button onClick={openINew} className="px-3 py-2 text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC", borderRadius: 9 }}>
            <span>➕</span> Novo Item
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FBF9F4", borderColor: "#E8E2D6" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium uppercase" style={{ fontSize: "11.5px", letterSpacing: "0.04em", color: "#8A989D" }}>Valor</th>
                <th className="text-left px-4 py-2.5 font-medium uppercase hidden md:table-cell" style={{ fontSize: "11.5px", letterSpacing: "0.04em", color: "#8A989D" }}>Lista</th>
                <th className="text-right px-4 py-2.5 font-medium uppercase hidden md:table-cell w-16" style={{ fontSize: "11.5px", letterSpacing: "0.04em", color: "#8A989D" }}>Ordem</th>
                <th className="text-center px-4 py-2.5 font-medium uppercase" style={{ fontSize: "11.5px", letterSpacing: "0.04em", color: "#8A989D" }}>Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium uppercase w-24" style={{ fontSize: "11.5px", letterSpacing: "0.04em", color: "#8A989D" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8" style={{ color: "#8A989D" }}>Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8" style={{ color: "#8A989D" }}>Nenhum item.</td></tr>}
              {filtered.map(i => {
                const t = tipos.find(x => x.nome === i.lista);
                return (
                  <tr key={i.id} className="border-b hover:bg-[#FBF9F4] transition" style={{ borderColor: "#F0EBE0", opacity: i.ativo ? 1 : 0.5 }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "#1F2A2E" }}>{i.valor}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell" style={{ color: "#5C6B70" }}>{t?.emoji} {t?.label || i.lista}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums" style={{ color: "#5C6B70" }}>{i.ordem}</td>
                    <td className="px-4 py-2.5 text-center">
                      {podeEditar ? (
                        <button onClick={() => toggleI(i)} className="inline-flex items-center w-10 h-5 rounded-full transition"
                          style={{ background: i.ativo ? "#009AAC" : "#D3D1C7" }}>
                          <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: i.ativo ? 20 : 2 }} />
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: i.ativo ? "#009AAC" : "#8A989D" }}>{i.ativo ? "Sim" : "Não"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {podeEditar && (
                        <>
                          <button onClick={() => openIEdit(i)} className="p-1 hover:bg-[#FBF9F4] rounded inline-block" style={{ color: "#5C6B70" }} title="Editar"><span style={{ fontSize: 13 }}>✏️</span></button>
                          <button onClick={() => removeI(i)} className="p-1 hover:bg-[#FBF9F4] rounded inline-block ml-1" style={{ color: "#b23b39" }} title="Excluir"><span style={{ fontSize: 13 }}>🗑️</span></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "#8A989D" }}>LISTAS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterLista("ALL")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterLista === "ALL" ? "#009AAC" : "#E8E2D6",
                background: filterLista === "ALL" ? "#E0F4F6" : "white",
                color: filterLista === "ALL" ? "#009AAC" : "#5C6B70",
              }}>
              Todos <span style={{ color: "#8A989D" }}>({itens.length})</span>
            </button>
            {tipos.map(t => (
              <div key={t.id} className="inline-flex items-center gap-0.5 border rounded-lg overflow-hidden"
                style={{
                  borderColor: filterLista === t.nome ? "#009AAC" : "#E8E2D6",
                  background: filterLista === t.nome ? "#E0F4F6" : "white",
                  opacity: t.ativo ? 1 : 0.5,
                }}>
                <button onClick={() => setFilterLista(t.nome)}
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{ color: filterLista === t.nome ? "#009AAC" : "#5C6B70" }}>
                  {t.emoji} {t.label || t.nome} <span style={{ color: "#8A989D" }}>({t._count?.itens || 0})</span>
                </button>
                {podeEditar && (
                  <>
                    <button onClick={() => openTEdit(t)} className="p-1.5 hover:bg-[#FBF9F4] border-l" style={{ borderColor: "#E8E2D6", color: "#5C6B70" }} title="Editar lista"><span style={{ fontSize: 11 }}>✏️</span></button>
                    <button onClick={() => removeT(t)} className="p-1.5 hover:bg-[#FBF9F4] border-l" style={{ borderColor: "#E8E2D6", color: "#b23b39" }} title="Excluir lista"><span style={{ fontSize: 11 }}>🗑️</span></button>
                  </>
                )}
              </div>
            ))}
            {podeEditar && (
              <button onClick={openTNew} className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed flex items-center gap-1.5" style={{ borderColor: "#E8E2D6", color: "#5C6B70" }}>
                <span>➕</span> Nova lista
              </button>
            )}
          </div>
        </div>
      </div>

      {iModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(1,43,46,.45)" }} onClick={() => setIModalOpen(false)}>
          <div className="p-6 max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6", borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: "#014D5E" }}>{iEditId ? "Editar item" : "Novo item"}</h2>
              <button onClick={() => setIModalOpen(false)} className="p-1 rounded hover:bg-[#FBF9F4]" style={{ color: "#5C6B70" }} title="Fechar"><span>✕</span></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: "#5C6B70" }}>Lista *</label>
                <select value={iForm.lista || ""} onChange={e => setIForm({ ...iForm, lista: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }}>
                  {tipos.filter(t => t.ativo).map(t => <option key={t.id} value={t.nome}>{t.emoji} {t.label || t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: "#5C6B70" }}>Valor *</label>
                <input value={iForm.valor || ""} onChange={e => setIForm({ ...iForm, valor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "#5C6B70" }}>Ordem</label>
                <input type="number" value={iForm.ordem || 0} onChange={e => setIForm({ ...iForm, ordem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#5C6B70" }}>
                <input type="checkbox" checked={iForm.ativo} onChange={e => setIForm({ ...iForm, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setIModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8E2D6", background: "#fff", color: "#5C6B70" }}>Cancelar</button>
              <button onClick={saveI} className="px-4 py-2 text-sm text-white" style={{ background: "#009AAC", borderRadius: 9 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {tModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(1,43,46,.45)" }} onClick={() => setTModalOpen(false)}>
          <div className="p-6 max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6", borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: "#014D5E" }}>{tEditId ? "Editar lista" : "Nova lista"}</h2>
              <button onClick={() => setTModalOpen(false)} className="p-1 rounded hover:bg-[#FBF9F4]" style={{ color: "#5C6B70" }} title="Fechar"><span>✕</span></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="text-xs" style={{ color: "#5C6B70" }}>Label (visível) *</label>
                  <input value={tForm.label || ""} onChange={e => { setTForm({ ...tForm, label: e.target.value, ...(autoSlug ? { nome: slugify(e.target.value) } : {}) }); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "#5C6B70" }}>Emoji</label>
                  <input value={tForm.emoji || ""} onChange={e => setTForm({ ...tForm, emoji: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-center bg-white" style={{ borderColor: "#E8E2D6" }} />
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: "#5C6B70" }}>Nome (snake_case) *</label>
                <input value={tForm.nome || ""} onChange={e => { setTForm({ ...tForm, nome: slugify(e.target.value) }); setAutoSlug(false); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-white" style={{ borderColor: "#E8E2D6" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "#5C6B70" }}>Descrição</label>
                <textarea value={tForm.descricao || ""} onChange={e => setTForm({ ...tForm, descricao: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8E2D6" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#5C6B70" }}>
                <input type="checkbox" checked={tForm.ativo} onChange={e => setTForm({ ...tForm, ativo: e.target.checked })} /> Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setTModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8E2D6", background: "#fff", color: "#5C6B70" }}>Cancelar</button>
              <button onClick={saveT} className="px-4 py-2 text-sm text-white" style={{ background: "#009AAC", borderRadius: 9 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
