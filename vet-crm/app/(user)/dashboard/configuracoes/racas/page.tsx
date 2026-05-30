"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical } from "react-icons/lu";

type Especie = "CAO" | "GATO" | "OUTRO";

interface Raca {
  id: string;
  nome: string;
  especie: Especie;
  ordem: number;
  ativo: boolean;
}

const ESPECIE_LABEL: Record<Especie, { label: string; emoji: string; color: string; bg: string }> = {
  CAO: { label: "Cão", emoji: "🐶", color: "#185FA5", bg: "#E6F1FB" },
  GATO: { label: "Gato", emoji: "🐱", color: "#6B7280", bg: "#F1F1F1" },
  OUTRO: { label: "Outro", emoji: "🐾", color: "#5F5E5A", bg: "#f0e8d4" },
};

const EMPTY: any = { nome: "", especie: "CAO", ordem: 0, ativo: true };

export default function RacasConfigPage() {
  const [racas, setRacas] = useState<Raca[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEspecie, setFilterEspecie] = useState<Especie | null>(null);
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
      const r = await fetch(`/api/racas?includeInactive=${showInactive}`);
      const d = await r.json().catch(() => []);
      setRacas(Array.isArray(d) ? d : []);
    } catch { setRacas([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const counts = useMemo(() => ({
    CAO: racas.filter((r) => r.especie === "CAO").length,
    GATO: racas.filter((r) => r.especie === "GATO").length,
    OUTRO: racas.filter((r) => r.especie === "OUTRO").length,
  }), [racas]);

  const filtered = useMemo(() => {
    let arr = racas;
    if (filterEspecie) arr = arr.filter((r) => r.especie === filterEspecie);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((r) => r.nome.toLowerCase().includes(q));
    }
    return arr;
  }, [racas, filterEspecie, search]);

  const openNew = () => { setEditId(null); setForm({ ...EMPTY, especie: filterEspecie || "CAO" }); setModalOpen(true); };
  const openEdit = (r: Raca) => { setEditId(r.id); setForm({ ...r }); setModalOpen(true); };

  const save = async () => {
    if (!form.nome?.trim()) { alert("Nome é obrigatório."); return; }
    const { id, createdAt, updatedAt, ...payload } = form as any;
    const url = editId ? `/api/racas/${editId}` : "/api/racas";
    const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      alert("Erro: " + (body?.message ? (Array.isArray(body.message) ? body.message.join(", ") : body.message) : `HTTP ${r.status}`));
      return;
    }
    setModalOpen(false); load();
  };

  const del = async (r: Raca) => {
    if (!confirm(`Excluir raça "${r.nome}"?`)) return;
    await fetch(`/api/racas/${r.id}`, { method: "DELETE" });
    load();
  };

  const importarPacote = async () => {
    if (!confirm("Importar pacote inicial?\n\n~49 raças caninas, ~36 felinas e ~20 de outras espécies (coelhos, hamsters, pássaros, etc).")) return;
    setSeeding(true);
    try {
      const r = await fetch("/api/racas/seed", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { alert("Erro: " + (body?.message || `HTTP ${r.status}`)); return; }
      if (body?.skipped) { alert(body.reason || "Já tem raças cadastradas."); }
      else alert(`✓ Pacote importado! ${body?.created?.total || 0} raças (${body?.created?.caninas} cães + ${body?.created?.felinas} gatos + ${body?.created?.outras} outras).`);
      load();
    } catch (e: any) { alert("Erro ao importar: " + (e?.message || "")); }
    finally { setSeeding(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Raças</h1>
          <p className="text-sm text-[#888780]">Lista de raças por espécie, usada nos cadastros de Pet</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativas
        </label>
        <button onClick={openNew} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <LuPlus className="w-3.5 h-3.5" />Adicionar Raça
        </button>
      </header>

      {/* Chips de filtro */}
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {([null, "CAO", "GATO", "OUTRO"] as (Especie | null)[]).map((e) => {
          const isSel = filterEspecie === e;
          const label = e === null ? `Todas (${racas.length})` : `${ESPECIE_LABEL[e].emoji} ${ESPECIE_LABEL[e].label} (${counts[e]})`;
          return (
            <button key={String(e)} onClick={() => setFilterEspecie(e)}
              className={`text-xs px-3 py-1 rounded-full font-medium ${isSel ? "bg-[#009AAC] text-white" : "bg-white border border-[#e8e1d2] text-[#5F5E5A]"}`}>
              {label}
            </button>
          );
        })}
        <div className="relative flex-1 min-w-[200px] ml-2">
          <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar raça..."
            className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-white" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e1d2]">
        {loading ? (
          <p className="text-center text-[11px] text-[#888780] py-6">Carregando...</p>
        ) : filtered.length === 0 ? (
          racas.length === 0 ? (
            <div className="text-center py-10 px-6">
              <div className="text-4xl mb-3">🐾</div>
              <p className="text-sm text-[#0E2244] font-medium mb-1">Importe a lista completa de raças</p>
              <p className="text-[11px] text-[#888780] mb-4">
                Cerca de 105 raças (49 caninas, 36 felinas, 20 outras espécies) usadas no Brasil.<br/>
                Você pode adicionar, editar e excluir depois.
              </p>
              <button onClick={importarPacote} disabled={seeding}
                className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">
                {seeding ? "Importando..." : "📥 Importar pacote inicial"}
              </button>
              <p className="text-[10px] text-[#888780] mt-3">
                Ou clique em <b>+ Adicionar Raça</b> pra começar do zero
              </p>
            </div>
          ) : (
            <p className="text-center text-[11px] text-[#888780] py-6">Nenhuma raça nesse filtro.</p>
          )
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fafafa] border-b border-[#e8e1d2] text-[11px] text-[#888780] font-medium">
                <th className="text-left py-2.5 px-3">Raça</th>
                <th className="text-left py-2.5 px-3">Espécie</th>
                <th className="text-center py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const esp = ESPECIE_LABEL[r.especie];
                return (
                  <tr key={r.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
                    <td className="py-2 px-3 text-[#0E2244]">{r.nome}</td>
                    <td className="py-2 px-3">
                      <span style={{ background: esp.bg, color: esp.color }}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {esp.emoji} {esp.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.ativo ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>
                        {r.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-2 px-3 relative">
                      <div className="relative inline-block">
                        <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === r.id ? null : r.id); }}
                          className="p-1.5 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded">
                          <LuEllipsisVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === r.id && (
                          <div onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                            <button onClick={() => { openEdit(r); setMenuOpenId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                              <LuPencil className="w-3 h-3" />Editar
                            </button>
                            <button onClick={() => { del(r); setMenuOpenId(null); }}
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">{editId ? "Editar raça" : "Nova raça"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Nome *</label>
            <input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Labrador, Persa, etc"
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Espécie *</label>
            <select value={form.especie || "CAO"} onChange={(e) => setForm({ ...form, especie: e.target.value })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm bg-white mb-3 focus:outline-none focus:border-[#009AAC]">
              <option value="CAO">🐶 Cão</option>
              <option value="GATO">🐱 Gato</option>
              <option value="OUTRO">Outro</option>
            </select>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Ordem</label>
            <input type="number" value={form.ordem ?? 0} onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="ra-ativo" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <label htmlFor="ra-ativo" className="text-sm text-[#0E2244]">Ativa (aparece nos dropdowns)</label>
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
