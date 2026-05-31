"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuX, LuSearch, LuStar } from "react-icons/lu";

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
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
  estrelas?: number | null; status: StatusG; tutorTelefone?: string | null;
}

const CAT_LABEL: Record<Cat, string> = { VET: "Veterinário", RECEPCAO: "Recepção", CLINICA_GERAL: "Clínica" };
const CLASS_LABEL: Record<Class, { label: string; dot: string }> = {
  PROMOTOR: { label: "Promotor", dot: "#22C55E" },
  NEUTRO: { label: "Neutro", dot: "#F59E0B" },
  DETRATOR: { label: "Detrator", dot: "#EF4444" },
};
const CANAL_LABEL: Record<Canal, string> = { PRESENCIAL: "Presencial", WHATSAPP: "WhatsApp", EMAIL: "Email", TELEFONE: "Telefone", FORMULARIO: "Formulário" };
const STATG_LABEL: Record<StatusG, { label: string; dot: string }> = {
  PERGUNTA_ENVIADA: { label: "Pergunta enviada", dot: "#94A3B8" },
  NAO_GOSTOU: { label: "Não gostou", dot: "#EF4444" },
  LINK_ENVIADO: { label: "Link enviado", dot: "#009AAC" },
  VOTOU: { label: "Votou", dot: "#22C55E" },
  NAO_VOTOU: { label: "Não votou", dot: "#F59E0B" },
  CANCELADO: { label: "Cancelado", dot: "#94A3B8" },
};

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const EMPTY_NPS: any = { categoriaAlvo: "VET", score: 9, canalColeta: "PRESENCIAL", dataColeta: new Date().toISOString().slice(0,10), comentario: "" };
const EMPTY_G: any = { dataPergunta: new Date().toISOString().slice(0,10), status: "PERGUNTA_ENVIADA", gostou: null };

function classFromScore(s: number): Class {
  if (s >= 9) return "PROMOTOR";
  if (s >= 7) return "NEUTRO";
  return "DETRATOR";
}

