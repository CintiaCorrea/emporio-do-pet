"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuSearch, LuPhone, LuPlus, LuExternalLink, LuShare2, LuCheckCheck,
  LuMessageSquare, LuSparkles, LuCalendar, LuFileText, LuFlaskConical, LuStickyNote,
  LuX, LuArrowUpRight,
} from "react-icons/lu";
import toast from "react-hot-toast";
import PetIcon from "@/components/profile/PetIcon";
import { speciesLabel, ageFromBirth } from "@/lib/pets/labels";

interface Contact { id: string; number: string; isPrimary?: boolean; isWhatsApp?: boolean; }
interface Tutor {
  id: string; name: string; email?: string | null;
  contacts?: Contact[];
  pets?: Pet[];
  estadoRelacionamento?: string | null;
  proximoFollowupAt?: string | null;
  resumoIa?: string | null;
  resumoIaUpdatedAt?: string | null;
  ltvCents?: number | null;
  createdAt?: string | null;
}
interface Lead {
  id: string; name?: string | null; phone?: string | null;
  pipelineComercialEtapa?: string | null;
  proximoFollowupAt?: string | null;
  resumoIa?: string | null;
  resumoIaUpdatedAt?: string | null;
  status?: string;
  source?: string | null;
  createdAt?: string | null;
}
interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  birthDate?: string | null; observations?: string | null; avatar?: string | null;
  pipelineClinicoEtapa?: string | null;
  pipelineFisioEtapa?: string | null;
}
interface HistoricoItem {
  id: string;
  type: "ATENDIMENTO" | "INTERACAO";
  date: string;
  title: string;
  subtitle: string;
  fase: "CLIENTE" | "LEAD";
  href?: string;
}
interface Staff { id: string; name: string | null; role: string; }

const TYPE_LABEL: Record<string, string> = {
  CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação",
  EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação",
  CIRURGIA: "Cirurgia", SESSAO_FISIO: "Sessão Fisio", OUTRO: "Outro",
};
const TIPO_INTERACAO: Record<string, string> = {
  NOTA: "Nota", WHATSAPP_ENVIADO: "WhatsApp", LIGACAO: "Ligação",
  EMAIL_ENVIADO: "Email", PRESENCIAL: "Presencial", ENCAMINHAMENTO: "Encaminhamento",
  RESOLVIDO: "Resolvido", AGENDAMENTO: "Agendamento",
};

const PIPELINE_COMERCIAL = ["Triagem", "Lead novo", "Qualificação", "Orçamento", "Aguardando retorno", "Agendado", "Compareceu", "Perdido"];
const PIPELINE_CLINICO = ["Diagnóstico", "Em tratamento", "Aguard. exames", "Retorno", "Alta"];
const PIPELINE_FISIO = ["Avaliação", "Pacote", "Sessão", "Alta"];

const ESTADO_RELACIONAMENTO = [
  { v: "EM_DIA", label: "Em dia", cls: "bg-green-100 text-green-700" },
  { v: "PET_EM_TRATAMENTO", label: "Pet em tratamento", cls: "bg-amber-100 text-amber-800" },
  { v: "PRECISA_DE_ATENCAO", label: "Precisa de atenção", cls: "bg-orange-100 text-orange-800" },
  { v: "A_RECUPERAR", label: "A recuperar", cls: "bg-red-100 text-red-700" },
  { v: "INATIVO", label: "Inativo há muito", cls: "bg-slate-100 text-slate-600" },
];

const sourceMap: Record<string, string> = {
  "Direto": "DIRECT", "Google Ads": "GOOGLE_ADS", "Instagram": "INSTAGRAM",
  "Facebook": "FACEBOOK", "TikTok": "TIKTOK", "Indicação": "REFERRAL",
  "Landing Page": "LANDING_PAGE", "WhatsApp": "WHATSAPP", "Email": "EMAIL", "Orgânico": "ORGANIC",
};

