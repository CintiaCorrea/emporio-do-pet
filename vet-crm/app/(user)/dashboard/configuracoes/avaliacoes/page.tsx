"use client";

import { useEffect, useState } from "react";
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


type Cat = "VET" | "RECEPCAO" | "CLINICA_GERAL";
type Class = "PROMOTOR" | "NEUTRO" | "DETRATOR";
type Canal = "PRESENCIAL" | "WHATSAPP" | "EMAIL" | "TELEFONE" | "FORMULARIO";

interface NPS {
  id: string; categoriaAlvo: Cat; profissionalId?: string | null; score: number; classificacao: Class;
  comentario?: string | null; canalColeta: Canal; dataColeta: string; coletadoPor?: string | null;
}

type StatusG = "PERGUNTA_ENVIADA" | "NAO_GOSTOU" | "LINK_ENVIADO" | "VOTOU" | "NAO_VOTOU" | "CANCELADO";

interface Google {
  id: string; dataPergunta: string; gostou?: boolean | null; comentarioNegativo?: string | null;
  canalEnvio?: string | null; linkEnviado?: string | null; dataVoto?: string | null;
  notaDada?: number | null; votoConfirmado: boolean; status: StatusG; observacoes?: string | null;
}

interface Stats {
  total: number; promotores: number; neutros: number; detratores: number; nps: number; mediaScore: number;
  googleVotos: number; googleMedia: number;
}

const CAT_LABEL: Record<Cat, string> = { VET: "Vet", RECEPCAO: "Recepção", CLINICA_GERAL: "Clínica geral" };
const CLASS_LABEL: Record<Class, { label: string; color: string }> = {
  PROMOTOR: { label: "Promotor", color: "#1E6B36" }, NEUTRO: { label: "Neutro", color: "#8a6313" }, DETRATOR: { label: "Detrator", color: "#A32D2D" },
};
const CANAL_LABEL: Record<Canal, string> = { PRESENCIAL: "Presencial", WHATSAPP: "WhatsApp", EMAIL: "E-mail", TELEFONE: "Telefone", FORMULARIO: "Formulário" };
const GSTAT_LABEL: Record<StatusG, string> = {
  PERGUNTA_ENVIADA: "Aguardando resposta", NAO_GOSTOU: "Não gostou (interno)",
  LINK_ENVIADO: "Link enviado", VOTOU: "Votou", NAO_VOTOU: "Não votou", CANCELADO: "Cancelado",
};

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const EMPTY_N: any = { categoriaAlvo: "CLINICA_GERAL", score: 10, canalColeta: "PRESENCIAL", dataColeta: new Date().toISOString().slice(0,10) };

