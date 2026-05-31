"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch, LuTarget } from "react-icons/lu";

type Periodo = "MENSAL" | "TRIMESTRAL" | "ANUAL" | "PERSONALIZADO";
type Tipo = "FATURAMENTO" | "ATENDIMENTOS" | "NOVOS_CLIENTES" | "NPS" | "CONVERSAO_LEADS" | "OUTRA";
type Stat = "ATIVA" | "PAUSADA" | "CONCLUIDA" | "ARQUIVADA";

interface Meta {
  id: string; titulo: string; tipo: Tipo; periodo: Periodo; alvo: number; atingido?: number | null;
  unidade?: string | null; inicio?: string | null; fim?: string | null; responsavel?: string | null;
  status: Stat; observacoes?: string | null;
}

const TIPO_LABEL: Record<Tipo, string> = {
  FATURAMENTO: "Faturamento", ATENDIMENTOS: "Atendimentos", NOVOS_CLIENTES: "Novos clientes",
  NPS: "NPS", CONVERSAO_LEADS: "Conversão de leads", OUTRA: "Outra",
};
const PER_LABEL: Record<Periodo, string> = { MENSAL: "Mensal", TRIMESTRAL: "Trimestral", ANUAL: "Anual", PERSONALIZADO: "Personalizado" };
const STAT_LABEL: Record<Stat, { label: string; dot: string }> = {
  ATIVA: { label: "Ativa", dot: "#22C55E" }, PAUSADA: { label: "Pausada", dot: "#F59E0B" },
  CONCLUIDA: { label: "Concluída", dot: "#009AAC" }, ARQUIVADA: { label: "Arquivada", dot: "#94A3B8" },
};

const EMPTY: any = { titulo: "", tipo: "FATURAMENTO", periodo: "MENSAL", alvo: 0, atingido: 0, status: "ATIVA", inicio: "", fim: "" };
async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

export default function MetasPage() {
  const [list, setList] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPer, setFilterPer] = useState<"ALL" | Periodo>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);

  async function load() {
    setLoading(true);
    try { const res = await fetch("/api/metas"); const data = await safeJson<any[]>(res, []); setList(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterPer !== "ALL") arr = arr.filter(m => m.periodo === filterPer);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(m => m.titulo.toLowerCase().includes(s));
    }
    return arr;
  }, [list, filterPer, search]);

  function openNew() { setEditId(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(m: Meta) {
    setEditId(m.id);
    setForm({ ...m, inicio: m.inicio ? new Date(m.inicio).toISOString().slice(0,10) : "", fim: m.fim ? new Date(m.fim).toISOString().slice(0,10) : "" });
    setModalOpen(true);
  }
  async function save() {
    try {
      const { id, createdAt, updatedAt, ...p } = form as any;
      if (!p.inicio) delete p.inicio;
      if (!p.fim) delete p.fim;
      if (p.alvo != null) p.alvo = Number(p.alvo);
      if (p.atingido != null) p.atingido = Number(p.atingido);
      const url = editId ? `/api/metas/${editId}` : "/api/metas";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(m: Meta) {
    if (!confirm(`Excluir meta "${m.titulo}"?`)) return;
    const res = await fetch(`/api/metas/${m.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const m of list) counts[m.periodo] = (counts[m.periodo] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Metas</h1>
            <p className="text-sm text-gray-500">Objetivos da clínica — acompanhamento por período</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">{filtered.length} de {list.length} metas</div>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar metas..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Nova Meta
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Título</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Período</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Progresso</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma meta.</td></tr>}
              {filtered.map(m => {
                const pct = m.alvo > 0 ? Math.min(100, ((m.atingido || 0) / m.alvo) * 100) : 0;
                return (
                  <tr key={m.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STAT_LABEL[m.status].dot }} title={STAT_LABEL[m.status].label} /></td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium" style={{ color: "#0E2244" }}>{m.titulo}</div>
                      {m.responsavel && <div className="text-xs text-gray-400">{m.responsavel}</div>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{TIPO_LABEL[m.tipo]}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{PER_LABEL[m.periodo]}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#22C55E" : "#009AAC" }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-600 w-24 text-right">{(m.atingido || 0).toLocaleString("pt-BR")} / {m.alvo.toLocaleString("pt-BR")} {m.unidade || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                      <button onClick={() => remove(m)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">PERÍODOS</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "MENSAL", "TRIMESTRAL", "ANUAL", "PERSONALIZADO"] as const).map(k => (
              <button key={k} onClick={() => setFilterPer(k as any)} className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  borderColor: filterPer === k ? "#009AAC" : "#E8DFC8",
                  background: filterPer === k ? "#E0F4F6" : "white",
                  color: filterPer === k ? "#009AAC" : "#4B5563",
                }}>
                {k === "ALL" ? "Todos" : PER_LABEL[k as Periodo]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{editId ? "Editar meta" : "Nova meta"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Título *</label>
                <input value={form.titulo || ""} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Período</label>
                <select value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(PER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Alvo *</label>
                <input type="number" value={form.alvo} onChange={e => setForm({ ...form, alvo: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Atingido</label>
                <input type="number" value={form.atingido ?? 0} onChange={e => setForm({ ...form, atingido: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Unidade (ex: R$, atend., %, pts)</label>
                <input value={form.unidade || ""} onChange={e => setForm({ ...form, unidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Responsável</label>
                <input value={form.responsavel || ""} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Início</label>
                <input type="date" value={form.inicio || ""} onChange={e => setForm({ ...form, inicio: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Fim</label>
                <input type="date" value={form.fim || ""} onChange={e => setForm({ ...form, fim: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(STAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Observações</label>
                <textarea value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
