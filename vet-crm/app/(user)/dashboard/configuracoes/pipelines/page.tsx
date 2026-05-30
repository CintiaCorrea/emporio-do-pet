"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuEllipsisVertical, LuSparkles } from "react-icons/lu";

type Escopo = "LEAD" | "CLIENTE" | "PROJETO" | "CUSTOM";

interface Estagio {
  id: string;
  pipelineId: string;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  ordem: number;
  ehInicial: boolean;
  ehGanho: boolean;
  ehPerda: boolean;
  ativo: boolean;
  diasMaxParar?: number | null;
}
interface Pipeline {
  id: string;
  nome: string;
  escopo: Escopo;
  descricao?: string | null;
  cor?: string | null;
  ativo: boolean;
  ordem: number;
  isPadrao: boolean;
  estagios: Estagio[];
  _count?: { estagios: number };
}

const ESCOPO_LABEL: Record<Escopo, { label: string; emoji: string }> = {
  LEAD: { label: "Leads", emoji: "✨" },
  CLIENTE: { label: "Clientes", emoji: "🧑" },
  PROJETO: { label: "Projetos", emoji: "📋" },
  CUSTOM: { label: "Custom", emoji: "🔧" },
};

const EMPTY_P: any = { nome: "", escopo: "CUSTOM", descricao: "", cor: "#3C3489", ativo: true, ordem: 0, isPadrao: false };
const EMPTY_E: any = { nome: "", descricao: "", cor: "#A0AEC0", ordem: 1, ehInicial: false, ehGanho: false, ehPerda: false, ativo: true, diasMaxParar: null };

