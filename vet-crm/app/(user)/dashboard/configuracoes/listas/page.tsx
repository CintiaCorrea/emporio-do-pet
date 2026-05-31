"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CsvImporter from "@/components/import/CsvImporter";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical } from "react-icons/lu";

interface ListaTipo {
  id: string;
  nome: string;
  label: string;
  emoji?: string | null;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
}

interface ListaItem {
  id: string;
  lista: string;
  valor: string;
  ordem: number;
  ativo: boolean;
}

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const EMPTY_TIPO: any = { nome: "", label: "", emoji: "📋", descricao: "", ordem: 0, ativo: true };
const EMPTY_ITEM: any = { valor: "", ordem: 0, ativo: true };

export default function ListasConfigPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [tipos, setTipos] = useState<ListaTipo[]>([]);
  const [items, setItems] = useState<ListaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedTipoNome, setSelectedTipoNome] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modais
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoEditId, setTipoEditId] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState<any>(EMPTY_TIPO);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<any>(EMPTY_ITEM);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const h = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener("click", h);
      return () => document.removeEventListener("click", h);
    }
  }, [menuOpenId]);

  const load = async () => {
    setLoading(true);
    try {
      const [tiposRes, itemsRes] = await Promise.all([
        fetch(`/api/listas/tipos?includeInactive=${showInactive}`),
        fetch(`/api/listas?includeInactive=${showInactive}`),
      ]);
      const ts = await tiposRes.json().catch(() => []);
      const its = await itemsRes.json().catch(() => []);
      const tiposArr = Array.isArray(ts) ? ts : [];
      setTipos(tiposArr);
      setItems(Array.isArray(its) ? its : []);
      if (!selectedTipoNome && tiposArr.length > 0) setSelectedTipoNome(tiposArr[0].nome);
    } catch { setTipos([]); setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const countsPorLista = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.lista] = (c[i.lista] || 0) + 1; });
    return c;
  }, [items]);

  const tipoAtivo = tipos.find((t) => t.nome === selectedTipoNome);

  const filtered = useMemo(() => {
    let arr = selectedTipoNome ? items.filter((i) => i.lista === selectedTipoNome) : [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) => i.valor.toLowerCase().includes(q));
    }
    return arr;
  }, [items, selectedTipoNome, search]);

  // ===== Tipo handlers =====
  const openNewTipo = () => { setTipoEditId(null); setTipoForm(EMPTY_TIPO); setTipoModalOpen(true); };
  const openEditTipo = (t: ListaTipo) => { setTipoEditId(t.id); setTipoForm({ ...t }); setTipoModalOpen(true); };
  const saveTipo = async () => {
    if (!tipoForm.label?.trim()) { alert("Label é obrigatório."); return; }
    let payload = { ...tipoForm };
    // auto-gerar nome se vazio e for novo
    if (!tipoEditId && !payload.nome?.trim()) {
      payload.nome = slugify(payload.label);
    }
    delete payload.id; delete payload.createdAt; delete payload.updatedAt;
    const url = tipoEditId ? `/api/listas/tipos/${tipoEditId}` : "/api/listas/tipos";
    const r = await fetch(url, { method: tipoEditId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setTipoModalOpen(false); load();
  };
  const deleteTipo = async (t: ListaTipo) => {
    if (!confirm(`Excluir a lista "${t.label}"? Isso só funciona se não houver itens dentro.`)) return;
    const r = await fetch(`/api/listas/tipos/${t.id}`, { method: "DELETE" });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert(body?.message || `HTTP ${r.status}`);
      return;
    }
    if (selectedTipoNome === t.nome) setSelectedTipoNome(null);
    load();
  };

  // ===== Item handlers =====
  const openNewItem = () => { setItemEditId(null); setItemForm({ ...EMPTY_ITEM, lista: selectedTipoNome }); setItemModalOpen(true); };
  const openEditItem = (i: ListaItem) => { setItemEditId(i.id); setItemForm({ ...i }); setItemModalOpen(true); };
  const saveItem = async () => {
    if (!itemForm.valor?.trim()) { alert("Valor é obrigatório."); return; }
    let { id, createdAt, updatedAt, ...payload } = itemForm as any;
    if (!itemEditId) payload.lista = selectedTipoNome;
    const url = itemEditId ? `/api/listas/${itemEditId}` : "/api/listas";
    const r = await fetch(url, { method: itemEditId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setItemModalOpen(false); load();
  };
  const deleteItem = async (i: ListaItem) => {
    if (!confirm(`Excluir "${i.valor}" da lista ${tipoAtivo?.label}?`)) return;
    await fetch(`/api/listas/${i.id}`, { method: "DELETE" });
    load();
  };

  const importarPacote = async () => {
    if (!confirm("Importar pacote inicial?\n\n7 listas + ~55 itens. Não duplica se já tiver.")) return;
    setSeeding(true);
    try {
      // Cria tipos padrão primeiro (idempotente)
      await fetch("/api/listas/tipos/seed", { method: "POST" });
      // Depois itens
      const r = await fetch("/api/listas/seed", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { alert("Erro: " + (body?.message || `HTTP ${r.status}`)); return; }
      if (body?.skipped) { alert(body.reason || "Já tem itens."); }
      else alert(`✓ Pacote importado!`);
      load();
    } catch (e: any) { alert("Erro: " + (e?.message || "")); }
    finally { setSeeding(false); }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Listas customizáveis</h1>
          <p className="text-sm text-[#888780]">Crie suas próprias listas e adicione itens em cada uma</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativos
        </label>
      </header>

      {!loading && tipos.length === 0 && (
        <div className="bg-white border border-dashed border-[#cfd8e0] rounded-xl p-6 mb-3 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-[#0E2244] font-medium mb-1">Comece com o pacote inicial</p>
          <p className="text-[11px] text-[#888780] mb-3">
            7 listas padrão (canais, origens, motivos, status clínico, etc) + ~55 itens.<br/>
            Você pode adicionar listas próprias, editar e excluir tudo depois.
          </p>
          <button onClick={importarPacote} disabled={seeding}
            className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">
            {seeding ? "Importando..." : "📥 Importar pacote inicial"}
          </button>
          <p className="text-[10px] text-[#888780] mt-3">
            Ou clique em <b>+ Nova Lista</b> abaixo pra começar do zero
          </p>
        </div>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-3">
        {/* Painel das Listas */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between">
            <span className="text-[11px] text-[#888780] font-medium">LISTAS</span>
            <button onClick={openNewTipo} className="text-[10px] text-[#009AAC] hover:underline font-medium flex items-center gap-1">
              <LuPlus className="w-3 h-3" /> Nova Lista
            </button>
          </div>
          <div className="flex flex-col max-h-[600px] overflow-y-auto">
            {tipos.length === 0 && !loading && (
              <p className="text-center text-[11px] text-[#888780] py-6">Sem listas. Crie uma!</p>
            )}
            {tipos.map((t) => (
              <div key={t.id}
                className={`border-b border-[#f0e8d4] ${selectedTipoNome === t.nome ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
                <div className="flex items-start justify-between">
                  <button onClick={() => setSelectedTipoNome(t.nome)}
                    className="flex-1 text-left px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.emoji || "📋"}</span>
                      <span className="text-xs text-[#0E2244] font-medium flex-1">{t.label}</span>
                      <span className="text-[10px] text-[#888780]">{countsPorLista[t.nome] || 0}</span>
                    </div>
                    {t.descricao && <p className="text-[10px] text-[#888780] mt-0.5 ml-7 leading-snug">{t.descricao}</p>}
                  </button>
                  <div className="relative pt-1.5 pr-1">
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === `tipo-${t.id}` ? null : `tipo-${t.id}`); }}
                      className="p-1 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded">
                      <LuEllipsisVertical className="w-3.5 h-3.5" />
                    </button>
                    {menuOpenId === `tipo-${t.id}` && (
                      <div onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                        <button onClick={() => { openEditTipo(t); setMenuOpenId(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                          <LuPencil className="w-3 h-3" />Editar
                        </button>
                        <button onClick={() => { deleteTipo(t); setMenuOpenId(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                          <LuTrash className="w-3 h-3" />Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Itens da lista selecionada */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {tipoAtivo ? (
                <>
                  <span className="text-lg">{tipoAtivo.emoji || "📋"}</span>
                  <div><span className="text-sm text-[#0E2244] font-medium">{tipoAtivo.label}</span></div>
                </>
              ) : (
                <span className="text-sm text-[#888780]">Selecione uma lista à esquerda</span>
              )}
            </div>
            {tipoAtivo && (
              <>
                <div className="relative w-40">
                  <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                    className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-[#fafafa]" />
                </div>
                <button onClick={openNewItem} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <LuPlus className="w-3.5 h-3.5" />Adicionar Item
                </button>
              </>
            )}
          </div>
          {tipoAtivo && (
            <div>
              {loading ? (
                <p className="text-center text-[11px] text-[#888780] py-6">Carregando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[11px] text-[#888780] py-6">Nenhum item. Clique em <b>+ Adicionar Item</b>.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-[#e8e1d2] text-[11px] text-[#888780] font-medium">
                      <th className="text-left py-2.5 px-3">Valor</th>
                      <th className="text-center py-2.5 px-3 w-20">Ordem</th>
                      <th className="text-center py-2.5 px-3 w-24">Status</th>
                      <th className="py-2.5 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => (
                      <tr key={i.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
                        <td className="py-2 px-3 text-[#0E2244]">{i.valor}</td>
                        <td className="py-2 px-3 text-center text-[#5F5E5A]">{i.ordem}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${i.ativo ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>
                            {i.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-2 px-3 relative">
                          <div className="relative inline-block">
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === i.id ? null : i.id); }}
                              className="p-1.5 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded">
                              <LuEllipsisVertical className="w-4 h-4" />
                            </button>
                            {menuOpenId === i.id && (
                              <div onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                                <button onClick={() => { openEditItem(i); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                                  <LuPencil className="w-3 h-3" />Editar
                                </button>
                                <button onClick={() => { deleteItem(i); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                                  <LuTrash className="w-3 h-3" />Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tipo */}
      {tipoModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setTipoModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{tipoEditId ? "Editar lista" : "Nova lista"}</h3>
              <button onClick={() => setTipoModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Label *</label>
            <input value={tipoForm.label || ""} onChange={(e) => setTipoForm({ ...tipoForm, label: e.target.value })}
              placeholder="Ex: Tipos de exame"
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            {!tipoEditId && (
              <>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Identificador (auto)</label>
                <input value={tipoForm.nome || slugify(tipoForm.label || "")} onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                  placeholder="auto-gerado do label (ex: tipos_exame)"
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] font-mono text-[12px]" />
              </>
            )}
            <div className="grid grid-cols-[80px_1fr] gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Emoji</label>
                <input value={tipoForm.emoji || ""} onChange={(e) => setTipoForm({ ...tipoForm, emoji: e.target.value })}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-lg text-center focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Ordem</label>
                <input type="number" value={tipoForm.ordem ?? 0} onChange={(e) => setTipoForm({ ...tipoForm, ordem: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Descrição</label>
            <textarea value={tipoForm.descricao || ""} onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
              rows={2} placeholder="O que essa lista representa..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 resize-none focus:outline-none focus:border-[#009AAC]" />
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="ta-ativo" checked={tipoForm.ativo ?? true} onChange={(e) => setTipoForm({ ...tipoForm, ativo: e.target.checked })} />
              <label htmlFor="ta-ativo" className="text-sm text-[#0E2244]">Ativa</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTipoModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={saveTipo} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setItemModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{itemEditId ? "Editar item" : `Novo item em ${tipoAtivo?.label}`}</h3>
              <button onClick={() => setItemModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Valor *</label>
            <input value={itemForm.valor || ""} onChange={(e) => setItemForm({ ...itemForm, valor: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Ordem</label>
            <input type="number" value={itemForm.ordem ?? 0} onChange={(e) => setItemForm({ ...itemForm, ordem: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="li-ativo" checked={itemForm.ativo ?? true} onChange={(e) => setItemForm({ ...itemForm, ativo: e.target.checked })} />
              <label htmlFor="li-ativo" className="text-sm text-[#0E2244]">Ativo</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setItemModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={saveItem} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}

      
      {/* Botão Importar planilha (FAB) */}
      <button
        onClick={() => setImportOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-3 rounded-full text-sm shadow-md hover:shadow-lg transition"
        style={{ background: "#009AAC", color: "white" }}
        title="Importar planilha"
      >
        Importar planilha
      </button>
      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Itens de Lista"
        endpoint="/api/listas/import-batch"
        exampleHint="Exporte de Base44 > ListaItem. Coluna 'lista' identifica a lista (ex: canais, origens, motivos_perda)."
        fields={[{"key": "lista", "label": "Lista", "required": true}, {"key": "valor", "label": "Valor", "required": true}, {"key": "ordem", "label": "Ordem", "type": "int"}, {"key": "ativo", "label": "Ativo", "type": "boolean"}]}
        onSuccess={() => load()}
      />
    </div>
  );
}
