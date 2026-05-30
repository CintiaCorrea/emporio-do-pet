"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical } from "react-icons/lu";

type ComissaoBase = "VALOR_CHEIO" | "MARGEM" | "SEM_COMISSAO" | "HERDAR";

interface Categoria {
  id: string;
  nome: string;
  comissaoBasePadrao: ComissaoBase;
  ativo: boolean;
  _count?: { servicos: number };
}

interface Servico {
  id: string;
  nome: string;
  valorPadrao?: number | null;
  custoPadrao?: number | null;
  comissaoBaseDefault: ComissaoBase;
  categoryId?: string | null;
  ativo: boolean;
  category?: { id: string; nome: string } | null;
}

const COMISSAO_LABEL: Record<ComissaoBase, { label: string; bg: string; color: string }> = {
  VALOR_CHEIO: { label: "Valor cheio", bg: "#E0F4F6", color: "#00798A" },
  MARGEM: { label: "Margem", bg: "#FBF0DD", color: "#8a6313" },
  SEM_COMISSAO: { label: "Sem comissão", bg: "#FCEBEB", color: "#A32D2D" },
  HERDAR: { label: "Herdar da categoria", bg: "#EEEDFE", color: "#3C3489" },
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${v.toFixed(2)}`;

const EMPTY_CAT: any = { nome: "", comissaoBasePadrao: "VALOR_CHEIO", ativo: true };
const EMPTY_SV: any = { nome: "", valorPadrao: null, custoPadrao: null, comissaoBaseDefault: "HERDAR", categoryId: null, ativo: true };

export default function ServicosConfigPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT);

  const [svModalOpen, setSvModalOpen] = useState(false);
  const [svEditId, setSvEditId] = useState<string | null>(null);
  const [svForm, setSvForm] = useState<any>(EMPTY_SV);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
      const [catRes, svRes] = await Promise.all([
        fetch(`/api/servicos/categorias?includeInactive=${showInactive}`),
        fetch(`/api/servicos/itens?includeInactive=${showInactive}`),
      ]);
      setCategorias((await catRes.json().catch(() => [])) || []);
      setServicos((await svRes.json().catch(() => [])) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = servicos;
    if (selectedCatId === "sem-categoria") arr = arr.filter((s) => !s.categoryId);
    else if (selectedCatId) arr = arr.filter((s) => s.categoryId === selectedCatId);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s) => s.nome.toLowerCase().includes(q));
    }
    return arr;
  }, [servicos, selectedCatId, search]);

  // ===== Categoria handlers =====
  const openNewCat = () => { setCatEditId(null); setCatForm(EMPTY_CAT); setCatModalOpen(true); };
  const openEditCat = (c: Categoria) => { setCatEditId(c.id); setCatForm({ ...c }); setCatModalOpen(true); };
  const saveCat = async () => {
    if (!catForm.nome?.trim()) { alert("Nome é obrigatório."); return; }
    const { id, _count, createdAt, updatedAt, ...payload } = catForm as any;
    const url = catEditId ? `/api/servicos/categorias/${catEditId}` : "/api/servicos/categorias";
    const r = await fetch(url, { method: catEditId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setCatModalOpen(false); loadAll();
  };
  const deleteCat = async (c: Categoria) => {
    if (!confirm(`Excluir categoria ${c.nome}? Serviços ficam sem categoria.`)) return;
    await fetch(`/api/servicos/categorias/${c.id}`, { method: "DELETE" });
    if (selectedCatId === c.id) setSelectedCatId(null);
    loadAll();
  };

  // ===== Serviço handlers =====
  const openNewSv = () => { setSvEditId(null); setSvForm({ ...EMPTY_SV, categoryId: selectedCatId === "sem-categoria" ? null : selectedCatId }); setSvModalOpen(true); };
  const openEditSv = (s: Servico) => { setSvEditId(s.id); setSvForm({ ...s }); setSvModalOpen(true); };
  const saveSv = async () => {
    if (!svForm.nome?.trim()) { alert("Nome é obrigatório."); return; }
    const { id, category, createdAt, updatedAt, ...payload } = svForm as any;
    const url = svEditId ? `/api/servicos/itens/${svEditId}` : "/api/servicos/itens";
    const r = await fetch(url, { method: svEditId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setSvModalOpen(false); loadAll();
  };
  const deleteSv = async (s: Servico) => {
    if (!confirm(`Excluir serviço "${s.nome}"?`)) return;
    await fetch(`/api/servicos/itens/${s.id}`, { method: "DELETE" });
    loadAll();
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Serviços e Produtos</h1>
          <p className="text-sm text-[#888780]">Catálogo com preço, custo e regra de comissão</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativos
        </label>
      </header>

      <div className="grid grid-cols-[250px_1fr] gap-3">
        {/* Categorias */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between">
            <span className="text-[11px] text-[#888780] font-medium">CATEGORIAS</span>
            <button onClick={openNewCat} className="text-[10px] text-[#009AAC] hover:underline font-medium">+ Nova</button>
          </div>
          <div className="flex flex-col">
            <button onClick={() => setSelectedCatId(null)}
              className={`text-left px-3 py-2 text-xs border-b border-[#f0e8d4] ${selectedCatId === null ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
              Todos <span className="text-[10px] text-[#888780]">({servicos.length})</span>
            </button>
            <button onClick={() => setSelectedCatId("sem-categoria")}
              className={`text-left px-3 py-2 text-xs border-b border-[#f0e8d4] ${selectedCatId === "sem-categoria" ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
              <em className="text-[#888780]">Sem categoria</em>
            </button>
            {categorias.map((c) => (
              <div key={c.id}
                className={`flex items-center justify-between border-b border-[#f0e8d4] ${selectedCatId === c.id ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
                <button onClick={() => setSelectedCatId(c.id)} className="flex-1 text-left px-3 py-2 text-xs text-[#0E2244]">
                  {c.nome} <span className="text-[10px] text-[#888780]">({c._count?.servicos || 0})</span>
                  <div className="text-[9px] text-[#888780] mt-0.5">Comissão: {COMISSAO_LABEL[c.comissaoBasePadrao]?.label}</div>
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

        {/* Serviços */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between gap-2">
            <div className="flex-1 relative">
              <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar serviços..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-[#fafafa]" />
            </div>
            <button onClick={openNewSv} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <LuPlus className="w-3.5 h-3.5" />Adicionar Serviço
            </button>
          </div>
          <div>
            {loading ? (
              <p className="text-center text-[11px] text-[#888780] py-6">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[11px] text-[#888780] py-6">
                Nenhum serviço nesse filtro. Clique em <b>+ Adicionar Serviço</b>.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e8e1d2] text-[11px] text-[#888780] font-medium">
                    <th className="text-left py-2.5 px-3">Nome</th>
                    <th className="text-right py-2.5 px-3">Valor</th>
                    <th className="text-right py-2.5 px-3">Custo</th>
                    <th className="text-left py-2.5 px-3">Comissão</th>
                    <th className="text-left py-2.5 px-3">Categoria</th>
                    <th className="text-center py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const c = COMISSAO_LABEL[s.comissaoBaseDefault];
                    return (
                      <tr key={s.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
                        <td className="py-2.5 px-3 text-[#0E2244] font-medium">{s.nome}</td>
                        <td className="py-2.5 px-3 text-right text-[#0E2244]">{fmtR(s.valorPadrao)}</td>
                        <td className="py-2.5 px-3 text-right text-[#5F5E5A]">{fmtR(s.custoPadrao)}</td>
                        <td className="py-2.5 px-3">
                          <span style={{ background: c.bg, color: c.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {c.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#5F5E5A]">{s.category?.nome || "—"}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.ativo ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>
                            {s.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 relative">
                          <div className="relative inline-block">
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `sv-${s.id}` ? null : `sv-${s.id}`); }}
                              className="p-1.5 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded">
                              <LuEllipsisVertical className="w-4 h-4" />
                            </button>
                            {menuOpenId === `sv-${s.id}` && (
                              <div onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                                <button onClick={() => { openEditSv(s); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                                  <LuPencil className="w-3 h-3" />Editar
                                </button>
                                <button onClick={() => { deleteSv(s); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                                  <LuTrash className="w-3 h-3" />Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Categoria */}
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
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Base de comissão padrão</label>
            <select value={catForm.comissaoBasePadrao || "VALOR_CHEIO"} onChange={(e) => setCatForm({ ...catForm, comissaoBasePadrao: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm bg-white mb-3 focus:outline-none focus:border-[#009AAC]">
              <option value="VALOR_CHEIO">Valor cheio (% sobre o preço)</option>
              <option value="MARGEM">Margem (% sobre valor - custo)</option>
              <option value="SEM_COMISSAO">Sem comissão</option>
            </select>
            <p className="text-[10px] text-[#888780] mb-3">
              💡 Margem é usado para Medicamentos, Vacinas e Produtos.<br/>
              Valor cheio para Consulta, Cirurgia e Serviços.
            </p>
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

      {/* Modal Serviço */}
      {svModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSvModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{svEditId ? "Editar serviço" : "Novo serviço"}</h3>
              <button onClick={() => setSvModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Nome *</label>
            <input value={svForm.nome || ""} onChange={(e) => setSvForm({ ...svForm, nome: e.target.value })}
              placeholder="Consulta padrão, Vacina V10, Banho..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Valor (R$)</label>
                <input type="number" step="0.01" value={svForm.valorPadrao ?? ""} onChange={(e) => setSvForm({ ...svForm, valorPadrao: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Custo (R$)</label>
                <input type="number" step="0.01" value={svForm.custoPadrao ?? ""} onChange={(e) => setSvForm({ ...svForm, custoPadrao: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Só pra produtos"
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
            </div>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Categoria</label>
            <select value={svForm.categoryId || ""} onChange={(e) => setSvForm({ ...svForm, categoryId: e.target.value || null })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 bg-white focus:outline-none focus:border-[#009AAC]">
              <option value="">Sem categoria</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Base de comissão</label>
            <select value={svForm.comissaoBaseDefault || "HERDAR"} onChange={(e) => setSvForm({ ...svForm, comissaoBaseDefault: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm bg-white mb-3 focus:outline-none focus:border-[#009AAC]">
              <option value="HERDAR">Herdar da categoria</option>
              <option value="VALOR_CHEIO">Valor cheio</option>
              <option value="MARGEM">Margem</option>
              <option value="SEM_COMISSAO">Sem comissão</option>
            </select>

            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="sv-ativo" checked={svForm.ativo ?? true} onChange={(e) => setSvForm({ ...svForm, ativo: e.target.checked })} />
              <label htmlFor="sv-ativo" className="text-sm text-[#0E2244]">Ativo</label>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setSvModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={saveSv} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
