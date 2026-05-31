"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    if (!res.ok) return fallback;
    const data = await res.json();
    return data == null ? fallback : data;
  } catch { return fallback; }
}


type Plat = "GOOGLE_ADS" | "META_ADS_FACEBOOK" | "META_ADS_INSTAGRAM" | "TIKTOK_ADS" | "OUTRAS";
type TipoC = "CONVERSAO" | "TRAFEGO" | "ENGAJAMENTO" | "MENSAGEM_WHATSAPP" | "RECONHECIMENTO";
type StatC = "ATIVA" | "PAUSADA" | "ENCERRADA" | "EM_TESTE" | "PLANEJADA";

interface Campanha {
  id: string; nome: string; plataforma: Plat; tipo: TipoC; tagOrigem?: string | null;
  inicio?: string | null; fim?: string | null; status: StatC; investimento?: number | null; observacoes?: string | null;
}

const PLAT_LABEL: Record<Plat, string> = { GOOGLE_ADS: "Google Ads", META_ADS_FACEBOOK: "Meta (Facebook)", META_ADS_INSTAGRAM: "Meta (Instagram)", TIKTOK_ADS: "TikTok Ads", OUTRAS: "Outras" };
const TIPO_LABEL: Record<TipoC, string> = { CONVERSAO: "Conversão", TRAFEGO: "Tráfego", ENGAJAMENTO: "Engajamento", MENSAGEM_WHATSAPP: "WhatsApp", RECONHECIMENTO: "Reconhecimento" };
const STAT_LABEL: Record<StatC, { label: string; color: string }> = {
  ATIVA: { label: "Ativa", color: "#1E6B36" }, PAUSADA: { label: "Pausada", color: "#8a6313" },
  ENCERRADA: { label: "Encerrada", color: "#6B7280" }, EM_TESTE: { label: "Em teste", color: "#009AAC" },
  PLANEJADA: { label: "Planejada", color: "#A0AEC0" },
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const EMPTY: any = { nome: "", plataforma: "OUTRAS", tipo: "CONVERSAO", status: "ATIVA", inicio: "", fim: "", investimento: null };

export default function CampanhasPage() {
  const [list, setList] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try { const res = await fetch("/api/campanhas"); const data = await safeJson<any[]>(res, []); setList(Array.isArray(data) ? data : await safeJson(res, [])); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterStatus) arr = arr.filter(c => c.status === filterStatus);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(c => c.nome.toLowerCase().includes(s) || (c.tagOrigem || "").toLowerCase().includes(s));
    }
    return arr;
  }, [list, filterStatus, search]);

  function openNew() { setEditId(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(c: Campanha) {
    setEditId(c.id);
    setForm({ ...c, inicio: c.inicio ? new Date(c.inicio).toISOString().slice(0,10) : "", fim: c.fim ? new Date(c.fim).toISOString().slice(0,10) : "" });
    setModalOpen(true);
  }
  async function save() {
    try {
      const { id, createdAt, updatedAt, ...p } = form as any;
      if (!p.inicio) delete p.inicio;
      if (!p.fim) delete p.fim;
      const url = editId ? `/api/campanhas/${editId}` : "/api/campanhas";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(c: Campanha) {
    if (!confirm(`Excluir campanha "${c.nome}"?`)) return;
    const res = await fetch(`/api/campanhas/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#009AAC" }}>Campanhas</h1>
            <p className="text-sm text-gray-600">Campanhas de marketing (Google/Meta Ads). Tag de origem rastreia leads no BotConversa.</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#009AAC" }}>Importar planilha</button>
          <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "#009AAC", color: "white" }}>
            <LuPlus size={16} /> Nova campanha
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border p-4 mb-4 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3" style={{ borderColor: "#E5DCC9" }}>
          <div>
            <label className="text-xs text-gray-500">Buscar nome / tag</label>
            <div className="relative">
              <LuSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} placeholder="Ex: Black Friday" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
              <option value="">Todos</option>
              {Object.entries(STAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Nome</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Plataforma</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Período</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Investimento</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma campanha.</td></tr>}
              {filtered.map(c => {
                const s = STAT_LABEL[c.status];
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.nome}</div>
                      {c.tagOrigem && <div className="text-xs text-gray-400">tag: {c.tagOrigem}</div>}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{PLAT_LABEL[c.plataforma]}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">{TIPO_LABEL[c.tipo]}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600 text-xs">{fmtDate(c.inicio)} → {fmtDate(c.fim)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtR(c.investimento)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEdit(c)} className="p-1 hover:bg-gray-200 rounded inline-block" title="Editar"><LuPencil size={14} /></button>
                      <button onClick={() => remove(c)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
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
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#009AAC" }}>{editId ? "Editar campanha" : "Nova campanha"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Nome *</label>
                <input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Plataforma</label>
                <select value={form.plataforma} onChange={e => setForm({ ...form, plataforma: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(PLAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Início</label>
                <input type="date" value={form.inicio || ""} onChange={e => setForm({ ...form, inicio: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Fim</label>
                <input type="date" value={form.fim || ""} onChange={e => setForm({ ...form, fim: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Tag origem (BotConversa)</label>
                <input value={form.tagOrigem || ""} onChange={e => setForm({ ...form, tagOrigem: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Investimento (R$)</label>
                <input type="number" step="0.01" value={form.investimento ?? ""} onChange={e => setForm({ ...form, investimento: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(STAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Observações</label>
                <textarea value={form.observacoes || ""} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#009AAC", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Campanhas"
        endpoint="/api/campanhas/import-batch"
        exampleHint="Exporte de Base44 > Campanha. Plataformas: Google Ads, Meta Facebook, Meta Instagram, TikTok, Outras."
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "plataforma", label: "Plataforma" },
          { key: "tipo", label: "Tipo" },
          { key: "tagOrigem", label: "Tag Origem", aliases: ["tag_origem"] },
          { key: "inicio", label: "Início" },
          { key: "fim", label: "Fim" },
          { key: "status", label: "Status" },
          { key: "investimento", label: "Investimento", type: "number" },
        ]}
        onSuccess={() => load()}
      />
    </div>
  );
}