export default function AvaliacoesPage() {
  const [tab, setTab] = useState<"nps" | "google">("nps");
  const [nps, setNps] = useState<NPS[]>([]);
  const [google, setGoogle] = useState<Google[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_N);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [n, g, s] = await Promise.all([fetch("/api/avaliacoes/nps"), fetch("/api/avaliacoes/google"), fetch("/api/avaliacoes/stats")]);
      setNps(await safeJson(n, [])); setGoogle(await safeJson(g, [])); setStats(await safeJson(s, null));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm(EMPTY_N); setModalOpen(true); }
  function openEdit(a: NPS) { setEditId(a.id); setForm({ ...a, dataColeta: a.dataColeta ? new Date(a.dataColeta).toISOString().slice(0,10) : "" }); setModalOpen(true); }
  async function save() {
    try {
      const { id, createdAt, updatedAt, classificacao, ...p } = form as any;
      p.score = Number(p.score);
      const url = editId ? `/api/avaliacoes/nps/${editId}` : "/api/avaliacoes/nps";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeNPS(a: NPS) {
    if (!confirm(`Excluir avaliação NPS?`)) return;
    const res = await fetch(`/api/avaliacoes/nps/${a.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function removeGoogle(g: Google) {
    if (!confirm(`Excluir registro Google?`)) return;
    const res = await fetch(`/api/avaliacoes/google/${g.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#009AAC" }}>Avaliações</h1>
            <p className="text-sm text-gray-600">NPS coletado pela recepção + fluxo Google My Business (pergunta filtro + envio de link).</p>
          </div>
          {tab === "nps" && (
            <>
              <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#009AAC" }}>Importar planilha</button>
              <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "#009AAC", color: "white" }}>
                <LuPlus size={16} /> Registrar NPS
              </button>
            </>
          )}
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          <button onClick={() => setTab("nps")} className="px-4 py-2 text-sm font-medium border-b-2"
            style={{ borderColor: tab === "nps" ? "#009AAC" : "transparent", color: tab === "nps" ? "#009AAC" : "#666" }}>
            NPS ({nps.length})
          </button>
          <button onClick={() => setTab("google")} className="px-4 py-2 text-sm font-medium border-b-2"
            style={{ borderColor: tab === "google" ? "#009AAC" : "transparent", color: tab === "google" ? "#009AAC" : "#666" }}>
            Google Reviews ({google.length})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
              <div className="text-xs text-gray-500">NPS</div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: stats.nps >= 50 ? "#1E6B36" : stats.nps >= 0 ? "#8a6313" : "#A32D2D" }}>{stats.nps}</div>
            </div>
            <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
              <div className="text-xs text-gray-500">Promotores</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.promotores}</div>
            </div>
            <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
              <div className="text-xs text-gray-500">Detratores</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.detratores}</div>
            </div>
            <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
              <div className="text-xs text-gray-500">Média Score</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.mediaScore}</div>
            </div>
            <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
              <div className="text-xs text-gray-500">Google ({stats.googleVotos} votos)</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.googleMedia} ★</div>
            </div>
          </div>
        )}

        {tab === "nps" && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Data</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Categoria</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Score</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Classificação</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Canal</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden md:table-cell">Comentário</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Carregando...</td></tr>}
                {!loading && nps.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma avaliação NPS.</td></tr>}
                {nps.map(a => {
                  const c = CLASS_LABEL[a.classificacao];
                  return (
                    <tr key={a.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                      <td className="px-3 py-2 text-gray-600">{fmtDate(a.dataColeta)}</td>
                      <td className="px-3 py-2">{CAT_LABEL[a.categoriaAlvo]}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-semibold">{a.score}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: c.color }}>{c.label}</span>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-gray-600">{CANAL_LABEL[a.canalColeta]}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-gray-600 truncate max-w-xs">{a.comentario || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => openEdit(a)} className="p-1 hover:bg-gray-200 rounded inline-block" title="Editar"><LuPencil size={14} /></button>
                        <button onClick={() => removeNPS(a)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "google" && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Pergunta</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Gostou?</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Votou?</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Nota</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>}
                {!loading && google.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum registro Google. O fluxo é iniciado a partir de cada cliente após atendimento.</td></tr>}
                {google.map(g => (
                  <tr key={g.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-3 py-2 text-gray-600">{fmtDate(g.dataPergunta)}</td>
                    <td className="px-3 py-2 text-center">{g.gostou === true ? "Sim" : g.gostou === false ? "Não" : "—"}</td>
                    <td className="px-3 py-2 text-center">{g.votoConfirmado ? "Sim" : "—"}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.notaDada ? `${g.notaDada} ★` : "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{GSTAT_LABEL[g.status]}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeGoogle(g)} className="p-1 hover:bg-gray-200 rounded inline-block" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#009AAC" }}>{editId ? "Editar NPS" : "Registrar avaliação NPS"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-600">Categoria avaliada</label>
                <select value={form.categoriaAlvo} onChange={e => setForm({ ...form, categoriaAlvo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Canal de coleta</label>
                <select value={form.canalColeta} onChange={e => setForm({ ...form, canalColeta: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(CANAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Score (0-10) *</label>
                <input type="number" min={0} max={10} value={form.score ?? 10} onChange={e => setForm({ ...form, score: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div><label className="text-xs text-gray-600">Data</label>
                <input type="date" value={form.dataColeta || ""} onChange={e => setForm({ ...form, dataColeta: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Comentário</label>
                <textarea value={form.comentario || ""} onChange={e => setForm({ ...form, comentario: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Coletado por (email)</label>
                <input value={form.coletadoPor || ""} onChange={e => setForm({ ...form, coletadoPor: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} placeholder="recepcao@emporiodopet.com.br" /></div>
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
        title="Importar NPS"
        endpoint="/api/avaliacoes/nps/import-batch"
        exampleHint="Exporte de Base44 > AvaliacaoNPS. Categorias: Vet, Recepção, Clínica geral. Score 0-10."
        fields={[
          { key: "score", label: "Score", type: "int", required: true },
          { key: "categoriaAlvo", label: "Categoria", aliases: ["categoria_alvo"] },
          { key: "comentario", label: "Comentário" },
          { key: "canalColeta", label: "Canal", aliases: ["canal_coleta"] },
          { key: "dataColeta", label: "Data", aliases: ["data_coleta"] },
          { key: "coletadoPor", label: "Coletado por", aliases: ["coletado_por"] },
        ]}
        onSuccess={() => load()}
      />
    </div>
  );
}
