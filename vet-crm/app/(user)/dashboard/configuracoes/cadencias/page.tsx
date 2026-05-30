"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CsvImporter from "@/components/import/CsvImporter";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuEllipsisVertical, LuSparkles } from "react-icons/lu";

type Gatilho = "AGENDAMENTO_CRIADO" | "AGENDAMENTO_CONFIRMADO" | "ATENDIMENTO_FINALIZADO" | "EXAME_SOLICITADO" | "EXAME_PRONTO" | "LEAD_NOVO" | "LEAD_INATIVO_7D" | "PACOTE_ATIVADO" | "PACOTE_PROXIMO_DO_FIM" | "NIVER_PET" | "NIVER_TUTOR" | "MANUAL";
type TipoPasso = "WHATSAPP" | "EMAIL" | "TAREFA_INTERNA" | "AGUARDAR";
type Unidade = "MINUTOS" | "HORAS" | "DIAS";

interface Passo {
  id: string;
  cadenciaId: string;
  ordem: number;
  tipo: TipoPasso;
  titulo?: string | null;
  conteudo: string;
  atrasoValor: number;
  atrasoUnidade: Unidade;
  ativo: boolean;
}
interface Cadencia {
  id: string;
  nome: string;
  descricao?: string | null;
  gatilho: Gatilho;
  ativo: boolean;
  ordem: number;
  passos: Passo[];
  _count?: { passos: number };
}

const GATILHO_LABEL: Record<Gatilho, { label: string; emoji: string }> = {
  AGENDAMENTO_CRIADO: { label: "Agendamento criado", emoji: "📅" },
  AGENDAMENTO_CONFIRMADO: { label: "Agendamento confirmado", emoji: "✅" },
  ATENDIMENTO_FINALIZADO: { label: "Atendimento finalizado", emoji: "🐾" },
  EXAME_SOLICITADO: { label: "Exame solicitado", emoji: "🧪" },
  EXAME_PRONTO: { label: "Exame pronto", emoji: "📋" },
  LEAD_NOVO: { label: "Lead novo", emoji: "✨" },
  LEAD_INATIVO_7D: { label: "Lead inativo 7d", emoji: "❄️" },
  PACOTE_ATIVADO: { label: "Pacote ativado", emoji: "📦" },
  PACOTE_PROXIMO_DO_FIM: { label: "Pacote acabando", emoji: "⚠️" },
  NIVER_PET: { label: "Aniversário pet", emoji: "🎂" },
  NIVER_TUTOR: { label: "Aniversário tutor", emoji: "🎁" },
  MANUAL: { label: "Manual", emoji: "👤" },
};

const TIPO_LABEL: Record<TipoPasso, { label: string; emoji: string; bg: string; color: string }> = {
  WHATSAPP: { label: "WhatsApp", emoji: "💬", bg: "#F1F1F1", color: "#6B7280" },
  EMAIL: { label: "E-mail", emoji: "📧", bg: "#F1F1F1", color: "#6B7280" },
  TAREFA_INTERNA: { label: "Tarefa interna", emoji: "📌", bg: "#F1F1F1", color: "#6B7280" },
  AGUARDAR: { label: "Aguardar", emoji: "⏸", bg: "#F1F1F1", color: "#555" },
};

const EMPTY_CAD: any = { nome: "", descricao: "", gatilho: "MANUAL", ativo: true, ordem: 0 };
const EMPTY_PASSO: any = { ordem: 1, tipo: "WHATSAPP", titulo: "", conteudo: "", atrasoValor: 0, atrasoUnidade: "DIAS", ativo: true };

