"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuSearch, LuPhone, LuPlus, LuExternalLink, LuChevronRight,
  LuMessageSquare, LuSparkles, LuRefreshCcw,
} from "react-icons/lu";
import toast from "react-hot-toast";
import PetIcon from "@/components/profile/PetIcon";
import { speciesLabel, ageFromBirth } from "@/lib/pets/labels";

interface Contact { id: string; number: string; isPrimary?: boolean; isWhatsApp?: boolean; }
interface Tutor {
  id: string; name: string; email?: string | null; cpf?: string | null;
  contacts?: Contact[];
  pets?: Pet[];
  estadoRelacionamento?: string | null;
  proximoFollowupAt?: string | null;
  resumoIa?: string | null;
  resumoIaUpdatedAt?: string | null;
}
interface Lead {
  id: string; name?: string | null; phone?: string | null;
  pipelineComercialEtapa?: string | null;
  proximoFollowupAt?: string | null;
  resumoIa?: string | null;
  resumoIaUpdatedAt?: string | null;
}
interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  birthDate?: string | null; observations?: string | null; avatar?: string | null;
  pipelineClinicoEtapa?: string | null;
  pipelineFisioEtapa?: string | null;
  proximoFollowupAt?: string | null;
}
interface Atendimento {
  id: string; date: string; type: string; status: string; description?: string | null;
  diagnosis?: string | null; chiefComplaint?: string | null; value?: number;
}

const TYPE_LABEL: Record<string, string> = {
  CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação",
  EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação",
  CIRURGIA: "Cirurgia", SESSAO_FISIO: "Sessão Fisio", OUTRO: "Outro",
};

const PIPELINE_COMERCIAL = ["Aguardando triagem","Lead novo","Em qualificação","Orçamento enviado","Aguardando retorno","Retomar contato","Reaproximação","Agendado","Compareceu","Perdido"];
const PIPELINE_CLINICO   = ["Diagnóstico inicial","Em tratamento","Aguardando exames","Retorno agendado","Em manutenção","Alta clínica","Abandonou"];
const PIPELINE_FISIO     = ["Avaliação inicial","Pacote em andamento","Sessão a sessão","Manutenção","Reavaliação","Alta","Pausa"];

const ESTADO_RELACIONAMENTO = [
  { v: "EM_DIA", label: "Em dia", color: "#16a34a", bg: "#dcfce7" },
  { v: "PET_EM_TRATAMENTO", label: "Pet em tratamento", color: "#92400e", bg: "#fef3c7" },
  { v: "PRECISA_DE_ATENCAO", label: "Precisa de atenção", color: "#b45309", bg: "#fed7aa" },
  { v: "A_RECUPERAR", label: "A recuperar", color: "#b91c1c", bg: "#fee2e2" },
  { v: "INATIVO", label: "Inativo há muito", color: "#64748b", bg: "#f1f5f9" },
];

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
function fmtRelative(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins/60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h/24);
  return `há ${days}d`;
}