function onlyDigits(s: string): string { return (s || "").replace(/\D/g, ""); }
function last9(s: string): string { const d = onlyDigits(s); return d.length > 9 ? d.slice(-9) : d; }
function normalizePhone(raw: string): string {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.length === 13 && d.startsWith("55")) return d;
  if (d.length === 12 && d.startsWith("55")) return d.slice(0, 4) + "9" + d.slice(4);
  if (d.length === 11) return "55" + d;
  if (d.length === 10) return "55" + d.slice(0, 2) + "9" + d.slice(2);
  return d;
}
function formatPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length !== 13) return raw || "";
  return `55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
function fmtMonthYear(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}
function fmtRelative(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}
function initials(name?: string | null) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}
function formatLtv(cents?: number | null) {
  if (!cents || cents <= 0) return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function InboxRightPanel({ canal = "BotConversa", initialPhone }: { canal?: string; initialPhone?: string | null }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ tutors: Tutor[]; leads: Lead[] }>({ tutors: [], leads: [] });
  const [searching, setSearching] = useState(false);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadHistorico, setLeadHistorico] = useState<Lead | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [chegandoAgora, setChegandoAgora] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);

  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [cadastroAs, setCadastroAs] = useState<"LEAD" | "CLIENTE">("LEAD");
  const [cadForm, setCadForm] = useState({ nome: "", telefone: "", email: "", canalLead: "WhatsApp", origem: "Direto", petNome: "", petEspecie: "Cão", petIdade: "", notas: "" });

  const [interacaoOpen, setInteracaoOpen] = useState(false);
  const [interacaoForm, setInteracaoForm] = useState({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });

  useEffect(() => {
    fetch("/api/inbox/context/staff").then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Quando recebe initialPhone (ex: Inbox Meta selecionou uma conversa), dispara lookup automatico
  useEffect(() => {
    if (!initialPhone) return;
    const tail = last9(initialPhone);
    if (!tail || tail.length < 8) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/inbox/context/lookup?phone=${encodeURIComponent(initialPhone)}`);
        const d = await safeJson<any>(res, {});
        if (cancelled) return;
        const tutorMatch = d?.unified?.tutor || (d.tutors || [])[0];
        const leadMatch = d?.unified?.lead || (d.leads || [])[0];
        if (tutorMatch) { await selectTutor(tutorMatch); return; }
        if (leadMatch) { await selectLead(leadMatch); return; }
        // Nao encontrou nada: limpa estado e prepara busca com o phone preenchido
        setSearch(initialPhone);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone]);

  useEffect(() => {
    if (!search || search.length < 2) { setResults({ tutors: [], leads: [] }); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/inbox/context/lookup?search=${encodeURIComponent(search)}`);
      const d = await safeJson<any>(res, {});
      const ts = (d.tutors || []).slice(0, 5);
      const tutorPhonesTail = new Set<string>();
      ts.forEach((t: any) => (t.contacts || []).forEach((c: any) => tutorPhonesTail.add(last9(c.number || ""))));
      const ls = (d.leads || []).filter((l: any) => !tutorPhonesTail.has(last9(l.phone || "")));
      setResults({ tutors: ts, leads: ls });
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (tutor || lead || search) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/leads?source=WHATSAPP&limit=15`);
        const d = await safeJson<any>(res, {});
        const arr = Array.isArray(d) ? d : (d.leads || d.data || []);
        const cutoff = Date.now() - 30 * 60 * 1000;
        const recent = arr.filter((l: any) => new Date(l.firstSeenAt || l.createdAt || 0).getTime() >= cutoff);
        if (!cancelled) setChegandoAgora(recent);
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tutor, lead, search]);

  async function carregarHistorico(tutorId?: string, leadId?: string, leadHistoricoId?: string) {
    const items: HistoricoItem[] = [];
    try {
      if (tutorId) {
        const r = await fetch(`/api/atendimentos?tutorId=${tutorId}&limit=20`);
        const d = await safeJson<any>(r, {});
        const arr = Array.isArray(d) ? d : (d.appointments || d.atendimentos || []);
        arr.forEach((a: any) => items.push({
          id: `at-${a.id}`,
          type: "ATENDIMENTO",
          date: a.date,
          title: `${TYPE_LABEL[a.type] || a.type}${a.petName ? ` · ${a.petName}` : ""} · ${fmtDate(a.date)}`,
          subtitle: [a.diagnosis, a.description, a.chiefComplaint].filter(Boolean).join(" · ") || (a.value ? `R$ ${a.value}` : "—"),
          fase: "CLIENTE",
          href: `/dashboard/erp/atendimentos/${a.id}`,
        }));
      }
      if (tutorId) {
        const r = await fetch(`/api/interacoes?tutorId=${tutorId}&limit=20`);
        const d = await safeJson<any>(r, {});
        const arr = Array.isArray(d) ? d : (d.interacoes || d.data || []);
        arr.forEach((i: any) => items.push({
          id: `it-${i.id}`,
          type: "INTERACAO",
          date: i.createdAt || i.date,
          title: `${TIPO_INTERACAO[i.tipo] || i.tipo} · ${fmtDate(i.createdAt || i.date)}`,
          subtitle: (i.texto || "").slice(0, 90) || "—",
          fase: "CLIENTE",
        }));
      }
      const idLeadParaBuscar = leadId || leadHistoricoId;
      if (idLeadParaBuscar) {
        const r = await fetch(`/api/interacoes?leadId=${idLeadParaBuscar}&limit=20`);
        const d = await safeJson<any>(r, {});
        const arr = Array.isArray(d) ? d : (d.interacoes || d.data || []);
        arr.forEach((i: any) => items.push({
          id: `il-${i.id}`,
          type: "INTERACAO",
          date: i.createdAt || i.date,
          title: `${TIPO_INTERACAO[i.tipo] || i.tipo} · ${fmtDate(i.createdAt || i.date)}`,
          subtitle: (i.texto || "").slice(0, 90) || "—",
          fase: "LEAD",
        }));
      }
    } catch { /* ignore */ }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 10);
  }

  async function selectTutor(t: Tutor) {
    setTutor(t);
    setLead(null);
    setResults({ tutors: [], leads: [] });
    setSearch(t.name);

    const resP = await fetch(`/api/tutors/${t.id}/pets`);
    const dP = await safeJson<any>(resP, []);
    const petsList = Array.isArray(dP) ? dP : (dP.pets || []);
    setPets(petsList);
    setSelectedPet(petsList[0] || null);

    let leadHist: Lead | null = null;
    const tutorPhone = (t.contacts || [])[0]?.number;
    if (tutorPhone) {
      const tail = last9(tutorPhone);
      const resL = await fetch(`/api/leads?search=${encodeURIComponent(tail)}&limit=3`);
      const dL = await safeJson<any>(resL, {});
      const arrL = Array.isArray(dL) ? dL : (dL.leads || []);
      if (arrL[0]) leadHist = arrL[0];
    }
    setLeadHistorico(leadHist);

    const hist = await carregarHistorico(t.id, undefined, leadHist?.id);
    setHistorico(hist);
  }

  async function selectLead(l: Lead) {
    setResults({ tutors: [], leads: [] });
    setSearch(l.name || l.phone || "");

    if (l.phone) {
      const tail = last9(l.phone);
      const resT = await fetch(`/api/tutors?search=${encodeURIComponent(tail)}&limit=3`);
      const dT = await safeJson<any>(resT, {});
      const arr = Array.isArray(dT) ? dT : (dT.tutors || dT.data || []);
      if (arr[0]) {
        await selectTutor(arr[0]);
        return;
      }
    }
    setLead(l);
    setTutor(null);
    setLeadHistorico(null);
    setPets([]);
    setSelectedPet(null);
    const hist = await carregarHistorico(undefined, l.id, undefined);
    setHistorico(hist);
  }

  function reset() {
    setSearch(""); setTutor(null); setLead(null); setLeadHistorico(null);
    setResults({ tutors: [], leads: [] }); setPets([]); setSelectedPet(null);
    setHistorico([]);
    setCadastroOpen(false); setInteracaoOpen(false); setForwardOpen(false);
  }

  async function updateLeadEtapa(value: string) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineComercialEtapa: value }) });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    toast.success("Etapa atualizada");
    setLead({ ...lead, pipelineComercialEtapa: value });
  }
  async function updatePetEtapa(field: "pipelineClinicoEtapa" | "pipelineFisioEtapa", value: string) {
    if (!selectedPet) return;
    const res = await fetch(`/api/pets/${selectedPet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    toast.success("Etapa atualizada");
    const updated = { ...selectedPet, [field]: value } as Pet;
    setSelectedPet(updated);
    setPets(pets.map(p => p.id === selectedPet.id ? updated : p));
  }
  async function updateTutorEstado(value: string) {
    if (!tutor) return;
    const res = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estadoRelacionamento: value }) });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    toast.success("Estado atualizado");
    setTutor({ ...tutor, estadoRelacionamento: value });
  }

  async function handleForward(userId: string, userName: string) {
    const res = await fetch("/api/inbox/context/forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor?.id, leadId: lead?.id, toUserId: userId }) });
    if (!res.ok) { toast.error("Erro ao encaminhar"); return; }
    toast.success(`Encaminhado para ${userName}`);
    setForwardOpen(false);
    reset();
  }
  async function handleResolve() {
    if (!confirm("Marcar essa conversa como resolvida?")) return;
    const res = await fetch("/api/inbox/context/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor?.id, leadId: lead?.id }) });
    if (!res.ok) { toast.error("Erro ao resolver"); return; }
    toast.success("Resolvido");
    reset();
  }
  async function handleConverter() {
    if (!lead) return;
    if (!confirm(`Converter ${lead.name || "esse lead"} em cliente?`)) return;
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
    if (!res.ok) { toast.error("Erro ao converter"); return; }
    const data = await res.json();
    toast.success(data.linked ? "Vinculado ao cliente existente" : "Cliente criado");
    if (data.tutorId) {
      const rT = await fetch(`/api/tutors/${data.tutorId}`);
      const t = await safeJson<any>(rT, null);
      if (t) await selectTutor(t);
    }
  }

  async function handleCadastro() {
    if (!cadForm.nome || !cadForm.telefone) { toast.error("Nome e telefone obrigatórios"); return; }
    const endpoint = cadastroAs === "LEAD" ? "/api/leads" : "/api/tutors";
    const cleanPhone = normalizePhone(cadForm.telefone) || cadForm.telefone;
    const emailFallback = `contato+${cleanPhone}@emporiodopet.crm`;
    const payload: any = cadastroAs === "LEAD"
      ? {
          name: cadForm.nome, phone: cleanPhone,
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
      const msg = Array.isArray(err?.message) ? err.message.join(", ") : (err?.message || `HTTP ${res.status}`);
      if (res.status === 409 || /duplicate|unique|already|já exist/i.test(msg)) {
        toast.error("Já existe — buscando o existente...");
        const r = await fetch(`/api/inbox/context/lookup?phone=${encodeURIComponent(cleanPhone)}`);
        const d = await r.json().catch(() => null);
        if (d?.unified?.tutor) { setCadastroOpen(false); await selectTutor(d.unified.tutor); return; }
        if (d?.unified?.lead) { setCadastroOpen(false); await selectLead(d.unified.lead); return; }
      }
      toast.error(`Erro: ${msg.slice(0, 120)}`);
      return;
    }
    const created = await res.json();
    if (cadastroAs === "CLIENTE" && cadForm.petNome) {
      const petPayload: any = { name: cadForm.petNome, species: cadForm.petEspecie === "Cão" ? "CANINE" : cadForm.petEspecie === "Gato" ? "FELINE" : "OTHER", tutorId: created.id, status: "ACTIVE" };
      await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(petPayload) }).catch(() => null);
    }
    toast.success(`${cadastroAs === "LEAD" ? "Lead" : "Cliente"} cadastrado`);
    setCadastroOpen(false);
    if (cadastroAs === "CLIENTE") await selectTutor(created);
    else await selectLead(created);
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
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Interação registrada");
    setInteracaoOpen(false);
    setInteracaoForm({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });
    const hist = await carregarHistorico(tutor?.id, lead?.id, leadHistorico?.id);
    setHistorico(hist);
  }

  const resumo = lead?.resumoIa || tutor?.resumoIa || leadHistorico?.resumoIa;
  const resumoWhen = lead?.resumoIaUpdatedAt || tutor?.resumoIaUpdatedAt || leadHistorico?.resumoIaUpdatedAt;
  const tutorPrimaryPhone = (tutor?.contacts || []).find(c => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || "";
  const ltv = formatLtv(tutor?.ltvCents);
  const clienteDesde = tutor?.createdAt ? fmtMonthYear(tutor.createdAt) : null;
  const numAtendimentos = historico.filter(h => h.type === "ATENDIMENTO").length;
  const SECTION = "px-3 py-2.5 border-b";
  const SECTION_STYLE: React.CSSProperties = { borderColor: "#E8DFC8" };
  const NUM = "inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold mr-1.5";
  const LBL = "text-[10px] font-bold tracking-wide text-gray-500 uppercase mb-1.5 flex items-center justify-between";
  const LINK = "text-[10.5px] font-semibold normal-case cursor-pointer";

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 pt-3 pb-2 border-b flex-shrink-0" style={SECTION_STYLE}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold tracking-wide text-gray-500 uppercase">Contexto da conversa</div>
          <div className="flex items-center gap-1.5">
            {(tutor || lead) && (
              <>
                <div className="relative">
                  <button onClick={() => setForwardOpen(o => !o)} className="text-[10.5px] font-semibold flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50" style={{ borderColor: "#E8DFC8", color: "#475569" }}>
                    <LuShare2 size={11} /> Encaminhar
                  </button>
                  {forwardOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-40 w-44 max-h-60 overflow-y-auto" style={{ borderColor: "#E8DFC8" }}>
                      {staff.length === 0 ? (
                        <div className="px-3 py-2 text-[10.5px] text-gray-400">Carregando...</div>
                      ) : staff.map(s => (
                        <button key={s.id} onClick={() => handleForward(s.id, s.name || "")} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                          <div className="font-medium" style={{ color: "#014D5E" }}>{s.name || "Sem nome"}</div>
                          <div className="text-[9.5px] text-gray-400 uppercase">{s.role}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleResolve} className="text-[10.5px] font-semibold flex items-center gap-1 px-2 py-1 rounded text-white" style={{ background: "#009AAC" }}>
                  <LuCheckCheck size={11} /> Resolver
                </button>
                <button onClick={reset} className="text-gray-400 hover:text-red-500" title="Fechar"><LuX size={13} /></button>
              </>
            )}
            {!tutor && !lead && !cadastroOpen && (
              <button onClick={() => { setCadastroOpen(true); setCadastroAs("LEAD"); setCadForm({ ...cadForm, telefone: onlyDigits(search) || search, nome: "" }); }} className="text-[10.5px] font-semibold flex items-center gap-1" style={{ color: "#009AAC" }}>
                <LuPlus size={11} /> cadastrar
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); if (!e.target.value) reset(); }} placeholder="Telefone, nome ou email..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={SECTION_STYLE} />
          {(results.tutors.length > 0 || results.leads.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto" style={SECTION_STYLE}>
              {results.tutors.map(t => {
                const phone = t.contacts?.find(c => c.isPrimary)?.number || t.contacts?.[0]?.number || "";
                return (
                  <button key={t.id} onClick={() => selectTutor(t)} className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                    <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#014D5E" }}>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Cliente</span>
                      {t.name}
                    </div>
                    {phone && <div className="text-[11px] text-gray-500 mt-0.5"><LuPhone size={9} className="inline" /> {formatPhone(phone)}</div>}
                  </button>
                );
              })}
              {results.leads.map(l => (
                <button key={l.id} onClick={() => selectLead(l)} className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#014D5E" }}>
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Lead</span>
                    {l.name || "Sem nome"}
                  </div>
                  {l.phone && <div className="text-[11px] text-gray-500 mt-0.5"><LuPhone size={9} className="inline" /> {formatPhone(l.phone)}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {cadastroOpen && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10.5px] font-bold uppercase text-gray-500">Novo cadastro</div>
              <button onClick={() => setCadastroOpen(false)} className="text-gray-400"><LuX size={12} /></button>
            </div>
            <div className="flex gap-1 mb-2">
              <button onClick={() => setCadastroAs("LEAD")} className={`flex-1 px-2 py-1 text-[11px] rounded ${cadastroAs === "LEAD" ? "text-white" : "border text-gray-600"}`} style={cadastroAs === "LEAD" ? { background: "#009AAC" } : { borderColor: "#E8DFC8" }}>Lead</button>
              <button onClick={() => setCadastroAs("CLIENTE")} className={`flex-1 px-2 py-1 text-[11px] rounded ${cadastroAs === "CLIENTE" ? "text-white" : "border text-gray-600"}`} style={cadastroAs === "CLIENTE" ? { background: "#009AAC" } : { borderColor: "#E8DFC8" }}>Cliente</button>
            </div>
            <div className="space-y-1.5">
              <input value={cadForm.nome} onChange={e => setCadForm({ ...cadForm, nome: e.target.value })} placeholder="Nome *" className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
              <input value={cadForm.telefone} onChange={e => setCadForm({ ...cadForm, telefone: e.target.value })} placeholder="Telefone *" className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
              <input value={cadForm.email} onChange={e => setCadForm({ ...cadForm, email: e.target.value })} placeholder="Email (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
              <select value={cadForm.origem} onChange={e => setCadForm({ ...cadForm, origem: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE}>
                {Object.keys(sourceMap).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {cadastroAs === "CLIENTE" && (
                <>
                  <input value={cadForm.petNome} onChange={e => setCadForm({ ...cadForm, petNome: e.target.value })} placeholder="Pet (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
                  <select value={cadForm.petEspecie} onChange={e => setCadForm({ ...cadForm, petEspecie: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE}>
                    <option>Cão</option><option>Gato</option><option>Outro</option>
                  </select>
                </>
              )}
              <button onClick={handleCadastro} className="w-full px-2 py-1.5 text-xs text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </section>
        )}

        {!tutor && !lead && !search && !cadastroOpen && chegandoAgora.length > 0 && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}><span>📬 Chegando agora · últimos 30min</span></div>
            <div className="space-y-1">
              {chegandoAgora.map(l => (
                <button key={l.id} onClick={() => selectLead(l)} className="w-full text-left px-2 py-1.5 rounded border hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[11.5px] font-semibold" style={{ color: "#014D5E" }}>{l.name || "Sem nome"}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-between">
                    <span>{formatPhone(l.phone || "") || "—"}</span>
                    <span className="text-[9.5px]">{fmtRelative(l.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!tutor && !lead && !search && !cadastroOpen && chegandoAgora.length === 0 && (
          <div className="px-3 py-6 text-center text-[11.5px] text-gray-400 leading-relaxed">
            Veja o telefone no BotConversa, cole na busca pra puxar contexto do CRM e registrar interação na ficha.
          </div>
        )}

        {(tutor || lead) && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}>
              <span><span className={NUM}>1</span><LuSparkles size={11} className="inline -mt-0.5 mr-1" />Resumo da conversa (IA){resumoWhen && <span className="font-normal text-gray-400 normal-case ml-1 text-[9.5px]">{fmtRelative(resumoWhen)}</span>}</span>
            </div>
            {resumo ? (
              <div className="rounded-lg p-2.5 text-[11.5px] leading-relaxed" style={{ background: "linear-gradient(135deg,#f0fdfa,#e0f4f6)", border: "1px solid #99e9d8", color: "#0c4a6e" }}>
                <div className="text-[9.5px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: "#0e7490" }}>
                  <span className="px-1 rounded text-white" style={{ background: "#14b8a6" }}>IA</span> via BotConversa
                </div>
                {resumo}
              </div>
            ) : (
              <div className="rounded-lg p-2.5 text-[11px] text-center italic" style={{ background: "#fafafa", border: "1px dashed #E8DFC8", color: "#94a3b8" }}>
                Sem resumo ainda · ↻ atualizar do BotConversa
              </div>
            )}
          </section>
        )}

        {tutor && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}>
              <span><span className={NUM}>2</span>Cliente <span className="ml-1 text-[8.5px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold normal-case">CLIENTE</span></span>
              <Link href={`/dashboard/erp/tutores/${tutor.id}`} target="_blank" className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg,#009AAC,#014D5E)" }}>{initials(tutor.name)}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: "#014D5E" }}>{tutor.name}</div>
                <div className="text-[10.5px] text-gray-500 leading-snug">
                  {tutorPrimaryPhone && (<><LuPhone size={9} className="inline -mt-0.5" /> {formatPhone(tutorPrimaryPhone)}</>)}
                  {ltv && <> · LTV {ltv}</>}
                  <br />
                  🐾 {pets.length} pet{pets.length !== 1 ? "s" : ""}
                  {numAtendimentos > 0 && <> · {numAtendimentos} atendimento{numAtendimentos !== 1 ? "s" : ""}</>}
                  {clienteDesde && <> · cliente desde {clienteDesde}</>}
                </div>
              </div>
            </div>
            <div className="text-[9.5px] font-bold uppercase text-gray-400 mt-2 mb-1">Estado de relacionamento</div>
            <div className="flex flex-wrap gap-1">
              {ESTADO_RELACIONAMENTO.map(e => {
                const active = tutor.estadoRelacionamento === e.v;
                return (
                  <button key={e.v} onClick={() => updateTutorEstado(e.v)} className={`text-[9.5px] px-2 py-0.5 rounded-full font-medium ${active ? "ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"} ${e.cls}`} style={active ? { boxShadow: "0 0 0 1.5px #009AAC" } : {}}>
                    {e.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {!tutor && lead && (
          <section className={SECTION} style={{ ...SECTION_STYLE, background: "#fef9f1" }}>
            <div className={LBL}>
              <span><span className={NUM}>2</span>Lead <span className="ml-1 text-[8.5px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold normal-case">LEAD</span></span>
              <Link href={`/dashboard/erp/leads/${lead.id}`} target="_blank" className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>{initials(lead.name || "?")}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: "#014D5E" }}>{lead.name || "Sem nome"}</div>
                <div className="text-[10.5px] text-gray-500 leading-snug">
                  {lead.phone && (<><LuPhone size={9} className="inline -mt-0.5" /> {formatPhone(lead.phone)}</>)}
                  {lead.source && <> · via {lead.source}</>}
                  {lead.createdAt && <> · {fmtRelative(lead.createdAt)}</>}
                </div>
              </div>
            </div>
            <div className="text-[9.5px] font-bold uppercase text-gray-400 mt-2 mb-1">Pipeline comercial</div>
            <div className="flex flex-wrap gap-1">
              {PIPELINE_COMERCIAL.map(e => {
                const active = lead.pipelineComercialEtapa === e;
                return (
                  <button key={e} onClick={() => updateLeadEtapa(e)} className="text-[9.5px] px-2 py-0.5 rounded-full font-medium" style={active ? { background: "linear-gradient(90deg,#009AAC,#00B4C4)", color: "white" } : { background: "#f1f5f9", color: "#64748b" }}>
                    {e}
                  </button>
                );
              })}
            </div>
            {lead.status !== "CONVERTED" && (
              <button onClick={handleConverter} className="mt-2 w-full text-[10.5px] py-1.5 border rounded font-semibold hover:bg-white flex items-center justify-center gap-1" style={{ borderColor: "#009AAC", color: "#009AAC" }}>
                <LuArrowUpRight size={12} /> Converter em cliente
              </button>
            )}
          </section>
        )}

        {tutor && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}>
              <span><span className={NUM}>3</span>Pets {pets.length > 0 && `(${pets.length})`}{pets.length > 1 ? " · clique pra selecionar" : ""}</span>
              <Link href={`/dashboard/erp/tutores/${tutor.id}/pets/novo`} target="_blank" className={LINK} style={{ color: "#009AAC" }}><LuPlus size={10} className="inline" /> cadastrar</Link>
            </div>
            {pets.length > 0 ? (
              <div className="space-y-1">
                {pets.map(p => {
                  const active = selectedPet?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedPet(p)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left ${active ? "" : "hover:bg-gray-50"}`} style={active ? { background: "#e0f4f6", borderColor: "#009AAC" } : { borderColor: "#F0EBE0" }}>
                      <PetIcon species={p.species} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-semibold truncate" style={{ color: "#014D5E" }}>{p.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}{p.birthDate ? ` · ${ageFromBirth(p.birthDate)}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg p-3 text-center text-[11px] text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                Nenhum pet cadastrado ainda<br />
                <Link href={`/dashboard/erp/tutores/${tutor.id}/pets/novo`} target="_blank" className="font-semibold" style={{ color: "#009AAC" }}>+ Cadastrar pet</Link>
              </div>
            )}
          </section>
        )}

        {tutor && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}><span><span className={NUM}>4</span>Pipelines{selectedPet ? ` da ${selectedPet.name}` : " do Pet"}</span></div>
            {selectedPet ? (
              <>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-bold uppercase text-gray-400">Clínico</span>
                    <span className="text-[8.5px] font-bold px-1.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>CLI</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PIPELINE_CLINICO.map(e => {
                      const active = selectedPet.pipelineClinicoEtapa === e;
                      return (
                        <button key={e} onClick={() => updatePetEtapa("pipelineClinicoEtapa", e)} className="text-[9.5px] px-2 py-0.5 rounded-full font-medium" style={active ? { background: "linear-gradient(90deg,#f59e0b,#fbbf24)", color: "white" } : { background: "#f1f5f9", color: "#64748b" }}>
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-bold uppercase text-gray-400">Fisioterapia</span>
                    <span className="text-[8.5px] font-bold px-1.5 rounded" style={{ background: "#ede9fe", color: "#5b21b6" }}>FISIO</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PIPELINE_FISIO.map(e => {
                      const active = selectedPet.pipelineFisioEtapa === e;
                      return (
                        <button key={e} onClick={() => updatePetEtapa("pipelineFisioEtapa", e)} className="text-[9.5px] px-2 py-0.5 rounded-full font-medium" style={active ? { background: "linear-gradient(90deg,#7c3aed,#8b5cf6)", color: "white" } : { background: "#f1f5f9", color: "#64748b" }}>
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[9.5px] font-bold uppercase text-gray-500 mb-1.5">Ações na {selectedPet.name}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => { setInteracaoOpen(true); setInteracaoForm({ ...interacaoForm, tipo: "NOTA" }); }} className="px-2 py-1.5 rounded text-[10.5px] border flex items-center justify-center gap-1 text-gray-600 hover:text-[#009AAC]" style={SECTION_STYLE}><LuStickyNote size={11} /> Nota</button>
                    <Link href={`/dashboard/erp/agendamentos/novo?tutorId=${tutor.id}&petId=${selectedPet.id}`} target="_blank" className="px-2 py-1.5 rounded text-[10.5px] border flex items-center justify-center gap-1 text-gray-600 hover:text-[#009AAC]" style={SECTION_STYLE}><LuCalendar size={11} /> Agendar</Link>
                    <Link href={`/dashboard/erp/pets/${selectedPet.id}`} target="_blank" className="px-2 py-1.5 rounded text-[10.5px] border flex items-center justify-center gap-1 text-gray-600 hover:text-[#009AAC]" style={SECTION_STYLE}><LuFileText size={11} /> Prontuário</Link>
                    <Link href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo?tipo=EXAME`} target="_blank" className="px-2 py-1.5 rounded text-[10.5px] border flex items-center justify-center gap-1 text-gray-600 hover:text-[#009AAC]" style={SECTION_STYLE}><LuFlaskConical size={11} /> Exame</Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg p-3 text-center text-[11px] italic text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                {pets.length > 0 ? "Selecione um pet pra ver pipelines" : "Cadastre um pet primeiro"}
              </div>
            )}
          </section>
        )}

        {(tutor || lead) && (
          <section className={SECTION} style={SECTION_STYLE}>
            <div className={LBL}>
              <span><span className={NUM}>5</span><LuMessageSquare size={11} className="inline -mt-0.5 mr-1" />Registrar interação</span>
              {!interacaoOpen && (<button onClick={() => setInteracaoOpen(true)} className={LINK} style={{ color: "#009AAC" }}><LuPlus size={10} className="inline" /> nova</button>)}
            </div>
            {interacaoOpen && (
              <div className="space-y-2 rounded-lg p-2 border" style={{ background: "#f6fdfd", borderColor: "#E8DFC8" }}>
                <select value={interacaoForm.tipo} onChange={e => setInteracaoForm({ ...interacaoForm, tipo: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE}>
                  <option value="NOTA">Nota</option>
                  <option value="WHATSAPP_ENVIADO">WhatsApp enviado</option>
                  <option value="LIGACAO">Ligação</option>
                  <option value="EMAIL_ENVIADO">Email</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="ENCAMINHAMENTO">Encaminhamento</option>
                </select>
                <textarea value={interacaoForm.texto} onChange={e => setInteracaoForm({ ...interacaoForm, texto: e.target.value })} placeholder="Resumo da conversa de hoje..." rows={3} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
                <input value={interacaoForm.proximaAcao} onChange={e => setInteracaoForm({ ...interacaoForm, proximaAcao: e.target.value })} placeholder="Próxima ação (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
                <input type="date" value={interacaoForm.proximoFollowupAt} onChange={e => setInteracaoForm({ ...interacaoForm, proximoFollowupAt: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
                <div className="flex gap-2">
                  <button onClick={() => setInteracaoOpen(false)} className="flex-1 px-2 py-1 text-xs border rounded" style={SECTION_STYLE}>Cancelar</button>
                  <button onClick={handleInteracao} className="flex-1 px-2 py-1 text-xs text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar na ficha</button>
                </div>
              </div>
            )}
          </section>
        )}

        {(tutor || lead) && (
          <section className="px-3 py-2.5">
            <div className={LBL}>
              <span><span className={NUM}>6</span>Últimos atendimentos{historico.length > 0 && ` (${historico.length})`}</span>
              {tutor && selectedPet && (
                <Link href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`} target="_blank" className={LINK} style={{ color: "#009AAC" }}><LuPlus size={10} className="inline" /> novo</Link>
              )}
            </div>
            {historico.length === 0 ? (
              <div className="rounded-lg p-3 text-center text-[11px] italic text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                Nenhum atendimento ainda
              </div>
            ) : (
              <div className="space-y-1">
                {historico.map(h => {
                  const Tag: any = h.href ? Link : "div";
                  const tagProps: any = h.href ? { href: h.href, target: "_blank" } : {};
                  return (
                    <Tag key={h.id} {...tagProps} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition border" style={{ borderColor: "#F0EBE0" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold flex items-center gap-1 flex-wrap" style={{ color: "#014D5E" }}>
                          {h.title}
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase ${h.fase === "LEAD" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{h.fase}</span>
                        </div>
                        <div className="text-[10.5px] text-gray-500 truncate">{h.subtitle}</div>
                      </div>
                    </Tag>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
