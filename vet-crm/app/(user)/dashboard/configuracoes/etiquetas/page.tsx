"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical } from "react-icons/lu";

type TipoEtiqueta = "CLINICA" | "STATUS" | "CUSTOM";

interface TagCategory {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  _count?: { etiquetas: number };
}

interface EtiquetaTemplate {
  id: string;
  texto: string;
  tipo: TipoEtiqueta;
  cor?: string | null;
  descricao?: string | null;
  aplicaEm: string[];
  categoryId?: string | null;
  ativo: boolean;
  category?: { id: string; nome: string } | null;
}

const TIPO_LABEL: Record<TipoEtiqueta, { label: string; color: string; bg: string }> = {
  CLINICA: { label: "Clínica", color: "#A32D2D", bg: "#FCEBEB" },
  STATUS: { label: "Status", color: "#185FA5", bg: "#E6F1FB" },
  CUSTOM: { label: "Custom", color: "#5F5E5A", bg: "#f0e8d4" },
};

const APLICA_OPCOES = ["Lead", "Cliente", "Pet"];

const EMPTY_CAT: any = { nome: "", ordem: 0, ativo: true };
const EMPTY_ET: any = { texto: "", tipo: "CUSTOM", cor: "#0E2244", aplicaEm: [], categoryId: null, ativo: true };

