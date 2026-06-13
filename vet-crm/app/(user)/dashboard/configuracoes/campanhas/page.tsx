"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

type Plat = "GOOGLE_ADS" | "META_ADS_FACEBOOK" | "META_ADS_INSTAGRAM" | "TIKTOK_ADS" | "OUTRAS";
type TipoC = "CONVERSAO" | "TRAFEGO" | "ENGAJAMENTO" | "MENSAGEM_WHATSAPP" | "RECONHECIMENTO";
type StatC = "ATIVA" | "PAUSADA" | "ENCERRADA" | "EM_TESTE" | "PLANEJADA";

interface Campanha {
  id: string; nome: string; plataforma: Plat; tipo: TipoC; tagOrigem?: string | null;
  inicio?: string | null; fim?: string | null; status: StatC; investimento?: number | null; observacoes?: string | null;
}

const PLAT_LABEL: Record<Plat, string> = { GOOGLE_ADS: "Google Ads", META_ADS_FACEBOOK: "Facebook", META_ADS_INSTAGRAM: "Instagram", TIKTOK_ADS: "TikTok", OUTRAS: "Outras" };
const TIPO_LABEL: Record<TipoC, string> = { CONVERSAO: "Conversão", TRAFEGO: "Tráfego", ENGAJAMENTO: "Engajamento", MENSAGEM_WHATSAPP: "WhatsApp", RECONHECIMENTO: "Reconhecimento" };
const STAT_LABEL: Record<StatC, { label: string; dot: string }> = {
  ATIVA: { label: "Ativa", dot: "#22C55E" }, PAUSADA: { label: "Pausada", dot: "#F59E0B" },
  ENCERRADA: { label: "Encerrada", dot: "#94A3B8" }, EM_TESTE: { label: "Em teste", dot: "#009AAC" },
  PLANEJADA: { label: "Planejada", dot: "#A855F7" },
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const EMPTY: any = { nome: "", plataforma: "OUTRAS", tipo: "CONVERSAO", status: "ATIVA", inicio: "", fim: "", investimento: null };

async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

export default function CampanhasPage() {
  const [list, setList] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | StatC>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try { const res = await fetch("/api/campanhas"); const data = await safeJson<any[]>(res, []); setList(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterStatus !== "ALL") arr = arr.filter(c => c.status === filterStatus);
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
    if (!(await confirmDelete({ entityLabel: "campanha", itemName: c.nome }))) return;
    const res = await fetch(`/api/campanhas/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const c of list) counts[c.status] = (counts[c.status] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Campanhas</h1>
            <p className="text-sm text-gray-500">Marketing (Google/Meta Ads) — tag de origem rastreia leads</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          Importar planilha
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanhas..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Nova Campanha
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome / Tag</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Plataforma</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Período</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Investimento</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma campanha.</td></tr>}
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0" }}>
                  <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STAT_LABEL[c.status].dot }} title={STAT_LABEL[c.status].label} /></td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: "#0E2244" }}>{c.nome}</div>
                    {c.tagOrigem && <div className="text-xs text-gray-400">tag: {c.tagOrigem}</div>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{PLAT_LABEL[c.plataforma]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{TIPO_LABEL[c.tipo]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs text-gray-500">{fmtDate(c.inicio)} → {fmtDate(c.fim)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtR(c.investimento)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openEdit(c)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                    <button onClick={() => remove(c)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">STATUS</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "ATIVA", "PAUSADA", "EM_TESTE", "PLANEJADA", "ENCERRADA"] as const).map(k => (
              <button key={k} onClick={() => setFilterStatus(k as any)} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterStatus === k ? "#009AAC" : "#E8DFC8",
                  background: filterStatus === k ? "#E0F4F6" : "white",
                  color: filterStatus === k ? "#009AAC" : "#4B5563",
                }}>
                {k !== "ALL" && <span className="inline-block w-2 h-2 rounded-full" style={{ background: STAT_LABEL[k as StatC].dot }} />}
                {k === "ALL" ? "Todas" : STAT_LABEL[k as StatC].label} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{editId ? "Editar campanha" : "Nova campanha"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Nome *</label>
                <input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Plataforma</label>
                <select value={form.plataforma} onChange={e => setForm({ ...form, plataforma: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(PLAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Início</label>
                <input type="date" value={form.inicio || ""} onChange={e => setForm({ ...form, inicio: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Fim</label>
                <input type="date" value={form.fim || ""} onChange={e => setForm({ ...form, fim: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Tag origem (BotConversa)</label>
                <input value={form.tagOrigem || ""} onChange={e => setForm({ ...form, tagOrigem: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Investimento (R$)</label>
                <input type="number" step="0.01" value={form.investimento ?? ""} onChange={e => setForm({ ...form, investimento: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
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

      <CsvImporter open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Campanhas" endpoint="/api/campanhas/import-batch"
        exampleHint="Exporte de Base44 > Campanha."
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "plataforma", label: "Plataforma" },
          { key: "tipo", label: "Tipo" },
          { key: "tagOrigem", label: "Tag", aliases: ["tag_origem"] },
          { key: "inicio", label: "Início" },
          { key: "fim", label: "Fim" },
          { key: "status", label: "Status" },
          { key: "investimento", label: "Investimento", type: "number" },
        ]}
        onSuccess={() => load()} />
    </div>
  );
}
