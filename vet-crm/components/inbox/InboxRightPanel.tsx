"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LuSearch, LuPhone, LuPlus, LuExternalLink, LuShare2, LuCheckCheck,
  LuMessageSquare, LuSparkles, LuCalendar, LuFileText, LuFlaskConical, LuStickyNote,
  LuX, LuArrowUpRight, LuInbox, LuMessageCircle, LuRefreshCcw,
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
  id: string; name?: string | null; phone?: string | null; email?: string | null;
  pipelineComercialEtapa?: string | null;
  proximoFollowupAt?: string | null;
  resumoIa?: string | null;
  resumoIaUpdatedAt?: string | null;
  status?: string;
  source?: string | null;
  createdAt?: string | null;
  customFields?: any;
  notes?: string | null;
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
interface IncomingItem {
  id: string;
  kind: "LEAD" | "CLIENTE";
  name: string;
  phone: string;
  petName?: string;
  petSpecies?: string;
  servico?: string;
  createdAt: string;
  raw: Lead | Tutor;
}

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

// Extrai serviço solicitado do texto do resumo IA (parsing simples por palavras-chave).
const SERVICO_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /banho\s*e\s*tosa|banho|tosa/i, label: "Banho e tosa" },
  { pattern: /retorno|consulta\s*de\s*retorno/i, label: "Consulta de retorno" },
  { pattern: /vacina[çc][ãa]o|vacina/i, label: "Vacinação" },
  { pattern: /fisio(terapia)?|reabilita[çc][ãa]o/i, label: "Fisioterapia" },
  { pattern: /castra[çc][ãa]o|esteriliza[çc][ãa]o/i, label: "Castração" },
  { pattern: /exame|sangue|raio-?x|ultrassom/i, label: "Exame" },
  { pattern: /emerg[êe]ncia|urg[êe]ncia/i, label: "Emergência" },
  { pattern: /consulta(?!.*retorno)/i, label: "Consulta" },
  { pattern: /interna[çc][ãa]o|interna/i, label: "Internação" },
  { pattern: /cirurgia/i, label: "Cirurgia" },
];
function extrairServico(resumo?: string | null, customField?: string | null): string | null {
  if (customField && customField.trim()) return customField.trim();
  if (!resumo) return null;
  for (const { pattern, label } of SERVICO_KEYWORDS) {
    if (pattern.test(resumo)) return label;
  }
  return null;
}

type Tab = "inbox" | "contexto";

