"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    if (!res.ok) return fallback;
    const data = await res.json();
    return data == null ? fallback : data;
  } catch { return fallback; }
}


type TipoMeta = "FATURAMENTO_GERAL" | "FATURAMENTO_INDIVIDUAL" | "ATENDIMENTOS" | "SERVICO_ESPECIFICO" | "CONVERSOES" | "NPS";
type Per = "SEMANAL" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
type StatM = "EM_ANDAMENTO" | "ATINGIDA" | "NAO_ATINGIDA";

interface Meta {
  id: string; tipo: TipoMeta; periodicidade: Per; profissionalId?: string | null; servicoId?: string | null;
  dataInicio: string; valorMeta: number; valorRealizado: number; status: StatM; observacoes?: string | null;
}

const TIPO_LABEL: Record<TipoMeta, string> = {
  FATURAMENTO_GERAL: "Faturamento geral", FATURAMENTO_INDIVIDUAL: "Faturamento individual",
  ATENDIMENTOS: "Atendimentos", SERVICO_ESPECIFICO: "Serviço específico",
  CONVERSOES: "Conversões de leads", NPS: "NPS",
};
const PER_LABEL: Record<Per, string> = { SEMANAL: "Semanal", MENSAL: "Mensal", TRIMESTRAL: "Trimestral", SEMESTRAL: "Semestral", ANUAL: "Anual" };
const STAT_LABEL: Record<StatM, { label: string; color: string }> = {
  EM_ANDAMENTO: { label: "Em andamento", color: "#3C3489" }, ATINGIDA: { label: "Atingida", color: "#1E6B36" },
  NAO_ATINGIDA: { label: "Não atingida", color: "#A32D2D" },
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const EMPTY: any = { tipo: "FATURAMENTO_GERAL", periodicidade: "MENSAL", dataInicio: new Date().toISOString().slice(0,10), valorMeta: 0, valorRealizado: 0, status: "EM_ANDAMENTO" };

export default function MetasPage() {
  const [list, setList] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try { const res = await fetch("/api/metas"); setList(await safeJson(res, [])); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(m: Meta) {
    setEditId(m.id);
    setForm({ ...m, dataInicio: m.dataInicio ? new Date(m.dataInicio).toISOString().slice(0,10) : "" });
    setModalOpen(true);
  }
  async function save() {
    try {
      const { id, createdAt, updatedAt, ...p } = form as any;
      p.valorMeta = Number(p.valorMeta);
      const url = editId ? `/api/metas/${editId}` : "/api/metas";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(m: Meta) {
    if (!confirm(`Excluir meta?`)) return;
    const res = await fetch(`/api/metas/${m.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Metas</h1>
            <p className="text-sm text-gray-600">Faturamento, atendimentos, conversões e NPS. Tipos individuais usam profissional vinculado.</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>Importar planilha</button>
          <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "#3C3489", color: "white" }}>
            <LuPlus size={16} /> Nova meta
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Periodicidade</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Início</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Meta</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Realizado</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Progresso</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-500">Carregando...</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">Nenhuma meta.</td></tr>}
              {list.map(m => {
                const s = STAT_LABEL[m.status];
                const pct = m.valorMeta > 0 ? (m.valorRealizado / m.valorMeta) * 100 : 0;
                return (
                  <tr key={m.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-3 py-2 font-medium">{TIPO_LABEL[m.tipo]}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{PER_LABEL[m.periodicidade]}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{fmtDate(m.dataInicio)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.tipo.includes("FATURAMENTO") ? fmtR(m.valorMeta) : m.valorMeta}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.tipo.includes("FATURAMENTO") ? fmtR(m.valorRealizado) : m.valorRealizado}</td>
                    <td className="px-3 py-2 text-right hidden md:table-cell">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#1E6B36" : "#3C3489" }} />
                        </div>
                        <span className="text-xs tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-200 rounded inline-block" title="Editar"><LuPencil size={14} /></button>
                      <button onClick={() => remove(m)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>{editId ? "Editar meta" : "Nova meta"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-600">Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Periodicidade</label>
                <select value={form.periodicidade} onChange={e => setForm({ ...form, periodicidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(PER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Data início *</label>
                <input type="date" value={form.dataInicio || ""} onChange={e => setForm({ ...form, dataInicio: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(STAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Valor meta *</label>
                <input type="number" step="0.01" value={form.valorMeta ?? 0} onChange={e => setForm({ ...form, valorMeta: e.target.value ? Number(e.target.value) : 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Valor realizado</label>
                <input type="number" step="0.01" value={form.valorRealizado ?? 0} onChange={e => setForm({ ...form, valorRealizado: e.target.value ? Number(e.target.value) : 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Observações</label>
                <textarea value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Metas"
        endpoint="/api/metas/import-batch"
        exampleHint="Exporte de Base44 > Meta. Tipos: Faturamento geral, Faturamento individual, Atendimentos, Serviço específico, Conversões."
        fields={[
          { key: "tipo", label: "Tipo", required: true },
          { key: "periodicidade", label: "Periodicidade" },
          { key: "dataInicio", label: "Data Início", aliases: ["data_inicio"] },
          { key: "valorMeta", label: "Valor Meta", aliases: ["valor_meta"], type: "number" },
          { key: "valorRealizado", label: "Valor Realizado", aliases: ["valor_realizado"], type: "number" },
          { key: "status", label: "Status" },
        ]}
        onSuccess={() => load()}
      />
    </div>
  );
}
