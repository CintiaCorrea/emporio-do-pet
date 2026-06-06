"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";

type Tipo = "CLINICA" | "STATUS" | "CUSTOM";

interface Etiqueta {
  id: string;
  texto: string;
  tipo: Tipo;
  cor?: string | null;
  descricao?: string | null;
  aplicaEm: string[];
  categoryId?: string | null;
  ativo: boolean;
  category?: { id: string; nome: string } | null;
}

interface Bloco {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  _count?: { etiquetas: number };
}

const TIPO_DOT: Record<Tipo, string> = {
  CLINICA: "#009AAC",   // turquesa
  STATUS: "#EF4444",    // vermelho
  CUSTOM: "#8B5CF6",    // roxo
};
const TIPO_LABEL: Record<Tipo, string> = {
  CLINICA: "Clínica",
  STATUS: "Status",
  CUSTOM: "Custom",
};

const EMPTY_E: any = { texto: "", tipo: "CUSTOM", cor: "#009AAC", aplicaEm: ["Lead"], descricao: "", ativo: true };
const EMPTY_C: any = { nome: "", ordem: 0, ativo: true };

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBloco, setFilterBloco] = useState<string | "ALL" | "NONE">("ALL");

  const [eModalOpen, setEModalOpen] = useState(false);
  const [eEditId, setEEditId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<any>(EMPTY_E);

  const [cModalOpen, setCModalOpen] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<any>(EMPTY_C);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [r1, r2] = await Promise.all([
        fetch(`/api/etiquetas/templates${qs}`),
        fetch(`/api/etiquetas/categorias${qs}`),
      ]);
      const e = await r1.json();
      const c = await r2.json();
      setEtiquetas(Array.isArray(e) ? e : []);
      setBlocos(Array.isArray(c) ? c : []);
    } catch (er) { console.error(er); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = etiquetas;
    if (filterBloco === "NONE") arr = arr.filter(e => !e.categoryId);
    else if (filterBloco !== "ALL") arr = arr.filter(e => e.categoryId === filterBloco);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(e => e.texto.toLowerCase().includes(q));
    }
    return arr;
  }, [etiquetas, filterBloco, search]);

  // Pill color: usa Etiqueta.cor se tiver, senão a cor do tipo (CLINICA, STATUS, CUSTOM)
  function pillStyle(e: Etiqueta): React.CSSProperties {
    const col = e.cor || TIPO_DOT[e.tipo];
    return {
      color: col,
      background: hexToBg(col),
      border: `1px solid ${col}40`,
    };
  }
  function hexToBg(hex: string): string {
    const c = hex.replace("#", "");
    if (c.length !== 6) return "#F1F1F1";
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.08)`;
  }

  // ===== Etiqueta CRUD =====
  function openENew() { setEEditId(null); setEForm({ ...EMPTY_E, categoryId: filterBloco !== "ALL" && filterBloco !== "NONE" ? filterBloco : null }); setEModalOpen(true); }
  function openEEdit(e: Etiqueta) { setEEditId(e.id); setEForm({ ...e, aplicaEm: e.aplicaEm.length ? e.aplicaEm : ["Lead"] }); setEModalOpen(true); }
  async function saveE() {
    try {
      const { id, createdAt, updatedAt, category, ...payload } = eForm as any;
      const url = eEditId ? `/api/etiquetas/templates/${eEditId}` : "/api/etiquetas/templates";
      const method = eEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setEModalOpen(false); await load();
    } catch (er) { alert(`Erro: ${er}`); }
  }
  async function deleteE(e: Etiqueta) {
    if (!confirm(`Excluir etiqueta "${e.texto}"?`)) return;
    const res = await fetch(`/api/etiquetas/templates/${e.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleAtivo(e: Etiqueta) {
    const res = await fetch(`/api/etiquetas/templates/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !e.ativo }),
    });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  // ===== Bloco CRUD =====
  function openCNew() { setCEditId(null); setCForm(EMPTY_C); setCModalOpen(true); }
  function openCEdit(c: Bloco) { setCEditId(c.id); setCForm({ ...c }); setCModalOpen(true); }
  async function saveC() {
    try {
      const { id, createdAt, updatedAt, _count, ...payload } = cForm as any;
      const url = cEditId ? `/api/etiquetas/categorias/${cEditId}` : "/api/etiquetas/categorias";
      const method = cEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setCModalOpen(false); await load();
    } catch (er) { alert(`Erro: ${er}`); }
  }
  async function deleteC(c: Bloco) {
    if (!confirm(`Excluir bloco "${c.nome}"? As etiquetas ficam sem bloco.`)) return;
    const res = await fetch(`/api/etiquetas/categorias/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    if (filterBloco === c.id) setFilterBloco("ALL");
    await load();
  }

  const totalSemBloco = etiquetas.filter(e => !e.categoryId).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Etiquetas</h1>
            <p className="text-sm text-gray-500">Tags com cor pra organizar Lead, Cliente e Pet</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativas
          </label>
        </div>
      </div>

      {/* Toolbar — Novo Bloco (outline) + Nova Etiqueta (filled) */}
      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <button onClick={openCNew}
          className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2"
          style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          <LuPlus size={14} /> Novo Bloco
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar etiquetas..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openENew}
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white"
          style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Nova Etiqueta
        </button>
      </div>

      {/* Tabela */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Etiqueta</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Bloco</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Aplica em</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma etiqueta.</td></tr>}
              {filtered.map((e, idx) => {
                const dot = e.cor || TIPO_DOT[e.tipo];
                return (
                  <tr key={e.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: e.ativo ? 1 : 0.5 }}>
                    <td className="px-4 py-2.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" style={pillStyle(e)}>
                        {e.texto}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{e.category?.nome || TIPO_LABEL[e.tipo]}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{e.aplicaEm?.join(", ") || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleAtivo(e)} className="inline-flex items-center w-10 h-5 rounded-full transition"
                        style={{ background: e.ativo ? "#009AAC" : "#CBD5E0" }}>
                        <span className="block w-4 h-4 rounded-full bg-white transition shadow"
                          style={{ marginLeft: e.ativo ? 20 : 2 }} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openEEdit(e)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Editar">
                        <LuPencil size={14} />
                      </button>
                      <button onClick={() => deleteE(e)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir">
                        <LuX size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé — BLOCOS / CATEGORIAS como filtros */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">BLOCOS / CATEGORIAS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterBloco("ALL")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterBloco === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterBloco === "ALL" ? "#E0F4F6" : "white",
                color: filterBloco === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todas <span className="text-gray-400">({etiquetas.length})</span>
            </button>
            <button onClick={() => setFilterBloco("NONE")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterBloco === "NONE" ? "#009AAC" : "#E8DFC8",
                background: filterBloco === "NONE" ? "#E0F4F6" : "white",
                color: filterBloco === "NONE" ? "#009AAC" : "#4B5563",
              }}>
              Sem bloco <span className="text-gray-400">({totalSemBloco})</span>
            </button>
            {blocos.map(b => (
              <div key={b.id} className="inline-flex items-center gap-0.5 border rounded-lg overflow-hidden"
                style={{
                  borderColor: filterBloco === b.id ? "#009AAC" : "#E8DFC8",
                  background: filterBloco === b.id ? "#E0F4F6" : "white",
                  opacity: b.ativo ? 1 : 0.5,
                }}>
                <button onClick={() => setFilterBloco(b.id)}
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{ color: filterBloco === b.id ? "#009AAC" : "#4B5563" }}>
                  {b.nome} <span className="text-gray-400">({b._count?.etiquetas || 0})</span>
                </button>
                <button onClick={() => openCEdit(b)} className="p-1.5 hover:bg-gray-100 border-l" style={{ borderColor: "#E8DFC8", color: "#4B5563" }} title="Editar bloco">
                  <LuPencil size={11} />
                </button>
                <button onClick={() => deleteC(b)} className="p-1.5 hover:bg-gray-100 border-l" style={{ borderColor: "#E8DFC8", color: "#EF4444" }} title="Excluir bloco">
                  <LuX size={11} />
                </button>
              </div>
            ))}
            <button onClick={openCNew}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed flex items-center gap-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-400"
              style={{ borderColor: "#D1D5DB" }}>
              <LuPlus size={12} /> Novo bloco
            </button>
          </div>
        </div>
      </div>

      {/* Modal Etiqueta */}
      {eModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>
              {eEditId ? "Editar etiqueta" : "Nova etiqueta"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Texto *</label>
                <input value={eForm.texto || ""} onChange={e => setEForm({ ...eForm, texto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="text-xs text-gray-600">Tipo</label>
                  <select value={eForm.tipo} onChange={e => setEForm({ ...eForm, tipo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Cor</label>
                  <input type="color" value={eForm.cor || "#009AAC"} onChange={e => setEForm({ ...eForm, cor: e.target.value })}
                    className="w-full h-9 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Bloco</label>
                <select value={eForm.categoryId || ""} onChange={e => setEForm({ ...eForm, categoryId: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Sem bloco</option>
                  {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Aplica em</label>
                <div className="flex gap-3 mt-1">
                  {["Lead", "Cliente", "Pet"].map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={(eForm.aplicaEm || []).includes(opt)}
                        onChange={e => {
                          const set = new Set(eForm.aplicaEm || []);
                          if (e.target.checked) set.add(opt); else set.delete(opt);
                          setEForm({ ...eForm, aplicaEm: Array.from(set) });
                        }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <input value={eForm.descricao || ""} onChange={e => setEForm({ ...eForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={eForm.ativo} onChange={e => setEForm({ ...eForm, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveE} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloco */}
      {cModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>
              {cEditId ? "Editar bloco" : "Novo bloco"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={cForm.nome || ""} onChange={e => setCForm({ ...cForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Ordem</label>
                <input type="number" value={cForm.ordem || 0} onChange={e => setCForm({ ...cForm, ordem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cForm.ativo} onChange={e => setCForm({ ...cForm, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveC} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