export default function InboxRightPanel({ canal = "BotConversa", initialPhone }: { canal?: string; initialPhone?: string | null }) {
  // ===== Tab control =====
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  // ===== Caixa de Entrada =====
  const [incoming, setIncoming] = useState<IncomingItem[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [incomingLimit, setIncomingLimit] = useState(20);

  // ===== Busca / contexto =====
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ tutors: Tutor[]; leads: Lead[] }>({ tutors: [], leads: [] });
  const [searching, setSearching] = useState(false);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadHistorico, setLeadHistorico] = useState<Lead | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);

  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [cadastroAs, setCadastroAs] = useState<"LEAD" | "CLIENTE">("LEAD");
  const [cadForm, setCadForm] = useState({ nome: "", telefone: "", email: "", canalLead: "WhatsApp", origem: "Direto", petNome: "", petEspecie: "Cão", petIdade: "", notas: "" });

  const [interacaoOpen, setInteracaoOpen] = useState(false);
  const [interacaoForm, setInteracaoForm] = useState({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });

  // Inline edit
  const [editingResumo, setEditingResumo] = useState(false);
  const [resumoDraft, setResumoDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [editingInteracaoId, setEditingInteracaoId] = useState<string | null>(null);
  const [interacaoDraft, setInteracaoDraft] = useState("");

  // Pet de interesse no Lead (novo)
  const [leadPetNome, setLeadPetNome] = useState("");
  const [leadPetEspecie, setLeadPetEspecie] = useState("Cão");

  useEffect(() => {
    fetch("/api/inbox/context/staff").then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // === Caixa de Entrada: carrega Leads recentes não-resolvidos + Tutores com conversa BC ativa ===
  async function loadIncoming() {
    setLoadingIncoming(true);
    try {
      const items: IncomingItem[] = [];
      // Leads recentes (não-convertidos, não-resolvidos)
      const rL = await fetch(`/api/leads?source=WHATSAPP&limit=${incomingLimit}`);
      const dL = await safeJson<any>(rL, {});
      const arrL = Array.isArray(dL) ? dL : (dL.leads || dL.data || []);
      arrL.forEach((l: any) => {
        if (l.status === "CONVERTED" || l.status === "RESOLVED" || l.status === "LOST") return;
        const cf = l.customFields || {};
        const servico = extrairServico(l.resumoIa, cf.servicoInteresse || cf.servico_interesse);
        items.push({
          id: `L-${l.id}`,
          kind: "LEAD",
          name: l.name || "Sem nome",
          phone: l.phone || "",
          petName: cf.petName || cf.pet_name || cf.petNome,
          petSpecies: cf.especie || cf.species,
          servico: servico || undefined,
          createdAt: l.firstSeenAt || l.createdAt || new Date().toISOString(),
          raw: l,
        });
      });
      // Tutores que receberam mensagem recente (via WhatsApp conversations abertas)
      try {
        const rC = await fetch(`/api/whatsapp/conversations?status=open&limit=${incomingLimit}`);
        const dC = await safeJson<any>(rC, {});
        const arrC = Array.isArray(dC) ? dC : (dC.conversations || dC.data || []);
        for (const c of arrC) {
          if (!c.tutor || !c.tutor.id) continue;
          const phone = c.contactNumber || (c.tutor.contacts || [])[0]?.number || "";
          items.push({
            id: `T-${c.tutor.id}`,
            kind: "CLIENTE",
            name: c.tutor.name || "Sem nome",
            phone,
            createdAt: c.lastMessageAt || c.createdAt || new Date().toISOString(),
            raw: c.tutor,
          });
        }
      } catch { /* ignora se endpoint não existir ainda */ }
      // Ordena por data desc, dedupe por phone (último 9)
      const seenPhones = new Set<string>();
      const dedupado = items
        .filter(it => {
          const t = last9(it.phone);
          if (!t) return true;
          if (seenPhones.has(t)) return false;
          seenPhones.add(t); return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncoming(dedupado);
    } catch { /* ignore */ }
    setLoadingIncoming(false);
  }

  useEffect(() => {
    loadIncoming();
    const id = setInterval(loadIncoming, 30000); // refetch a cada 30s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingLimit]);

  // === Busca por texto/telefone ===
  useEffect(() => {
    if (!search || search.length < 2) { setResults({ tutors: [], leads: [] }); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/inbox/context/lookup?search=${encodeURIComponent(search)}`);
      const d = await safeJson<any>(res, {});
      const seenTutorPhones = new Set<string>();
      const ts = ((d.tutors || []) as any[]).filter(t => {
        const phones = (t.contacts || []).map((c: any) => last9(c.number || "")).filter((p: string) => p && p.length >= 8);
        const main = phones[0];
        if (!main) return true;
        if (seenTutorPhones.has(main)) return false;
        seenTutorPhones.add(main);
        return true;
      }).slice(0, 5);
      const seenLeadPhones = new Set<string>();
      const ls = ((d.leads || []) as any[]).filter(l => {
        const tail = last9(l.phone || "");
        if (!tail || tail.length < 8) return true;
        if (seenTutorPhones.has(tail)) return false;
        if (seenLeadPhones.has(tail)) return false;
        seenLeadPhones.add(tail);
        return true;
      });
      setResults({ tutors: ts, leads: ls });
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // initialPhone (Inbox Meta passa o phone do contato selecionado)
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
        setSearch(initialPhone);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone]);

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
    setActiveTab("contexto"); // ABRE aba contexto

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
    setActiveTab("contexto"); // ABRE aba contexto

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
    // preenche pet de interesse com customFields se existirem
    const cf = (l.customFields || {}) as any;
    setLeadPetNome(cf.petName || cf.pet_name || cf.petNome || "");
    setLeadPetEspecie(cf.especie || cf.species || "Cão");
    const hist = await carregarHistorico(undefined, l.id, undefined);
    setHistorico(hist);
  }

  async function selectFromIncoming(item: IncomingItem) {
    if (item.kind === "LEAD") {
      await selectLead(item.raw as Lead);
    } else {
      await selectTutor(item.raw as Tutor);
    }
  }

  function reset() {
    setSearch(""); setTutor(null); setLead(null); setLeadHistorico(null);
    setResults({ tutors: [], leads: [] }); setPets([]); setSelectedPet(null);
    setHistorico([]);
    setCadastroOpen(false); setInteracaoOpen(false); setForwardOpen(false);
    setActiveTab("inbox"); // volta pra Caixa
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
    loadIncoming();
    reset();
  }
  async function handleResolve() {
    if (!confirm("Marcar essa conversa como resolvida?")) return;
    const res = await fetch("/api/inbox/context/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor?.id, leadId: lead?.id }) });
    if (!res.ok) { toast.error("Erro ao resolver"); return; }
    toast.success("Resolvido");
    loadIncoming();
    reset();
  }
  async function handleConverter() {
    if (!lead) return;
    if (!confirm(`Converter ${lead.name || "esse lead"} em cliente?`)) return;
    // Inclui pet de interesse no payload da conversão
    const body: any = {};
    if (leadPetNome) {
      body.petName = leadPetNome;
      body.petEspecie = leadPetEspecie;
    }
    const res = await fetch(`/api/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error("Erro ao converter"); return; }
    const data = await res.json();
    toast.success(data.linked ? "Vinculado ao cliente existente" : "Cliente criado");
    if (data.tutorId) {
      const rT = await fetch(`/api/tutors/${data.tutorId}`);
      const t = await safeJson<any>(rT, null);
      if (t) await selectTutor(t);
    }
  }
  // NOVO: desconverter cliente em lead (toggle Lead/Cliente)
  async function handleDesconverter() {
    if (!tutor) return;
    if (!confirm(`Reclassificar ${tutor.name} como Lead? O cadastro permanece, mas vai aparecer como Lead nas listagens.`)) return;
    const res = await fetch(`/api/tutors/${tutor.id}/reclassify-as-lead`, { method: "POST" });
    if (!res.ok) { toast.error("Erro ao reclassificar (endpoint pode não existir ainda)"); return; }
    toast.success("Reclassificado como Lead");
    reset();
    loadIncoming();
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

  async function saveResumo() {
    const txt = resumoDraft.trim();
    if (lead) {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() }) });
      if (!r.ok) { toast.error("Erro ao salvar resumo"); return; }
      setLead({ ...lead, resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() });
    } else if (tutor) {
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() }) });
      if (!r.ok) { toast.error("Erro ao salvar resumo"); return; }
      setTutor({ ...tutor, resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() });
    } else if (leadHistorico) {
      const r = await fetch(`/api/leads/${leadHistorico.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() }) });
      if (!r.ok) { toast.error("Erro ao salvar resumo"); return; }
      setLeadHistorico({ ...leadHistorico, resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() });
    }
    toast.success("Resumo salvo");
    setEditingResumo(false);
  }
  async function saveName() {
    const v = nameDraft.trim();
    if (!v) { toast.error("Nome obrigatório"); return; }
    if (tutor) {
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setTutor({ ...tutor, name: v });
    } else if (lead) {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setLead({ ...lead, name: v });
    }
    toast.success("Nome salvo");
    setEditingName(false);
  }
  async function saveInteracaoEdit(interacaoId: string) {
    const txt = interacaoDraft.trim();
    if (!txt) { toast.error("Texto obrigatório"); return; }
    const realId = interacaoId.replace(/^(it-|il-|i-)/, "");
    const r = await fetch(`/api/interacoes/${realId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: txt }) });
    if (!r.ok) { toast.error("Erro"); return; }
    toast.success("Atualizada");
    setEditingInteracaoId(null);
    const hist = await carregarHistorico(tutor?.id, lead?.id, leadHistorico?.id);
    setHistorico(hist);
  }
  async function savePhone() {
    const raw = phoneDraft.trim();
    const v = normalizePhone(raw);
    if (!v || v.length < 10) { toast.error("Telefone inválido"); return; }
    if (tutor) {
      const existing = tutor.contacts || [];
      const newContacts = existing.length
        ? existing.map((c, i) => i === 0 ? { ...c, number: v } : c)
        : [{ id: "tmp", number: v, isPrimary: true, isWhatsApp: true }];
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts: newContacts }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setTutor({ ...tutor, contacts: newContacts });
    } else if (lead) {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: v }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setLead({ ...lead, phone: v });
    }
    toast.success("Telefone salvo");
    setEditingPhone(false);
  }

  // ===== Memos pra render =====
  const resumo = lead?.resumoIa || tutor?.resumoIa || leadHistorico?.resumoIa;
  const resumoWhen = lead?.resumoIaUpdatedAt || tutor?.resumoIaUpdatedAt || leadHistorico?.resumoIaUpdatedAt;
  const tutorPrimaryPhone = (tutor?.contacts || []).find(c => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || "";
  const ltv = formatLtv(tutor?.ltvCents);
  const clienteDesde = tutor?.createdAt ? fmtMonthYear(tutor.createdAt) : null;
  const numAtendimentos = historico.filter(h => h.type === "ATENDIMENTO").length;
  const servicoSolicitado = useMemo(() => {
    const cf: any = (lead?.customFields || {});
    return extrairServico(resumo, cf.servicoInteresse || cf.servico_interesse);
  }, [resumo, lead]);

  const SECTION = "px-3 py-2.5 border-b";
  const SECTION_STYLE: React.CSSProperties = { borderColor: "#E8DFC8" };
  const NUM = "inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold mr-1.5";
  const LBL = "text-[10px] font-bold tracking-wide text-gray-500 uppercase mb-1.5 flex items-center justify-between";
  const LINK = "text-[10.5px] font-semibold normal-case cursor-pointer";

  return (
    <div className="h-full flex flex-col bg-white" style={{ maxHeight: "calc(100vh - 60px)" }}>
      {/* ========== ABAS ========== */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: "#E8DFC8", background: "#FAFAF7" }}>
        <button
          onClick={() => setActiveTab("inbox")}
          className={`flex-1 px-2 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition`}
          style={{
            color: activeTab === "inbox" ? "#014D5E" : "#5F5E5A",
            background: activeTab === "inbox" ? "white" : "transparent",
            borderBottom: activeTab === "inbox" ? "2px solid #009AAC" : "2px solid transparent",
          }}
        >
          <LuInbox size={13} /> Caixa de entrada
          {incoming.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: activeTab === "inbox" ? "#009AAC" : "#E8DFC8", color: activeTab === "inbox" ? "white" : "#5F5E5A" }}>
              {incoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("contexto")}
          className={`flex-1 px-2 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition`}
          style={{
            color: activeTab === "contexto" ? "#014D5E" : "#5F5E5A",
            background: activeTab === "contexto" ? "white" : "transparent",
            borderBottom: activeTab === "contexto" ? "2px solid #009AAC" : "2px solid transparent",
          }}
        >
          <LuMessageCircle size={13} /> Contexto
        </button>
      </div>

      {/* ========== Header ações (Encaminhar/Resolver) ========== */}
      <div className="px-3 py-2 border-b flex-shrink-0 flex items-center justify-end gap-1.5" style={SECTION_STYLE}>
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
            <button onClick={reset} className="text-gray-400 hover:text-red-500" title="Voltar pra Caixa"><LuX size={13} /></button>
          </>
        )}
        {!tutor && !lead && !cadastroOpen && (
          <button onClick={() => { setCadastroOpen(true); setCadastroAs("LEAD"); setCadForm({ ...cadForm, telefone: onlyDigits(search) || search, nome: "" }); }} className="text-[10.5px] font-semibold flex items-center gap-1" style={{ color: "#009AAC" }}>
            <LuPlus size={11} /> cadastrar
          </button>
        )}
        <button onClick={loadIncoming} className="text-gray-400 hover:text-[#009AAC]" title="Atualizar caixa"><LuRefreshCcw size={12} /></button>
      </div>

      {/* ========== BUSCA ========== */}
      <div className="px-3 py-2 border-b flex-shrink-0" style={SECTION_STYLE}>
        <div className="relative">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); if (!e.target.value && !tutor && !lead) { /* mantém aba */ } }} placeholder="Telefone, nome ou email..." className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm bg-white" style={SECTION_STYLE} />
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

      {/* ========== CONTEÚDO BASEADO NA ABA ========== */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Aba INBOX = Caixa de Entrada */}
        {activeTab === "inbox" && (
          <div className="p-2.5 space-y-1.5">
            {loadingIncoming && incoming.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-gray-400">Carregando...</div>
            ) : incoming.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-gray-400 italic">
                Nenhum contato novo agora.<br />
                Quando alguém escrever pelo BotConversa, aparece aqui.
              </div>
            ) : (
              <>
                {incoming.slice(0, incomingLimit).map(item => {
                  const isLead = item.kind === "LEAD";
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectFromIncoming(item)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition hover:translate-x-[2px] hover:shadow-sm"
                      style={{
                        background: isLead ? "#FFFBEB" : "#F0FDFA",
                        borderColor: "#E8DFC8",
                        borderLeftWidth: 4,
                        borderLeftColor: isLead ? "#92611A" : "#009AAC",
                      }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9.5px] font-bold flex-shrink-0" style={{ background: isLead ? "linear-gradient(135deg,#D97706,#92611A)" : "linear-gradient(135deg,#009AAC,#014D5E)" }}>
                        {initials(item.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold flex items-center gap-1.5 flex-wrap" style={{ color: "#014D5E" }}>
                          {item.name}
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: isLead ? "#FEF3C7" : "#CCFBF1", color: isLead ? "#92611A" : "#0E7490" }}>{isLead ? "Lead" : "Cliente"}</span>
                          <span className="text-[7.5px] font-bold px-1 rounded text-white" style={{ background: "#009AAC" }}>BC</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {item.phone ? formatPhone(item.phone) : "—"}
                          {item.petName && <> · 🐾 {item.petName}{item.petSpecies ? ` (${item.petSpecies})` : ""}</>}
                          {item.servico && <> · {item.servico}</>}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 flex-shrink-0">{fmtRelative(item.createdAt)}</div>
                    </button>
                  );
                })}
                {incoming.length >= incomingLimit && (
                  <button onClick={() => setIncomingLimit(l => l + 20)} className="w-full py-2 text-[10.5px] font-semibold border rounded text-[#014D5E]" style={SECTION_STYLE}>
                    ver mais ({incoming.length - incomingLimit}+)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Aba CONTEXTO */}
        {activeTab === "contexto" && (
          <>
            {/* Cadastro inline */}
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

            {/* Estado vazio */}
            {!tutor && !lead && !cadastroOpen && (
              <div className="px-3 py-6 text-center text-[11.5px] text-gray-400 leading-relaxed">
                Selecione um contato na <strong>Caixa de Entrada</strong> ou pesquise acima.
              </div>
            )}

            {/* BLOCO 1: RESUMO IA + SERVICO */}
            {(tutor || lead) && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL}>
                  <span><span className={NUM}>1</span><LuSparkles size={11} className="inline -mt-0.5 mr-1" />Resumo da conversa (IA){resumoWhen && <span className="font-normal text-gray-400 normal-case ml-1 text-[9.5px]">{fmtRelative(resumoWhen)}</span>}</span>
                </div>
                {editingResumo ? (
                  <div className="rounded-lg p-2 border" style={{ background: "#f0fdfa", borderColor: "#99e9d8" }}>
                    <textarea value={resumoDraft} onChange={e => setResumoDraft(e.target.value)} rows={4} className="w-full px-2 py-1.5 text-[11.5px] border rounded resize-none" style={{ borderColor: "#99e9d8", color: "#0c4a6e" }} placeholder="Resumo da conversa..." />
                    <div className="flex gap-1.5 mt-1.5">
                      <button onClick={() => setResumoDraft("")} className="px-2 py-1 text-[10.5px] border rounded text-gray-500" style={{ borderColor: "#E8DFC8" }} title="Limpar">🗑 limpar</button>
                      <button onClick={() => setEditingResumo(false)} className="flex-1 px-2 py-1 text-[10.5px] border rounded" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
                      <button onClick={saveResumo} className="flex-1 px-2 py-1 text-[10.5px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar</button>
                    </div>
                  </div>
                ) : resumo ? (
                  <>
                    <div onClick={() => { setEditingResumo(true); setResumoDraft(resumo); }} className="rounded-lg p-2.5 text-[11.5px] leading-relaxed cursor-pointer hover:opacity-90 group" style={{ background: "linear-gradient(135deg,#f0fdfa,#e0f4f6)", border: "1px solid #99e9d8", color: "#0c4a6e" }} title="Clique para editar">
                      <div className="text-[9.5px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: "#0e7490" }}>
                        <span className="px-1 rounded text-white" style={{ background: "#14b8a6" }}>IA</span> via BotConversa
                        <span className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 normal-case font-normal">✏ editar</span>
                      </div>
                      {resumo}
                    </div>
                    {servicoSolicitado && (
                      <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "#009AAC", color: "white" }}>
                        <span className="text-[10px] font-bold">🎯 Serviço:</span>
                        <span className="text-[11.5px] font-semibold">{servicoSolicitado}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div onClick={() => { setEditingResumo(true); setResumoDraft(""); }} className="rounded-lg p-2.5 text-[11px] text-center italic cursor-pointer hover:bg-gray-100" style={{ background: "#fafafa", border: "1px dashed #E8DFC8", color: "#94a3b8" }}>
                    Sem resumo ainda · ✏ clique para adicionar
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 2: CLIENTE com toggle Lead↔Cliente */}
            {tutor && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL}>
                  <span>
                    <span className={NUM}>2</span>Cliente
                    {/* TOGGLE Lead/Cliente */}
                    <span className="inline-flex ml-1.5 rounded-full p-0.5 border" style={{ background: "#FAFAF7", borderColor: "#E8DFC8" }}>
                      <button onClick={handleDesconverter} className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase text-[#5F5E5A] hover:bg-amber-100 hover:text-[#92611A]">Lead</button>
                      <button className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase" style={{ background: "#CCFBF1", color: "#0E7490" }}>Cliente</button>
                    </span>
                  </span>
                  <Link href={`/dashboard/erp/tutores/${tutor.id}`} target="_blank" className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg,#009AAC,#014D5E)" }}>{initials(tutor.name)}</div>
                  <div className="min-w-0 flex-1">
                    {editingName ? (
                      <div className="flex gap-1 mb-1">
                        <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }} className="flex-1 text-[12.5px] font-semibold border rounded px-1.5 py-0.5" style={{ borderColor: "#009AAC", color: "#014D5E" }} />
                        <button onClick={() => setNameDraft("")} title="Limpar" className="px-1.5 text-[10px] border rounded text-gray-500" style={{ borderColor: "#E8DFC8" }}>🗑</button>
                        <button onClick={saveName} className="px-1.5 text-[10px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>✓</button>
                        <button onClick={() => setEditingName(false)} className="px-1.5 text-[10px] border rounded" style={{ borderColor: "#E8DFC8" }}>✕</button>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingName(true); setNameDraft(tutor.name); }} className="text-[12.5px] font-semibold truncate cursor-pointer hover:underline" style={{ color: "#014D5E" }} title="Clique para editar">{tutor.name}</div>
                    )}
                    <div className="text-[10.5px] text-gray-500 leading-snug">
                      {editingPhone ? (
                        <span className="inline-flex gap-1 items-center">
                          <input autoFocus value={phoneDraft} onChange={e => setPhoneDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") setEditingPhone(false); }} className="text-[10.5px] border rounded px-1.5 py-0.5 w-28" style={{ borderColor: "#009AAC" }} />
                          <button onClick={() => setPhoneDraft("")} title="Limpar" className="text-[10px] text-gray-500">🗑</button>
                          <button onClick={savePhone} className="text-[10px] text-[#009AAC] font-bold">✓</button>
                          <button onClick={() => setEditingPhone(false)} className="text-[10px] text-gray-400">✕</button>
                        </span>
                      ) : (
                        <span onClick={() => { setEditingPhone(true); setPhoneDraft(tutorPrimaryPhone || ""); }} className="cursor-pointer hover:underline" title="Clique para editar">
                          <LuPhone size={9} className="inline -mt-0.5" /> {tutorPrimaryPhone ? formatPhone(tutorPrimaryPhone) : "+ adicionar telefone"}
                        </span>
                      )}
                      {ltv && <> · LTV {ltv}</>}
                      <br />
                      🐾 {pets.length} pet{pets.length !== 1 ? "s" : ""}
                      {numAtendimentos > 0 && <> · {numAtendimentos} atendimento{numAtendimentos !== 1 ? "s" : ""}</>}
                      {clienteDesde && <> · cliente desde {clienteDesde}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9.5px] font-bold uppercase text-gray-400 whitespace-nowrap">Estado relac.</span>
                  <select value={tutor.estadoRelacionamento || ""} onChange={e => updateTutorEstado(e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded-lg font-medium" style={{ borderColor: "#009AAC", color: "#014D5E", background: "white" }}>
                    <option value="">— selecionar —</option>
                    {ESTADO_RELACIONAMENTO.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
                  </select>
                </div>
              </section>
            )}
            {/* BLOCO 2: LEAD com toggle Lead↔Cliente + PET DE INTERESSE */}
            {!tutor && lead && (
              <section className={SECTION} style={{ ...SECTION_STYLE, background: "#FFFBEB" }}>
                <div className={LBL}>
                  <span>
                    <span className={NUM}>2</span>Lead
                    <span className="inline-flex ml-1.5 rounded-full p-0.5 border" style={{ background: "#FAFAF7", borderColor: "#E8DFC8" }}>
                      <button className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase" style={{ background: "#FEF3C7", color: "#92611A" }}>Lead</button>
                      <button onClick={handleConverter} className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase text-[#5F5E5A] hover:bg-teal-100 hover:text-[#0E7490]">Cliente</button>
                    </span>
                  </span>
                  <Link href={`/dashboard/erp/leads/${lead.id}`} target="_blank" className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg,#D97706,#92611A)" }}>{initials(lead.name || "?")}</div>
                  <div className="min-w-0 flex-1">
                    {editingName ? (
                      <div className="flex gap-1 mb-1">
                        <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }} className="flex-1 text-[12.5px] font-semibold border rounded px-1.5 py-0.5" style={{ borderColor: "#009AAC", color: "#014D5E" }} />
                        <button onClick={() => setNameDraft("")} title="Limpar" className="px-1.5 text-[10px] border rounded text-gray-500" style={{ borderColor: "#E8DFC8" }}>🗑</button>
                        <button onClick={saveName} className="px-1.5 text-[10px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>✓</button>
                        <button onClick={() => setEditingName(false)} className="px-1.5 text-[10px] border rounded" style={{ borderColor: "#E8DFC8" }}>✕</button>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingName(true); setNameDraft(lead.name || ""); }} className="text-[12.5px] font-semibold truncate cursor-pointer hover:underline" style={{ color: "#014D5E" }} title="Clique para editar">{lead.name || "Sem nome"}</div>
                    )}
                    <div className="text-[10.5px] text-gray-500 leading-snug">
                      {editingPhone ? (
                        <span className="inline-flex gap-1 items-center">
                          <input autoFocus value={phoneDraft} onChange={e => setPhoneDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") setEditingPhone(false); }} className="text-[10.5px] border rounded px-1.5 py-0.5 w-28" style={{ borderColor: "#009AAC" }} />
                          <button onClick={() => setPhoneDraft("")} title="Limpar" className="text-[10px] text-gray-500">🗑</button>
                          <button onClick={savePhone} className="text-[10px] text-[#009AAC] font-bold">✓</button>
                          <button onClick={() => setEditingPhone(false)} className="text-[10px] text-gray-400">✕</button>
                        </span>
                      ) : (
                        <span onClick={() => { setEditingPhone(true); setPhoneDraft(lead.phone || ""); }} className="cursor-pointer hover:underline" title="Clique para editar">
                          <LuPhone size={9} className="inline -mt-0.5" /> {lead.phone ? formatPhone(lead.phone) : "+ adicionar telefone"}
                        </span>
                      )}
                      {lead.source && <> · via {lead.source}</>}
                      {lead.createdAt && <> · {fmtRelative(lead.createdAt)}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9.5px] font-bold uppercase text-gray-400 whitespace-nowrap">Pipeline comercial</span>
                  <select value={lead.pipelineComercialEtapa || ""} onChange={e => updateLeadEtapa(e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded-lg font-medium" style={{ borderColor: "#009AAC", color: "#014D5E", background: "white" }}>
                    <option value="">— selecionar etapa —</option>
                    {PIPELINE_COMERCIAL.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                {/* PET DE INTERESSE */}
                <div className="text-[9.5px] font-bold uppercase text-[#92611A] mt-2 mb-1">🐾 Pet de interesse</div>
                <div className="flex gap-1.5">
                  <input value={leadPetNome} onChange={e => setLeadPetNome(e.target.value)} placeholder="Nome do pet" className="flex-1 px-2 py-1 text-[11px] border rounded" style={{ borderColor: "#E8DFC8" }} />
                  <select value={leadPetEspecie} onChange={e => setLeadPetEspecie(e.target.value)} className="px-2 py-1 text-[11px] border rounded w-[80px]" style={{ borderColor: "#E8DFC8" }}>
                    <option>Cão</option><option>Gato</option><option>Outro</option>
                  </select>
                </div>
                <button onClick={handleConverter} className="mt-2 w-full text-[10.5px] py-1.5 border rounded font-semibold hover:bg-white flex items-center justify-center gap-1" style={{ borderColor: "#009AAC", color: "#009AAC" }}>
                  <LuArrowUpRight size={12} /> Converter em cliente
                </button>
              </section>
            )}

            {/* BLOCO 3: PETS */}
            {tutor && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL}>
                  <span><span className={NUM}>3</span>Pets {pets.length > 0 && `(${pets.length})`}{pets.length > 1 ? " · clique pra expandir" : ""}</span>
                  <button onClick={() => window.open(`/dashboard/erp/pets/novo?tutorId=${tutor.id}`, "_blank")} className={LINK} style={{ color: "#009AAC" }} type="button"><LuPlus size={10} className="inline" /> cadastrar</button>
                </div>
                {pets.length > 0 ? (
                  <div className="space-y-1.5">
                    {pets.map(p => {
                      const active = selectedPet?.id === p.id;
                      return (
                        <div key={p.id} className={`rounded-lg border ${active ? "" : "hover:bg-gray-50"}`} style={active ? { background: "#e0f4f6", borderColor: "#009AAC" } : { borderColor: "#F0EBE0" }}>
                          <button onClick={() => setSelectedPet(active ? null : p)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left">
                            <PetIcon species={p.species} size={20} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-semibold truncate" style={{ color: "#014D5E" }}>{p.name}</div>
                              <div className="text-[10px] text-gray-500 truncate">{speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}{p.birthDate ? ` · ${ageFromBirth(p.birthDate)}` : ""}</div>
                            </div>
                            <span className="text-[10px] text-gray-400">{active ? "▴" : "▾"}</span>
                          </button>
                          {active && (
                            <div className="px-2 pb-2 pt-1 border-t" style={{ borderColor: "#cfe8eb" }}>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] mb-2 mt-1">
                                <div><span className="text-gray-400">Espécie:</span> <span style={{ color: "#014D5E" }}>{speciesLabel(p.species)}</span></div>
                                <div><span className="text-gray-400">Raça:</span> <span style={{ color: "#014D5E" }}>{p.breed || "—"}</span></div>
                                <div><span className="text-gray-400">Idade:</span> <span style={{ color: "#014D5E" }}>{p.birthDate ? ageFromBirth(p.birthDate) : "—"}</span></div>
                              </div>
                              <div className="space-y-1.5 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e", minWidth: 28, textAlign: "center" }}>CLI</span>
                                  <select value={p.pipelineClinicoEtapa || ""} onChange={e => updatePetEtapa("pipelineClinicoEtapa", e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded font-medium" style={{ borderColor: "#fef3c7", color: "#014D5E", background: "white" }}>
                                    <option value="">— sem etapa —</option>
                                    {PIPELINE_CLINICO.map(et => <option key={et} value={et}>{et}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#ede9fe", color: "#5b21b6", minWidth: 28, textAlign: "center" }}>FIS</span>
                                  <select value={p.pipelineFisioEtapa || ""} onChange={e => updatePetEtapa("pipelineFisioEtapa", e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded font-medium" style={{ borderColor: "#ede9fe", color: "#014D5E", background: "white" }}>
                                    <option value="">— sem etapa —</option>
                                    {PIPELINE_FISIO.map(et => <option key={et} value={et}>{et}</option>)}
                                  </select>
                                </div>
                              </div>
                              <button onClick={() => window.open(`/dashboard/erp/pets/${p.id}/atendimentos/novo`, "_blank")} className="w-full px-2 py-1.5 rounded text-[10.5px] text-white font-semibold flex items-center justify-center gap-1 mb-1.5" style={{ background: "#009AAC" }} type="button"><LuPlus size={11} /> Registrar atendimento</button>
                              <button onClick={() => window.open(`/dashboard/erp/pets/${p.id}`, "_blank")} className="w-full text-[10px] py-1 border rounded font-medium bg-white hover:bg-gray-50" style={{ borderColor: "#009AAC", color: "#009AAC" }} type="button">Abrir ficha completa ↗</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg p-3 text-center text-[11px] text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                    Nenhum pet cadastrado ainda<br />
                    <button onClick={() => window.open(`/dashboard/erp/pets/novo?tutorId=${tutor.id}`, "_blank")} className="font-semibold mt-1" style={{ color: "#009AAC" }} type="button">+ Cadastrar pet</button>
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 4: REGISTRAR INTERACAO */}
            {(tutor || lead) && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL}>
                  <span><span className={NUM}>4</span><LuMessageSquare size={11} className="inline -mt-0.5 mr-1" />Registrar interação</span>
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
                    <textarea value={interacaoForm.texto} onChange={e => setInteracaoForm({ ...interacaoForm, texto: e.target.value })} placeholder="Resumo da conversa..." rows={3} className="w-full px-2 py-1 text-xs border rounded" style={SECTION_STYLE} />
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

            {/* BLOCO 5: ULTIMOS ATENDIMENTOS */}
            {(tutor || lead) && (
              <section className="px-3 py-2.5">
                <div className={LBL}>
                  <span><span className={NUM}>5</span>Últimos atendimentos{historico.length > 0 && ` (${historico.length})`}</span>
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
                      const isInteracao = h.type === "INTERACAO";
                      const isEditing = editingInteracaoId === h.id;
                      if (isEditing) {
                        return (
                          <div key={h.id} className="rounded-lg p-2 border" style={{ background: "#f6fdfd", borderColor: "#E8DFC8" }}>
                            <div className="text-[10px] font-semibold mb-1" style={{ color: "#014D5E" }}>{h.title}</div>
                            <textarea autoFocus value={interacaoDraft} onChange={e => setInteracaoDraft(e.target.value)} rows={3} className="w-full px-2 py-1 text-[11px] border rounded" style={SECTION_STYLE} />
                            <div className="flex gap-1.5 mt-1.5">
                              <button onClick={() => setEditingInteracaoId(null)} className="flex-1 px-2 py-1 text-[10.5px] border rounded" style={SECTION_STYLE}>Cancelar</button>
                              <button onClick={() => saveInteracaoEdit(h.id)} className="flex-1 px-2 py-1 text-[10.5px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar</button>
                            </div>
                          </div>
                        );
                      }
                      const Tag: any = h.href ? Link : "div";
                      const tagProps: any = h.href ? { href: h.href, target: "_blank" } : {};
                      return (
                        <Tag key={h.id} {...tagProps} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition border group" style={{ borderColor: "#F0EBE0" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold flex items-center gap-1 flex-wrap" style={{ color: "#014D5E" }}>
                              {h.title}
                              <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase ${h.fase === "LEAD" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{h.fase}</span>
                            </div>
                            <div className="text-[10.5px] text-gray-500 truncate">{h.subtitle}</div>
                          </div>
                          {isInteracao && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingInteracaoId(h.id); setInteracaoDraft(h.subtitle); }} className="text-[10px] text-gray-400 hover:text-[#009AAC] opacity-0 group-hover:opacity-100 flex-shrink-0" title="Editar interação">✏</button>
                          )}
                        </Tag>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          </>
        )}
      </div>
    </div>
  );
}