export default function EtiquetasConfigPage() {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT);

  const [etModalOpen, setEtModalOpen] = useState(false);
  const [etEditId, setEtEditId] = useState<string | null>(null);
  const [etForm, setEtForm] = useState<any>(EMPTY_ET);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const h = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener("click", h);
      return () => document.removeEventListener("click", h);
    }
  }, [menuOpenId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [catRes, etRes] = await Promise.all([
        fetch(`/api/etiquetas/categorias?includeInactive=${showInactive}`),
        fetch(`/api/etiquetas/templates?includeInactive=${showInactive}`),
      ]);
      const cats = await catRes.json().catch(() => []);
      const ets = await etRes.json().catch(() => []);
      setCategories(Array.isArray(cats) ? cats : []);
      setEtiquetas(Array.isArray(ets) ? ets : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = etiquetas;
    if (selectedCatId === "sem-categoria") arr = arr.filter((e) => !e.categoryId);
    else if (selectedCatId) arr = arr.filter((e) => e.categoryId === selectedCatId);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e) => e.texto.toLowerCase().includes(q));
    }
    return arr;
  }, [etiquetas, selectedCatId, search]);

  // ===== Handlers Categoria =====
  const openNewCat = () => { setCatEditId(null); setCatForm(EMPTY_CAT); setCatModalOpen(true); };
  const openEditCat = (c: TagCategory) => { setCatEditId(c.id); setCatForm({ ...c }); setCatModalOpen(true); };
  const saveCat = async () => {
    if (!catForm.nome?.trim()) { alert("Nome é obrigatório."); return; }
    const { id, _count, ...payload } = catForm as any;
    const url = catEditId ? `/api/etiquetas/categorias/${catEditId}` : "/api/etiquetas/categorias";
    const method = catEditId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setCatModalOpen(false); loadAll();
  };
  const deleteCat = async (c: TagCategory) => {
    if (!confirm(`Excluir categoria ${c.nome}? Etiquetas dela ficarão sem categoria.`)) return;
    await fetch(`/api/etiquetas/categorias/${c.id}`, { method: "DELETE" });
    if (selectedCatId === c.id) setSelectedCatId(null);
    loadAll();
  };

  // ===== Handlers Etiqueta =====
  const openNewEt = () => { setEtEditId(null); setEtForm({ ...EMPTY_ET, categoryId: selectedCatId === "sem-categoria" ? null : selectedCatId }); setEtModalOpen(true); };
  const openEditEt = (e: EtiquetaTemplate) => { setEtEditId(e.id); setEtForm({ ...e }); setEtModalOpen(true); };
  const saveEt = async () => {
    if (!etForm.texto?.trim()) { alert("Texto é obrigatório."); return; }
    const { id, category, createdAt, updatedAt, ...payload } = etForm as any;
    const url = etEditId ? `/api/etiquetas/templates/${etEditId}` : "/api/etiquetas/templates";
    const method = etEditId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setEtModalOpen(false); loadAll();
  };
  const deleteEt = async (e: EtiquetaTemplate) => {
    if (!confirm(`Excluir etiqueta "${e.texto}"?`)) return;
    await fetch(`/api/etiquetas/templates/${e.id}`, { method: "DELETE" });
    loadAll();
  };

  const toggleAplica = (v: string) => {
    const cur = etForm.aplicaEm || [];
    if (cur.includes(v)) setEtForm({ ...etForm, aplicaEm: cur.filter((x: string) => x !== v) });
    else setEtForm({ ...etForm, aplicaEm: [...cur, v] });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Etiquetas</h1>
          <p className="text-sm text-[#888780]">Tags com cor pra organizar Lead, Cliente e Pet</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativas
        </label>
      </header>

      <div className="grid grid-cols-[250px_1fr] gap-3">
        {/* ===== Categorias ===== */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between">
            <span className="text-[11px] text-[#888780] font-medium">CATEGORIAS</span>
            <button onClick={openNewCat} className="text-[10px] text-[#009AAC] hover:underline font-medium">+ Nova</button>
          </div>
          <div className="flex flex-col">
            <button onClick={() => setSelectedCatId(null)}
              className={`text-left px-3 py-2 text-xs border-b border-[#f0e8d4] ${selectedCatId === null ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
              Todas <span className="text-[10px] text-[#888780]">({etiquetas.length})</span>
            </button>
            <button onClick={() => setSelectedCatId("sem-categoria")}
              className={`text-left px-3 py-2 text-xs border-b border-[#f0e8d4] ${selectedCatId === "sem-categoria" ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
              <em className="text-[#888780]">Sem categoria</em>
            </button>
            {categories.map((c) => (
              <div key={c.id}
                className={`flex items-center justify-between border-b border-[#f0e8d4] ${selectedCatId === c.id ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
                <button onClick={() => setSelectedCatId(c.id)} className="flex-1 text-left px-3 py-2 text-xs text-[#0E2244]">
                  {c.nome} <span className="text-[10px] text-[#888780]">({c._count?.etiquetas || 0})</span>
                </button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `cat-${c.id}` ? null : `cat-${c.id}`); }}
                    className="p-1.5 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded mr-1">
                    <LuEllipsisVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpenId === `cat-${c.id}` && (
                    <div onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                      <button onClick={() => { openEditCat(c); setMenuOpenId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                        <LuPencil className="w-3 h-3" />Editar
                      </button>
                      <button onClick={() => { deleteCat(c); setMenuOpenId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                        <LuTrash className="w-3 h-3" />Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Etiquetas ===== */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between gap-2">
            <div className="flex-1 relative">
              <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar etiquetas..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-[#fafafa]" />
            </div>
            <button onClick={openNewEt} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <LuPlus className="w-3.5 h-3.5" />Adicionar Etiqueta
            </button>
          </div>
          <div className="p-3">
            {loading ? (
              <p className="text-center text-[11px] text-[#888780] py-6">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[11px] text-[#888780] py-6">
                Nenhuma etiqueta nesse filtro. Clique em <b>+ Adicionar Etiqueta</b>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filtered.map((e) => {
                  const tipo = TIPO_LABEL[e.tipo];
                  return (
                    <div key={e.id} className="border border-[#e8e1d2] rounded-lg p-2.5 bg-[#fbfaf6] min-w-[200px] relative">
                      <div className="flex items-start justify-between mb-1">
                        <span style={{ background: e.cor || "#f0e8d4", color: "#fff" }}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block">
                          {e.texto}
                        </span>
                        <div className="relative">
                          <button onClick={(ev) => { ev.stopPropagation(); setMenuOpenId(menuOpenId === `et-${e.id}` ? null : `et-${e.id}`); }}
                            className="p-1 text-[#5F5E5A] hover:bg-white rounded">
                            <LuEllipsisVertical className="w-3.5 h-3.5" />
                          </button>
                          {menuOpenId === `et-${e.id}` && (
                            <div onClick={(ev) => ev.stopPropagation()}
                              className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                              <button onClick={() => { openEditEt(e); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                                <LuPencil className="w-3 h-3" />Editar
                              </button>
                              <button onClick={() => { deleteEt(e); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                                <LuTrash className="w-3 h-3" />Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span style={{ background: tipo.bg, color: tipo.color }} className="text-[9px] font-medium px-1.5 py-0.5 rounded">
                          {tipo.label}
                        </span>
                        {!e.ativo && <span className="text-[9px] bg-[#f0e8d4] text-[#5F5E5A] px-1.5 py-0.5 rounded">Inativa</span>}
                      </div>
                      <div className="text-[10px] text-[#888780] mt-1.5">
                        Aplica em: {(e.aplicaEm || []).join(", ") || "—"}
                      </div>
                      {e.category && (
                        <div className="text-[10px] text-[#888780] mt-0.5">Categoria: {e.category.nome}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Modal Categoria ===== */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCatModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{catEditId ? "Editar categoria" : "Nova categoria"}</h3>
              <button onClick={() => setCatModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Nome *</label>
            <input value={catForm.nome || ""} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Ordem</label>
            <input type="number" value={catForm.ordem ?? 0} onChange={(e) => setCatForm({ ...catForm, ordem: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="cat-ativo" checked={catForm.ativo ?? true} onChange={(e) => setCatForm({ ...catForm, ativo: e.target.checked })} />
              <label htmlFor="cat-ativo" className="text-sm text-[#0E2244]">Ativa</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCatModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={saveCat} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Etiqueta ===== */}
      {etModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEtModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{etEditId ? "Editar etiqueta" : "Nova etiqueta"}</h3>
              <button onClick={() => setEtModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Texto *</label>
            <input value={etForm.texto || ""} onChange={(e) => setEtForm({ ...etForm, texto: e.target.value })}
              placeholder="VIP, A recuperar, Castrado..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Tipo</label>
                <select value={etForm.tipo || "CUSTOM"} onChange={(e) => setEtForm({ ...etForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm bg-white focus:outline-none focus:border-[#009AAC]">
                  <option value="CLINICA">Clínica</option>
                  <option value="STATUS">Status</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Cor</label>
                <input type="color" value={etForm.cor || "#0E2244"} onChange={(e) => setEtForm({ ...etForm, cor: e.target.value })}
                  className="w-full h-10 border border-[#e8e1d2] rounded-lg cursor-pointer" />
              </div>
            </div>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Categoria</label>
            <select value={etForm.categoryId || ""} onChange={(e) => setEtForm({ ...etForm, categoryId: e.target.value || null })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 bg-white focus:outline-none focus:border-[#009AAC]">
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Aplica em</label>
            <div className="flex gap-2 mb-3">
              {APLICA_OPCOES.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => toggleAplica(opt)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${(etForm.aplicaEm || []).includes(opt) ? "bg-[#009AAC] text-white" : "bg-white border border-[#e8e1d2] text-[#5F5E5A]"}`}>
                  {opt}
                </button>
              ))}
            </div>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Descrição (opcional)</label>
            <textarea value={etForm.descricao || ""} onChange={(e) => setEtForm({ ...etForm, descricao: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />

            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="et-ativo" checked={etForm.ativo ?? true} onChange={(e) => setEtForm({ ...etForm, ativo: e.target.checked })} />
              <label htmlFor="et-ativo" className="text-sm text-[#0E2244]">Ativa</label>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setEtModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={saveEt} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
