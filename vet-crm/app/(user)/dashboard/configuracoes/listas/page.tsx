"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical } from "react-icons/lu";

interface ListaItem {
  id: string;
  lista: string;
  valor: string;
  ordem: number;
  ativo: boolean;
}

interface ListaDef {
  id: string;
  label: string;
  emoji: string;
  descricao: string;
}

const LISTAS_DEF: ListaDef[] = [
  { id: "canais", emoji: "📞", label: "Canais de entrada", descricao: "Como o lead chegou (WhatsApp, Ligação, Walk-in...)" },
  { id: "origens", emoji: "🎯", label: "Origens", descricao: "Como conheceu a clínica (Indicação, Google, Instagram...)" },
  { id: "motivos_perda", emoji: "❌", label: "Motivos de perda", descricao: "Quando um Lead não converte (Preço, Sem retorno...)" },
  { id: "status_clinico", emoji: "🩺", label: "Status clínico", descricao: "Etapas do acompanhamento clínico do Pet" },
  { id: "plataformas_ads", emoji: "📣", label: "Plataformas de anúncio", descricao: "Google Ads, Meta Ads, TikTok Ads, etc" },
  { id: "tipos_campanha", emoji: "🎬", label: "Tipos de campanha", descricao: "Conversão, Tráfego, Engajamento..." },
  { id: "status_campanha", emoji: "🚦", label: "Status de campanha", descricao: "Ativa, Pausada, Encerrada, Em teste" },
];

const EMPTY: any = { valor: "", ordem: 0, ativo: true };

export default function ListasConfigPage() {
  const [items, setItems] = useState<ListaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedLista, setSelectedLista] = useState<string>("canais");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
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
      const r = await fetch(`/api/listas?includeInactive=${showInactive}`);
      const d = await r.json().catch(() => []);
      setItems(Array.isArray(d) ? d : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const countsPorLista = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.lista] = (c[i.lista] || 0) + 1; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    let arr = items.filter((i) => i.lista === selectedLista);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) => i.valor.toLowerCase().includes(q));
    }
    return arr;
  }, [items, selectedLista, search]);

  const listaAtiva = LISTAS_DEF.find((l) => l.id === selectedLista);

  const openNew = () => { setEditId(null); setForm({ ...EMPTY, lista: selectedLista }); setModalOpen(true); };
  const openEdit = (i: ListaItem) => { setEditId(i.id); setForm({ ...i }); setModalOpen(true); };

  const save = async () => {
    if (!form.valor?.trim()) { alert("Valor é obrigatório."); return; }
    const { id, createdAt, updatedAt, ...payload } = form as any;
    if (!editId) payload.lista = selectedLista;
    const url = editId ? `/api/listas/${editId}` : "/api/listas";
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setModalOpen(false); load();
  };

  const del = async (i: ListaItem) => {
    if (!confirm(`Excluir "${i.valor}" da lista ${listaAtiva?.label}?`)) return;
    await fetch(`/api/listas/${i.id}`, { method: "DELETE" });
    load();
  };

  const importarPacote = async () => {
    if (!confirm("Importar pacote inicial?\n\n~55 itens distribuídos entre as 7 listas (canais, origens, motivos, status clínicos, plataformas, tipos e status de campanha).")) return;
    setSeeding(true);
    try {
      const r = await fetch("/api/listas/seed", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { alert("Erro: " + (body?.message || `HTTP ${r.status}`)); return; }
      if (body?.skipped) { alert(body.reason || "Já tem itens."); }
      else alert(`✓ Pacote importado! ${body?.created?.total || 0} itens em ${body?.created?.listas || 0} listas.`);
      load();
    } catch (e: any) { alert("Erro: " + (e?.message || "")); }
    finally { setSeeding(false); }
  };

  const haveAny = items.length > 0;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Listas customizáveis</h1>
          <p className="text-sm text-[#888780]">Vocabulário do CRM — canais, origens, motivos, status</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativos
        </label>
      </header>

      {!haveAny && !loading && (
        <div className="bg-white border border-dashed border-[#cfd8e0] rounded-xl p-6 mb-3 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-[#0E2244] font-medium mb-1">Comece com o pacote inicial</p>
          <p className="text-[11px] text-[#888780] mb-3">
            ~55 itens nas 7 listas. Você pode editar e excluir o que não usar.
          </p>
          <button onClick={importarPacote} disabled={seeding}
            className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">
            {seeding ? "Importando..." : "📥 Importar pacote inicial"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-3">
        {/* Lista de listas */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2]">
            <span className="text-[11px] text-[#888780] font-medium">LISTAS</span>
          </div>
          <div className="flex flex-col">
            {LISTAS_DEF.map((l) => (
              <button key={l.id} onClick={() => setSelectedLista(l.id)}
                className={`text-left px-3 py-2.5 border-b border-[#f0e8d4] ${selectedLista === l.id ? "bg-[#fdfaee] border-l-2 border-l-[#009AAC]" : "hover:bg-[#fdfaee]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{l.emoji}</span>
                    <span className="text-xs text-[#0E2244] font-medium">{l.label}</span>
                  </div>
                  <span className="text-[10px] text-[#888780]">{countsPorLista[l.id] || 0}</span>
                </div>
                <p className="text-[10px] text-[#888780] mt-0.5 ml-7 leading-snug">{l.descricao}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Itens da lista selecionada */}
        <div className="bg-white rounded-xl border border-[#e8e1d2]">
          <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{listaAtiva?.emoji}</span>
              <div>
                <span className="text-sm text-[#0E2244] font-medium">{listaAtiva?.label}</span>
              </div>
            </div>
            <div className="relative w-40">
              <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-[#fafafa]" />
            </div>
            <button onClick={openNew} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <LuPlus className="w-3.5 h-3.5" />Adicionar Item
            </button>
          </div>
          <div>
            {loading ? (
              <p className="text-center text-[11px] text-[#888780] py-6">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[11px] text-[#888780] py-6">
                Nenhum item nessa lista. Clique em <b>+ Adicionar Item</b>.
              </p>
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
                              <button onClick={() => { openEdit(i); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                                <LuPencil className="w-3 h-3" />Editar
                              </button>
                              <button onClick={() => { del(i); setMenuOpenId(null); }}
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
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{editId ? "Editar item" : `Novo item em ${listaAtiva?.label}`}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Valor *</label>
            <input value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Ordem</label>
            <input type="number" value={form.ordem ?? 0} onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="li-ativo" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <label htmlFor="li-ativo" className="text-sm text-[#0E2244]">Ativo</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={save} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