export default function InboxRightPanel({ canal = "BotConversa" }: { canal?: string }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Tutor[]>([]);
  const [searching, setSearching] = useState(false);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);

  // Cadastro inline
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [cadastroAs, setCadastroAs] = useState<"LEAD" | "CLIENTE">("LEAD");
  const [cadForm, setCadForm] = useState({ nome: "", telefone: "", email: "", canalLead: "WhatsApp", origem: "Direto", petNome: "", petEspecie: "Cão", petIdade: "", notas: "" });

  // Interação
  const [interacaoOpen, setInteracaoOpen] = useState(false);
  const [interacaoForm, setInteracaoForm] = useState({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });

  useEffect(() => {
    if (!search || search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/tutors?search=${encodeURIComponent(search)}&limit=10`);
      const d = await safeJson<any>(res, {});
      const arr = Array.isArray(d) ? d : (d.tutors || d.data || []);
      setResults(arr);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function selectTutor(t: Tutor) {
    setTutor(t); setLead(null);
    setResults([]); setSearch(t.name);
    const res = await fetch(`/api/tutors/${t.id}/pets`);
    const d = await safeJson<any>(res, []);
    const list = Array.isArray(d) ? d : (d.pets || []);
    setPets(list);
    if (list[0]) selectPet(list[0]);
    else { setSelectedPet(null); setAtendimentos([]); }
  }

  async function selectPet(p: Pet) {
    setSelectedPet(p);
    const res = await fetch(`/api/atendimentos?petId=${p.id}&limit=5`);
    const d = await safeJson<any>(res, {});
    const arr = Array.isArray(d) ? d : (d.appointments || d.atendimentos || []);
    arr.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAtendimentos(arr.slice(0, 5));
  }

  function reset() {
    setSearch(""); setTutor(null); setLead(null);
    setResults([]); setPets([]); setSelectedPet(null); setAtendimentos([]);
    setCadastroOpen(false); setInteracaoOpen(false);
  }

  const tutorPhone = tutor?.contacts?.find(c => c.isWhatsApp)?.number || tutor?.contacts?.find(c => c.isPrimary)?.number || tutor?.contacts?.[0]?.number;
  const isUnknown = search && search.length >= 2 && !searching && results.length === 0 && !tutor;

  async function updateEntityEtapa(entity: "lead" | "pet", id: string, field: string, value: string) {
    const url = entity === "lead" ? `/api/leads/${id}` : `/api/pets/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) { toast.error("Erro ao atualizar etapa"); return; }
    toast.success("Etapa atualizada");
    if (entity === "lead" && lead) setLead({ ...lead, [field]: value } as any);
    if (entity === "pet" && selectedPet) {
      const updated = { ...selectedPet, [field]: value } as any;
      setSelectedPet(updated);
      setPets(pets.map(p => p.id === id ? updated : p));
    }
  }

  async function updateTutorEstado(value: string) {
    if (!tutor) return;
    const res = await fetch(`/api/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estadoRelacionamento: value }),
    });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    toast.success("Estado atualizado");
    setTutor({ ...tutor, estadoRelacionamento: value });
  }

  // Mapeia origem amigável → enum LeadSource do backend
  const sourceMap: Record<string, string> = {
    "Direto": "DIRECT",
    "Google Ads": "GOOGLE_ADS",
    "Instagram": "INSTAGRAM",
    "Facebook": "FACEBOOK",
    "TikTok": "TIKTOK",
    "Indicação": "REFERRAL",
    "Landing Page": "LANDING_PAGE",
    "WhatsApp": "WHATSAPP",
    "Email": "EMAIL",
    "Orgânico": "ORGANIC",
  };

  async function handleCadastro() {
    if (!cadForm.nome || !cadForm.telefone) { toast.error("Nome e telefone obrigatórios"); return; }
    const endpoint = cadastroAs === "LEAD" ? "/api/leads" : "/api/tutors";
    const cleanPhone = cadForm.telefone.replace(/\D/g, "") || cadForm.telefone;
    const emailFallback = `contato+${cleanPhone}@emporiodopet.crm`;
    const payload: any = cadastroAs === "LEAD"
      ? {
          name: cadForm.nome,
          phone: cleanPhone,
          email: (cadForm.email && cadForm.email.includes("@")) ? cadForm.email : emailFallback,
          source: sourceMap[cadForm.origem] || "OTHER",
          customFields: { canal: cadForm.canalLead, petName: cadForm.petNome, especie: cadForm.petEspecie, idade: cadForm.petIdade },
          notes: cadForm.notas || undefined,
        }
      : {
          name: cadForm.nome,
          contacts: [{ type: "MOBILE", number: cleanPhone, isPrimary: true, isWhatsApp: cadForm.canalLead === "WhatsApp" }],
          ...(cadForm.email && cadForm.email.includes("@") ? { email: cadForm.email } : {}),
          ...(cadForm.origem ? { howFoundUs: cadForm.origem } : {}),
        };

    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      toast.error(`Erro: ${err?.message || res.status}`);
      return;
    }
    const created = await res.json();
    // Cria pet vinculado se foi cliente e nome do pet preenchido
    if (cadastroAs === "CLIENTE" && cadForm.petNome) {
      const petPayload: any = { name: cadForm.petNome, species: cadForm.petEspecie === "Cão" ? "CANINE" : cadForm.petEspecie === "Gato" ? "FELINE" : "OTHER", tutorId: created.id, status: "ACTIVE" };
      await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(petPayload) }).catch(() => null);
    }
    toast.success(`${cadastroAs === "LEAD" ? "Lead" : "Cliente"} cadastrado`);
    setCadastroOpen(false);
    if (cadastroAs === "CLIENTE") {
      await selectTutor(created);
    } else {
      setLead(created);
      setSearch(created.name || created.phone || "");
      setResults([]);
    }
  }

  async function handleInteracao() {
    if (!interacaoForm.texto.trim()) { toast.error("Escreva o resumo"); return; }
    const payload: any = {
      tipo: interacaoForm.tipo,
      texto: interacaoForm.texto,
      proximaAcao: interacaoForm.proximaAcao || undefined,
      proximoFollowupAt: interacaoForm.proximoFollowupAt ? new Date(interacaoForm.proximoFollowupAt).toISOString() : undefined,
      canal,
      ...(tutor && { tutorId: tutor.id }),
      ...(lead && { leadId: lead.id }),
      ...(selectedPet && { petId: selectedPet.id }),
    };
    const res = await fetch("/api/interacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      toast.error(`Erro: ${err?.message || res.status}`);
      return;
    }
    toast.success("Interação registrada na ficha");
    setInteracaoOpen(false);
    setInteracaoForm({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: "#E8DFC8" }}>
        <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase mb-1.5 flex items-center justify-between">
          <span>Contexto da conversa</span>
          {!tutor && !lead && !cadastroOpen && (
            <button
              onClick={() => { setCadastroOpen(true); setCadastroAs("LEAD"); setCadForm({ ...cadForm, telefone: search.replace(/\D/g, "") || search, nome: "" }); }}
              className="text-[10px] font-semibold flex items-center gap-1 normal-case"
              style={{ color: "#009AAC" }}
            >
              <LuPlus size={10} /> cadastrar
            </button>
          )}
        </div>
        <div className="relative">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) reset(); }}
            placeholder="Telefone, nome ou email..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: "#E8DFC8" }}
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto" style={{ borderColor: "#E8DFC8" }}>
              {results.map(r => {
                const phone = r.contacts?.find(c => c.isPrimary)?.number || r.contacts?.[0]?.number || "";
                return (
                  <button key={r.id} onClick={() => selectTutor(r)} className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                    <div className="text-sm text-[#014D5E] font-medium">{r.name}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      {phone && <span>📞 {phone}</span>}
                      {r.pets && r.pets.length > 0 && <span>🐾 {r.pets.length}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {searching && <div className="text-[10.5px] text-gray-400 mt-1">Buscando...</div>}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Estado: vazio */}
        {!tutor && !lead && !isUnknown && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm text-gray-600 font-medium">Selecione um tutor</div>
            <div className="text-xs text-gray-400 mt-1 leading-relaxed">Cole o telefone do contato no BotConversa pra ver o contexto aqui.</div>
          </div>
        )}

        {/* Estado: contato não encontrado — CTA cadastrar */}
        {isUnknown && !cadastroOpen && (
          <div className="px-3 py-6 text-center">
            <div className="text-3xl mb-2">🆕</div>
            <div className="text-sm font-semibold text-[#014D5E] mb-1">Contato não cadastrado</div>
            <div className="text-xs text-gray-500 mb-3 leading-relaxed">"{search}" não está no CRM. Quer cadastrar?</div>
            <button onClick={() => { setCadastroOpen(true); setCadastroAs("LEAD"); setCadForm({ ...cadForm, telefone: search.replace(/\D/g, "") || search, nome: "" }); }} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "#009AAC" }}>+ Cadastrar como Lead</button>
            <div className="mt-2"><button onClick={() => { setCadastroOpen(true); setCadastroAs("CLIENTE"); setCadForm({ ...cadForm, telefone: search.replace(/\D/g, "") || search }); }} className="text-[11px] underline" style={{ color: "#009AAC" }}>ou cadastrar direto como Cliente</button></div>
          </div>
        )}

        {/* Form cadastro inline */}
        {cadastroOpen && (
          <div className="px-3 py-3 space-y-2 bg-[#f6fdfd] border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500">Novo {cadastroAs}</div>
              <div className="flex items-center gap-1 text-[10px]">
                <button onClick={() => setCadastroAs("LEAD")} className="px-2 py-0.5 rounded" style={{ background: cadastroAs === "LEAD" ? "#009AAC" : "#f1f5f9", color: cadastroAs === "LEAD" ? "white" : "#64748b" }}>Lead</button>
                <button onClick={() => setCadastroAs("CLIENTE")} className="px-2 py-0.5 rounded" style={{ background: cadastroAs === "CLIENTE" ? "#009AAC" : "#f1f5f9", color: cadastroAs === "CLIENTE" ? "white" : "#64748b" }}>Cliente</button>
              </div>
            </div>
            <input value={cadForm.nome} onChange={e => setCadForm({ ...cadForm, nome: e.target.value })} placeholder="Nome *" className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
            <input value={cadForm.telefone} onChange={e => setCadForm({ ...cadForm, telefone: e.target.value })} placeholder="Telefone *" className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
            <input value={cadForm.email} onChange={e => setCadForm({ ...cadForm, email: e.target.value })} placeholder="Email (opcional)" className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
            <div className="grid grid-cols-2 gap-2">
              <select value={cadForm.canalLead} onChange={e => setCadForm({ ...cadForm, canalLead: e.target.value })} className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }}>
                {["WhatsApp","Ligação","Walk-in","Indicação","Formulário LP"].map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={cadForm.origem} onChange={e => setCadForm({ ...cadForm, origem: e.target.value })} className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }}>
                {["Direto","Google Ads","Instagram","Facebook","Indicação"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input value={cadForm.petNome} onChange={e => setCadForm({ ...cadForm, petNome: e.target.value })} placeholder="Nome do pet (opcional)" className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
            {cadForm.petNome && (
              <div className="grid grid-cols-2 gap-2">
                <select value={cadForm.petEspecie} onChange={e => setCadForm({ ...cadForm, petEspecie: e.target.value })} className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }}>
                  {["Cão","Gato","Outro"].map(c => <option key={c}>{c}</option>)}
                </select>
                <input value={cadForm.petIdade} onChange={e => setCadForm({ ...cadForm, petIdade: e.target.value })} placeholder="Idade" className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
              </div>
            )}
            <textarea value={cadForm.notas} onChange={e => setCadForm({ ...cadForm, notas: e.target.value })} placeholder="Anotações iniciais" rows={2} className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8" }} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCadastroOpen(false)} className="flex-1 px-2 py-1.5 text-xs border rounded" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={handleCadastro} className="flex-1 px-2 py-1.5 text-xs text-white rounded font-semibold" style={{ background: "#009AAC" }}>Cadastrar {cadastroAs === "LEAD" ? "Lead" : "Cliente"}</button>
            </div>
          </div>
        )}

        {/* Resumo IA */}
        {(tutor?.resumoIa || lead?.resumoIa) && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><LuSparkles size={11} /> Resumo da conversa (IA)</span>
              <span className="text-[10px] text-gray-400 normal-case font-normal">{fmtRelative(tutor?.resumoIaUpdatedAt || lead?.resumoIaUpdatedAt)}</span>
            </div>
            <div className="rounded-md px-3 py-2 text-[11.5px] leading-relaxed" style={{ background: "linear-gradient(135deg, #f0fdfa, #e0f4f6)", border: "1px solid #99e9d8", color: "#0c4a6e" }}>
              <div className="text-[9.5px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: "#0e7490" }}>
                <span style={{ background: "#14b8a6", color: "white", padding: "0 4px", borderRadius: 3, fontSize: 9 }}>IA</span>
                via BotConversa
              </div>
              {tutor?.resumoIa || lead?.resumoIa}
            </div>
          </section>
        )}

        {/* Tutor / Lead */}
        {tutor && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500">Cliente</div>
              <Link href={`/dashboard/erp/tutores/${tutor.id}`} target="_blank" className="text-[10.5px] flex items-center gap-1" style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={10} /></Link>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {((tutor.name.split(/\s+/)[0]?.[0] || "") + (tutor.name.split(/\s+/)[1]?.[0] || "")).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#014D5E] truncate">{tutor.name}</div>
                {tutorPhone && <div className="text-[11px] text-gray-500 flex items-center gap-1"><LuPhone size={10} /> {tutorPhone}</div>}
              </div>
            </div>
            {/* Estado relacionamento */}
            <div className="mt-2.5">
              <div className="text-[9.5px] font-bold uppercase text-gray-400 mb-1">Estado de relacionamento</div>
              <div className="flex flex-wrap gap-1">
                {ESTADO_RELACIONAMENTO.map(e => {
                  const on = (tutor.estadoRelacionamento || "") === e.v;
                  return (
                    <button key={e.v} onClick={() => updateTutorEstado(e.v)} className="text-[9.5px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: on ? e.color : e.bg, color: on ? "white" : e.color, border: on ? "none" : `1px solid ${e.color}55` }}>
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {lead && !tutor && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500">Lead</div>
              <Link href={`/dashboard/crm/leads/${lead.id}`} target="_blank" className="text-[10.5px] flex items-center gap-1" style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={10} /></Link>
            </div>
            <div className="text-sm font-semibold text-[#014D5E]">{lead.name || "Sem nome"}</div>
            {lead.phone && <div className="text-[11px] text-gray-500 flex items-center gap-1"><LuPhone size={10} /> {lead.phone}</div>}
            <div className="mt-3">
              <div className="text-[9.5px] font-bold uppercase text-gray-400 mb-1">Pipeline comercial</div>
              <div className="flex flex-wrap gap-1">
                {PIPELINE_COMERCIAL.map(s => {
                  const on = (lead.pipelineComercialEtapa || "") === s;
                  return (
                    <button key={s} onClick={() => updateEntityEtapa("lead", lead.id, "pipelineComercialEtapa", s)} className="text-[9.5px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: on ? "linear-gradient(90deg,#009AAC,#00B4C4)" : "#f1f5f9", color: on ? "white" : "#64748b" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {lead.proximoFollowupAt && <div className="text-[10.5px] text-gray-500 mt-1.5">⏰ Próximo FU: <strong>{fmtDate(lead.proximoFollowupAt)}</strong></div>}
            </div>
          </section>
        )}

        {/* Pets */}
        {pets.length > 0 && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500 mb-1.5">Pets ({pets.length})</div>
            <div className="flex flex-col gap-1">
              {pets.map(p => {
                const active = selectedPet?.id === p.id;
                return (
                  <button key={p.id} onClick={() => selectPet(p)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition"
                    style={{ background: active ? "#e0f4f6" : "transparent", border: "1px solid", borderColor: active ? "#009AAC" : "#F0EBE0" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: active ? "#009AAC" : "#e6f6f8", color: active ? "white" : "#009AAC" }}>
                      <PetIcon species={p.species} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: "#014D5E" }}>{p.name}</div>
                      <div className="text-[10.5px] text-gray-500">{speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}{p.birthDate ? ` · ${ageFromBirth(p.birthDate)}` : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Pipelines do Pet */}
        {selectedPet && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500">Pipelines da {selectedPet.name}</div>
              <Link href={`/dashboard/erp/pets/${selectedPet.id}`} target="_blank" className="text-[10.5px] flex items-center gap-1" style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={10} /></Link>
            </div>
            {selectedPet.observations && (
              <div className="rounded px-2 py-1 text-[10.5px] mb-2" style={{ background: "#fffbeb", color: "#92611a", border: "1px solid #fde68a" }}>💭 {selectedPet.observations}</div>
            )}

            <div className="mb-2">
              <div className="text-[9.5px] font-bold uppercase text-gray-400 mb-1 flex items-center justify-between">
                Clínico <span style={{ background: "#fef3c7", color: "#92400e", padding: "0 4px", borderRadius: 3, fontSize: 8.5, fontWeight: 700 }}>CLI</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {PIPELINE_CLINICO.map(s => {
                  const on = (selectedPet.pipelineClinicoEtapa || "") === s;
                  return (
                    <button key={s} onClick={() => updateEntityEtapa("pet", selectedPet.id, "pipelineClinicoEtapa", s)} className="text-[9.5px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: on ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "#f1f5f9", color: on ? "white" : "#64748b" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[9.5px] font-bold uppercase text-gray-400 mb-1 flex items-center justify-between">
                Fisioterapia <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "0 4px", borderRadius: 3, fontSize: 8.5, fontWeight: 700 }}>FISIO</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {PIPELINE_FISIO.map(s => {
                  const on = (selectedPet.pipelineFisioEtapa || "") === s;
                  return (
                    <button key={s} onClick={() => updateEntityEtapa("pet", selectedPet.id, "pipelineFisioEtapa", s)} className="text-[9.5px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: on ? "linear-gradient(90deg,#8b5cf6,#a78bfa)" : "#f1f5f9", color: on ? "white" : "#64748b" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Bloco "Registrar Interação" */}
        {(tutor || lead) && (
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500 flex items-center gap-1.5">
                <LuMessageSquare size={11} /> Registrar interação
              </div>
              {!interacaoOpen && (
                <button onClick={() => setInteracaoOpen(true)} className="text-[10.5px] font-semibold flex items-center gap-1" style={{ color: "#009AAC" }}>
                  <LuPlus size={11} /> nova
                </button>
              )}
            </div>
            {interacaoOpen && (
              <div className="space-y-2 bg-[#f6fdfd] p-2 rounded-lg border" style={{ borderColor: "#E8DFC8" }}>
                <select value={interacaoForm.tipo} onChange={e => setInteracaoForm({ ...interacaoForm, tipo: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={{ borderColor: "#E8DFC8" }}>
                  <option value="NOTA">Nota</option>
                  <option value="WHATSAPP_ENVIADO">WhatsApp enviado</option>
                  <option value="LIGACAO">Ligação</option>
                  <option value="EMAIL_ENVIADO">Email</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="ENCAMINHAMENTO">Encaminhamento</option>
                  <option value="AGENDAMENTO">Agendamento</option>
                  <option value="PERDIDO">Perdido</option>
                </select>
                <textarea value={interacaoForm.texto} onChange={e => setInteracaoForm({ ...interacaoForm, texto: e.target.value })} placeholder="Resumo da conversa de hoje..." rows={3} className="w-full px-2 py-1 text-xs border rounded" style={{ borderColor: "#E8DFC8" }} />
                <input value={interacaoForm.proximaAcao} onChange={e => setInteracaoForm({ ...interacaoForm, proximaAcao: e.target.value })} placeholder="Próxima ação (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={{ borderColor: "#E8DFC8" }} />
                <div className="flex items-center gap-2">
                  <input type="date" value={interacaoForm.proximoFollowupAt} onChange={e => setInteracaoForm({ ...interacaoForm, proximoFollowupAt: e.target.value })} placeholder="Próximo FU" className="flex-1 px-2 py-1 text-xs border rounded" style={{ borderColor: "#E8DFC8" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setInteracaoOpen(false)} className="flex-1 px-2 py-1 text-xs border rounded" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
                  <button onClick={handleInteracao} className="flex-1 px-2 py-1 text-xs text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar na ficha</button>
                </div>
                <div className="text-[10px] text-gray-400 text-center">Vai pra Histórico de Interações do {tutor ? "tutor" : "lead"}{selectedPet ? ` + ${selectedPet.name}` : ""}</div>
              </div>
            )}
          </section>
        )}

        {/* Pet selecionado: ações + atendimentos */}
        {selectedPet && (
          <section className="px-3 py-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold tracking-wide uppercase text-gray-500">Últimos atendimentos ({atendimentos.length})</div>
              <Link href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`} target="_blank" className="text-[10.5px] font-semibold flex items-center gap-1" style={{ color: "#009AAC" }}>
                <LuPlus size={11} /> novo
              </Link>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {atendimentos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[11px] text-gray-400 text-center px-3">
                  Nenhum atendimento ainda
                  <Link href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`} target="_blank" className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#009AAC" }}>+ Novo Atendimento</Link>
                </div>
              ) : (
                atendimentos.map(a => (
                  <Link key={a.id} href={`/dashboard/erp/atendimentos/${a.id}`} target="_blank" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition border" style={{ borderColor: "#F0EBE0" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold" style={{ color: "#014D5E" }}>{TYPE_LABEL[a.type] || a.type} <span className="text-gray-400 font-normal">· {fmtDate(a.date)}</span></div>
                      <div className="text-[10.5px] text-gray-500 truncate">{a.description || a.diagnosis || a.chiefComplaint || "—"}</div>
                    </div>
                    <LuChevronRight size={11} className="text-gray-400 flex-shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
