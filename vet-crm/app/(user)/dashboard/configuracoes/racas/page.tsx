"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

type Especie = "CAO" | "GATO" | "OUTRO";

interface Raca {
  id: string;
  nome: string;
  especie: Especie;
  ordem: number;
  ativo: boolean;
}

const ESP_LABEL: Record<Especie, string> = { CAO: "Cão", GATO: "Gato", OUTRO: "Outro" };
const ESP_DOT: Record<Especie, string> = { CAO: "#009AAC", GATO: "#A855F7", OUTRO: "#94A3B8" };

const EMPTY: any = { nome: "", especie: "CAO", ordem: 0, ativo: true };

export default function RacasPage() {
  const [list, setList] = useState<Raca[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEsp, setFilterEsp] = useState<"ALL" | Especie>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/racas${qs}`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterEsp !== "ALL") arr = arr.filter(r => r.especie === filterEsp);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(r => r.nome.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => a.especie.localeCompare(b.especie) || a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  }, [list, filterEsp, search]);

  function openNew() { setEditId(null); setForm({ ...EMPTY, especie: filterEsp !== "ALL" ? filterEsp : "CAO" }); setModalOpen(true); }
  function openEdit(r: Raca) { setEditId(r.id); setForm({ ...r }); setModalOpen(true); }
  async function save() {
    try {
      const { id, createdAt, updatedAt, ...payload } = form as any;
      const url = editId ? `/api/racas/${editId}` : "/api/racas";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(r: Raca) {
    if (!(await confirmDelete({ entityLabel: "raça", itemName: r.nome }))) return;
    const res = await fetch(`/api/racas/${r.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleAtivo(r: Raca) {
    const res = await fetch(`/api/racas/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !r.ativo }),
    });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const r of list) counts[r.especie] = (counts[r.especie] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Raças</h1>
            <p className="text-sm text-gray-500">Catálogo de raças por espécie (cão, gato, outros)</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativas
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <button onClick={() => setImportOpen(true)}
          className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
          style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          Importar planilha
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar raças..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Nova Raça
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Espécie</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-16">Ordem</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma raça.</td></tr>}
              {filtered.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: r.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ESP_DOT[r.especie] }} />
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: "#0E2244" }}>{r.nome}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{ESP_LABEL[r.especie]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{r.ordem}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleAtivo(r)} className="inline-flex items-center w-10 h-5 rounded-full transition"
                      style={{ background: r.ativo ? "#009AAC" : "#CBD5E0" }}>
                      <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: r.ativo ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openEdit(r)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Editar"><LuPencil size={14} /></button>
                    <button onClick={() => remove(r)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir"><LuX size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtro por espécie */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ESPÉCIES</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "CAO", "GATO", "OUTRO"] as const).map(k => (
              <button key={k} onClick={() => setFilterEsp(k)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterEsp === k ? "#009AAC" : "#E8DFC8",
                  background: filterEsp === k ? "#E0F4F6" : "white",
                  color: filterEsp === k ? "#009AAC" : "#4B5563",
                }}>
                {k === "ALL" ? "Todas" : ESP_LABEL[k as Especie]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{editId ? "Editar raça" : "Nova raça"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="text-xs text-gray-600">Espécie *</label>
                  <select value={form.especie} onChange={e => setForm({ ...form, especie: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(ESP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Ordem</label>
                  <input type="number" value={form.ordem || 0} onChange={e => setForm({ ...form, ordem: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Raças" endpoint="/api/racas/import-batch"
        exampleHint="Exporte de Base44 > Raca. Espécies: Cão, Gato, Outro."
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "especie", label: "Espécie", required: true },
          { key: "ordem", label: "Ordem", type: "int" },
          { key: "ativo", label: "Ativo", type: "boolean" },
        ]}
        onSuccess={() => load()} />
    </div>
  );
}
