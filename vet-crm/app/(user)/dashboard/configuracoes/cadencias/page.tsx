"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";

type Gatilho = "AGENDAMENTO_CRIADO" | "AGENDAMENTO_CONFIRMADO" | "ATENDIMENTO_FINALIZADO" | "EXAME_SOLICITADO" | "EXAME_PRONTO" | "LEAD_NOVO" | "LEAD_INATIVO_7D" | "PACOTE_ATIVADO" | "PACOTE_PROXIMO_DO_FIM" | "NIVER_PET" | "NIVER_TUTOR" | "MANUAL";
type TipoPasso = "WHATSAPP" | "EMAIL" | "TAREFA_INTERNA" | "AGUARDAR";
type Unidade = "MINUTOS" | "HORAS" | "DIAS";

interface Passo { id: string; cadenciaId: string; ordem: number; tipo: TipoPasso; titulo?: string | null; conteudo: string; atrasoValor: number; atrasoUnidade: Unidade; ativo: boolean; }
interface Cadencia { id: string; nome: string; descricao?: string | null; gatilho: Gatilho; ativo: boolean; ordem: number; passos: Passo[]; _count?: { passos: number }; }

const GATILHO_LABEL: Record<Gatilho, string> = {
  AGENDAMENTO_CRIADO: "Agendamento criado", AGENDAMENTO_CONFIRMADO: "Agendamento confirmado",
  ATENDIMENTO_FINALIZADO: "Atendimento finalizado", EXAME_SOLICITADO: "Exame solicitado",
  EXAME_PRONTO: "Exame pronto", LEAD_NOVO: "Lead novo", LEAD_INATIVO_7D: "Lead inativo 7d",
  PACOTE_ATIVADO: "Pacote ativado", PACOTE_PROXIMO_DO_FIM: "Pacote acabando",
  NIVER_PET: "Aniversário pet", NIVER_TUTOR: "Aniversário tutor", MANUAL: "Manual",
};
const TIPO_LABEL: Record<TipoPasso, string> = { WHATSAPP: "WhatsApp", EMAIL: "E-mail", TAREFA_INTERNA: "Tarefa", AGUARDAR: "Aguardar" };
const EMPTY_C: any = { nome: "", descricao: "", gatilho: "MANUAL", ativo: true, ordem: 0 };
const EMPTY_P: any = { ordem: 1, tipo: "WHATSAPP", titulo: "", conteudo: "", atrasoValor: 0, atrasoUnidade: "DIAS", ativo: true };

