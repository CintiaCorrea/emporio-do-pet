"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useState, useMemo } from "react";
import { criarPetEAbrir } from "@/lib/actions/pets";
import Link from "next/link";
import {
  LuSearch, LuPhone, LuPlus, LuExternalLink, LuShare2, LuCheckCheck,
  LuMessageSquare, LuSparkles, LuCalendar, LuFileText, LuFlaskConical, LuStickyNote,
  LuX, LuArrowUpRight, LuInbox, LuMessageCircle, LuTrash, LuArrowLeft,
  LuStethoscope, LuClock, LuDollarSign, LuRepeat, LuMail, LuActivity,
  LuPencil, LuStore,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import { speciesKey, ageFromBirth } from "@/lib/pets/labels";
import NovoAgendamentoModal from "@/components/agendamentos/NovoAgendamentoModal";

function scorePie(score: number, max: number, color: string) {
  const f = Math.max(0, Math.min(1, max ? score / max : 0));
  const ang = -Math.PI / 2 + 2 * Math.PI * f;
  const x = 12 + 10 * Math.cos(ang);
  const y = 12 + 10 * Math.sin(ang);
  const large = f > 0.5 ? 1 : 0;
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#EBE8DF" />
      {f >= 0.999 ? (
        <circle cx="12" cy="12" r="10" fill={color} />
      ) : (
        <path d={`M12 12 L12 2 A10 10 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`} fill={color} />
      )}
    </svg>
  );
}


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
  birthDate?: string | null; observations?: string | null; avatar?: string | null; gender?: string | null;
  weight?: number | null; sterilization?: string | null; coatColor?: string | null; microchip?: string | null; insurancePlan?: string | null;
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
  tipoLabel?: string;
  auto?: boolean;
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
  canal?: "BC" | "Meta";
  canais?: string[];
  classificacao?: string;
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

const GOOGLE_REVIEW_LINK = "https://g.page/r/CctbNjVipnY8EAI/review";
const sourceMap: Record<string, string> = {
  "Direto": "DIRECT", "Google Ads": "GOOGLE_ADS", "Instagram": "INSTAGRAM",
  "Facebook": "FACEBOOK", "TikTok": "TIKTOK", "Indicação": "REFERRAL",
  "Landing Page": "LANDING_PAGE", "WhatsApp": "WHATSAPP", "Email": "EMAIL", "Orgânico": "ORGANIC",
};

const SPECIES_EMOJI: Record<string, string> = { CANINE: "🐶", FELINE: "🐱", BIRD: "🐦", RODENT: "🐹", REPTILE: "🦎", FISH: "🐟", OTHER: "🐾" };
function speciesEmoji(s?: string | null): string { return SPECIES_EMOJI[speciesKey(s)] || "🐾"; }
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
function fmtConsultaDateTime(s?: string | null, duration?: number) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const dia = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
  const hi = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  const end = new Date(d.getTime() + (duration && duration > 0 ? duration : 30) * 60000);
  const hf = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return `${dia} · ${hi}–${hf}`;
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