export default function PipelinesConfigPage() {
  const [pipes, setPipes] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [pModalOpen, setPModalOpen] = useState(false);
  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<any>(EMPTY_P);
  const [openMenuP, setOpenMenuP] = useState<string | null>(null);

  const [eModalOpen, setEModalOpen] = useState(false);
  const [eEditId, setEEditId] = useState<string | null>(null);
  const [ePipelineId, setEPipelineId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<any>(EMPTY_E);

  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/pipelines${qs}`);
      setPipes(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  function openPNew() { setPEditId(null); setPForm(EMPTY_P); setPModalOpen(true); }
  function openPEdit(p: Pipeline) { setPEditId(p.id); setPForm({ ...p }); setPModalOpen(true); setOpenMenuP(null); }
  async function saveP() {
    try {
      const { id, createdAt, updatedAt, estagios, _count, ...payload } = pForm as any;
      const url = pEditId ? `/api/pipelines/${pEditId}` : "/api/pipelines";
      const method = pEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setPModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteP(p: Pipeline) {
    if (!confirm(`Excluir pipeline "${p.nome}" e ${p._count?.estagios || 0} estágios?`)) return;
    try {
      const res = await fetch(`/api/pipelines/${p.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      setOpenMenuP(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  function openENew(pipelineId: string, proxOrdem: number) {
    setEEditId(null);
    setEPipelineId(pipelineId);
    setEForm({ ...EMPTY_E, ordem: proxOrdem, pipelineId });
    setEModalOpen(true);
  }
  function openEEdit(e: Estagio) {
    setEEditId(e.id);
    setEPipelineId(e.pipelineId);
    setEForm({ ...e });
    setEModalOpen(true);
  }
  async function saveE() {
    try {
      const { id, createdAt, updatedAt, ...payload } = eForm as any;
      if (!payload.pipelineId && ePipelineId) payload.pipelineId = ePipelineId;
      const url = eEditId ? `/api/pipelines/estagios/${eEditId}` : "/api/pipelines/estagios";
      const method = eEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setEModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteE(e: Estagio) {
    if (!confirm(`Excluir estágio "${e.nome}"?`)) return;
    try {
      const res = await fetch(`/api/pipelines/estagios/${e.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      await load();
    } catch (er) { alert(`Erro: ${er}`); }
  }

  async function rodarSeed() {
    if (!confirm("Carregar pacote inicial de 3 pipelines (15 estágios)?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/pipelines/seed-pacote-inicial", { method: "POST" });
      const data = await res.json();
      if (data?.skipped) alert(`Pacote não carregado: ${data.message}`);
      else { alert(`✅ ${data.pipelinesCriados} pipelines e ${data.estagiosCriados} estágios criados!`); await load(); }
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Pipelines configuráveis</h1>
            <p className="text-sm text-gray-600">Defina fluxos de estágios para Leads, Clientes ou projetos internos.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Inativos
          </label>
          {pipes.length === 0 && !loading && (
            <button onClick={rodarSeed} disabled={seeding}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "#3C3489", color: "white", opacity: seeding ? 0.5 : 1 }}>
              <LuSparkles size={16} /> {seeding ? "Carregando…" : "Carregar pacote inicial"}
            </button>
          )}
          <button onClick={openPNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            style={{ background: "#3C3489", color: "white" }}>
            <LuPlus size={16} /> Novo pipeline
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-3">
        {loading && <div className="text-center py-12 text-sm text-gray-500">Carregando...</div>}
        {!loading && pipes.length === 0 && <div className="text-center py-12 text-sm text-gray-500">Nenhum pipeline.</div>}
        {pipes.map(p => {
          const sc = ESCOPO_LABEL[p.escopo];
          const isOpen = expanded === p.id;
          const maxOrdem = Math.max(0, ...p.estagios.map(e => e.ordem));
          return (
            <div key={p.id} className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9", borderLeft: `4px solid ${p.cor || "#3C3489"}`, opacity: p.ativo ? 1 : 0.5 }}>
              <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "#E5DCC9" }}>
                <button onClick={() => setExpanded(isOpen ? null : p.id)} className="text-lg">{isOpen ? "▼" : "▶"}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "#3C3489" }}>{p.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F3EEFC", color: "#3C3489" }}>
                      {sc.emoji} {sc.label}
                    </span>
                    {p.isPadrao && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#DDF4E1", color: "#1E6B36" }}>⭐ Padrão</span>}
                    <span className="text-xs text-gray-500">{p.estagios.length} estágios</span>
                  </div>
                  {p.descricao && <div className="text-xs text-gray-500 mt-0.5">{p.descricao}</div>}
                </div>
                <div className="relative">
                  <button onClick={() => setOpenMenuP(openMenuP === p.id ? null : p.id)} className="p-1 hover:bg-gray-100 rounded">
                    <LuEllipsisVertical size={16} />
                  </button>
                  {openMenuP === p.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                      style={{ borderColor: "#E5DCC9" }}>
                      <button onClick={() => openPEdit(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><LuPencil size={14} /> Editar</button>
                      <button onClick={() => deleteP(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: "#A32D2D" }}><LuTrash size={14} /> Excluir</button>
                    </div>
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="p-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {p.estagios.map(e => (
                      <div key={e.id} className="relative flex-shrink-0 border rounded-lg p-3 min-w-[180px]"
                        style={{ borderColor: e.cor || "#E5DCC9", borderTop: `3px solid ${e.cor || "#A0AEC0"}`, opacity: e.ativo ? 1 : 0.5 }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: e.cor || "#333" }}>#{e.ordem}</span>
                          {e.ehInicial && <span className="text-xs" title="Inicial">🏁</span>}
                          {e.ehGanho && <span className="text-xs" title="Ganho">✅</span>}
                          {e.ehPerda && <span className="text-xs" title="Perda">❌</span>}
                        </div>
                        <div className="font-semibold text-sm">{e.nome}</div>
                        {e.descricao && <div className="text-xs text-gray-500 mt-1">{e.descricao}</div>}
                        {e.diasMaxParar && <div className="text-xs text-gray-400 mt-1">⏱ SLA: {e.diasMaxParar}d</div>}
                        <div className="flex gap-1 mt-2 justify-end">
                          <button onClick={() => openEEdit(e)} className="p-1 hover:bg-gray-100 rounded" title="Editar"><LuPencil size={12} /></button>
                          <button onClick={() => deleteE(e)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#A32D2D" }} title="Excluir"><LuTrash size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openENew(p.id, maxOrdem + 1)}
                      className="flex-shrink-0 min-w-[180px] border-2 border-dashed rounded-lg p-3 flex items-center justify-center gap-1 text-sm hover:bg-gray-50"
                      style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>
                      <LuPlus size={14} /> Novo estágio
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Pipeline */}
      {pModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>{pEditId ? "Editar pipeline" : "Novo pipeline"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={pForm.nome || ""} onChange={e => setPForm({ ...pForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="text-xs text-gray-600">Escopo *</label>
                  <select value={pForm.escopo} onChange={e => setPForm({ ...pForm, escopo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                    {(Object.keys(ESCOPO_LABEL) as Escopo[]).map(k => <option key={k} value={k}>{ESCOPO_LABEL[k].emoji} {ESCOPO_LABEL[k].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Cor</label>
                  <input type="color" value={pForm.cor || "#3C3489"} onChange={e => setPForm({ ...pForm, cor: e.target.value })}
                    className="w-full h-9 border rounded-lg" style={{ borderColor: "#E5DCC9" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <textarea value={pForm.descricao || ""} onChange={e => setPForm({ ...pForm, descricao: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={pForm.isPadrao} onChange={e => setPForm({ ...pForm, isPadrao: e.target.checked })} />
                Pipeline padrão deste escopo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={pForm.ativo} onChange={e => setPForm({ ...pForm, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveP} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Estágio */}
      {eModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>{eEditId ? "Editar estágio" : "Novo estágio"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_80px] gap-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={eForm.nome || ""} onChange={e => setEForm({ ...eForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Ordem *</label>
                <input type="number" min={1} value={eForm.ordem} onChange={e => setEForm({ ...eForm, ordem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Cor</label>
                <input type="color" value={eForm.cor || "#A0AEC0"} onChange={e => setEForm({ ...eForm, cor: e.target.value })}
                  className="w-full h-9 border rounded-lg" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-gray-600">Descrição</label>
                <input value={eForm.descricao || ""} onChange={e => setEForm({ ...eForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-gray-600">SLA (dias máx parado nesse estágio)</label>
                <input type="number" min={1} value={eForm.diasMaxParar ?? ""}
                  onChange={e => setEForm({ ...eForm, diasMaxParar: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ehInicial} onChange={e => setEForm({ ...eForm, ehInicial: e.target.checked })} />
                  🏁 Estágio inicial
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ehGanho} onChange={e => setEForm({ ...eForm, ehGanho: e.target.checked })} />
                  ✅ Ganho
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ehPerda} onChange={e => setEForm({ ...eForm, ehPerda: e.target.checked })} />
                  ❌ Perda
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ativo} onChange={e => setEForm({ ...eForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveE} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