export default function CadenciasConfigPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [cadencias, setCadencias] = useState<Cadencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [cadModalOpen, setCadModalOpen] = useState(false);
  const [cadEditId, setCadEditId] = useState<string | null>(null);
  const [cadForm, setCadForm] = useState<any>(EMPTY_CAD);
  const [openMenuCad, setOpenMenuCad] = useState<string | null>(null);

  const [passoModalOpen, setPassoModalOpen] = useState(false);
  const [passoEditId, setPassoEditId] = useState<string | null>(null);
  const [passoCadenciaId, setPassoCadenciaId] = useState<string | null>(null);
  const [passoForm, setPassoForm] = useState<any>(EMPTY_PASSO);

  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/cadencias${qs}`);
      setCadencias(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  function openCadNew() { setCadEditId(null); setCadForm(EMPTY_CAD); setCadModalOpen(true); }
  function openCadEdit(c: Cadencia) { setCadEditId(c.id); setCadForm({ ...c }); setCadModalOpen(true); setOpenMenuCad(null); }
  async function saveCad() {
    try {
      const { id, createdAt, updatedAt, passos, _count, ...payload } = cadForm as any;
      const url = cadEditId ? `/api/cadencias/${cadEditId}` : "/api/cadencias";
      const method = cadEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setCadModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteCad(c: Cadencia) {
    if (!confirm(`Excluir cadência "${c.nome}" e seus ${c._count?.passos || 0} passos?`)) return;
    try {
      const res = await fetch(`/api/cadencias/${c.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      setOpenMenuCad(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  function openPassoNew(cadenciaId: string, proxOrdem: number) {
    setPassoEditId(null);
    setPassoCadenciaId(cadenciaId);
    setPassoForm({ ...EMPTY_PASSO, ordem: proxOrdem, cadenciaId });
    setPassoModalOpen(true);
  }
  function openPassoEdit(p: Passo) {
    setPassoEditId(p.id);
    setPassoCadenciaId(p.cadenciaId);
    setPassoForm({ ...p });
    setPassoModalOpen(true);
  }
  async function savePasso() {
    try {
      const { id, createdAt, updatedAt, ...payload } = passoForm as any;
      if (!payload.cadenciaId && passoCadenciaId) payload.cadenciaId = passoCadenciaId;
      const url = passoEditId ? `/api/cadencias/passos/${passoEditId}` : "/api/cadencias/passos";
      const method = passoEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setPassoModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deletePasso(p: Passo) {
    if (!confirm(`Excluir passo ${p.ordem} "${p.titulo || ''}"?`)) return;
    try {
      const res = await fetch(`/api/cadencias/passos/${p.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  async function rodarSeed() {
    if (!confirm("Carregar pacote inicial de 5 cadências (12 passos)? Só se ainda não houver cadências cadastradas.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/cadencias/seed-pacote-inicial", { method: "POST" });
      const data = await res.json();
      if (data?.skipped) alert(`Pacote não carregado: ${data.message}`);
      else { alert(`✅ ${data.cadenciasCriadas} cadências e ${data.passosCriados} passos criados!`); await load(); }
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  function fmtAtraso(p: Passo) {
    if (p.atrasoValor === 0) return "imediato";
    const label = { MINUTOS: "min", HORAS: "h", DIAS: "d" }[p.atrasoUnidade];
    return `+${p.atrasoValor}${label}`;
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Cadências (fluxos automatizados)</h1>
            <p className="text-sm text-gray-600">Sequências de mensagens disparadas por gatilhos. Use {`{tutor}`}, {`{pet}`}, {`{data}`}, {`{hora}`}.</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>Importar planilha</button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Inativas
          </label>
          {cadencias.length === 0 && !loading && (
            <button onClick={rodarSeed} disabled={seeding}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "#3C3489", color: "white", opacity: seeding ? 0.5 : 1 }}>
              <LuSparkles size={16} /> {seeding ? "Carregando…" : "Carregar pacote inicial"}
            </button>
          )}
          <button onClick={openCadNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            style={{ background: "#3C3489", color: "white" }}>
            <LuPlus size={16} /> Nova cadência
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-3">
        {loading && <div className="text-center py-12 text-sm text-gray-500">Carregando...</div>}
        {!loading && cadencias.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-12">
            Nenhuma cadência. Crie uma ou carregue o pacote inicial.
          </div>
        )}
        {cadencias.map(c => {
          const g = GATILHO_LABEL[c.gatilho];
          const isOpen = expanded === c.id;
          const maxOrdem = Math.max(0, ...c.passos.map(p => p.ordem));
          return (
            <div key={c.id} className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9", opacity: c.ativo ? 1 : 0.5 }}>
              <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "#E5DCC9" }}>
                <button onClick={() => setExpanded(isOpen ? null : c.id)} className="text-lg">{isOpen ? "▼" : "▶"}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: "#3C3489" }}>{c.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: "#3C3489" }}>
                      {g.emoji} {g.label}
                    </span>
                    <span className="text-xs text-gray-500">{c.passos.length} {c.passos.length === 1 ? "passo" : "passos"}</span>
                  </div>
                  {c.descricao && <div className="text-xs text-gray-500 mt-0.5">{c.descricao}</div>}
                </div>
                <div className="relative">
                  <button onClick={() => setOpenMenuCad(openMenuCad === c.id ? null : c.id)} className="p-1 hover:bg-gray-100 rounded">
                    <LuEllipsisVertical size={16} />
                  </button>
                  {openMenuCad === c.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                      style={{ borderColor: "#E5DCC9" }}>
                      <button onClick={() => openCadEdit(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <LuPencil size={14} /> Editar
                      </button>
                      <button onClick={() => deleteCad(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: "#6B7280" }}>
                        <LuTrash size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="p-4 space-y-2">
                  {c.passos.length === 0 && <div className="text-xs text-gray-500 text-center py-4">Nenhum passo. Adicione o primeiro abaixo.</div>}
                  {c.passos.map(p => {
                    const t = TIPO_LABEL[p.tipo];
                    return (
                      <div key={p.id} className="border rounded-lg p-3 flex items-start gap-3" style={{ borderColor: "#E5DCC9", opacity: p.ativo ? 1 : 0.5 }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "#3C3489", color: "white" }}>
                          {p.ordem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: t.bg, color: t.color }}>
                              {t.emoji} {t.label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: "#555" }}>⏱ {fmtAtraso(p)}</span>
                            {p.titulo && <span className="text-xs font-medium">{p.titulo}</span>}
                          </div>
                          <div className="text-sm whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2">{p.conteudo}</div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openPassoEdit(p)} title="Editar" className="p-1 hover:bg-gray-100 rounded">
                            <LuPencil size={14} />
                          </button>
                          <button onClick={() => deletePasso(p)} title="Excluir" className="p-1 hover:bg-gray-100 rounded" style={{ color: "#6B7280" }}>
                            <LuTrash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => openPassoNew(c.id, maxOrdem + 1)}
                    className="w-full px-3 py-2 rounded-lg text-sm border-2 border-dashed flex items-center justify-center gap-1 hover:bg-gray-50"
                    style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>
                    <LuPlus size={14} /> Adicionar passo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Cadência */}
      {cadModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCadModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {cadEditId ? "Editar cadência" : "Nova cadência"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={cadForm.nome || ""} onChange={e => setCadForm({ ...cadForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Gatilho *</label>
                <select value={cadForm.gatilho} onChange={e => setCadForm({ ...cadForm, gatilho: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(GATILHO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <textarea value={cadForm.descricao || ""} onChange={e => setCadForm({ ...cadForm, descricao: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cadForm.ativo} onChange={e => setCadForm({ ...cadForm, ativo: e.target.checked })} />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCadModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveCad} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Passo */}
      {passoModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPassoModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {passoEditId ? "Editar passo" : "Novo passo"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Ordem *</label>
                <input type="number" min={1} value={passoForm.ordem} onChange={e => setPassoForm({ ...passoForm, ordem: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Tipo *</label>
                <select value={passoForm.tipo} onChange={e => setPassoForm({ ...passoForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Título</label>
                <input value={passoForm.titulo || ""} onChange={e => setPassoForm({ ...passoForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}
                  placeholder="Ex: Lembrete 24h antes" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Atraso (após passo anterior)</label>
                <input type="number" min={0} value={passoForm.atrasoValor} onChange={e => setPassoForm({ ...passoForm, atrasoValor: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Unidade</label>
                <select value={passoForm.atrasoUnidade} onChange={e => setPassoForm({ ...passoForm, atrasoUnidade: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="MINUTOS">Minutos</option>
                  <option value="HORAS">Horas</option>
                  <option value="DIAS">Dias</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Conteúdo *</label>
                <textarea value={passoForm.conteudo || ""} onChange={e => setPassoForm({ ...passoForm, conteudo: e.target.value })}
                  rows={5} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E5DCC9" }}
                  placeholder="Oi, {tutor}! Lembrete da consulta do {pet}..." />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={passoForm.ativo} onChange={e => setPassoForm({ ...passoForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPassoModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={savePasso} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Cadências"
        endpoint="/api/cadencias/import-batch"
        exampleHint="Exporte de Base44 > CadenciaTemplate. Gatilhos: agendamento_criado, atendimento_finalizado, lead_novo, niver_pet, etc."
        fields={[{"key": "nome", "label": "Nome", "required": true}, {"key": "descricao", "label": "Descri\u00e7\u00e3o"}, {"key": "gatilho", "label": "Gatilho"}, {"key": "ordem", "label": "Ordem", "type": "int"}, {"key": "ativo", "label": "Ativa", "type": "boolean"}]}
        onSuccess={() => load()}
      />
    </div>
  );
}