// [EMP-COWORK] busca+acoes mesma linha (Cintia 07/06)
export default function InboxRightPanel({ canal = "BotConversa", initialPhone }: { canal?: string; initialPhone?: string | null }) {
  // ===== Tab control =====
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  // ===== Caixa de Entrada =====
  const [incoming, setIncoming] = useState<IncomingItem[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [incomingError, setIncomingError] = useState(false);
  const [incomingLimit, setIncomingLimit] = useState(20);

  // ===== Busca / contexto =====
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ tutors: Tutor[]; leads: Lead[] }>({ tutors: [], leads: [] });
  const [searching, setSearching] = useState(false);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  // Conversa do Meta ainda NAO materializada como Lead (so vira Lead ao usar um botao). null = lead ja e real.
  const [leadConversa, setLeadConversa] = useState<{ name?: string; phone?: string } | null>(null);
  const [leadHistorico, setLeadHistorico] = useState<Lead | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  useEffect(() => { if (pets.length && !pets.some((p) => p.id === selectedPet?.id)) setSelectedPet(pets[0]); }, [pets]);
  const [breedOptions, setBreedOptions] = useState<string[]>([]);
  const [pacotesInbox, setPacotesInbox] = useState<{ id: string; data: any }[]>([]);
  const [fisioSrvInbox, setFisioSrvInbox] = useState<any[]>([]);
  const [pacFormInbox, setPacFormInbox] = useState<{ open: boolean; serviceId: string; total: string; jaFeitas: string }>({ open: false, serviceId: "", total: "4", jaFeitas: "0" });
  const [savingPacInbox, setSavingPacInbox] = useState(false);
  const [cadAberto, setCadAberto] = useState<Record<string, boolean>>({});
  const [fichaPet, setFichaPet] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!selectedPet) { setBreedOptions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const sp = speciesKey(selectedPet.species);
        const res = await fetch(`/api/breeds?species=${encodeURIComponent(sp)}`, { cache: "no-store" });
        if (!res.ok) { if (!cancelled) setBreedOptions([]); return; }
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.breeds) ? data.breeds : [];
        const names = Array.from(new Set(arr.map((b: any) => (typeof b === "string" ? b : b?.name)).filter(Boolean)));
        if (!cancelled) setBreedOptions(names as string[]);
      } catch { if (!cancelled) setBreedOptions([]); }
    })();
    return () => { cancelled = true; };
  }, [selectedPet?.id, selectedPet?.species]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [histWaOpen, setHistWaOpen] = useState<Record<string, boolean>>({});
  const [staff, setStaff] = useState<Staff[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [petActForward, setPetActForward] = useState(false);
  const [tutorScore, setTutorScore] = useState<{ total: number; label: string; dimensions: any } | null>(null);
  const [inscricoes, setInscricoes] = useState<any[]>([]);
  const [vacPend, setVacPend] = useState<{ id: string; nome: string; numero: number; dataPrevista: string; vencida: boolean; dias: number }[]>([]);

  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [cadastroAs, setCadastroAs] = useState<"LEAD" | "CLIENTE">("LEAD");
  const [cadForm, setCadForm] = useState({ nome: "", telefone: "", email: "", canalLead: "WhatsApp", origem: "Direto", petNome: "", petEspecie: "Cão", petIdade: "", notas: "" });

  const [interacaoOpen, setInteracaoOpen] = useState(false);
  const [classifOpen, setClassifOpen] = useState(false);
  const [classifCats, setClassifCats] = useState<string[]>(["Cliente", "Fornecedor", "Parceiro"]);
  useEffect(() => {
    fetch(`/api/listas?lista=classificacao_tutor`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        const extras = arr.map((i: any) => i.valor).filter(Boolean);
        const base = ["Cliente", "Fornecedor", "Parceiro"];
        setClassifCats([...base, ...extras.filter((v: string) => !base.includes(v))]);
      })
      .catch(() => {});
  }, []);
  const [interacaoForm, setInteracaoForm] = useState({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });

  // Inline edit
  const [editingResumo, setEditingResumo] = useState(false);
  const [resumoDraft, setResumoDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [editingInteracaoId, setEditingInteracaoId] = useState<string | null>(null);
  const [interacaoDraft, setInteracaoDraft] = useState("");

  // Pet de interesse no Lead (novo)
  const [leadPetNome, setLeadPetNome] = useState("");
  const [leadPetEspecie, setLeadPetEspecie] = useState("Cão");
  const [pipeDyn, setPipeDyn] = useState<{ comercial: string[]; clinico: string[]; fisio: string[] }>({ comercial: [], clinico: [], fisio: [] });
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/pipelines", { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []);
        const pick = (test: (x: any) => boolean) => { const p = arr.find((x: any) => test(x) && x.ativo !== false); return p ? (p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome) : []; };
        setPipeDyn({
          comercial: pick((x) => x.escopo === "LEAD" || (x.nome || "").toLowerCase().includes("comercial")),
          clinico: pick((x) => (x.nome || "").toLowerCase().includes("clín") || (x.nome || "").toLowerCase().includes("clin")),
          fisio: pick((x) => (x.nome || "").toLowerCase().includes("fisio")),
        });
      } catch {}
    })();
  }, []);

  useEffect(() => {
    fetch("/api/inbox/context/staff").then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Score do cliente (formula no backend, vem em GET /api/tutors/[id].score)
  useEffect(() => {
    if (!tutor?.id) { setTutorScore(null); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/tutors/${tutor.id}`);
        const d = await safeJson<any>(r, null);
        if (!cancel) setTutorScore(d?.score || null);
      } catch { if (!cancel) setTutorScore(null); }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor?.id]);

  // Sequencias (inscricoes em cadencia) do tutor selecionado
  useEffect(() => {
    if (!tutor?.id) { setInscricoes([]); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/cadencias/inscricoes?tutorId=${tutor.id}`);
        const arr = await safeJson<any[]>(r, []);
        if (!cancel) setInscricoes((Array.isArray(arr) ? arr : []).filter((i: any) => i.status === "ATIVA" || i.status === "PAUSADA"));
      } catch { if (!cancel) setInscricoes([]); }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor?.id]);

  async function cancelarInscricaoSeq(id: string) {
    if (!confirm("Cancelar essa sequencia? Os proximos passos nao serao enviados.")) return;
    const r = await fetch(`/api/cadencias/inscricoes/${id}/cancelar`, { method: "PATCH" });
    if (!r.ok) { toast.error("Erro ao cancelar"); return; }
    toast.success("Sequencia cancelada");
    setInscricoes(list => list.filter(x => x.id !== id));
  }

  // Vacinas a resolver (doses pendentes vencidas ou <=7 dias) do pet selecionado
  useEffect(() => {
    if (!selectedPet?.id) { setVacPend([]); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/protocolos?petId=${selectedPet.id}`, { cache: "no-store" });
        const arr = await safeJson<any[]>(r, []);
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const out: { id: string; nome: string; numero: number; dataPrevista: string; vencida: boolean; dias: number }[] = [];
        (Array.isArray(arr) ? arr : []).forEach((a: any) => {
          (a.doses || []).forEach((d: any) => {
            if (d.status !== "PENDENTE") return;
            const dp = new Date(d.dataPrevista); if (Number.isNaN(dp.getTime())) return;
            const dias = Math.round((dp.getTime() - now.getTime()) / 86400000);
            if (dias <= 7) out.push({ id: d.id, nome: a.nomeProtocolo, numero: d.numero, dataPrevista: d.dataPrevista, vencida: dias < 0, dias });
          });
        });
        out.sort((x, y) => new Date(x.dataPrevista).getTime() - new Date(y.dataPrevista).getTime());
        if (!cancel) setVacPend(out);
      } catch { if (!cancel) setVacPend([]); }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet?.id]);

  // === Caixa de Entrada: carrega Leads recentes não-resolvidos + Tutores com conversa BC ativa ===
  async function loadIncoming() {
    setLoadingIncoming(true);
    try {
      let hadError = false;
      const items: IncomingItem[] = [];
      // Carrega todos os tutores de uma vez (evita N+1 e o sumico de cards por limite)
      const tutorMap = new Map<string, any>();
      try {
        const rAllT = await fetch(`/api/tutors?take=10000`);
        const dAllT = await safeJson<any>(rAllT, {});
        const allT = Array.isArray(dAllT) ? dAllT : (dAllT.tutors || dAllT.data || []);
        for (const t of allT) tutorMap.set(t.id, t);
      } catch { /* segue sem map */ }
      // Últimas resoluções por lead/tutor (Interacao tipo RESOLVIDO)
      const resolvedByTutor = new Map<string, number>();
      const resolvedByLead = new Map<string, number>();
      try {
        const rR = await fetch(`/api/interacoes?tipo=RESOLVIDO&limit=200`);
        const arrR = await safeJson<any[]>(rR, []);
        for (const it of (Array.isArray(arrR) ? arrR : [])) {
          if (it.tipo !== "RESOLVIDO") continue;
          const ts = new Date(it.createdAt || 0).getTime();
          if (it.tutorId && ts > (resolvedByTutor.get(it.tutorId) || 0)) resolvedByTutor.set(it.tutorId, ts);
          if (it.leadId && ts > (resolvedByLead.get(it.leadId) || 0)) resolvedByLead.set(it.leadId, ts);
        }
      } catch { /* segue sem mapa de resolvidos */ }
      // Quem tem follow-up/sequência agendado sai da caixa (fica na ação)
      const temFollowupFuturo = (x: any) =>
        !!x?.proximoFollowupAt && new Date(x.proximoFollowupAt).getTime() > Date.now();
      // Leads recentes (não-convertidos, não-resolvidos, sem follow-up futuro)
      const rL = await fetch(`/api/leads?source=WHATSAPP&limit=1000`);
      if (!rL.ok) hadError = true;
      const dL = await safeJson<any>(rL, {});
      const arrL = Array.isArray(dL) ? dL : (dL.leads || dL.data || []);
      arrL.forEach((l: any) => {
        if (l.status === "CONVERTED" || l.status === "RESOLVED" || l.status === "LOST") return;
        if (temFollowupFuturo(l)) return;
        const lastResolved = resolvedByLead.get(l.id) || 0;
        const lastActivity = new Date(l.lastActivityAt || l.firstSeenAt || l.createdAt || 0).getTime();
        if (lastResolved && lastResolved >= lastActivity) return; // resolvido após última atividade
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
          canal: "BC",
          raw: l,
        });
      });
      // Tutores (clientes) com Interacao BC mais recente que a última resolução
      try {
        const rI = await fetch(`/api/interacoes?canal=${encodeURIComponent("WhatsApp BC")}&limit=1000`);
        if (!rI.ok) hadError = true;
        const arrI = await safeJson<any[]>(rI, []);
        const seenTutorIds = new Set<string>();
        for (const it of (Array.isArray(arrI) ? arrI : [])) {
          if (it.canal !== "WhatsApp BC") continue;
          if (!it.tutorId || seenTutorIds.has(it.tutorId)) continue;
          seenTutorIds.add(it.tutorId);
          const bcTs = new Date(it.updatedAt || it.createdAt || 0).getTime();
          const lastResolved = resolvedByTutor.get(it.tutorId) || 0;
          if (lastResolved >= bcTs) continue; // resolvido depois da última conversa
          try {
            const t = tutorMap.get(it.tutorId);
            if (!t || !t.id) continue;
            if (temFollowupFuturo(t)) continue; // em follow-up/sequência
            const phone = (t.contacts || [])[0]?.number || "";
            items.push({
              id: `T-${t.id}`,
              kind: "CLIENTE",
              name: t.name || "Sem nome",
              phone,
              createdAt: it.updatedAt || it.createdAt || it.dataHora || new Date().toISOString(),
              canal: "BC",
              classificacao: t?.classificacao,
              raw: t,
            });
          } catch { /* ignora tutor individual */ }
        }
      } catch { /* ignora se endpoint falhar */ }
      // Conversas Meta (WhatsApp oficial) entram na Caixa com etiqueta propria
      try {
        const rM = await fetch(`/api/whatsapp/conversations?limit=200`);
        const dM = await safeJson<any>(rM, {});
        const convs = Array.isArray(dM?.conversations) ? dM.conversations : (Array.isArray(dM) ? dM : (dM.data || []));
        for (const c of convs) {
          if (["RESOLVED", "CLOSED", "ARCHIVED"].includes(c.status)) continue;
          const phone = c.contactPhone || "";
          const tutorId = c.tutorId || c.tutor?.id;
          const lastMsg = new Date(c.lastMessageAt || c.updatedAt || 0).getTime();
          let nome = c.contactName || c.contactPushName || c.tutor?.name || "Sem nome";
          if (tutorId) {
            const lr = resolvedByTutor.get(tutorId) || 0;
            if (lr && lr >= lastMsg) continue;
            const t = tutorMap.get(tutorId);
            if (t) { if (temFollowupFuturo(t)) continue; nome = t.name || nome; }
          }
          items.push({
            id: `M-${c.id}`,
            kind: tutorId ? "CLIENTE" : "LEAD",
            name: nome,
            phone,
            createdAt: c.lastMessageAt || c.updatedAt || new Date().toISOString(),
            canal: "Meta",
            classificacao: tutorId ? tutorMap.get(tutorId)?.classificacao : undefined,
            raw: (tutorMap.get(tutorId) || c) as any,
          });
        }
      } catch { /* ignora se Meta indisponivel */ }
      // Ordena por data desc, dedupe por phone (último 9)
      const ordenado = items.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const porPhone = new Map<string, IncomingItem>();
      const semPhone: IncomingItem[] = [];
      for (const it of ordenado) {
        const canal = it.canal || "BC";
        const t = last9(it.phone);
        if (!t) { it.canais = [canal]; semPhone.push(it); continue; }
        const ex = porPhone.get(t);
        if (!ex) { it.canais = [canal]; porPhone.set(t, it); }
        else if (ex.canais && !ex.canais.includes(canal)) { ex.canais.push(canal); }
      }
      const dedupado = [...porPhone.values(), ...semPhone]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncomingError(hadError);
      setIncoming(dedupado);
    } catch { setIncomingError(true); }
    setLoadingIncoming(false);
  }

  useEffect(() => {
    loadIncoming();
    const id = setInterval(loadIncoming, 30000); // refetch a cada 30s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          tipoLabel: `${TYPE_LABEL[a.type] || a.type}${a.petName ? ` · ${a.petName}` : ""}`,
          auto: false,
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
          tipoLabel: TIPO_INTERACAO[i.tipo] || i.tipo,
          auto: /trigger|botconversa|bot conversa/i.test(i.texto || ""),
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
          tipoLabel: TIPO_INTERACAO[i.tipo] || i.tipo,
          auto: /trigger|botconversa|bot conversa/i.test(i.texto || ""),
          fase: "LEAD",
        }));
      }
    } catch { /* ignore */ }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 1);
  }
  function renderHistItem(h: HistoricoItem) {
    const isInteracao = h.type === "INTERACAO";
    const isEditing = editingInteracaoId === h.id;
    if (isEditing) {
      return (
        <div key={h.id} className="rounded-lg p-2 border" style={{ background: "#f6fdfd", borderColor: "#E8DFC8" }}>
          <div className="text-[10px] font-semibold mb-1" style={{ color: "#014D5E" }}>{h.tipoLabel || h.title}</div>
          <textarea autoFocus value={interacaoDraft} onChange={e => setInteracaoDraft(e.target.value)} rows={3} className="w-full px-2 py-1 text-[11px] border rounded" style={BORDER_STYLE} />
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={() => setEditingInteracaoId(null)} className="flex-1 px-2 py-1 text-[10.5px] border rounded" style={BORDER_STYLE}>Cancelar</button>
            <button onClick={() => saveInteracaoEdit(h.id)} className="flex-1 px-2 py-1 text-[10.5px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar</button>
          </div>
        </div>
      );
    }
    const Tag: any = h.href ? Link : "div";
    const tagProps: any = h.href ? { href: h.href } : {};
    return (
      <Tag key={h.id} {...tagProps} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition border group" style={{ borderColor: "#F0EBE0" }}>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold flex items-center gap-1 flex-wrap" style={{ color: "#014D5E" }}>
            {h.tipoLabel || h.title}
            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold uppercase ${h.fase === "LEAD" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{h.fase}</span>
          </div>
          <div className="text-[10.5px] text-gray-500 truncate">{h.subtitle}</div>
        </div>
        {isInteracao && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingInteracaoId(h.id); setInteracaoDraft(h.subtitle); }} className="text-[10px] text-gray-400 hover:text-[#009AAC] opacity-0 group-hover:opacity-100 flex-shrink-0" title="Editar interação">✏</button>
        )}
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); excluirHistorico(h); }} className="text-gray-300 hover:text-[#A32D2D] opacity-0 group-hover:opacity-100 flex-shrink-0" title="Excluir atendimento"><LuTrash size={11} /></button>
      </Tag>
    );
  }

  async function selectTutor(t: Tutor) {
    setTutor(t);
    setLead(null);
    setLeadConversa(null);
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

  async function selectLead(l: Lead, phoneHint?: string, createIfMissing?: { name?: string; phone?: string }) {
    setResults({ tutors: [], leads: [] });
    setSearch(l.name || l.phone || "");
    setActiveTab("contexto"); // ABRE aba contexto

    const phone = l.phone || phoneHint || (l as any).contactPhone || "";
    let achouLead = false;
    if (phone) {
      // Normaliza ANTES de buscar: conversas do Meta trazem o telefone SEM o 9 do celular
      // (ex.: 558586018111), entao o last9 do telefone cru nao bate com o cliente/lead (que tem o 9).
      // normalizePhone adiciona o 9 -> a busca acha o registro existente (e evita criar duplicata/colisao).
      const tail = last9(normalizePhone(phone) || phone);
      const resT = await fetch(`/api/tutors?search=${encodeURIComponent(tail)}&limit=3`);
      const dT = await safeJson<any>(resT, {});
      const arr = Array.isArray(dT) ? dT : (dT.tutors || dT.data || []);
      if (arr[0]) {
        await selectTutor(arr[0]);
        return;
      }
      // Resolve o Lead REAL do CRM pelo telefone. Conversas do Meta (WhatsApp oficial) carregam
      // o id da CONVERSA, nao de um Lead — entao os botoes (pipeline/converter) bateriam em 404.
      try {
        const resL = await fetch(`/api/leads?search=${encodeURIComponent(tail)}&limit=5`);
        const dL = await safeJson<any>(resL, {});
        const arrL = Array.isArray(dL) ? dL : (dL.leads || dL.data || []);
        const real = arrL.find((x: any) => x.id === l.id) || arrL.find((x: any) => last9(x.phone || "") === tail);
        if (real) { l = real; achouLead = true; }
      } catch { /* mantem o lead recebido */ }
    }
    // Conversa do Meta sem cliente/lead: NAO cria agora. Mostra como lead PROVISORIO
    // (com nome/telefone da conversa) e marca como pendente; o Lead so vira real quando a
    // Cintia usar um botao (mudar etapa, registrar, converter, salvar pet) -> ver materializarLead().
    if (!achouLead && createIfMissing) {
      l = { ...l, name: createIfMissing.name || l.name || "Sem nome", phone: createIfMissing.phone || (l as any).contactPhone || l.phone } as Lead;
      setLeadConversa({ name: createIfMissing.name, phone: createIfMissing.phone });
    } else {
      setLeadConversa(null);
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
      await selectLead(item.raw as Lead, item.phone, item.canal === "Meta" ? { name: item.name, phone: item.phone } : undefined);
    } else {
      await selectTutor(item.raw as Tutor);
    }
  }

  function reset() {
    setSearch(""); setTutor(null); setLead(null); setLeadConversa(null); setLeadHistorico(null);
    setResults({ tutors: [], leads: [] }); setPets([]); setSelectedPet(null);
    setHistorico([]);
    setCadastroOpen(false); setInteracaoOpen(false); setForwardOpen(false);
    setActiveTab("inbox"); // volta pra Caixa
  }

  // Garante um Lead REAL antes de uma acao. Se a conversa do Meta ainda nao virou Lead,
  // cria agora (so quando a Cintia clica num botao). Retorna o lead real ou null se falhar.
  async function materializarLead(): Promise<Lead | null> {
    if (!lead) return null;
    if (!leadConversa) return lead; // ja e um lead real
    const cleanPhone = normalizePhone(leadConversa.phone || lead.phone || "") || (leadConversa.phone || lead.phone || "") || "";
    const emailFallback = cleanPhone ? `contato+${cleanPhone}@emporiodopet.crm` : undefined;
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: leadConversa.name || lead.name || "Sem nome",
        phone: cleanPhone || undefined,
        email: emailFallback,
        source: "WHATSAPP",
        customFields: { canal: "Meta" },
      }) });
      if (res.ok) { const novo = await res.json(); setLead(novo); setLeadConversa(null); toast.success("Lead criado"); return novo; }
      if (res.status === 409) {
        const body = await safeJson<any>(res, {});
        if (body?.tutorId) { // telefone ja e de um cliente -> abre o cliente
          const t = await safeJson<any>(await fetch(`/api/tutors/${body.tutorId}`), null);
          if (t) { await selectTutor(t); toast("Esse telefone ja e de um cliente."); return null; }
        }
        if (cleanPhone) { // tenta achar lead existente
          const d = await safeJson<any>(await fetch(`/api/inbox/context/lookup?phone=${encodeURIComponent(cleanPhone)}`), {});
          if (d?.unified?.lead) { setLead(d.unified.lead); setLeadConversa(null); return d.unified.lead; }
        }
      }
      toast.error("Nao foi possivel criar o lead");
      return null;
    } catch { toast.error("Erro ao criar o lead"); return null; }
  }
  async function updateLeadEtapa(value: string) {
    if (!lead) return;
    const real = await materializarLead();
    if (!real) return;
    const res = await fetch(`/api/leads/${real.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineComercialEtapa: value }) });
    if (!res.ok) { toast.error("Erro ao atualizar"); return; }
    toast.success("Etapa atualizada");
    setLead({ ...real, pipelineComercialEtapa: value });
  }
  async function salvarPetInteresse(nome: string, especie: string) {
    if (!lead) return;
    const real = await materializarLead();
    if (!real) return;
    const cf = { ...((real.customFields || {}) as any), petName: nome, especie };
    try {
      const res = await fetch(`/api/leads/${real.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customFields: cf }) });
      if (!res.ok) { toast.error("Erro ao salvar pet de interesse"); return; }
      setLead({ ...real, customFields: cf } as Lead);
      toast.success("Pet de interesse salvo");
    } catch { toast.error("Erro ao salvar"); }
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
  async function savePetField(petId: string, patch: Record<string, any>) {
    const res = await fetch(`/api/pets/${petId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) { toast.error("Erro ao salvar"); return; }
    toast.success("Pet atualizado");
    setPets(pets.map(p => p.id === petId ? ({ ...p, ...patch } as Pet) : p));
    setSelectedPet(selectedPet && selectedPet.id === petId ? ({ ...selectedPet, ...patch } as Pet) : selectedPet);
  }

  async function loadPacotesInbox(pid: string) {
    try {
      const r = await fetch(`/api/listas?lista=${encodeURIComponent("petpac_" + pid)}`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      setPacotesInbox(arr.map((i: any) => { let dd: any = {}; try { dd = JSON.parse(i.valor); } catch {} return { id: i.id, data: dd }; }));
    } catch { setPacotesInbox([]); }
  }
  async function addPacoteInbox() {
    if (!selectedPet) return;
    const srv = fisioSrvInbox.find((x: any) => String(x.id) === pacFormInbox.serviceId);
    if (!srv) { toast.error("Escolha um serviço de fisioterapia"); return; }
    const total = Number(pacFormInbox.total) || 0; if (total <= 0) { toast.error("Informe o total de sessões"); return; }
    setSavingPacInbox(true);
    try {
      await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `petpac_${selectedPet.id}`, valor: JSON.stringify({ serviceId: srv.id, nome: srv.nome || srv.titulo || srv.descricao, total, used: Math.min(Math.max(Number(pacFormInbox.jaFeitas) || 0, 0), total), createdAt: new Date().toISOString() }) }) });
      toast.success("Pacote criado");
      try { await fetch(`/api/pets/${selectedPet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineFisioEtapa: "Pacote em andamento" }) }); setPets(ps => ps.map(pp => pp.id === selectedPet.id ? ({ ...pp, pipelineFisioEtapa: "Pacote em andamento" } as Pet) : pp)); setSelectedPet(sp => sp && sp.id === selectedPet.id ? ({ ...sp, pipelineFisioEtapa: "Pacote em andamento" } as Pet) : sp); } catch {}
      setPacFormInbox({ open: false, serviceId: "", total: "4", jaFeitas: "0" });
      await loadPacotesInbox(selectedPet.id);
    } catch { toast.error("Erro ao criar pacote"); } finally { setSavingPacInbox(false); }
  }
  async function usarSessaoInbox(pk: { id: string; data: any }) {
    if (!selectedPet) return;
    const total = pk.data.total || 0;
    const used = Math.min((pk.data.used || 0) + 1, total);
    try {
      const r = await fetch(`/api/listas/${pk.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...pk.data, used }) }) });
      if (!r.ok) throw new Error();
      await loadPacotesInbox(selectedPet.id);
      if (used === total || (total > 1 && used === total - 1)) {
        const ultima = used === total;
        const texto = ultima ? `⚠ Pacote "${pk.data.nome}": ÚLTIMA sessão usada (${used}/${total}). Verificar renovação com o cliente.` : `⚠ Pacote "${pk.data.nome}": penúltima sessão (${used}/${total}). Avaliar renovação.`;
        try { await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId: selectedPet.id, tipo: "NOTA", texto, canal: "Sistema" }) }); } catch {}
        try { await fetch(`/api/pets/${selectedPet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date().toISOString(), ...(ultima ? { pipelineFisioEtapa: "Reavaliação" } : {}) }) }); if (ultima) { setPets(ps => ps.map(pp => pp.id === selectedPet.id ? ({ ...pp, pipelineFisioEtapa: "Reavaliação" } as Pet) : pp)); setSelectedPet(sp => sp && sp.id === selectedPet.id ? ({ ...sp, pipelineFisioEtapa: "Reavaliação" } as Pet) : sp); } } catch {}
        toast(ultima ? "🎉 Pacote concluído!" : "⏳ Penúltima sessão — avaliar renovação");
      }
    } catch { toast.error("Erro ao registrar sessão"); }
  }
  async function delPacoteInbox(id: string) {
    if (!selectedPet) return;
    try { await fetch(`/api/listas/${id}`, { method: "DELETE" }); toast.success("Pacote removido"); await loadPacotesInbox(selectedPet.id); } catch { toast.error("Erro"); }
  }
  useEffect(() => {
    (async () => { try { const r = await fetch(`/api/servicos/itens`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || d.servicos || []); setFisioSrvInbox(arr.filter((srv: any) => JSON.stringify(srv).toLowerCase().includes("fisio"))); } catch {} })();
  }, []);
  useEffect(() => {
    if (selectedPet?.id) loadPacotesInbox(selectedPet.id);
    else { setPacotesInbox([]); setPacFormInbox({ open: false, serviceId: "", total: "4", jaFeitas: "0" }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet?.id]);
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [proximasTick, setProximasTick] = useState(0);
  const agendaDefaults = useMemo(() => (tutor && selectedPet ? { tutor, petId: selectedPet.id } : undefined), [tutor?.id, selectedPet?.id]);
  useEffect(() => {
    if (!selectedPet?.id) { setProximasConsultas([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/appointments?petId=${selectedPet.id}&startDate=${new Date().toISOString()}&limit=20`, { cache: "no-store" });
        const d = await safeJson<any>(r, {});
        const arr = Array.isArray(d) ? d : (d.appointments || d.data || []);
        const futuras = (arr as any[])
          .filter((a) => a && a.date && new Date(a.date).getTime() >= Date.now() && a.status !== "CANCELED" && a.status !== "CANCELLED")
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (!cancelled) setProximasConsultas(futuras);
      } catch { if (!cancelled) setProximasConsultas([]); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet?.id, proximasTick]);
  const [avGoogle, setAvGoogle] = useState<any>(null);
  const [notaGoogleOpen, setNotaGoogleOpen] = useState(false);
  useEffect(() => {
    if (!tutor?.id) { setAvGoogle(null); setNotaGoogleOpen(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/avaliacoes/google`, { cache: "no-store" });
        const d = await safeJson<any>(r, []);
        const arr = Array.isArray(d) ? d : (d.data || d.avaliacoes || []);
        const mine = (arr as any[]).filter((a) => a.tutorId === tutor.id);
        if (!cancelled) setAvGoogle(mine[0] || null);
      } catch { if (!cancelled) setAvGoogle(null); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor?.id]);
  async function avaliarNotaGoogle(n: number) {
    if (!tutor) return;
    setNotaGoogleOpen(false);
    const gostou = n >= 4;
    const body: any = { tutorId: tutor.id, notaDada: n, gostou, status: gostou ? "LINK_ENVIADO" : "NAO_GOSTOU" };
    if (gostou) { body.linkEnviado = GOOGLE_REVIEW_LINK; body.canalEnvio = "WhatsApp"; }
    try {
      const r = await fetch(`/api/avaliacoes/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const novo = await safeJson<any>(r, null);
      if (!r.ok || !novo) throw new Error();
      setAvGoogle(novo);
      toast.success(gostou ? `Nota ${n}/5 — pode enviar o Google!` : `Feedback interno registrado (${n}/5)`);
    } catch { toast.error("Erro ao registrar avaliação"); }
  }
  async function enviarLinkGoogle() {
    try { await navigator.clipboard.writeText(GOOGLE_REVIEW_LINK); toast.success("Link do Google copiado — cole no WhatsApp do cliente"); } catch {}
    window.open(GOOGLE_REVIEW_LINK, "_blank");
  }
  async function marcarAvaliouGoogle() {
    if (!avGoogle?.id) return;
    try {
      const r = await fetch(`/api/avaliacoes/google/${avGoogle.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ votoConfirmado: true, status: "VOTOU" }) });
      const upd = await safeJson<any>(r, null);
      if (!r.ok) throw new Error();
      setAvGoogle(upd || { ...avGoogle, votoConfirmado: true, status: "VOTOU" });
      toast.success("Avaliação recebida 🎉");
    } catch { toast.error("Erro ao atualizar"); }
  }
  async function enviarPesquisaWhatsApp() {
    if (!tutor) return;
    try {
      const r = await fetch(`/api/survey-avaliacao/enviar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor.id }) });
      const d = await safeJson<any>(r, null);
      if (!r.ok || !d?.success) throw new Error(d?.error || "Falha ao enviar");
      toast.success("Pesquisa enviada no WhatsApp 📲");
      setAvGoogle({ status: "PERGUNTA_ENVIADA", tutorId: tutor.id });
    } catch (e: any) { toast.error(e?.message || "Erro ao enviar pesquisa"); }
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
  async function dismissIncoming(item: IncomingItem) {
    try {
      if (item.id.startsWith("M-")) {
        await fetch(`/api/whatsapp/conversations/${item.id.slice(2)}/close`, { method: "POST" });
      } else if (item.id.startsWith("L-")) {
        await fetch("/api/inbox/context/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: item.id.slice(2) }) });
      } else if (item.id.startsWith("T-")) {
        await fetch("/api/inbox/context/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: item.id.slice(2) }) });
      }
      setIncoming((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Removido da caixa");
    } catch { toast.error("Erro ao remover"); }
  }
  async function handleResolve() {
    if (!confirm("Marcar essa conversa como resolvida?")) return;
    const res = await fetch("/api/inbox/context/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor?.id, leadId: lead?.id }) });
    if (!res.ok) { toast.error("Erro ao resolver"); return; }
    toast.success("Resolvido");
    loadIncoming();
    reset();
  }
  async function handleConverter(classif?: any) {
    if (!lead) return;
    const classificacao = typeof classif === "string" ? classif : undefined;
    if (!confirm(`Converter ${lead.name || "esse lead"} em cliente${classificacao ? " (" + classificacao + ")" : ""}?`)) return;
    const real = await materializarLead();
    if (!real) return;
    // Inclui pet de interesse no payload da conversão
    const body: any = {};
    if (leadPetNome) {
      body.petName = leadPetNome;
      body.petEspecie = leadPetEspecie;
    }
    const res = await fetch(`/api/leads/${real.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast.error("Erro ao converter"); return; }
    const data = await res.json();
    toast.success(data.linked ? "Vinculado ao cliente existente" : "Cliente criado");
    if (data.tutorId) {
      if (classificacao) {
        try { await fetch(`/api/tutors/${data.tutorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classificacao }) }); } catch {}
      }
      const rT = await fetch(`/api/tutors/${data.tutorId}`);
      const t = await safeJson<any>(rT, null);
      if (t) await selectTutor(t);
    }
  }
  async function addClassifCatLead() {
    const nome = window.prompt("Nova categoria de classificacao:");
    if (!nome || !nome.trim()) return;
    const v = nome.trim();
    setClassifOpen(false);
    try {
      await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "classificacao_tutor", valor: v }) });
      setClassifCats((cs) => (cs.includes(v) ? cs : [...cs, v]));
      await handleConverter(v);
    } catch { toast.error("Erro ao adicionar categoria"); }
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

  const classifColor = (c?: string) => c === "Fornecedor" ? "#6D28D9" : c === "Parceiro" ? "#BE185D" : c === "Cliente" ? "#0E5560" : "#64748b";
  async function saveClassificacao(valor: string) {
    if (!tutor) return;
    setClassifOpen(false);
    try {
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classificacao: valor }) });
      if (!r.ok) throw new Error();
      setTutor({ ...tutor, classificacao: valor } as any);
      toast.success("Classificacao: " + valor);
    } catch { toast.error("Erro ao classificar"); }
  }
  async function addClassifCat() {
    const nome = window.prompt("Nova categoria de classificacao:");
    if (!nome || !nome.trim()) return;
    const v = nome.trim();
    try {
      await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "classificacao_tutor", valor: v }) });
      setClassifCats((cs) => (cs.includes(v) ? cs : [...cs, v]));
      await saveClassificacao(v);
    } catch { toast.error("Erro ao adicionar categoria"); }
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
    let leadIdReal: string | undefined = undefined;
    if (lead) { const real = await materializarLead(); if (!real) return; leadIdReal = real.id; }
    const payload: any = {
      tipo: interacaoForm.tipo,
      texto: interacaoForm.texto,
      proximaAcao: interacaoForm.proximaAcao || undefined,
      proximoFollowupAt: interacaoForm.proximoFollowupAt ? new Date(interacaoForm.proximoFollowupAt).toISOString() : undefined,
      canal,
      ...(tutor && { tutorId: tutor.id }),
      ...(leadIdReal && { leadId: leadIdReal }),
      ...(selectedPet && { petId: selectedPet.id }),
    };
    const res = await fetch("/api/interacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Interação registrada");
    setInteracaoOpen(false);
    setInteracaoForm({ texto: "", tipo: "NOTA", proximaAcao: "", proximoFollowupAt: "" });
    const hist = await carregarHistorico(tutor?.id, leadIdReal, leadHistorico?.id);
    setHistorico(hist);
  }

  async function saveResumo() {
    const txt = resumoDraft.trim();
    if (lead) {
      const real = await materializarLead();
      if (!real) return;
      const r = await fetch(`/api/leads/${real.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() }) });
      if (!r.ok) { toast.error("Erro ao salvar resumo"); return; }
      setLead({ ...real, resumoIa: txt, resumoIaUpdatedAt: new Date().toISOString() });
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
      const real = await materializarLead();
      if (!real) return;
      const r = await fetch(`/api/leads/${real.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setLead({ ...real, name: v });
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

  async function excluirHistorico(h: any) {
    if (!(await confirmDelete({ entityLabel: "atendimento", itemName: "este atendimento" }))) return;
    const isInt = h.type === "INTERACAO";
    const realId = String(h.id || "").replace(/^(it-|il-|i-|at-)/, "");
    const url = isInt ? `/api/interacoes/${realId}` : `/api/appointments/${realId}`;
    try {
      const r = await fetch(url, { method: "DELETE" });
      if (!r.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído");
      const hist = await carregarHistorico(tutor?.id, lead?.id, leadHistorico?.id);
      setHistorico(hist);
    } catch { toast.error("Erro ao excluir"); }
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
      const real = await materializarLead();
      if (!real) return;
      const r = await fetch(`/api/leads/${real.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: v }) });
      if (!r.ok) { toast.error("Erro"); return; }
      setLead({ ...real, phone: v });
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

  const SECTION = "rounded-xl border bg-white mb-2";
  const SECTION_STYLE: React.CSSProperties = { borderColor: "#E8E2D6", padding: 11 };
  // estilo só de borda (usado em inputs, busca, dropdowns) — NÃO leva padding de card
  const BORDER_STYLE: React.CSSProperties = { borderColor: "#E8DFC8" };
  const NUM = "inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold mr-1.5";
  const LBL = "text-[10px] font-bold tracking-wide uppercase mb-1.5 flex items-center justify-between";
  const LBL_STYLE: React.CSSProperties = { color: "#8A989D" };
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

      {/* ========== Busca + ações (mesma linha) ========== */}
      <div className="px-3 py-2 border-b flex-shrink-0 flex items-center gap-1.5" style={BORDER_STYLE}>
        {/* BUSCA */}
        <div className="relative flex-1 min-w-0">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); if (!e.target.value && !tutor && !lead) { /* mantém aba */ } }} placeholder="Telefone, nome ou email..." className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm bg-white" style={BORDER_STYLE} />
          {(results.tutors.length > 0 || results.leads.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto" style={BORDER_STYLE}>
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
        {/* AÇÕES */}
        {(tutor || lead) && (
          <>
            <div className="relative flex-shrink-0">
              <button onClick={() => setForwardOpen(o => !o)} title="Encaminhar" className="flex items-center justify-center w-7 h-7 rounded border hover:bg-gray-50" style={{ borderColor: "#E8DFC8", color: "#475569" }}>
                <LuShare2 size={13} />
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
            <button onClick={handleResolve} title="Resolver" className="flex items-center justify-center w-7 h-7 rounded text-white flex-shrink-0" style={{ background: "#009AAC" }}>
              <LuCheckCheck size={13} />
            </button>
            <button onClick={reset} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Voltar pra Caixa"><LuX size={13} /></button>
          </>
        )}
        {!tutor && !lead && !cadastroOpen && (
          <button onClick={() => { setCadastroOpen(true); setCadastroAs("LEAD"); setCadForm({ ...cadForm, telefone: onlyDigits(search) || search, nome: "" }); }} className="text-[10.5px] font-semibold flex items-center gap-1 flex-shrink-0 whitespace-nowrap" style={{ color: "#009AAC" }}>
            <LuPlus size={11} /> cadastrar
          </button>
        )}
      </div>

      {/* ========== CONTEÚDO BASEADO NA ABA ========== */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Aba INBOX = Caixa de Entrada */}
        {activeTab === "inbox" && (
          <div className="p-2.5 space-y-1.5">
            {loadingIncoming && incoming.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-gray-400">Carregando...</div>
            ) : incoming.length === 0 ? (
              incomingError ? (
                <div className="text-center py-6 text-[11px] text-gray-500">
                  Não foi possível carregar a caixa de entrada.<br />
                  <button onClick={() => loadIncoming()} className="mt-2 inline-flex items-center gap-1 text-[#009AAC] font-medium hover:underline">Tentar novamente</button>
                </div>
              ) : (
                <div className="text-center py-6 text-[11px] text-gray-400 italic">
                  Nenhum contato novo agora.<br />
                  Quando alguém escrever pelo BotConversa, aparece aqui.
                </div>
              )
            ) : (
              <>
                {incoming.slice(0, incomingLimit).map(item => {
                  const isLead = item.kind === "LEAD";
                  const _cls = item.classificacao;
                  let tagLabel = isLead ? "Lead" : "Cliente"; let tagBg = isLead ? "#FEF3C7" : "#CCFBF1"; let tagFg = isLead ? "#92611A" : "#0E7490";
                  if (!isLead && _cls === "Fornecedor") { tagLabel = "Fornecedor"; tagBg = "#EDE9FE"; tagFg = "#6D28D9"; }
                  else if (!isLead && _cls === "Parceiro") { tagLabel = "Parceiro"; tagBg = "#FCE7F3"; tagFg = "#BE185D"; }
                  else if (!isLead && _cls === "Ex_cliente") { tagLabel = "Ex-cliente"; tagBg = "#FEE2E2"; tagFg = "#B91C1C"; }
                  return (
                    <div key={item.id} className="relative">
                    <button
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
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: tagBg, color: tagFg }}>{tagLabel}</span>
                          {(item.canais || ["BC"]).map((c) => (
                            <span key={c} className="text-[7.5px] font-bold px-1 rounded text-white" style={{ background: c === "Meta" ? "#1877F2" : "#009AAC" }}>{c}</span>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {item.phone ? formatPhone(item.phone) : "—"}
                          {item.petName && <> · 🐾 {item.petName}{item.petSpecies ? ` (${item.petSpecies})` : ""}</>}
                          {item.servico && <> · {item.servico}</>}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 flex-shrink-0">{fmtRelative(item.createdAt)}</div>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); dismissIncoming(item); }} title="Resolver / remover da caixa" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[11px] text-gray-400 hover:text-[#0F6E56] hover:border-[#0F6E56]" style={{ borderColor: "#E8DFC8" }}>✓</button>
                    </div>
                  );
                })}
                {incoming.length >= incomingLimit && (
                  <button onClick={() => setIncomingLimit(l => l + 20)} className="w-full py-2 text-[10.5px] font-semibold border rounded text-[#014D5E]" style={BORDER_STYLE}>
                    ver mais ({incoming.length - incomingLimit}+)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Aba CONTEXTO */}
        {activeTab === "contexto" && (
          <div className="p-2.5" style={{ background: "#F6F2EA", minHeight: "100%" }}>
            <button onClick={reset} className="w-full flex items-center gap-1.5 mb-2 px-2.5 py-2 text-[11.5px] font-semibold rounded-lg border" style={{ borderColor: "#bfe3e8", color: "#00798A", background: "#E0F4F6" }}>
              <LuArrowLeft size={14} /> Voltar para a Caixa de entrada
            </button>
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
                  <input value={cadForm.nome} onChange={e => setCadForm({ ...cadForm, nome: e.target.value })} placeholder="Nome *" className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                  <input value={cadForm.telefone} onChange={e => setCadForm({ ...cadForm, telefone: e.target.value })} placeholder="Telefone *" className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                  <input value={cadForm.email} onChange={e => setCadForm({ ...cadForm, email: e.target.value })} placeholder="Email (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                  <select value={cadForm.origem} onChange={e => setCadForm({ ...cadForm, origem: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE}>
                    {Object.keys(sourceMap).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {cadastroAs === "CLIENTE" && (
                    <>
                      <input value={cadForm.petNome} onChange={e => setCadForm({ ...cadForm, petNome: e.target.value })} placeholder="Pet (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                      <select value={cadForm.petEspecie} onChange={e => setCadForm({ ...cadForm, petEspecie: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE}>
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

            {/* BLOCO 2: CLIENTE com toggle Lead↔Cliente */}
            {tutor && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className="flex items-center gap-1.5 mb-2.5" style={{ color: "#8A989D" }}><span className="text-[13px] leading-none" aria-hidden>🏪</span><span className="text-[11px] font-medium">Empório do Pet</span></div>
                <div className={LBL}>
                  <div className="relative inline-flex ml-1" style={{ verticalAlign: "middle" }}>
                    <button type="button" onClick={() => setClassifOpen((o) => !o)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5" style={{ background: "#FAFAF7", border: "1px solid #E8DFC8", color: classifColor(tutor.classificacao || "Cliente") }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: classifColor(tutor.classificacao || "Cliente"), display: "inline-block" }} />
                      {tutor.classificacao || "Cliente"} ▾
                    </button>
                    {classifOpen && (
                      <div className="absolute left-0 z-30 bg-white rounded-lg p-1" style={{ top: 22, border: "1px solid #E3E0D7", boxShadow: "0 8px 22px rgba(0,0,0,.13)", minWidth: 158 }}>
                        {classifCats.map((c) => (
                          <div key={c} onClick={() => saveClassificacao(c)} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50" style={{ color: "#0E2244", textTransform: "none" }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: classifColor(c), display: "inline-block", flexShrink: 0 }} />
                            <span className="text-[12px] font-normal normal-case">{c}</span>
                            {(tutor.classificacao || "Cliente") === c && <span className="ml-auto text-[12px] font-bold" style={{ color: "#009AAC" }}>✓</span>}
                          </div>
                        ))}
                        <div style={{ height: 1, background: "#EEEBE3", margin: "4px 6px" }} />
                        <div onClick={() => { setClassifOpen(false); handleDesconverter(); }} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50" style={{ color: "#B45309" }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#D97706", display: "inline-block", flexShrink: 0 }} />
                          <span className="text-[12px] font-normal normal-case">Voltar a Lead</span>
                        </div>
                        <div onClick={addClassifCat} className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50" style={{ color: "#009AAC", fontWeight: 600 }}>
                          <LuPlus size={12} /> <span className="text-[12px] normal-case">adicionar categoria</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Link href={`/dashboard/erp/tutores/${tutor.id}`} className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0" style={{ background: "#E0F4F6", color: "#014D5E" }}>{initials(tutor.name)}</div>
                  <div className="min-w-0 flex-1">
                    {editingName ? (
                      <div className="flex gap-1 mb-1">
                        <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }} className="flex-1 text-[12.5px] font-semibold border rounded px-1.5 py-0.5" style={{ borderColor: "#009AAC", color: "#014D5E" }} />
                        <button onClick={() => setNameDraft("")} title="Limpar" className="px-1.5 text-[10px] border rounded text-gray-500" style={{ borderColor: "#E8DFC8" }}>🗑</button>
                        <button onClick={saveName} className="px-1.5 text-[10px] text-white rounded font-semibold" style={{ background: "#009AAC" }}>✓</button>
                        <button onClick={() => setEditingName(false)} className="px-1.5 text-[10px] border rounded" style={{ borderColor: "#E8DFC8" }}>✕</button>
                      </div>
                    ) : (
                      <div onClick={() => setFichaOpen((o) => !o)} className="text-[15px] font-semibold truncate cursor-pointer hover:underline" style={{ color: "#014D5E" }} title="Clique para editar">{tutor.name} <LuPencil className="inline -mt-0.5 text-gray-300" size={12} /></div>
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
                          <FaWhatsapp size={12} className="inline -mt-0.5" style={{ color: "#0F9D58" }} /> {tutorPrimaryPhone ? formatPhone(tutorPrimaryPhone) : "+ adicionar telefone"}
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
              </section>
            )}
            {tutor && fichaOpen && (
            <section className={SECTION} style={{ ...SECTION_STYLE, border: "1px solid #D6E9EC", background: "#FAFEFE" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: "#0E5560" }}>Ficha do cliente</span>
                <button onClick={() => setFichaOpen(false)} className="text-[10px] text-gray-400">fechar</button>
              </div>
              <div className="flex items-center justify-between text-[12.5px] py-1.5 border-b" style={{ borderColor: "#EFEAE0" }}>
                <span><span className="text-gray-400 text-[10px] mr-2">Nome</span>{tutor.name}</span>
                <button onClick={() => { setNameDraft(tutor.name); setEditingName(true); setFichaOpen(false); }} className="text-[11px]" style={{ color: "#009AAC" }}>editar</button>
              </div>
              <div className="flex items-center justify-between text-[12.5px] py-1.5 border-b" style={{ borderColor: "#EFEAE0" }}>
                <span><span className="text-gray-400 text-[10px] mr-2">Telefone</span>{tutorPrimaryPhone ? formatPhone(tutorPrimaryPhone) : "—"}</span>
                <button onClick={() => { setEditingPhone(true); setFichaOpen(false); }} className="text-[11px]" style={{ color: "#009AAC" }}>editar</button>
              </div>
              <label className="block text-[10px] text-gray-500 mt-2 mb-1">Estado do relacionamento</label>
              <select value={tutor.estadoRelacionamento || ""} onChange={(e) => updateTutorEstado(e.target.value)} className="w-full text-[12.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", background: "white" }}>
                <option value="">— selecionar —</option>
                {ESTADO_RELACIONAMENTO.map((opt) => (<option key={opt.v} value={opt.v}>{opt.label}</option>))}
              </select>
            </section>
          )}
          {/* BLOCO 2: LEAD com toggle Lead↔Cliente + PET DE INTERESSE */}
            {!tutor && lead && (
              <section className={SECTION} style={{ ...SECTION_STYLE, background: "#FFFBEB" }}>
                <div className="flex items-center gap-1.5 mb-2.5" style={{ color: "#8A989D" }}><span className="text-[13px] leading-none" aria-hidden>🎯</span><span className="text-[11px] font-medium">Lead</span></div>
                <div className={LBL}>
                  <div className="relative inline-flex" style={{ verticalAlign: "middle" }}>
                    <button type="button" onClick={() => setClassifOpen((o) => !o)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#D97706" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
                      Lead ▾
                    </button>
                    {classifOpen && (
                      <div className="absolute left-0 z-30 bg-white rounded-lg p-1" style={{ top: 22, border: "1px solid #E3E0D7", boxShadow: "0 8px 22px rgba(0,0,0,.13)", minWidth: 172 }}>
                        <div className="px-2 py-1 text-[10px] font-bold" style={{ color: "#92611A" }}>Converter em cliente:</div>
                        {classifCats.map((c) => (
                          <div key={c} onClick={() => { setClassifOpen(false); handleConverter(c); }} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50" style={{ color: "#0E2244", textTransform: "none" }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: classifColor(c), display: "inline-block", flexShrink: 0 }} />
                            <span className="text-[12px] font-normal normal-case">{c}</span>
                          </div>
                        ))}
                        <div style={{ height: 1, background: "#EEEBE3", margin: "4px 6px" }} />
                        <div onClick={addClassifCatLead} className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50" style={{ color: "#009AAC", fontWeight: 600 }}>
                          <LuPlus size={12} /> <span className="text-[12px] normal-case">adicionar categoria</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {!leadConversa && <Link href={`/dashboard/crm/leads/${lead.id}`} className={LINK} style={{ color: "#009AAC" }}>Ficha <LuExternalLink size={9} className="inline -mt-0.5" /></Link>}
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
                          <FaWhatsapp size={12} className="inline -mt-0.5" style={{ color: "#0F9D58" }} /> {lead.phone ? formatPhone(lead.phone) : "+ adicionar telefone"}
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
                    {lead.pipelineComercialEtapa && !(pipeDyn.comercial.length ? pipeDyn.comercial : PIPELINE_COMERCIAL).includes(lead.pipelineComercialEtapa) && <option value={lead.pipelineComercialEtapa}>{lead.pipelineComercialEtapa}</option>}
                    {(pipeDyn.comercial.length ? pipeDyn.comercial : PIPELINE_COMERCIAL).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                {/* PET DE INTERESSE */}
                <div className="text-[9.5px] font-bold uppercase text-[#92611A] mt-2 mb-1">🐾 Pet de interesse</div>
                <div className="flex gap-1.5">
                  <input value={leadPetNome} onChange={e => setLeadPetNome(e.target.value)} onBlur={() => salvarPetInteresse(leadPetNome, leadPetEspecie)} placeholder="Nome do pet" className="flex-1 px-2 py-1 text-[11px] border rounded" style={{ borderColor: "#E8DFC8" }} />
                  <select value={leadPetEspecie} onChange={e => { setLeadPetEspecie(e.target.value); salvarPetInteresse(leadPetNome, e.target.value); }} className="px-2 py-1 text-[11px] border rounded w-[80px]" style={{ borderColor: "#E8DFC8" }}>
                    <option>Cão</option><option>Gato</option><option>Outro</option>
                  </select>
                </div>
                <button onClick={handleConverter} className="mt-2 w-full text-[10.5px] py-1.5 border rounded font-semibold hover:bg-white flex items-center justify-center gap-1" style={{ borderColor: "#009AAC", color: "#009AAC" }}>
                  <LuArrowUpRight size={12} /> Converter em cliente
                </button>
              </section>
            )}

            {/* BLOCO 2.5: SCORE DO CLIENTE (F5) */}
            {tutor && tutorScore && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className="flex items-center gap-3">
                  <svg width="46" height="46" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#EEEBE3" strokeWidth="6" />
                    <circle cx="32" cy="32" r="27" fill="none" stroke="#009AAC" strokeWidth="6" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset={169.6 - (Math.max(0, Math.min(100, tutorScore.total)) / 100) * 169.6} transform="rotate(-90 32 32)" />
                    <text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="600" fill="#0E2244">{tutorScore.total}</text>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium" style={{ color: "#014D5E" }}>📊 Cliente {(tutorScore.label || "").toLowerCase()} <span className="text-[10px] text-gray-400 font-normal">· score {tutorScore.total}/100</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                  <div className="rounded-lg text-center px-1 py-1.5" style={{ background: "#FBF9F4", border: "1px solid #F0EBE0" }}>
                    <div className="text-[15px] font-bold leading-none" style={{ color: "#014D5E" }}>{tutorScore.dimensions?.visitas?.score ?? 0}</div>
                    <div className="text-[8.5px] mt-1" style={{ color: "#8A989D" }}>Visitas</div>
                  </div>
                  <div className="rounded-lg text-center px-1 py-1.5" style={{ background: "#FBF9F4", border: "1px solid #F0EBE0" }}>
                    <div className="text-[15px] font-bold leading-none" style={{ color: "#014D5E" }}>{tutorScore.dimensions?.ltv?.score ?? 0}</div>
                    <div className="text-[8.5px] mt-1" style={{ color: "#8A989D" }}>LTV</div>
                  </div>
                  <div className="rounded-lg text-center px-1 py-1.5" style={{ background: "#FBF9F4", border: "1px solid #F0EBE0" }}>
                    <div className="text-[15px] font-bold leading-none" style={{ color: "#014D5E" }}>{tutorScore.dimensions?.recencia?.score ?? 0}</div>
                    <div className="text-[8.5px] mt-1" style={{ color: "#8A989D" }}>Recência</div>
                  </div>
                  <div className="rounded-lg text-center px-1 py-1.5" style={{ background: "#FBF9F4", border: "1px solid #F0EBE0" }}>
                    <div className="text-[15px] font-bold leading-none" style={{ color: "#014D5E" }}>{tutorScore.dimensions?.nps?.score ?? 0}</div>
                    <div className="text-[8.5px] mt-1" style={{ color: "#8A989D" }}>NPS</div>
                  </div>
                </div>
              </section>
            )}

            {/* BLOCO 2.55: AVALIACAO GOOGLE */}
          {tutor && (
            <section className={SECTION} style={{ ...SECTION_STYLE, background: "#FFFDF5", borderColor: "#F0E6C8" }}>
              <div className="flex items-center gap-2">
                <span className="text-[15px]">⭐</span>
                <span className="text-[12.5px] font-medium">Avaliação Google</span>
                <div className="ml-auto flex items-center gap-1">
                  {(!avGoogle || avGoogle.status === "NAO_GOSTOU" || avGoogle.status === "PERGUNTA_ENVIADA") && (
                    <button type="button" onClick={enviarPesquisaWhatsApp} title="Enviar/reenviar a pesquisa de satisfação pelo WhatsApp" className="text-[10px] px-2 py-1 rounded-lg font-semibold" style={{ background: "#DCFCE7", color: "#0F6E56" }}>📲 {avGoogle && avGoogle.status === "PERGUNTA_ENVIADA" ? "Reenviar" : "WhatsApp"}</button>
                  )}
                  {(!avGoogle || avGoogle.status === "NAO_GOSTOU" || avGoogle.status === "PERGUNTA_ENVIADA") && (
                    <button type="button" onClick={() => setNotaGoogleOpen((o) => !o)} className="text-[10px] px-2 py-1 rounded-lg text-white" style={{ background: "#009AAC" }}>{avGoogle ? "Refazer" : "Solicitar"}</button>
                  )}
                </div>
              </div>
              {notaGoogleOpen && (
                <div className="mt-2">
                  <div className="text-[10.5px] text-gray-500 mb-1">Que nota o cliente daria? (1 a 5)</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => avaliarNotaGoogle(n)} className="w-8 h-8 rounded-lg border text-[12px] font-bold hover:bg-amber-50" style={{ borderColor: "#E8DFC8", color: n >= 4 ? "#0F6E56" : "#B45309" }}>{n}</button>
                    ))}
                  </div>
                  <div className="text-[9.5px] text-gray-400 mt-1">4–5 envia o Google · 1–3 fica como feedback interno.</div>
                </div>
              )}
              {!avGoogle && !notaGoogleOpen && (
                <div className="text-[11px] text-gray-400 mt-2">Nenhuma avaliação solicitada.</div>
              )}
              {avGoogle && avGoogle.status === "PERGUNTA_ENVIADA" && !notaGoogleOpen && (
                <div className="text-[11px] mt-2" style={{ color: "#0E5560" }}>📲 Pesquisa enviada no WhatsApp · aguardando a resposta do cliente.</div>
              )}
              {avGoogle && avGoogle.status === "NAO_GOSTOU" && !notaGoogleOpen && (
                <div className="text-[11px] mt-2" style={{ color: "#B45309" }}>Feedback interno: {avGoogle.notaDada}/5 — não enviado ao Google.</div>
              )}
              {avGoogle && avGoogle.status === "LINK_ENVIADO" && (
                <div className="mt-2">
                  <div className="text-[11px] mb-1.5" style={{ color: "#0F6E56" }}>👍 Gostou ({avGoogle.notaDada}/5) · solicitação enviada · aguardando avaliação</div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={enviarLinkGoogle} className="text-[10.5px] px-2 py-1 rounded-lg text-white font-semibold" style={{ background: "#009AAC" }}>Copiar/abrir link</button>
                    <button type="button" onClick={marcarAvaliouGoogle} className="text-[10.5px] px-2 py-1 rounded-lg border font-semibold" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}>Marcar como avaliou</button>
                  </div>
                </div>
              )}
              {avGoogle && (avGoogle.status === "VOTOU" || avGoogle.votoConfirmado) && (
                <div className="text-[12px] mt-2" style={{ color: "#0F6E56" }}>★★★★★ Avaliação recebida 🎉</div>
              )}
            </section>
          )}
          {/* BLOCO 2.6: SEQUENCIAS (S3) */}
            {tutor && inscricoes.length > 0 && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}><span>🔁 Sequencias em andamento</span></div>
                <div className="space-y-1.5">
                  {inscricoes.map(i => {
                    const pausada = i.status === "PAUSADA";
                    return (
                      <div key={i.id} className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5" style={{ borderColor: pausada ? "#EBD9A8" : "#D6E9EC", background: pausada ? "#FFFDF5" : "#FAFEFE" }}>
                        <LuRepeat size={14} style={{ color: pausada ? "#9a6b00" : "#0E5560", flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-medium truncate" style={{ color: "#014D5E" }}>{i.cadencia?.nome || "Sequencia"}</div>
                          <div className="text-[10px] text-gray-500 truncate">{pausada ? "Pausada - tutor respondeu" : `Passo ${i.passoOrdem}${i.proximoEm ? ` - proximo ${fmtDate(i.proximoEm)}` : ""}`}</div>
                        </div>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: pausada ? "#FCF1DD" : "#E1F2F4", color: pausada ? "#9a6b00" : "#0E5560" }}>{pausada ? "Pausada" : "Ativa"}</span>
                        <button onClick={() => cancelarInscricaoSeq(i.id)} title="Cancelar sequencia" className="text-gray-300 hover:text-[#C2410C] flex-shrink-0" type="button"><LuX size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* BLOCO 3: PETS */}
            {tutor && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}>
                  <span>🐾 Pets {pets.length > 0 && `(${pets.length})`}{pets.length > 1 ? " · clique pra expandir" : ""}</span>
                  <button onClick={() => criarPetEAbrir(tutor.id, true)} className={LINK} style={{ color: "#009AAC" }} type="button"><LuPlus size={10} className="inline" /> cadastrar</button>
                </div>
                {pets.length > 0 ? (
                  <div className="flex flex-wrap gap-2 items-start">
                    {pets.map(p => {
                      const active = selectedPet?.id === p.id;
                      return (
                        <div key={p.id} className={`border ${active ? "w-full order-last rounded-lg mt-1" : "rounded-full hover:brightness-[0.97]"}`} style={active ? { background: "#cdebef", borderColor: "#009AAC" } : { background: "#e0f4f6", borderColor: "#9fd0d7" }}>
                          <button onClick={() => setSelectedPet(active ? null : p)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left">
                            <span className="text-[18px] leading-none flex-shrink-0" aria-hidden>{speciesEmoji(p.species)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-semibold truncate" style={{ color: "#014D5E" }}>{p.name}</div>
                              {(p.breed || p.birthDate) && (
                                <div className="text-[10px] text-gray-500 truncate">{[p.breed, p.birthDate ? ageFromBirth(p.birthDate) : null].filter(Boolean).join(" · ")}</div>
                              )}
                            </div>
                            <span onClick={(e) => { e.stopPropagation(); setSelectedPet(p); setFichaPet(st => ({ ...st, [p.id]: !st[p.id] })); }} title="Ficha do pet" className="text-gray-300 hover:text-[#009AAC] flex-shrink-0 cursor-pointer"><LuPencil size={13} /></span>
                          </button>
                          {active && fichaPet[p.id] && (
                            <div className="px-2 pb-2 pt-1 border-t" style={{ borderColor: "#cfe8eb" }}>
                              {(() => { const cadCompleto = !!(p.gender && p.breed && p.birthDate); const aberto = cadAberto[p.id] ?? !cadCompleto; return (<>
                              <button type="button" onClick={() => setCadAberto(st => ({ ...st, [p.id]: !(st[p.id] ?? !cadCompleto) }))} className="w-full flex items-center justify-between text-[9.5px] font-bold uppercase text-gray-400 mb-1 mt-1"><span>Dados do pet{cadCompleto ? "" : " · completar"}</span><span>{aberto ? "▴" : "▾"}</span></button>
                              {aberto && (<div className="space-y-1 text-[10.5px] mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Nome</span>
                                  <input defaultValue={p.name === "Sem nome" ? "" : p.name} placeholder="Nome do pet" onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) savePetField(p.id, { name: v }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E" }} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Espécie</span>
                                  <select value={speciesKey(p.species)} onChange={e => savePetField(p.id, { species: e.target.value, breed: null })} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }}>
                                    <option value="CANINE">Cão</option>
                                    <option value="FELINE">Gato</option>
                                    <option value="BIRD">Ave</option>
                                    <option value="RODENT">Roedor</option>
                                    <option value="REPTILE">Réptil</option>
                                    <option value="OTHER">Outro</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Sexo</span>
                                  <select value={p.gender || ""} onChange={e => savePetField(p.id, { gender: e.target.value || null })} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }}>
                                    <option value="">—</option>
                                    <option value="MALE">Macho</option>
                                    <option value="FEMALE">Fêmea</option>
                                    <option value="OTHER">Outro</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Raça</span>
                                  <select value={p.breed || ""} onChange={e => savePetField(p.id, { breed: e.target.value || null })} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }}>
                                    <option value="">— selecione —</option>
                                    {p.breed && !breedOptions.includes(p.breed) && <option value={p.breed}>{p.breed}</option>}
                                    {breedOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Nasc.</span>
                                  <input type="date" defaultValue={p.birthDate ? String(p.birthDate).slice(0, 10) : ""} onChange={e => savePetField(p.id, { birthDate: e.target.value ? new Date(e.target.value).toISOString() : null })} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                  <span className="text-[9.5px] text-gray-400 flex-shrink-0 w-12">{p.birthDate ? ageFromBirth(p.birthDate) : ""}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Peso</span>
                                  <input type="number" step="0.1" defaultValue={p.weight ?? ""} placeholder="kg" onBlur={e => { const v = e.target.value.trim(); savePetField(p.id, { weight: v ? Number(v.replace(",", ".")) : null }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Castr.</span>
                                  <select value={p.sterilization || ""} onChange={e => savePetField(p.id, { sterilization: e.target.value || null })} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }}>
                                    <option value="">—</option>
                                    <option value="STERILIZED">Castrado</option>
                                    <option value="NOT_STERILIZED">Inteiro</option>
                                    <option value="SCHEDULED">Agendado</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Pelagem</span>
                                  <input defaultValue={p.coatColor || ""} placeholder="cor / pelagem" onBlur={e => { const v = e.target.value.trim(); if (v !== (p.coatColor || "")) savePetField(p.id, { coatColor: v || null }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Microchip</span>
                                  <input defaultValue={p.microchip || ""} placeholder="número" onBlur={e => { const v = e.target.value.trim(); if (v !== (p.microchip || "")) savePetField(p.id, { microchip: v || null }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0">Plano</span>
                                  <input defaultValue={p.insurancePlan || ""} placeholder="convênio / plano" onBlur={e => { const v = e.target.value.trim(); if (v !== (p.insurancePlan || "")) savePetField(p.id, { insurancePlan: v || null }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-gray-400 w-12 flex-shrink-0 mt-1">Obs.</span>
                                  <textarea defaultValue={p.observations || ""} placeholder="Alergias / observações clínicas" rows={2} onBlur={e => { const v = e.target.value.trim(); if (v !== (p.observations || "")) savePetField(p.id, { observations: v || null }); }} className="flex-1 text-[10.5px] px-2 py-1 border rounded" style={{ borderColor: "#cfe8eb", color: "#014D5E", background: "white" }} />
                                </div>
                              </div>)}
                              </>); })()}
                              <div className="space-y-1.5 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e", minWidth: 28, textAlign: "center" }}>CLI</span>
                                  <select value={p.pipelineClinicoEtapa || ""} onChange={e => updatePetEtapa("pipelineClinicoEtapa", e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded font-medium" style={{ borderColor: "#fef3c7", color: "#014D5E", background: "white" }}>
                                    <option value="">— sem etapa —</option>
                                    {p.pipelineClinicoEtapa && !(pipeDyn.clinico.length ? pipeDyn.clinico : PIPELINE_CLINICO).includes(p.pipelineClinicoEtapa) && <option value={p.pipelineClinicoEtapa}>{p.pipelineClinicoEtapa}</option>}
                                    {(pipeDyn.clinico.length ? pipeDyn.clinico : PIPELINE_CLINICO).map(et => <option key={et} value={et}>{et}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#ede9fe", color: "#5b21b6", minWidth: 28, textAlign: "center" }}>FIS</span>
                                  <select value={p.pipelineFisioEtapa || ""} onChange={e => updatePetEtapa("pipelineFisioEtapa", e.target.value)} className="flex-1 text-[10.5px] px-2 py-1 border rounded font-medium" style={{ borderColor: "#ede9fe", color: "#014D5E", background: "white" }}>
                                    <option value="">— sem etapa —</option>
                                    {p.pipelineFisioEtapa && !(pipeDyn.fisio.length ? pipeDyn.fisio : PIPELINE_FISIO).includes(p.pipelineFisioEtapa) && <option value={p.pipelineFisioEtapa}>{p.pipelineFisioEtapa}</option>}
                                    {(pipeDyn.fisio.length ? pipeDyn.fisio : PIPELINE_FISIO).map(et => <option key={et} value={et}>{et}</option>)}
                                  </select>
                                </div>
                              </div>
                              
                              
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg p-3 text-center text-[11px] text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                    Nenhum pet cadastrado ainda<br />
                    <button onClick={() => criarPetEAbrir(tutor.id, true)} className="font-semibold mt-1" style={{ color: "#009AAC" }} type="button">+ Cadastrar pet</button>
                  </div>
                )}
              </section>
            )}

            {tutor && selectedPet && (
            <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-[11px]" style={{ background: "#F2FAFB", color: "#0E5560" }}>
              Tudo abaixo é do pet: <b style={{ fontWeight: 600 }}>{selectedPet.name}</b>
            </div>
          )}
          {/* BLOCO 3.4: VACINAS A RESOLVER (F3) */}
            {tutor && selectedPet && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}><span>💉 Vacinas a resolver</span></div>
                {vacPend.length === 0 ? (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "#1c7a47" }}><span aria-hidden>✅</span> Vacinas em dia.</div>
                ) : (
                  <div className="space-y-1.5">
                    {vacPend.map(v => (
                      <div key={v.id} className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5" style={{ borderColor: v.vencida ? "#F3D0C4" : "#EBD9A8", background: v.vencida ? "#FFF7F4" : "#FFFDF5" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.vencida ? "#C2410C" : "#9a6b00" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-medium truncate" style={{ color: "#014D5E" }}>{v.nome} · dose {v.numero}</div>
                          <div className="text-[10px] text-gray-500">{v.vencida ? `venceu ${fmtDate(v.dataPrevista)}` : (v.dias === 0 ? "vence hoje" : `vence em ${v.dias}d · ${fmtDate(v.dataPrevista)}`)}</div>
                        </div>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: v.vencida ? "#FBE6DF" : "#FCF1DD", color: v.vencida ? "#C2410C" : "#9a6b00" }}>{v.vencida ? "Vencida" : "A vencer"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 3.45: PACOTES DE FISIOTERAPIA (F4 - patinhas) */}
            {tutor && selectedPet && pacotesInbox.length > 0 && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}><span>🏥 Pacotes de fisioterapia</span></div>
                <div className="space-y-2">
                  {pacotesInbox.map(pk => {
                    const used = pk.data.used || 0; const total = pk.data.total || 0; const done = total > 0 && used >= total;
                    return (
                      <div key={pk.id} className="border rounded-lg p-2.5" style={{ borderColor: done ? "#0F6E56" : "#E8DFC8", background: done ? "#F3FBF7" : "#fff" }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <LuActivity size={14} style={{ color: "#0E5560" }} />
                          <span className="text-[11.5px] font-medium truncate" style={{ color: "#014D5E" }}>{done ? "🏆 " : ""}{pk.data.nome || "Pacote de fisioterapia"}</span>
                          <span className="ml-auto text-[12px] font-semibold flex-shrink-0" style={{ color: done ? "#0F6E56" : "#0E5560" }}>{used}/{total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: Math.min(total, 20) }).map((_, i) => <span key={i} style={{ fontSize: "13px" }} title={`Sessão ${i + 1}`}>{i < used ? "🐾" : "⚪"}</span>)}
                        </div>
                        <div className="text-[9.5px] text-gray-400 mt-1.5">As sessões são lançadas pela Agenda e atualizam aqui.</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* BLOCO 3.46: PROXIMAS CONSULTAS DO PET */}
            {tutor && selectedPet && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}><span>📅 Próximo agendamento · {selectedPet.name}</span></div>
                {proximasConsultas.length === 0 ? (
                  <div className="text-[11px] text-gray-400 py-1">Nenhuma consulta agendada.</div>
                ) : (
                  <div className="space-y-1.5">
                    {proximasConsultas.slice(0, 1).map((a: any) => (
                      <Link key={a.id} href={`/dashboard/erp/atendimentos/${a.id}`} className="flex items-start gap-2 border rounded-lg p-2 hover:bg-gray-50" style={{ borderColor: "#E8DFC8" }}>
                        <LuCalendar size={13} style={{ color: "#009AAC", marginTop: 1, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-medium" style={{ color: "#014D5E" }}>{fmtConsultaDateTime(a.date, a.duration)}</div>
                          <div className="text-[10.5px] text-gray-500 truncate">{TYPE_LABEL[a.type] || a.type || "Consulta"}{a.user?.name ? ` · ${a.user.name}` : ""}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 3.5: ACOES DO PET (F1 - barra de icones) */}
            {tutor && selectedPet && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}><span>⚡ Ações · {selectedPet.name}</span></div>
                <button type="button" onClick={() => window.open(`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`, "_self")} title="Iniciar atendimento" className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 mb-2 text-white font-semibold text-[12px]" style={{ background: "#0E5560" }}>
                  <LuStethoscope size={16} /> Atendimento
                </button>
                <div className="grid grid-cols-4 gap-1.5">
                  <button type="button" onClick={() => setAgendaOpen((o) => !o)} title="Agendar para este pet" className="flex items-center justify-center h-11 rounded-lg border hover:bg-[#E1F2F4]" style={{ borderColor: "#009AAC", background: agendaOpen ? "#E1F2F4" : "white" }}><LuCalendar size={18} style={{ color: "#009AAC" }} /></button>
                  <button type="button" disabled title="Follow-up · em breve" className="flex items-center justify-center h-11 rounded-lg border cursor-not-allowed opacity-50" style={{ borderColor: "#E8DFC8", background: "#fafafa" }}><LuClock size={18} style={{ color: "#9aa0a8" }} /></button>
                  <button type="button" onClick={() => { setPetActForward(false); setInteracaoOpen(true); }} title="Registrar interação" className="flex items-center justify-center h-11 rounded-lg border hover:bg-[#E1F2F4]" style={{ borderColor: "#009AAC", background: "white" }}><LuMessageSquare size={18} style={{ color: "#009AAC" }} /></button>
                  <button type="button" disabled title="Venda · em breve" className="flex items-center justify-center h-11 rounded-lg border cursor-not-allowed opacity-50" style={{ borderColor: "#E8DFC8", background: "#fafafa" }}><LuDollarSign size={18} style={{ color: "#9aa0a8" }} /></button>
                  <button type="button" disabled title="Sequência · em breve" className="flex items-center justify-center h-11 rounded-lg border cursor-not-allowed opacity-50" style={{ borderColor: "#E8DFC8", background: "#fafafa" }}><LuRepeat size={18} style={{ color: "#9aa0a8" }} /></button>
                  <button type="button" disabled title="E-mail · em breve" className="flex items-center justify-center h-11 rounded-lg border cursor-not-allowed opacity-50" style={{ borderColor: "#E8DFC8", background: "#fafafa" }}><LuMail size={18} style={{ color: "#9aa0a8" }} /></button>
                  <button type="button" onClick={() => setPetActForward(o => !o)} title="Encaminhar" className="flex items-center justify-center h-11 rounded-lg border hover:bg-[#E1F2F4]" style={{ borderColor: "#009AAC", background: "white" }}><LuShare2 size={18} style={{ color: "#009AAC" }} /></button>
                  <button type="button" disabled title="Exames · em breve" className="flex items-center justify-center h-11 rounded-lg border cursor-not-allowed opacity-50" style={{ borderColor: "#E8DFC8", background: "#fafafa" }}><LuFlaskConical size={18} style={{ color: "#9aa0a8" }} /></button>
                </div>
                <NovoAgendamentoModal inline open={agendaOpen} onClose={() => setAgendaOpen(false)} defaults={agendaDefaults} onCreated={() => setProximasTick((t) => t + 1)} />
                {petActForward && (
                  <div className="mt-2 border rounded-lg overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
                    {staff.length === 0 ? (
                      <div className="px-3 py-2 text-[10.5px] text-gray-400">Carregando...</div>
                    ) : staff.map(s => (
                      <button key={s.id} onClick={() => { setPetActForward(false); handleForward(s.id, s.name || ""); }} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                        <div className="font-medium" style={{ color: "#014D5E" }}>{s.name || "Sem nome"}</div>
                        <div className="text-[9.5px] text-gray-400 uppercase">{s.role}</div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 1: RESUMO IA + SERVICO */}
            {(tutor || lead) && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}>
                  <span><span className="mr-1" aria-hidden>✨</span>Resumo da conversa (IA){resumoWhen && <span className="font-normal text-gray-400 normal-case ml-1 text-[9.5px]">{fmtRelative(resumoWhen)}</span>}</span>
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

            {/* BLOCO 4: REGISTRAR INTERACAO */}
            {(tutor || lead) && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}>
                  <span><span className="mr-1" aria-hidden>📝</span>Registrar interação</span>
                  {!interacaoOpen && (<button onClick={() => setInteracaoOpen(true)} className={LINK} style={{ color: "#009AAC" }}><LuPlus size={10} className="inline" /> nova</button>)}
                </div>
                {interacaoOpen && (
                  <div className="space-y-2 rounded-lg p-2 border" style={{ background: "#f6fdfd", borderColor: "#E8DFC8" }}>
                    <select value={interacaoForm.tipo} onChange={e => setInteracaoForm({ ...interacaoForm, tipo: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE}>
                      <option value="NOTA">Nota</option>
                      <option value="WHATSAPP_ENVIADO">WhatsApp enviado</option>
                      <option value="LIGACAO">Ligação</option>
                      <option value="EMAIL_ENVIADO">Email</option>
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="ENCAMINHAMENTO">Encaminhamento</option>
                    </select>
                    <textarea value={interacaoForm.texto} onChange={e => setInteracaoForm({ ...interacaoForm, texto: e.target.value })} placeholder="Resumo da conversa..." rows={3} className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                    <input value={interacaoForm.proximaAcao} onChange={e => setInteracaoForm({ ...interacaoForm, proximaAcao: e.target.value })} placeholder="Próxima ação (opcional)" className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                    <input type="date" value={interacaoForm.proximoFollowupAt} onChange={e => setInteracaoForm({ ...interacaoForm, proximoFollowupAt: e.target.value })} className="w-full px-2 py-1 text-xs border rounded" style={BORDER_STYLE} />
                    <div className="flex gap-2">
                      <button onClick={() => setInteracaoOpen(false)} className="flex-1 px-2 py-1 text-xs border rounded" style={BORDER_STYLE}>Cancelar</button>
                      <button onClick={handleInteracao} className="flex-1 px-2 py-1 text-xs text-white rounded font-semibold" style={{ background: "#009AAC" }}>Salvar na ficha</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* BLOCO 5: ULTIMOS ATENDIMENTOS */}
            {(tutor || lead) && (
              <section className={SECTION} style={SECTION_STYLE}>
                <div className={LBL} style={LBL_STYLE}>
                  <span>💬 Último atendimento{historico.length > 0 && ` (${historico.length})`}</span>
                  {tutor && selectedPet && (
                    <Link href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`} className={LINK} style={{ color: "#009AAC" }}><LuPlus size={10} className="inline" /> novo</Link>
                  )}
                </div>
                {historico.length === 0 ? (
                  <div className="rounded-lg p-3 text-center text-[11px] italic text-gray-400" style={{ background: "#fafafa", border: "1px dashed #E8DFC8" }}>
                    Nenhum atendimento ainda
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const byDay: Record<string, HistoricoItem[]> = {};
                      const order: string[] = [];
                      historico.forEach(h => { const k = fmtDate(h.date); if (!byDay[k]) { byDay[k] = []; order.push(k); } byDay[k].push(h); });
                      return order.map(day => {
                        const its = byDay[day];
                        const autos = its.filter(x => x.auto && x.type === "INTERACAO");
                        const outros = its.filter(x => !(x.auto && x.type === "INTERACAO"));
                        return (
                          <div key={day}>
                            <div className="flex items-center gap-1.5 mb-1 mt-0.5">
                              <span className="text-[9.5px] font-bold uppercase text-gray-400 flex-shrink-0">{day}</span>
                              <div className="flex-1 h-px" style={{ background: "#F0EBE0" }} />
                              <span className="text-[9px] text-gray-300 flex-shrink-0">{its.length}</span>
                            </div>
                            <div className="space-y-1">
                              {outros.map(h => renderHistItem(h))}
                              {autos.length === 1 && renderHistItem(autos[0])}
                              {autos.length > 1 && (
                                <div>
                                  <button type="button" onClick={() => setHistWaOpen(stt => ({ ...stt, [day]: !stt[day] }))} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left" style={{ borderColor: "#F0EBE0", background: "#f6fdfd" }}>
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
                                    <span className="text-[11px] font-semibold flex-1" style={{ color: "#014D5E" }}>WhatsApp · {autos.length} contatos automáticos</span>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{histWaOpen[day] ? "▴" : "▾"}</span>
                                  </button>
                                  {histWaOpen[day] && <div className="space-y-1 mt-1 pl-2">{autos.map(h => renderHistItem(h))}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