export default function CadenciasPage() {
  const [list, setList] = useState<Cadencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGat, setFilterGat] = useState<"ALL" | Gatilho>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [cModalOpen, setCModalOpen] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<any>(EMPTY_C);

  const [pModalOpen, setPModalOpen] = useState(false);
  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pCadId, setPCadId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<any>(EMPTY_P);

  // "Carregando..." so na PRIMEIRA carga: nas recargas depois de uma acao os dados
  // sao trocados por baixo, sem desmontar a tela (evita o "pulo" a cada clique).
  const jaCarregou = useRef(false);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/cadencias${qs}`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { jaCarregou.current = true; setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterGat !== "ALL") arr = arr.filter(c => c.gatilho === filterGat);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.nome.toLowerCase().includes(q));
    }
    return arr;
  }, [list, filterGat, search]);

  function openCNew() { setCEditId(null); setCForm(EMPTY_C); setCModalOpen(true); }
  function openCEdit(c: Cadencia) { setCEditId(c.id); setCForm({ ...c }); setCModalOpen(true); }
  async function saveC() {
    try {
      const { id, createdAt, updatedAt, passos, _count, ...payload } = cForm as any;
      const url = cEditId ? `/api/cadencias/${cEditId}` : "/api/cadencias";
      const method = cEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setCModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeC(c: Cadencia) {
    if (!(await confirmDelete({ entityLabel: "cadência", itemName: c.nome, consequenceText: "Os passos dela também serão removidos." }))) return;
    const res = await fetch(`/api/cadencias/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleC(c: Cadencia) {
    const res = await fetch(`/api/cadencias/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !c.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function openPNew(cadId: string, ord: number) { setPEditId(null); setPCadId(cadId); setPForm({ ...EMPTY_P, ordem: ord, cadenciaId: cadId }); setPModalOpen(true); }
  function openPEdit(p: Passo) { setPEditId(p.id); setPCadId(p.cadenciaId); setPForm({ ...p }); setPModalOpen(true); }
  async function saveP() {
    try {
      const { id, createdAt, updatedAt, ...payload } = pForm as any;
      if (!payload.cadenciaId && pCadId) payload.cadenciaId = pCadId;
      const url = pEditId ? `/api/cadencias/passos/${pEditId}` : "/api/cadencias/passos";
      const method = pEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setPModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeP(p: Passo) {
    if (!(await confirmDelete({ entityLabel: "passo", itemName: String(p.ordem) }))) return;
    const res = await fetch(`/api/cadencias/passos/${p.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function fmtAtraso(p: Passo) {
    if (p.atrasoValor === 0) return "imediato";
    const u = { MINUTOS: "min", HORAS: "h", DIAS: "d" }[p.atrasoUnidade];
    return `+${p.atrasoValor}${u}`;
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const c of list) counts[c.gatilho] = (counts[c.gatilho] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Cadências</h1>
            <p className="text-sm text-gray-500">Sequências de mensagens disparadas por gatilho</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativas
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cadências..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openCNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Nova Cadência
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Gatilho</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-20">Passos</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativa</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma cadência.</td></tr>}
              {filtered.map(c => {
                const isOpen = expanded === c.id;
                const maxOrd = Math.max(0, ...c.passos.map(p => p.ordem));
                return (
                  <>
                    <tr key={c.id} className="border-b hover:bg-gray-50/60 transition cursor-pointer" style={{ borderColor: "#F0EBE0", opacity: c.ativo ? 1 : 0.5 }}
                      onClick={() => setExpanded(isOpen ? null : c.id)}>
                      <td className="px-4 py-2.5 text-gray-400">{isOpen ? "▼" : "▶"}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium" style={{ color: "#0E2244" }}>{c.nome}</div>
                        {c.descricao && <div className="text-xs text-gray-500 mt-0.5">{c.descricao}</div>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{GATILHO_LABEL[c.gatilho]}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-right tabular-nums text-gray-500">{c.passos.length}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={(e) => { e.stopPropagation(); toggleC(c); }} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: c.ativo ? "#009AAC" : "#CBD5E0" }}>
                          <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: c.ativo ? 20 : 2 }} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openCEdit(c)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600"><LuPencil size={14} /></button>
                        <button onClick={() => removeC(c)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }}><LuX size={14} /></button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: "#FAFAFA" }}>
                        <td colSpan={6} className="px-4 py-3">
                          {c.passos.length === 0 && <div className="text-xs text-gray-500 text-center py-3">Nenhum passo. Adicione abaixo.</div>}
                          <div className="space-y-1.5">
                            {c.passos.map(p => (
                              <div key={p.id} className="bg-white border rounded p-2.5 flex items-start gap-3" style={{ borderColor: "#E8DFC8", opacity: p.ativo ? 1 : 0.5 }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ background: "#009AAC" }}>{p.ordem}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="px-2 py-0.5 rounded font-medium" style={{ background: "#E0F4F6", color: "#009AAC" }}>{TIPO_LABEL[p.tipo]}</span>
                                    <span className="text-gray-500">⏱ {fmtAtraso(p)}</span>
                                    {p.titulo && <span className="font-medium" style={{ color: "#0E2244" }}>{p.titulo}</span>}
                                  </div>
                                  <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{p.conteudo}</div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button onClick={() => openPEdit(p)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><LuPencil size={12} /></button>
                                  <button onClick={() => removeP(p)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#EF4444" }}><LuX size={12} /></button>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => openPNew(c.id, maxOrd + 1)} className="w-full px-3 py-2 rounded text-xs border-2 border-dashed flex items-center justify-center gap-1 hover:bg-white" style={{ borderColor: "#D1D5DB", color: "#009AAC" }}>
                              <LuPlus size={12} /> Adicionar passo
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">GATILHOS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterGat("ALL")} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterGat === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterGat === "ALL" ? "#E0F4F6" : "white",
                color: filterGat === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todos <span className="text-gray-400">({list.length})</span>
            </button>
            {(Object.keys(GATILHO_LABEL) as Gatilho[]).filter(g => counts[g]).map(g => (
              <button key={g} onClick={() => setFilterGat(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterGat === g ? "#009AAC" : "#E8DFC8",
                  background: filterGat === g ? "#E0F4F6" : "white",
                  color: filterGat === g ? "#009AAC" : "#4B5563",
                }}>
                {GATILHO_LABEL[g]} <span className="text-gray-400">({counts[g] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {cModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{cEditId ? "Editar cadência" : "Nova cadência"}</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-600">Nome *</label>
                <input value={cForm.nome || ""} onChange={e => setCForm({ ...cForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Gatilho</label>
                <select value={cForm.gatilho} onChange={e => setCForm({ ...cForm, gatilho: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(GATILHO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Descrição</label>
                <textarea value={cForm.descricao || ""} onChange={e => setCForm({ ...cForm, descricao: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cForm.ativo} onChange={e => setCForm({ ...cForm, ativo: e.target.checked })} /> Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveC} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {pModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{pEditId ? "Editar passo" : "Novo passo"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-600">Ordem *</label>
                <input type="number" min={1} value={pForm.ordem} onChange={e => setPForm({ ...pForm, ordem: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Tipo *</label>
                <select value={pForm.tipo} onChange={e => setPForm({ ...pForm, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Título</label>
                <input value={pForm.titulo || ""} onChange={e => setPForm({ ...pForm, titulo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Atraso</label>
                <input type="number" min={0} value={pForm.atrasoValor} onChange={e => setPForm({ ...pForm, atrasoValor: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Unidade</label>
                <select value={pForm.atrasoUnidade} onChange={e => setPForm({ ...pForm, atrasoUnidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  <option value="MINUTOS">Minutos</option><option value="HORAS">Horas</option><option value="DIAS">Dias</option>
                </select></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Conteúdo *</label>
                <textarea value={pForm.conteudo || ""} onChange={e => setPForm({ ...pForm, conteudo: e.target.value })} rows={5} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={pForm.ativo} onChange={e => setPForm({ ...pForm, ativo: e.target.checked })} /> Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveP} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