export default function AvaliacoesPage() {
  const [tab, setTab] = useState<"NPS" | "GOOGLE">("NPS");
  const [npsList, setNpsList] = useState<NPS[]>([]);
  const [gList, setGList] = useState<Google[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_NPS);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch("/api/avaliacoes/nps"), fetch("/api/avaliacoes/google")]);
      const d1 = await safeJson<any[]>(r1, []);
      const d2 = await safeJson<any[]>(r2, []);
      setNpsList(Array.isArray(d1) ? d1 : []);
      setGList(Array.isArray(d2) ? d2 : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm(tab === "NPS" ? EMPTY_NPS : EMPTY_G);
    setModalOpen(true);
  }
  function openEditNPS(r: NPS) {
    setEditId(r.id);
    setForm({ ...r, dataColeta: r.dataColeta ? new Date(r.dataColeta).toISOString().slice(0,10) : "" });
    setModalOpen(true);
  }
  function openEditG(r: Google) {
    setEditId(r.id);
    setForm({
      ...r,
      dataPergunta: r.dataPergunta ? new Date(r.dataPergunta).toISOString().slice(0,10) : "",
      dataVoto: r.dataVoto ? new Date(r.dataVoto).toISOString().slice(0,10) : "",
    });
    setModalOpen(true);
  }
  async function save() {
    try {
      const { id, createdAt, updatedAt, ...p } = form as any;
      if (tab === "NPS") {
        p.score = Number(p.score);
        p.classificacao = classFromScore(p.score);
      } else {
        if (p.estrelas != null) p.estrelas = Number(p.estrelas);
        if (!p.dataVoto) delete p.dataVoto;
      }
      const base = tab === "NPS" ? "/api/avaliacoes/nps" : "/api/avaliacoes/google";
      const url = editId ? `${base}/${editId}` : base;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeNPS(r: NPS) {
    if (!confirm(`Excluir avaliação?`)) return;
    const res = await fetch(`/api/avaliacoes/nps/${r.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function removeG(r: Google) {
    if (!confirm(`Excluir pergunta Google?`)) return;
    const res = await fetch(`/api/avaliacoes/google/${r.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  // Métricas
  const npsStats = useMemo(() => {
    const total = npsList.length;
    const promo = npsList.filter(n => n.classificacao === "PROMOTOR").length;
    const detr = npsList.filter(n => n.classificacao === "DETRATOR").length;
    const score = total > 0 ? Math.round(((promo - detr) / total) * 100) : 0;
    return { total, promo, detr, neutro: total - promo - detr, score };
  }, [npsList]);
  const gStats = useMemo(() => {
    const total = gList.length;
    const votou = gList.filter(g => g.status === "VOTOU").length;
    const naoGostou = gList.filter(g => g.status === "NAO_GOSTOU").length;
    return { total, votou, naoGostou };
  }, [gList]);

  const filteredNps = useMemo(() => {
    if (!search) return npsList;
    const s = search.toLowerCase();
    return npsList.filter(n => (n.comentario || "").toLowerCase().includes(s) || (n.coletadoPor || "").toLowerCase().includes(s));
  }, [npsList, search]);
  const filteredG = useMemo(() => {
    if (!search) return gList;
    const s = search.toLowerCase();
    return gList.filter(g => (g.tutorTelefone || "").includes(s) || (g.comentarioNegativo || "").toLowerCase().includes(s));
  }, [gList, search]);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Avaliações</h1>
            <p className="text-sm text-gray-500">NPS interno + funil de avaliações no Google</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={() => setTab("NPS")} className="px-4 py-2.5 text-sm font-medium border-b-2 transition"
            style={{ borderColor: tab === "NPS" ? "#009AAC" : "transparent", color: tab === "NPS" ? "#009AAC" : "#6B7280" }}>
            NPS Interno
          </button>
          <button onClick={() => setTab("GOOGLE")} className="px-4 py-2.5 text-sm font-medium border-b-2 transition"
            style={{ borderColor: tab === "GOOGLE" ? "#009AAC" : "transparent", color: tab === "GOOGLE" ? "#009AAC" : "#6B7280" }}>
            Google Reviews
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="max-w-7xl mx-auto px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {tab === "NPS" ? (
          <>
            <KpiBox label="NPS Score" value={npsStats.score.toString()} accent="#009AAC" />
            <KpiBox label="Total" value={npsStats.total.toString()} />
            <KpiBox label="Promotores" value={npsStats.promo.toString()} accent="#22C55E" />
            <KpiBox label="Detratores" value={npsStats.detr.toString()} accent="#EF4444" />
          </>
        ) : (
          <>
            <KpiBox label="Perguntas" value={gStats.total.toString()} />
            <KpiBox label="Votaram" value={gStats.votou.toString()} accent="#22C55E" />
            <KpiBox label="Conversão" value={gStats.total > 0 ? `${Math.round(gStats.votou / gStats.total * 100)}%` : "—"} accent="#009AAC" />
            <KpiBox label="Não gostaram" value={gStats.naoGostou.toString()} accent="#EF4444" />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">{tab === "NPS" ? `${filteredNps.length} de ${npsList.length}` : `${filteredG.length} de ${gList.length}`}</div>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> {tab === "NPS" ? "Nova Avaliação" : "Nova Pergunta"}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          {tab === "NPS" ? (
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Categoria</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500">Score</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Canal</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Comentário</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
                {!loading && filteredNps.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma avaliação NPS.</td></tr>}
                {filteredNps.map(n => (
                  <tr key={n.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CLASS_LABEL[n.classificacao].dot }} title={CLASS_LABEL[n.classificacao].label} /></td>
                    <td className="px-4 py-2.5 text-gray-700">{fmtDate(n.dataColeta)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{CAT_LABEL[n.categoriaAlvo]}</td>
                    <td className="px-4 py-2.5 text-center"><span className="font-semibold tabular-nums" style={{ color: CLASS_LABEL[n.classificacao].dot }}>{n.score}</span></td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{CANAL_LABEL[n.canalColeta]}</td>
                    <td className="px-4 py-2.5 text-gray-600 truncate max-w-xs">{n.comentario || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openEditNPS(n)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                      <button onClick={() => removeNPS(n)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Pergunta</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Telefone</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Estrelas</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Voto</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
                {!loading && filteredG.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma pergunta Google.</td></tr>}
                {filteredG.map(g => (
                  <tr key={g.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STATG_LABEL[g.status].dot }} title={STATG_LABEL[g.status].label} /></td>
                    <td className="px-4 py-2.5 text-gray-700">{fmtDate(g.dataPergunta)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{g.tutorTelefone || "—"}</td>
                    <td className="px-4 py-2.5"><span className="text-xs">{STATG_LABEL[g.status].label}</span></td>
                    <td className="px-4 py-2.5 text-center hidden md:table-cell">
                      {g.estrelas ? <span className="inline-flex items-center gap-0.5">{Array.from({ length: g.estrelas }).map((_, i) => <LuStar key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}</span> : "—"}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{fmtDate(g.dataVoto)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => openEditG(g)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                      <button onClick={() => removeG(g)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>
              {editId ? "Editar" : "Nova"} {tab === "NPS" ? "Avaliação NPS" : "Pergunta Google"}
            </h2>
            {tab === "NPS" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-600">Categoria</label>
                  <select value={form.categoriaAlvo} onChange={e => setForm({ ...form, categoriaAlvo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-600">Score (0-10)</label>
                  <input type="number" min={0} max={10} value={form.score} onChange={e => setForm({ ...form, score: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-xs text-gray-600">Canal</label>
                  <select value={form.canalColeta} onChange={e => setForm({ ...form, canalColeta: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(CANAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-600">Data</label>
                  <input type="date" value={form.dataColeta || ""} onChange={e => setForm({ ...form, dataColeta: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-600">Coletado por</label>
                  <input value={form.coletadoPor || ""} onChange={e => setForm({ ...form, coletadoPor: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-600">Comentário</label>
                  <textarea value={form.comentario || ""} onChange={e => setForm({ ...form, comentario: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-600">Data pergunta</label>
                  <input type="date" value={form.dataPergunta || ""} onChange={e => setForm({ ...form, dataPergunta: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-xs text-gray-600">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(STATG_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-600">Telefone tutor</label>
                  <input value={form.tutorTelefone || ""} onChange={e => setForm({ ...form, tutorTelefone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-xs text-gray-600">Canal envio</label>
                  <input value={form.canalEnvio || ""} onChange={e => setForm({ ...form, canalEnvio: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-xs text-gray-600">Estrelas (1-5)</label>
                  <input type="number" min={1} max={5} value={form.estrelas ?? ""} onChange={e => setForm({ ...form, estrelas: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-xs text-gray-600">Data voto</label>
                  <input type="date" value={form.dataVoto || ""} onChange={e => setForm({ ...form, dataVoto: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-600">Link enviado</label>
                  <input value={form.linkEnviado || ""} onChange={e => setForm({ ...form, linkEnviado: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-600">Comentário (se não gostou)</label>
                  <textarea value={form.comentarioNegativo || ""} onChange={e => setForm({ ...form, comentarioNegativo: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              </div>
            )}
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

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E8DFC8" }}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-xl font-semibold tabular-nums" style={{ color: accent || "#0E2244" }}>{value}</div>
    </div>
  );
}
