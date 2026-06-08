"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";

type Escopo = "LEAD" | "CLIENTE" | "PROJETO" | "CUSTOM";

interface Estagio { id: string; pipelineId: string; nome: string; descricao?: string | null; cor?: string | null; ordem: number; ehInicial: boolean; ehGanho: boolean; ehPerda: boolean; ativo: boolean; diasMaxParar?: number | null; }
interface Pipeline { id: string; nome: string; escopo: Escopo; descricao?: string | null; cor?: string | null; ativo: boolean; ordem: number; isPadrao: boolean; estagios: Estagio[]; _count?: { estagios: number }; }

const ESC_LABEL: Record<Escopo, string> = { LEAD: "Leads", CLIENTE: "Clientes", PROJETO: "Projetos", CUSTOM: "Custom" };
const EMPTY_P: any = { nome: "", escopo: "CUSTOM", descricao: "", cor: "#009AAC", ativo: true, ordem: 0, isPadrao: false };
const EMPTY_E: any = { nome: "", descricao: "", cor: "#A0AEC0", ordem: 1, ehInicial: false, ehGanho: false, ehPerda: false, ativo: true, diasMaxParar: null };

export default function PipelinesPage() {
  const [list, setList] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEsc, setFilterEsc] = useState<"ALL" | Escopo>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [pModalOpen, setPModalOpen] = useState(false);
  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<any>(EMPTY_P);

  const [eModalOpen, setEModalOpen] = useState(false);
  const [eEditId, setEEditId] = useState<string | null>(null);
  const [ePipeId, setEPipeId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<any>(EMPTY_E);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/pipelines${qs}`, { cache: "no-store" });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterEsc !== "ALL") arr = arr.filter(p => p.escopo === filterEsc);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(p => p.nome.toLowerCase().includes(q) || (p.estagios || []).some((e: any) => (e.nome || "").toLowerCase().includes(q)));
    }
    return arr;
  }, [list, filterEsc, search]);

  function openPNew() { setPEditId(null); setPForm(EMPTY_P); setPModalOpen(true); }
  function openPEdit(p: Pipeline) { setPEditId(p.id); setPForm({ ...p }); setPModalOpen(true); }
  async function saveP() {
    try {
      const { id, createdAt, updatedAt, estagios, _count, ...payload } = pForm as any;
      const url = pEditId ? `/api/pipelines/${pEditId}` : "/api/pipelines";
      const method = pEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setPModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeP(p: Pipeline) {
    if (!confirm(`Excluir pipeline "${p.nome}"?`)) return;
    const res = await fetch(`/api/pipelines/${p.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleP(p: Pipeline) {
    const res = await fetch(`/api/pipelines/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !p.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function openENew(pipeId: string, ord: number) { setEEditId(null); setEPipeId(pipeId); setEForm({ ...EMPTY_E, ordem: ord, pipelineId: pipeId }); setEModalOpen(true); }
  function openEEdit(e: Estagio) { setEEditId(e.id); setEPipeId(e.pipelineId); setEForm({ ...e }); setEModalOpen(true); }
  async function saveE() {
    try {
      const { id, createdAt, updatedAt, ...payload } = eForm as any;
      if (!payload.pipelineId && ePipeId) payload.pipelineId = ePipeId;
      const url = eEditId ? `/api/pipelines/estagios/${eEditId}` : "/api/pipelines/estagios";
      const method = eEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setEModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeE(e: Estagio) {
    if (!confirm(`Excluir estágio "${e.nome}"?`)) return;
    const res = await fetch(`/api/pipelines/estagios/${e.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const p of list) counts[p.escopo] = (counts[p.escopo] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Pipelines</h1>
            <p className="text-sm text-gray-500">Etapas customizáveis pra Leads, Clientes e projetos internos</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pipelines..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openPNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Pipeline
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Escopo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-20">Estágios</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum pipeline.</td></tr>}
              {filtered.map(p => {
                const isOpen = expanded === p.id;
                const maxOrd = Math.max(0, ...p.estagios.map(e => e.ordem));
                return (
                  <>
                    <tr key={p.id} className="border-b hover:bg-gray-50/60 transition cursor-pointer" style={{ borderColor: "#F0EBE0", opacity: p.ativo ? 1 : 0.5 }} onClick={() => setExpanded(isOpen ? null : p.id)}>
                      <td className="px-4 py-2.5 text-gray-400">{isOpen ? "▼" : "▶"}</td>
                      <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.cor || "#009AAC" }} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: "#0E2244" }}>{p.nome}</span>
                          {p.isPadrao && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#E0F4F6", color: "#009AAC" }}>Padrão</span>}
                        </div>
                        {p.descricao && <div className="text-xs text-gray-500 mt-0.5">{p.descricao}</div>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{ESC_LABEL[p.escopo]}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{p.estagios.length}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={(e) => { e.stopPropagation(); toggleP(p); }} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: p.ativo ? "#009AAC" : "#CBD5E0" }}>
                          <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: p.ativo ? 20 : 2 }} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openPEdit(p)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                        <button onClick={() => removeP(p)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: "#FAFAFA" }}>
                        <td colSpan={7} className="px-4 py-3">
                          {p.estagios.length === 0 && <div className="text-xs text-gray-500 text-center py-3">Nenhum estágio.</div>}
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {p.estagios.map(e => (
                              <div key={e.id} className="flex-shrink-0 bg-white border rounded p-2.5 min-w-[160px]" style={{ borderColor: e.cor || "#E8DFC8", borderTopWidth: 3, borderTopColor: e.cor || "#A0AEC0", opacity: e.ativo ? 1 : 0.5 }}>
                                <div className="flex items-center gap-1 text-xs mb-1">
                                  <span className="font-bold" style={{ color: e.cor || "#0E2244" }}>#{e.ordem}</span>
                                  {e.ehInicial && <span title="Inicial">🏁</span>}
                                  {e.ehGanho && <span title="Ganho">✅</span>}
                                  {e.ehPerda && <span title="Perda">❌</span>}
                                </div>
                                <div className="font-medium text-sm" style={{ color: "#0E2244" }}>{e.nome}</div>
                                {e.diasMaxParar && <div className="text-xs text-gray-400 mt-1">SLA: {e.diasMaxParar}d</div>}
                                <div className="flex gap-1 mt-2 justify-end">
                                  <button onClick={() => openEEdit(e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><LuPencil size={11} /></button>
                                  <button onClick={() => removeE(e)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#EF4444" }}><LuX size={11} /></button>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => openENew(p.id, maxOrd + 1)} className="flex-shrink-0 min-w-[160px] border-2 border-dashed rounded p-2.5 flex items-center justify-center gap-1 text-xs hover:bg-white" style={{ borderColor: "#D1D5DB", color: "#009AAC" }}>
                              <LuPlus size={12} /> Novo estágio
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ESCOPOS</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "LEAD", "CLIENTE", "PROJETO", "CUSTOM"] as const).map(k => (
              <button key={k} onClick={() => setFilterEsc(k)} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterEsc === k ? "#009AAC" : "#E8DFC8",
                  background: filterEsc === k ? "#E0F4F6" : "white",
                  color: filterEsc === k ? "#009AAC" : "#4B5563",
                }}>
                {k === "ALL" ? "Todos" : ESC_LABEL[k as Escopo]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {pModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{pEditId ? "Editar pipeline" : "Novo pipeline"}</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-600">Nome *</label>
                <input value={pForm.nome || ""} onChange={e => setPForm({ ...pForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div><label className="text-xs text-gray-600">Escopo</label>
                  <select value={pForm.escopo} onChange={e => setPForm({ ...pForm, escopo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                    {Object.entries(ESC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-600">Cor</label>
                  <input type="color" value={pForm.cor || "#009AAC"} onChange={e => setPForm({ ...pForm, cor: e.target.value })} className="w-full h-9 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              </div>
              <div><label className="text-xs text-gray-600">Descrição</label>
                <textarea value={pForm.descricao || ""} onChange={e => setPForm({ ...pForm, descricao: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={pForm.isPadrao} onChange={e => setPForm({ ...pForm, isPadrao: e.target.checked })} /> Pipeline padrão</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={pForm.ativo} onChange={e => setPForm({ ...pForm, ativo: e.target.checked })} /> Ativo</label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveP} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {eModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{eEditId ? "Editar estágio" : "Novo estágio"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_80px] gap-3">
              <div><label className="text-xs text-gray-600">Nome *</label>
                <input value={eForm.nome || ""} onChange={e => setEForm({ ...eForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Ordem *</label>
                <input type="number" min={1} value={eForm.ordem} onChange={e => setEForm({ ...eForm, ordem: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Cor</label>
                <input type="color" value={eForm.cor || "#A0AEC0"} onChange={e => setEForm({ ...eForm, cor: e.target.value })} className="w-full h-9 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-3"><label className="text-xs text-gray-600">SLA (dias máx parado)</label>
                <input type="number" min={1} value={eForm.diasMaxParar ?? ""} onChange={e => setEForm({ ...eForm, diasMaxParar: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={eForm.ehInicial} onChange={e => setEForm({ ...eForm, ehInicial: e.target.checked })} /> 🏁 Inicial</label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={eForm.ehGanho} onChange={e => setEForm({ ...eForm, ehGanho: e.target.checked })} /> ✅ Ganho</label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={eForm.ehPerda} onChange={e => setEForm({ ...eForm, ehPerda: e.target.checked })} /> ❌ Perda</label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="checkbox" checked={eForm.ativo} onChange={e => setEForm({ ...eForm, ativo: e.target.checked })} /> Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveE} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
