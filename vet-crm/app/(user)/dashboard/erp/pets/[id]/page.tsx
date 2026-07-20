"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Ficha do Pet  (pets/[id])
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo (GitHub Action diária).
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft, LuPencil, LuTrash, LuPlus, LuFlaskConical,
  LuPackage, LuMessageSquare, LuShare2, LuTag, LuClock, LuCalendar, LuX, LuCheck,
} from "react-icons/lu";
import toast from "react-hot-toast";
import FeedTimeline from "@/components/pets/FeedTimeline";
import HistoricoAddGrid from "@/components/pets/HistoricoAddGrid";
import PetProtocolosPanel from "@/components/pets/PetProtocolosPanel";
import PetAtendimentoPanel from "@/components/pets/PetAtendimentoPanel";
import PetFichaHeaderCard from "@/components/pets/PetFichaHeaderCard";
import { LuPrinter } from "react-icons/lu";
import PetVendaPanel from "@/components/pets/PetVendaPanel";
import PetClinicaTabela from "@/components/pets/PetClinicaTabela";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import EncaminharBox from "@/components/inbox/EncaminharBox";
import PetProfilePanel from "@/components/profile/PetProfilePanel";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";

// Pelagem = enum CoatType no backend (mandar texto livre dava 400). Rótulos em pt-BR.
const COAT_OPTS: [string, string][] = [["SHORT", "Curto"], ["LONG", "Longo"], ["SMOOTH", "Liso"], ["WAVY", "Ondulado"], ["CURLY", "Cacheado"], ["MIXED", "Misto"], ["GOLDEN", "Dourado"], ["BLACK", "Preto"], ["WHITE", "Branco"], ["BROWN", "Marrom"]];
const COAT_VALID = new Set(COAT_OPTS.map(([v]) => v));
const CORES_DEFAULT = ["Preto", "Branco", "Marrom", "Caramelo", "Cinza", "Dourado", "Rajado", "Tricolor", "Malhado", "Creme", "Amarelo", "Frajola"];
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { montarTextoBoletim } from "@/lib/pets/boletim";
import { loadExameFases, EXAME_FASES_PADRAO } from "@/lib/exameFases";
import BoletimModal from "@/components/pets/BoletimModal";

// Emoji da espécie (avatar do cabeçalho — padrão Base44)
const PET_EMOJI = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s.includes("FELIN") || s.includes("GAT") || s === "FELINE") return "🐱";
  if (s.includes("CANIN") || s.includes("CACHORR") || s === "CANINE") return "🐶";
  return "🐾";
};
const fmtDataBR = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};
const diasTxt = (d: number | null | undefined) =>
  d == null ? "—" : d === 0 ? "hoje" : d < 30 ? `${d}d` : d < 365 ? `${Math.floor(d / 30)}m` : `${Math.floor(d / 365)}a`;
const sterilLabel = (s?: string | null) =>
  s === "STERILIZED" ? "Castrado" : s === "NOT_STERILIZED" ? "Não castrado" : s === "SCHEDULED" ? "Castração agendada" : "—";

// Status de saúde derivado das pipelines clínica/fisio (pill do cabeçalho)
const healthStatus = (clin?: string | null, fisio?: string | null): { label: string; bg: string; color: string } => {
  const c = (clin || "").toLowerCase();
  const f = (fisio || "").toLowerCase();
  const txt = c + " " + f;
  if (txt.includes("alta")) return { label: "🟢 Saudável", bg: "#E1F5EE", color: "#0F6E56" };
  if (txt.includes("manuten")) return { label: "🩺 Em manutenção", bg: "#FBF3E3", color: "#8a6400" };
  if (txt.includes("exame")) return { label: "🔬 Aguardando exames", bg: "#EDE9FA", color: "#3C3489" };
  if (clin || fisio) return { label: "🩺 Em tratamento", bg: "#FBEFD6", color: "#8A5A0B" };
  return { label: "🟢 Saudável", bg: "#E1F5EE", color: "#0F6E56" };
};

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  status: string;
  gender?: string | null;
  sterilization?: string | null;
  birthDate?: string | null;
  coat?: string | null;
  coatColor?: string | null;
  weight?: number | null;
  microchip?: string | null;
  avatar?: string | null;
  observations?: string | null;
  allergies?: string[];
  medicalNotes?: string | null;
  insurancePlan?: string | null;
  temperament?: string | null;
  pipelineClinicoEtapa?: string | null;
  pipelineFisioEtapa?: string | null;
  proximoFollowupAt?: string | null;
  tags?: string[];
  codigo?: number | null;
  tutorName?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string; acceptsWhatsApp?: boolean; contacts?: { number: string; isPrimary?: boolean; isWhatsApp?: boolean }[] };
  createdAt: string;
  _count?: { appointments: number; treatments: number };
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

function speciesEnum(sp: string): string {
  const u = (sp || "").toUpperCase();
  if (["CANINE", "FELINE", "BIRD", "RODENT", "REPTILE", "OTHER"].includes(u)) return u;
  if (u.includes("CANIN") || u.includes("CACHORR") || u.startsWith("C\u00c3") || u.startsWith("CA")) return "CANINE";
  if (u.includes("FELIN") || u.includes("GAT")) return "FELINE";
  if (u.includes("AVE") || u.includes("BIRD") || u.includes("SSAR")) return "BIRD";
  return "OTHER";
}

const ATD_TIPOS_DEFAULT: [string, string][] = [["Acupuntura","Acupuntura"],["Alta da internação","Alta da internação"],["Atendimento pelo WhatsApp","Atendimento pelo WhatsApp"],["Atendimento telefônico/email","Atendimento telefônico/email"],["Avaliação Cirúrgica","Avaliação Cirúrgica"],["Avaliação Cirúrgica - DogLife","Avaliação Cirúrgica - DogLife"],["Avaliação de fisioterapia","Avaliação de fisioterapia"],["Bloqueada","Bloqueada"],["Boletim da Internação","Boletim da Internação"],["Cirurgia","Cirurgia"],["Cirurgia - DogLife","Cirurgia - DogLife"],["Consulta Alimentação Natural","Consulta Alimentação Natural"],["Consulta Cardiologista","Consulta Cardiologista"],["Consulta Clínica","Consulta Clínica"],["Consulta Fisioterapia","Consulta Fisioterapia"],["Consulta Integrativa","Consulta Integrativa"],["Consulta Neurologia","Consulta Neurologia"],["Consulta Odontológica","Consulta Odontológica"],["Consulta Oftalmológica","Consulta Oftalmológica"],["Consulta Ortopédica","Consulta Ortopédica"],["Consulta Plantão","Consulta Plantão"],["CRM","CRM"],["Curso integral","Curso integral"],["DogLife - Consulta Clínica","DogLife - Consulta Clínica"],["Exames","Exames"],["Hidroterapia","Hidroterapia"],["Hospedagem","Hospedagem"],["Internamento","Internamento"],["Laserterapia","Laserterapia"],["MAP","MAP"],["Ozônioterapia","Ozônioterapia"],["Peso","Peso"],["Receitas","Receitas"],["Renovação Pacote Map","Renovação Pacote Map"],["Resultado de exames","Resultado de exames"],["Retorno","Retorno"],["Retorno Alimentação Natural","Retorno Alimentação Natural"],["Retorno Vídeo Chamada","Retorno Vídeo Chamada"],["Soroterapia Subcutânea","Soroterapia Subcutânea"],["Terapia neural","Terapia neural"],["Tratamento Ortomolecular Injetável","Tratamento Ortomolecular Injetável"],["Vacinação","Vacinação"],["Vermifugação/Ectoparasitas","Vermifugação/Ectoparasitas"]];
const ATD_STATUS_DEFAULT = ["Realizado","Agendado","Cancelado","Faltou"];
const ATD_TIPO_LABEL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"HISTORICO" | "PROTOCOLOS" | "TIMELINE" | "AGENDA" | "VENDAS" | "CLINICA" | "PACOTES" | "EXAMES" | "RELACIONAMENTO">("HISTORICO");
  const [protoAuto, setProtoAuto] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [editClin, setEditClin] = useState(false);
  const [clinForm, setClinForm] = useState<any>({});
  const [savingClin, setSavingClin] = useState(false);
  const [editObs, setEditObs] = useState(false);
  const [obsVal, setObsVal] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [fuDate, setFuDate] = useState("");
  const [savingFu, setSavingFu] = useState(false);
  const [pipes, setPipes] = useState<{ clinico: string[]; fisio: string[] }>({ clinico: [], fisio: [] });
  const [examFases, setExamFases] = useState<string[]>(EXAME_FASES_PADRAO);
  const [savingPipe, setSavingPipe] = useState(false);
  const [petTags, setPetTags] = useState<{ id: string; texto: string }[]>([]);
  const [tagTpls, setTagTpls] = useState<any[]>([]);
  const [savingTag, setSavingTag] = useState(false);
  const [cadAtivas, setCadAtivas] = useState<{ id: string; data: any }[]>([]);
  const [cadOpts, setCadOpts] = useState<any[]>([]);
  const [cadPick, setCadPick] = useState(false);
  const [savingCad, setSavingCad] = useState(false);
  const [pacotes, setPacotes] = useState<{ id: string; data: any }[]>([]);
  const [fisioSrv, setFisioSrv] = useState<any[]>([]);
  const [pacForm, setPacForm] = useState<{ open: boolean; serviceId: string; nome: string; total: string; jaFeitas: string }>({ open: false, serviceId: "", nome: "", total: "4", jaFeitas: "0" });
  const [savingPac, setSavingPac] = useState(false);
  const [exames, setExames] = useState<{ id: string; data: any }[]>([]);
  const [subindoEx, setSubindoEx] = useState<string | null>(null); // id do exame cujo arquivo está subindo
  const [exCat, setExCat] = useState<any[]>([]);
  const [exPick, setExPick] = useState("");
  const [savingEx, setSavingEx] = useState(false);
  const [vets, setVets] = useState<any[]>([]);
  const [atdOpen, setAtdOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [savingAtd, setSavingAtd] = useState(false);
  const [artefato, setArtefato] = useState<null | "PESO" | "OBS" | "RECEITA" | "DOCUMENTO" | "VIDEO" | "FOTO" | "EXAME">(null);
  // Exame pelo histórico: nome + arquivo de uma vez. Antes o card "Exame" só trocava de
  // aba (e por isso não tinha como fechar/voltar), e anexar exigia "Solicitar" antes.
  const [exNome, setExNome] = useState("");
  const [exFile, setExFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoLegenda, setFotoLegenda] = useState("");
  const [pesoVal, setPesoVal] = useState("");
  const [racasCat, setRacasCat] = useState<{ nome: string; especie?: string }[]>([]);
  const [coresCat, setCoresCat] = useState<string[]>([]);
  const [tempCat, setTempCat] = useState<string[]>([]);      // opções de temperamento (Configurações › Listas)
  const [tempTravam, setTempTravam] = useState<string[]>([]); // quais ocupam a sala inteira
  const [savingTemp, setSavingTemp] = useState(false);
  const [recModelos, setRecModelos] = useState<{ nome: string; corpo: string }[]>([]);
  const [recModeloNome, setRecModeloNome] = useState("");
  const [recCorpo, setRecCorpo] = useState("");
  const [recVetId, setRecVetId] = useState("");
  const [docModelos, setDocModelos] = useState<{ nome: string; corpo: string }[]>([]);
  const [docModeloNome, setDocModeloNome] = useState("");
  const [docCorpo, setDocCorpo] = useState("");
  const [docVetId, setDocVetId] = useState("");
  const [vidUrl, setVidUrl] = useState("");
  const [vidFile, setVidFile] = useState<File | null>(null);
  const [vidVetId, setVidVetId] = useState("");
  const [savingArt, setSavingArt] = useState(false);
  const ATD0 = { date: "", userId: "", type: "CONSULTA", status: "Realizado", duration: "30", chiefComplaint: "", anamnesis: "", physicalExam: "", petWeight: "", temperature: "", diagnosis: "", conduct: "", prescription: "", examsRequested: "", nextReturnDate: "", paymentMethod: "", followUpNotes: "", notes: "" };
  const [atd, setAtd] = useState<any>(ATD0);
  const [items, setItems] = useState<any[]>([]);
  const [atdTipos, setAtdTipos] = useState<{ v: string; l: string }[]>(ATD_TIPOS_DEFAULT.map(([v, l]) => ({ v, l })));
  const [atdStatus, setAtdStatus] = useState<string[]>(ATD_STATUS_DEFAULT);
  const [servicosCat, setServicosCat] = useState<any[]>([]);
  const [petInteracoes, setPetInteracoes] = useState<any[]>([]);
  const [protocolos, setProtocolos] = useState<any[]>([]);
  const [gerenciarProto, setGerenciarProto] = useState(false);
  // 🌿 Fisioterapia: boletins + registro do tratamento (frequência/diagnóstico/encaminhado)
  const [boletins, setBoletins] = useState<{ id: string; data: any }[]>([]);
  const [fisioRec, setFisioRec] = useState<{ id?: string; data: any }>({ data: {} });
  const [editFisio, setEditFisio] = useState(false);
  const [fisioForm, setFisioForm] = useState<any>({ frequencia: "", diagnostico: "", encaminhadoPor: "", ultimosExames: "" });
  const [savingFisio, setSavingFisio] = useState(false);
  const [boletimOpen, setBoletimOpen] = useState(false);
  const [boletimEditId, setBoletimEditId] = useState<string | null>(null);
  const [intTipo, setIntTipo] = useState("NOTA");
  const [intTexto, setIntTexto] = useState("");
  const [savingInt, setSavingInt] = useState(false);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [clinDocs, setClinDocs] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [detalheHist, setDetalheHist] = useState<any>(null);
  const [verAtd, setVerAtd] = useState<any>(null);
  const [editAtd, setEditAtd] = useState(false);
  const [editAtdForm, setEditAtdForm] = useState<any>({});
  // Nova estrutura Base44: 5 abas de topo + cabeçalho estilo ficha do cliente
  const [mainTab, setMainTab] = useState<"GERAL" | "CADASTRO" | "PRONTUARIO" | "VACINAS" | "FISIO" | "COMPRAS">("GERAL");
  const [showValues, setShowValues] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaVal, setNotaVal] = useState("");
  const [savingNota, setSavingNota] = useState(false);
  const [fuOpen, setFuOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagLivre, setTagLivre] = useState("");
  const [pipeOpen, setPipeOpen] = useState<{ clinico: boolean; fisio: boolean }>({ clinico: false, fisio: false });

  usePageTitle("", undefined); // F1-rev: barra global minima (info fica no sub-header da pagina)

  // "Carregando..." só na PRIMEIRA carga — nas recargas depois de uma ação os dados
  // são trocados por baixo, sem desmontar a ficha (evita o "pulo" a cada clique).
  const jaCarregou = useRef(false);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    const res = await fetch(`/api/pets/${petId}`);
    const d = await safeJson<Pet | null>(res, null);
    setPet(d);
    jaCarregou.current = true;
    setLoading(false);
  }
  async function loadPipes() {
    try {
      const r = await fetch(`/api/pipelines`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []);
      const pick = (kw: string) => { const p = arr.find((x: any) => (x.nome || "").toLowerCase().includes(kw) && x.ativo !== false); return p ? (p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome) : []; };
      setPipes({ clinico: pick("cl\u00edn"), fisio: pick("fisio") });
    } catch {}
    // Fases de exame: fonte \u00daNICA em Configura\u00e7\u00f5es \u203a Listas (exame_fases)
    setExamFases(await loadExameFases());
  }
  async function loadProtocolos() { try { const r = await fetch(`/api/protocolos?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); setProtocolos(Array.isArray(d) ? d : (d.data || [])); } catch {} }
  async function loadBoletins() {
    try {
      const r = await fetch(`/api/listas?lista=petboletim_${petId}`, { cache: "no-store" });
      const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const parsed = arr.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch {} return { id: i.id, data: o }; }).sort((a: any, b: any) => new Date(b.data?.sessaoData || b.data?.createdAt || 0).getTime() - new Date(a.data?.sessaoData || a.data?.createdAt || 0).getTime());
      setBoletins(parsed);
    } catch {}
  }
  async function loadFisioRec() {
    try {
      const r = await fetch(`/api/listas?lista=petfisio_${petId}`, { cache: "no-store" });
      const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      if (arr[0]) { let o: any = {}; try { o = JSON.parse(arr[0].valor); } catch {} setFisioRec({ id: arr[0].id, data: o }); setFisioForm({ frequencia: o.frequencia || "", diagnostico: o.diagnostico || "", encaminhadoPor: o.encaminhadoPor || "", ultimosExames: o.ultimosExames || "" }); }
      else setFisioRec({ data: {} });
    } catch {}
  }
  async function saveFisioRec() {
    setSavingFisio(true);
    try {
      const valor = JSON.stringify({ ...fisioForm, updatedAt: new Date().toISOString() });
      if (fisioRec.id) { const r = await fetch(`/api/listas/${fisioRec.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor }) }); if (!r.ok) throw new Error(); }
      else { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `petfisio_${petId}`, valor }) }); if (!r.ok) throw new Error(); }
      toast.success("Tratamento atualizado"); setEditFisio(false); await loadFisioRec();
    } catch { toast.error("Erro ao salvar"); } finally { setSavingFisio(false); }
  }
  async function delBoletim(id: string) {
    if (!(await confirmDelete({ entityLabel: "boletim", itemName: "este boletim" }))) return;
    try { const r = await fetch(`/api/listas/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); toast.success("Boletim excluído"); await loadBoletins(); } catch { toast.error("Erro ao excluir"); }
  }
  // 💬 Reenviar boletim: envio automático pela API oficial da Meta; fallback manual se recusar. Consentimento exigido.
  async function reenviarBoletim(b: { id: string; data: any }) {
    if (!pet?.tutor?.acceptsWhatsApp) { toast.error("O tutor ainda não autorizou receber por WhatsApp"); return; }
    const texto = montarTextoBoletim(b.data);
    const marcarEnviado = async () => { try { await fetch(`/api/listas/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...b.data, enviadoAt: new Date().toISOString() }) }) }); await loadBoletins(); } catch {} };
    try {
      const r = await fetch(`/api/survey-avaliacao/mensagem-tutor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: (pet as any).tutorId || pet?.tutor?.id, texto }) });
      const d = await r.json().catch(() => ({ success: false }));
      if (d?.success) { toast.success("Boletim enviado pelo WhatsApp ✅"); await marcarEnviado(); return; }
      toast.error("Envio automático não deu certo" + (d?.error ? `: ${d.error}` : "") + ". Abrindo o WhatsApp.");
    } catch { toast.error("Envio automático falhou. Abrindo o WhatsApp."); }
    try { await navigator.clipboard.writeText(texto); } catch {}
    openWhatsAppMeta(tutorWhats || undefined);
    await marcarEnviado();
  }
  function imprimirBoletim(b: { id: string; data: any }) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
    const esc = (t: any) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`<html><head><title>Boletim de fisioterapia</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E2244;padding:40px;max-width:720px;margin:0 auto;font-size:13px;line-height:1.55}h1{color:#014D5E;font-size:19px;margin:0 0 2px}.sub{color:#6B7280;font-size:12px;margin-bottom:16px}pre{white-space:pre-wrap;font-family:inherit;border-top:2px solid #009AAC;padding-top:14px}</style></head><body><h1>🌿 Boletim de Fisioterapia — Empório do Pet</h1><div class="sub">${esc(pet?.name || "")} · ${esc(new Date(b.data?.sessaoData || Date.now()).toLocaleDateString("pt-BR"))}</div><pre>${esc(montarTextoBoletim(b.data))}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
  useEffect(() => { if (petId) { load(); loadPipes(); loadPetColecoes(); loadCatalogos(); loadInteracoesPet(); loadAtendimentos(); loadClinDocs(); loadHistorico(); loadAtdConfig(); loadProtocolos(); loadBoletins(); loadFisioRec(); } /* eslint-disable-next-line */ }, [petId]);
  useEffect(() => { const t = searchParams?.get("tab"); if (t === "fisio") setMainTab("FISIO"); /* eslint-disable-next-line */ }, [searchParams]);

  async function handleDelete() {
    const res = await fetch(`/api/pets/${petId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pet removido");
      router.push("/dashboard/erp/pets");
    } else {
      toast.error("Erro ao remover");
    }
    setDelOpen(false);
  }

  async function handleEncaminhar() {
    const destino = window.prompt("Encaminhar este pet para quem? (vet, recepção, admin)");
    if (!destino || !destino.trim()) return;
    try {
      const r = await fetch("/api/interacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: params.id, tipo: "ENCAMINHAMENTO", texto: `Pet encaminhado para: ${destino.trim()}`, canal: "Sistema" }),
      });
      if (!r.ok) throw new Error(String(r.status));
      toast.success(`Encaminhado para ${destino.trim()}`);
    } catch {
      toast.error("Erro ao encaminhar");
    }
  }

  async function patchPet(body: any) {
    const r = await fetch(`/api/pets/${petId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(String(r.status));
  }
  // Convênio Petlife: reaproveita o campo insurancePlan (texto "Petlife" = conveniado).
  async function togglePetlife() {
    const on = /petlife/i.test(pet?.insurancePlan || "");
    try { await patchPet({ insurancePlan: on ? "" : "Petlife" }); toast.success(on ? "Petlife removido" : "Marcado como Petlife 🩺"); await load(); }
    catch { toast.error("Não consegui atualizar o convênio"); }
  }
  // Vivo/Óbito: usa o campo status do pet (ACTIVE ↔ DECEASED).
  async function toggleObito() {
    const obito = pet?.status === "DECEASED";
    if (!window.confirm(obito ? "Marcar este pet como VIVO novamente?" : "Confirmar o ÓBITO deste pet? (pode reverter depois)")) return;
    try { await patchPet({ status: obito ? "ACTIVE" : "DECEASED" }); toast.success(obito ? "Pet marcado como vivo" : "Óbito registrado 🕊️"); await load(); }
    catch { toast.error("Erro ao atualizar"); }
  }
  function iniciarConsulta() { router.push(`/dashboard/erp/pets/${petId}/atendimentos/novo`); }
  async function saveClin() {
    setSavingClin(true);
    try {
      const body: any = { species: clinForm.species || undefined, breed: clinForm.breed || undefined, gender: clinForm.gender || undefined, sterilization: clinForm.sterilization || undefined, coat: COAT_VALID.has(clinForm.coat) ? clinForm.coat : undefined, coatColor: clinForm.coatColor || undefined, microchip: clinForm.microchip || undefined, medicalNotes: clinForm.medicalNotes || undefined, allergies: clinForm.allergies ? clinForm.allergies.split(",").map((x: string) => x.trim()).filter(Boolean) : [] };
      if (clinForm.birthDate) body.birthDate = new Date(clinForm.birthDate + "T12:00:00").toISOString();
      if (clinForm.weight !== "" && clinForm.weight != null) body.weight = Number(clinForm.weight);
      await patchPet(body); toast.success("Dados cl\u00ednicos atualizados"); setEditClin(false); await load();
    } catch { toast.error("Erro ao salvar"); } finally { setSavingClin(false); }
  }
  async function saveObs() {
    setSavingObs(true);
    try { await patchPet({ observations: obsVal }); toast.success("Observa\u00e7\u00e3o salva"); setEditObs(false); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingObs(false); }
  }
  async function salvarPeso() {
    const w = parseFloat(String(pesoVal).replace(",", "."));
    if (!w || w <= 0) { toast.error("Informe o peso"); return; }
    setSavingArt(true);
    try { await patchPet({ weight: w }); toast.success("Peso atualizado"); setArtefato(null); await load(); await loadAtendimentos(); } catch { toast.error("Erro ao salvar peso"); } finally { setSavingArt(false); }
  }
  async function salvarObsArt() {
    setSavingArt(true);
    try { await patchPet({ observations: obsVal }); toast.success("Observação salva"); setArtefato(null); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingArt(false); }
  }
  function fmtLocal(d: any) { const x = new Date(d); const p = (n: number) => String(n).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; }
  async function editarEntrada(it: any) {
    if (it.src !== "atd") { toast("Edite pelo atendimento de origem"); return; }
    const ap = it.raw; setEditId(ap.id); setTab("HISTORICO"); setAtdOpen(false);
    const t = ap.type;
    if (t === "Receitas") {
      setRecModeloNome(ap.chiefComplaint || ""); setRecCorpo(ap.prescription || ""); setRecVetId(ap.userId || "");
      try { const ms = await listasGet("receita_modelo"); setRecModelos(ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { nome: o.nome || i.valor, corpo: o.corpo || "" }; })); } catch {}
      setArtefato("RECEITA");
    } else if (t === "Documento") {
      setDocModeloNome(ap.chiefComplaint || ""); setDocCorpo(ap.prescription || ""); setDocVetId(ap.userId || "");
      try { const ms = await listasGet("documento_modelo"); setDocModelos(ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { nome: o.nome || i.valor, corpo: o.corpo || "" }; })); } catch {}
      setArtefato("DOCUMENTO");
    } else if (t === "Video") {
      setVidUrl(ap.prescription || ""); setVidVetId(ap.userId || ""); setArtefato("VIDEO");
    } else {
      setArtefato(null);
      setAtd({ ...ATD0, date: ap.date ? fmtLocal(ap.date) : "", userId: ap.userId || "", type: ap.type || "CONSULTA", status: ap.status || "Realizado", chiefComplaint: ap.chiefComplaint || "", anamnesis: ap.anamnesis || "", physicalExam: ap.physicalExam || "", diagnosis: ap.diagnosis || "", conduct: ap.conduct || "", prescription: ap.prescription || "", notes: ap.notes || "" });
      setItems([]); setAtdOpen(true);
    }
  }
  async function excluirEntrada(it: any) {
    if (!(await confirmDelete({ entityLabel: "registro", itemName: it.title || "este registro" }))) return;
    try {
      const url = it.src === "doc" ? `/api/clinical-documents/${it.rawId}` : `/api/appointments/${it.rawId}`;
      const r = await fetch(url, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Registro excluído"); await loadAtendimentos(); await loadClinDocs();
    } catch { toast.error("Erro ao excluir"); }
  }
  async function abrirDocumento() {
    setEditId(null); setAtdOpen(false); setArtefato("DOCUMENTO"); setDocModeloNome(""); setDocCorpo(""); setDocVetId(vets[0]?.id || "");
    try { const ms = await listasGet("documento_modelo"); const parsed = ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { nome: o.nome || i.valor, corpo: o.corpo || "" }; }); setDocModelos(parsed); } catch {}
  }
  async function salvarDocumento() {
    if (!pet) return;
    if (!docCorpo.trim()) { toast.error("Escreva ou escolha um modelo de documento"); return; }
    if (!docVetId) { toast.error("Selecione o profissional"); return; }
    setSavingArt(true);
    try {
      const body: any = { tutorId: pet.tutorId, petId: pet.id, userId: docVetId, date: new Date().toISOString(), type: "Documento", status: "Realizado", prescription: docCorpo };
      if (docModeloNome) body.chiefComplaint = docModeloNome;
      const r = await fetch(editId ? `/api/appointments/${editId}` : "/api/appointments", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Documento salvo"); setArtefato(null); await loadAtendimentos();
    } catch { toast.error("Erro ao salvar documento"); } finally { setSavingArt(false); }
  }
  function abrirVideo() { setEditId(null); setAtdOpen(false); setArtefato("VIDEO"); setVidUrl(""); setVidVetId(vets[0]?.id || ""); setVidFile(null); }
  async function salvarVideo() {
    if (!pet) return;
    if (!vidFile && !vidUrl.trim()) { toast.error("Escolha um arquivo ou cole um link"); return; }
    setSavingArt(true);
    try {
      const urlV = vidFile ? await subirArquivo(vidFile, "pets") : vidUrl.trim();
      const body: any = { tutorId: pet.tutorId, petId: pet.id, userId: vidVetId || vets[0]?.id, date: new Date().toISOString(), type: "Video", status: "Realizado", prescription: urlV };
      const r = await fetch(editId ? `/api/appointments/${editId}` : "/api/appointments", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Vídeo anexado"); setArtefato(null); await loadAtendimentos();
    } catch { toast.error("Erro ao anexar vídeo"); } finally { setSavingArt(false); }
  }
  // 📷 Fotos — anexa por link/URL de imagem (mesmo padrão do Vídeo; upload de arquivo entra com Cloudinary na Fase B)
  // Sobe um arquivo e devolve a URL. Usado por exame, foto e vídeo — os três antes
  // só aceitavam link colado ("Cole o link da imagem").
  async function subirArquivo(file: File, pasta: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch(`/api/media/upload?pasta=${pasta}&origem=${pasta}&origemId=${petId}`, { method: "POST", body: fd });
    const j = await up.json().catch(() => ({}));
    if (!up.ok || !j?.url) throw new Error(j?.error || j?.message || "falha ao subir o arquivo");
    return j.url as string;
  }
  function abrirExame() { setEditId(null); setAtdOpen(false); setArtefato("EXAME"); setExNome(""); setExFile(null); }
  // Cria o exame e já anexa o laudo. Antes eram dois passos obrigatórios ("Solicitar"
  // primeiro, anexar depois) — o que não faz sentido pra exame feito fora, que chega pronto.
  async function salvarExameComArquivo() {
    if (!pet) return;
    const nome = exNome.trim();
    if (!nome) { toast.error("Informe o nome do exame"); return; }
    setSavingArt(true);
    try {
      const url = exFile ? await subirArquivo(exFile, "exames") : "";
      const _cat = exCat.find((c: any) => (c.nome || "").trim().toLowerCase() === nome.toLowerCase());
      const _snap = _cat ? { fornecedorId: _cat.fornecedorId || _cat.fornecedor?.id, fornecedorNome: _cat.fornecedor?.nome, custo: _cat.valorFornecedor ?? null, valor: _cat.valorClienteSugerido ?? null } : {};
      // Com laudo já anexado, o exame nasce na fase de resultado; sem laudo, como solicitado.
      const statusInicial = url
        ? (examFases.find((f) => /resultado/i.test(f)) || examFases[0] || "Solicitado")
        : (examFases[0] || "Solicitado");
      await listasAdd(`petexa_${petId}`, JSON.stringify({
        nome, status: statusInicial, date: new Date().toISOString(),
        ...(url ? { resultadoUrl: url, resultadoArquivo: exFile?.name } : {}),
        ..._snap,
      }));
      if (url) {
        try {
          await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tutorId: pet.tutorId, petId: pet.id, userId: vets[0]?.id, date: new Date().toISOString(), type: "Resultado de exames", status: "Realizado", prescription: url, chiefComplaint: nome }) });
        } catch {}
      }
      toast.success(url ? "Exame anexado" : "Exame solicitado");
      setArtefato(null); setExNome(""); setExFile(null);
      await loadPetColecoes(); await loadAtendimentos();
    } catch (e: any) {
      toast.error(String(e?.message || e).slice(0, 130));
    } finally { setSavingArt(false); }
  }
  function abrirFoto() { setEditId(null); setAtdOpen(false); setArtefato("FOTO"); setFotoUrl(""); setFotoLegenda(""); setFotoFile(null); }
  async function salvarFoto() {
    if (!pet) return;
    if (!fotoFile && !fotoUrl.trim()) { toast.error("Escolha um arquivo ou cole um link"); return; }
    setSavingArt(true);
    try {
      const url = fotoFile ? await subirArquivo(fotoFile, "pets") : fotoUrl.trim();
      const body: any = { tutorId: pet.tutorId, petId: pet.id, userId: vets[0]?.id, date: new Date().toISOString(), type: "Foto", status: "Realizado", prescription: url, chiefComplaint: fotoLegenda || undefined };
      const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Foto anexada"); setArtefato(null); await loadAtendimentos();
    } catch { toast.error("Erro ao anexar foto"); } finally { setSavingArt(false); }
  }
  function imprimirFolha(titulo: string, corpo: string, vetNome: string) {
    const tutorNome = (pet?.tutor?.name || pet?.tutorName || "");
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
    const esc = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const dt = new Date().toLocaleDateString("pt-BR");
    w.document.write('<html><head><title>' + esc(titulo) + '</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E2244;padding:40px;max-width:720px;margin:0 auto}h1{color:#014D5E;font-size:20px;margin:0 0 4px}.sub{color:#6B7280;font-size:12px;margin-bottom:18px}.who{font-size:13px;color:#475569;margin-bottom:14px}.box{white-space:pre-wrap;font-size:14px;line-height:1.6;border-top:2px solid #009AAC;padding-top:16px}.ft{margin-top:48px;font-size:12px;color:#6B7280;border-top:1px solid #ddd;padding-top:10px}</style></head><body><h1>Empório do Pet</h1><div class="sub">' + esc(titulo) + ' — ' + esc(dt) + '</div><div class="who">Pet: <b>' + esc(pet?.name || "") + '</b>' + (tutorNome ? ' · Tutor: ' + esc(tutorNome) : '') + (vetNome ? ' · Profissional: ' + esc(vetNome) : '') + '</div><div class="box">' + esc(corpo) + '</div><div class="ft">Documento gerado pelo sistema Empório do Pet</div></body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
  }
  async function abrirReceita() {
    setEditId(null); setAtdOpen(false); setRecModeloNome(""); setRecCorpo("");
    setRecVetId((v) => v || (vets[0]?.id || ""));
    try { const ms = await listasGet("receita_modelo"); const parsed = ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { nome: o.nome || i.valor, corpo: o.corpo || "" }; }); setRecModelos(parsed); } catch {}
    setArtefato("RECEITA");
  }
  async function salvarReceita() {
    if (!pet) return;
    if (!recCorpo.trim()) { toast.error("Escreva ou escolha um modelo de receita"); return; }
    if (!recVetId) { toast.error("Selecione o profissional"); return; }
    setSavingArt(true);
    try {
      const body: any = { tutorId: pet.tutorId, petId: pet.id, userId: recVetId, date: new Date().toISOString(), type: "Receitas", status: "Realizado", prescription: recCorpo };
      if (recModeloNome) body.chiefComplaint = recModeloNome;
      const r = await fetch(editId ? `/api/appointments/${editId}` : "/api/appointments", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Receita registrada"); setArtefato(null); setRecModeloNome(""); setRecCorpo(""); await loadAtendimentos();
    } catch { toast.error("Erro ao salvar receita"); } finally { setSavingArt(false); }
  }
  async function saveName() {
    const novo = nameVal.trim();
    if (!novo) { toast.error("O nome n\u00e3o pode ficar vazio"); return; }
    setSavingName(true);
    try { await patchPet({ name: novo }); toast.success("Nome atualizado"); setEditName(false); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingName(false); }
  }
  async function savePipe(field: "pipelineClinicoEtapa" | "pipelineFisioEtapa", value: string) {
    setSavingPipe(true);
    try { await patchPet({ [field]: value || null }); toast.success("Pipeline atualizada"); await load(); } catch { toast.error("Erro ao atualizar"); } finally { setSavingPipe(false); }
  }
  async function saveFu() {
    if (!fuDate) { toast.error("Escolha uma data"); return; }
    setSavingFu(true);
    try { await patchPet({ proximoFollowupAt: new Date(fuDate + "T12:00:00").toISOString() }); toast.success("Follow-up agendado"); setFuDate(""); await load(); } catch { toast.error("Erro ao agendar"); } finally { setSavingFu(false); }
  }
  async function clearFu() {
    try { await patchPet({ proximoFollowupAt: null }); toast.success("Follow-up removido"); await load(); } catch { toast.error("Erro"); }
  }
  // ❤️ Nota médica (medicalNotes) — popup do cabeçalho
  async function saveNotaMedica() {
    setSavingNota(true);
    try { await patchPet({ medicalNotes: notaVal }); toast.success("Nota médica salva"); setNotaOpen(false); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingNota(false); }
  }
  // 🏷️ Etiquetas no campo pet.tags (novo campo do schema)
  async function addPetTag(texto: string) {
    if (!pet || !texto.trim()) return;
    const novas = Array.from(new Set([...(pet.tags || []), texto.trim()]));
    setSavingTag(true);
    try { await patchPet({ tags: novas }); toast.success("Etiqueta adicionada"); setTagLivre(""); setTagPickerOpen(false); await load(); } catch { toast.error("Erro ao adicionar"); } finally { setSavingTag(false); }
  }
  async function removePetTag(texto: string) {
    if (!pet) return;
    const novas = (pet.tags || []).filter((t) => t !== texto);
    try { await patchPet({ tags: novas }); await load(); } catch { toast.error("Erro ao remover"); }
  }

  async function listasGet(lista: string) { try { const r = await fetch(`/api/listas?lista=${encodeURIComponent(lista)}`, { cache: "no-store" }); const d = await r.json(); return Array.isArray(d) ? d : (d.itens || d.data || []); } catch { return []; } }
  async function listasAdd(lista: string, valor: string) { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista, valor }) }); if (!r.ok) throw new Error(String(r.status)); return r.json(); }
  async function listasDel(id: string) { const r = await fetch(`/api/listas/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(String(r.status)); }
  async function loadPetColecoes() {
    const [tags, cads, pacs, exs] = await Promise.all([listasGet(`petetq_${petId}`), listasGet(`petcad_${petId}`), listasGet(`petpac_${petId}`), listasGet(`petexa_${petId}`)]);
    setPetTags(tags.map((i: any) => ({ id: i.id, texto: i.valor })));
    setCadAtivas(cads.map((i: any) => { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} return { id: i.id, data: d }; }));
    const parse = (arr: any[]) => arr.map((i: any) => { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} return { id: i.id, data: d }; });
    setPacotes(parse(pacs)); setExames(parse(exs));
  }
  async function loadCatalogos() {
    try { const r = await fetch(`/api/etiquetas/templates`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.templates || d.data || []); setTagTpls(arr.filter((t: any) => t.ativo !== false && (t.aplicaEm || []).includes("Pet"))); } catch {}
    try { const r = await fetch(`/api/cadencias`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.cadencias || d.data || []); setCadOpts(arr); } catch {}
    try { const r = await fetch(`/api/servicos/itens`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || d.servicos || []); setServicosCat(arr); setFisioSrv(arr.filter((srv: any) => JSON.stringify(srv).toLowerCase().includes("fisio"))); } catch {}
    try { const r = await fetch(`/api/fornecedores/exames/lista`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.exames || d.data || d.itens || []); setExCat(arr); } catch {}
    try { const r = await fetch(`/api/users`, { cache: "no-store" }); const d = await r.json(); setVets(Array.isArray(d) ? d : (d.users || d.data || [])); } catch {}
    try { const r = await fetch(`/api/racas`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.racas || d.data || d.itens || []); setRacasCat(arr.map((x: any) => ({ nome: x.nome || x.name || x.valor || "", especie: x.especie || x.species || "" })).filter((x: any) => x.nome)); } catch {}
    try { const r = await fetch(`/api/listas?lista=pet_cor`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setCoresCat(arr.map((i: any) => { try { const o = JSON.parse(i.valor); return o.nome || o.valor || i.valor; } catch { return i.valor; } }).filter(Boolean)); } catch {}
    try { const r = await fetch(`/api/listas?lista=pet_temperamento`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setTempCat(arr.map((i: any) => { try { const o = JSON.parse(i.valor); return o.nome || o.valor || i.valor; } catch { return i.valor; } }).filter(Boolean)); } catch {}
    // Quais temperamentos ocupam a sala inteira — configurado junto da agenda (é lá que a regra vale).
    try { const r = await fetch(`/api/listas?lista=agenda_config`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); if (arr[0]?.valor) { const cfg = JSON.parse(arr[0].valor); setTempTravam(Array.isArray(cfg.temperamentosQueTravam) ? cfg.temperamentosQueTravam : []); } } catch {}
  }
  async function addTag(texto: string) { setSavingTag(true); try { await listasAdd(`petetq_${petId}`, texto); toast.success("Etiqueta adicionada"); await loadPetColecoes(); } catch { toast.error("Erro (talvez já exista)"); } finally { setSavingTag(false); } }
  async function delTag(id: string) { try { await listasDel(id); await loadPetColecoes(); } catch { toast.error("Erro ao remover"); } }
  async function addCad(c: any) { setSavingCad(true); try { await listasAdd(`petcad_${petId}`, JSON.stringify({ cadenciaId: c.id, nome: c.nome || c.titulo, startedAt: new Date().toISOString() })); toast.success("Cadência iniciada"); setCadPick(false); await loadPetColecoes(); } catch { toast.error("Erro"); } finally { setSavingCad(false); } }
  async function delCad(id: string) { try { await listasDel(id); toast.success("Cadência encerrada"); await loadPetColecoes(); } catch { toast.error("Erro"); } }
  async function addPacote() {
    const srv = fisioSrv.find((s: any) => String(s.id) === pacForm.serviceId);
    // Aceita serviço do catálogo OU nome livre (migração de pacote já em andamento)
    const nome = srv ? (srv.nome || srv.titulo || srv.descricao) : pacForm.nome.trim();
    if (!nome) { toast.error("Escolha um serviço ou informe o nome do pacote"); return; }
    const total = Number(pacForm.total) || 0; if (total <= 0) { toast.error("Informe o total de sessões"); return; }
    setSavingPac(true);
    try { await listasAdd(`petpac_${petId}`, JSON.stringify({ serviceId: srv?.id || null, nome, total, used: Math.min(Math.max(Number(pacForm.jaFeitas) || 0, 0), total), createdAt: new Date().toISOString() })); toast.success("Pacote lançado"); setPacForm({ open: false, serviceId: "", nome: "", total: "4", jaFeitas: "0" }); await loadPetColecoes(); try { await patchPet({ pipelineFisioEtapa: "Pacote em andamento" }); await load(); } catch {} } catch { toast.error("Erro ao lançar pacote"); } finally { setSavingPac(false); }
  }
  async function usarSessao(p: { id: string; data: any }) {
    const total = p.data.total || 0;
    const used = Math.min((p.data.used || 0) + 1, total);
    try {
      const r = await fetch(`/api/listas/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...p.data, used }) }) });
      if (!r.ok) throw new Error();
      await loadPetColecoes();
      if (used === total) { toast.success("🎉 Pacote concluído!"); await alertaRenovacao(p.data.nome, used, total, true); }
      else if (total > 1 && used === total - 1) { toast("⏳ Penúltima sessão — avaliar renovação"); await alertaRenovacao(p.data.nome, used, total, false); }
    } catch { toast.error("Erro ao registrar sessão"); }
  }
  async function alertaRenovacao(nome: string, used: number, total: number, ultima: boolean) {
    const texto = ultima
      ? `⚠ Pacote "${nome}": ÚLTIMA sessão usada (${used}/${total}). Verificar renovação com o cliente.`
      : `⚠ Pacote "${nome}": penúltima sessão (${used}/${total}). Avaliar renovação.`;
    try { await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tipo: "NOTA", texto, canal: "Sistema" }) }); } catch {}
    try { await fetch(`/api/pets/${petId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date().toISOString(), ...(ultima ? { pipelineFisioEtapa: "Reavaliação" } : {}) }) }); } catch {}
    await load(); await loadInteracoesPet();
  }
  async function delPacote(id: string) { try { await listasDel(id); toast.success("Pacote removido"); await loadPetColecoes(); } catch { toast.error("Erro"); } }
  async function addExame() { if (!exPick.trim()) { toast.error("Escolha um exame"); return; } setSavingEx(true); try { const _cat = exCat.find((c: any) => (c.nome || "").trim().toLowerCase() === exPick.trim().toLowerCase()); const _snap = _cat ? { fornecedorId: _cat.fornecedorId || _cat.fornecedor?.id, fornecedorNome: _cat.fornecedor?.nome, custo: _cat.valorFornecedor ?? null, valor: _cat.valorClienteSugerido ?? null } : {}; await listasAdd(`petexa_${petId}`, JSON.stringify({ nome: exPick.trim(), status: examFases[0] || "Solicitado", date: new Date().toISOString(), ..._snap })); toast.success("Exame solicitado"); setExPick(""); await loadPetColecoes(); } catch { toast.error("Erro"); } finally { setSavingEx(false); } }
  async function updExameStatus(id: string, data: any, novoStatus: string) { try { const r = await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...data, status: novoStatus }) }) }); if (!r.ok) throw new Error(); await loadPetColecoes(); } catch { toast.error("Erro ao atualizar fase"); } }
  async function delExame(id: string) { try { await listasDel(id); await loadPetColecoes(); } catch { toast.error("Erro"); } }
  // 📎 Anexa o resultado (link) ao exame e avança o status para "Resultado"
  // Anexo de arquivo DE VERDADE (o antigo só aceitava link colado num window.prompt).
  // Sobe pro storage da clínica e devolve a URL — que alimenta o mesmo `resultadoUrl`
  // de sempre, então tudo que já lia o resultado continua funcionando.
  async function subirResultado(id: string, data: any, file: File) {
    setSubindoEx(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`/api/media/upload?pasta=exames&origem=exame&origemId=${petId}`, { method: "POST", body: fd });
      const j = await up.json().catch(() => ({}));
      if (!up.ok || !j?.url) throw new Error(j?.error || j?.message || "falha no upload");
      await gravarResultado(id, data, j.url, file.name);
      toast.success("Resultado anexado");
    } catch (e: any) {
      toast.error(String(e?.message || e).slice(0, 120));
    } finally {
      setSubindoEx(null);
    }
  }
  // Gravação do resultado — uma só, usada pelo arquivo E pelo link. O que muda entre
  // os dois é só de onde a URL veio.
  async function gravarResultado(id: string, data: any, url: string, nomeArquivo?: string) {
    const limpa = (url || "").trim();
    const novoStatus = (examFases.find((f) => /resultado/i.test(f)) || data.status);
    const r = await fetch(`/api/listas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor: JSON.stringify({ ...data, resultadoUrl: limpa || null, resultadoArquivo: nomeArquivo || data.resultadoArquivo || null, status: limpa ? novoStatus : data.status }) }),
    });
    if (!r.ok) throw new Error("não consegui salvar o resultado no exame");
    // Registra tambem como documento na timeline
    if (limpa && pet) {
      try {
        await fetch("/api/appointments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tutorId: pet.tutorId, petId: pet.id, userId: vets[0]?.id, date: new Date().toISOString(), type: "Resultado de exames", status: "Realizado", prescription: limpa, chiefComplaint: data.nome }),
        });
      } catch {}
    }
    await loadPetColecoes(); await loadAtendimentos();
  }
  async function anexarResultado(id: string, data: any) {
    const url = window.prompt("Cole o link do resultado (Drive, PDF, imagem…):", data.resultadoUrl || "");
    if (url == null) return;
    try {
      await gravarResultado(id, data, url);
      toast.success("Resultado anexado");
    } catch (e: any) { toast.error(String(e?.message || "Erro ao anexar resultado").slice(0, 120)); }
  }
  async function criarAtendimento() {
    if (!pet) return;
    if (!atd.date) { toast.error("Informe data e hora"); return; }
    if (!atd.userId) { toast.error("Selecione o profissional responsável"); return; }
    setSavingAtd(true);
    try {
      const body: any = { tutorId: pet.tutorId, petId: pet.id, userId: atd.userId, date: new Date(atd.date).toISOString(), type: atd.type, status: atd.status };
      if (atd.duration) body.duration = Number(atd.duration);
      for (const k of ["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "conduct", "prescription", "examsRequested", "paymentMethod", "followUpNotes", "notes"]) { if (atd[k]) body[k] = atd[k]; }
      if (atd.petWeight) body.petWeight = Number(atd.petWeight);
      if (atd.temperature) body.temperature = Number(atd.temperature);
      if (atd.nextReturnDate) body.nextReturnDate = new Date(atd.nextReturnDate + "T12:00:00").toISOString();
      const itensValidos = items.filter((it: any) => it.descricao || it.servicoId);
      if (itensValidos.length) {
        body.items = itensValidos.map((it: any) => ({ ...(it.servicoId ? { servicoId: it.servicoId, productId: it.servicoId } : {}), ...(it.descricao ? { descricao: it.descricao } : {}), ...(it.executorUserId ? { executorUserId: it.executorUserId } : {}), quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, custoUnitario: Number(it.custoUnitario) || 0, valorTotal: (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), ...(it.comissaoValor ? { comissaoTipo: "PERCENTUAL", comissaoValor: Number(it.comissaoValor) } : {}) }));
        body.value = body.items.reduce((sm: number, it: any) => sm + (it.valorTotal || 0), 0);
      }
      const r = await fetch(editId ? `/api/appointments/${editId}` : "/api/appointments", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      if (atd.petWeight) { try { await patchPet({ weight: Number(atd.petWeight) }); } catch {} } // F5.1: peso do atendimento atualiza o peso atual do pet
      toast.success("Atendimento registrado"); setAtdOpen(false); setAtd(ATD0); setItems([]); await load(); await loadAtendimentos();
      // Venda de fisioterapia: abre o pacote pra lancar as sessoes
      const fisioItem = itensValidos.find((it: any) => it.servicoId && fisioSrv.some((sv: any) => String(sv.id) === String(it.servicoId)));
      if (fisioItem) {
        const sv = fisioSrv.find((x: any) => String(x.id) === String(fisioItem.servicoId));
        setTab("PACOTES");
        setPacForm({ open: true, serviceId: String(fisioItem.servicoId), nome: "", total: String(Number(fisioItem.quantidade) || 4), jaFeitas: "0" });
        toast(`Fisioterapia vendida (${sv?.nome || sv?.titulo || "sessão"}) — defina o total de sessões do pacote`, { icon: "🩺", duration: 6000 });
      }
    } catch { toast.error("Erro ao registrar atendimento"); } finally { setSavingAtd(false); }
  }
  function addItem() { setItems(prev => [...prev, { servicoId: "", descricao: "", quantidade: 1, valorUnitario: 0, custoUnitario: 0, executorUserId: "", comissaoValor: 0 }]); }
  function updItem(i: number, patch: any) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function rmItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function pickServico(i: number, servicoId: string) { const sv = servicosCat.find((x: any) => x.id === servicoId); updItem(i, { servicoId, descricao: sv?.nome || "", valorUnitario: sv?.valorPadrao ?? 0, custoUnitario: sv?.custoPadrao ?? 0 }); }
  async function loadInteracoesPet() { try { const r = await fetch(`/api/interacoes?petId=${petId}&limit=100`, { cache: "no-store" }); const d = await r.json(); setPetInteracoes(Array.isArray(d) ? d : (d.interacoes || d.data || [])); } catch {} }
  async function addInteracaoPet() { if (!intTexto.trim()) { toast.error("Escreva algo"); return; } setSavingInt(true); try { const r = await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tipo: intTipo, texto: intTexto.trim(), canal: "Sistema" }) }); if (!r.ok) throw new Error(); toast.success("Registrado"); setIntTexto(""); await loadInteracoesPet(); } catch { toast.error("Erro ao registrar"); } finally { setSavingInt(false); } }
  async function loadAtdConfig() {
    try {
      const [rt, rs] = await Promise.all([fetch(`/api/listas?lista=atendimento_tipo`, { cache: "no-store" }), fetch(`/api/listas?lista=atendimento_status`, { cache: "no-store" })]);
      const dt = await rt.json(); const at = Array.isArray(dt) ? dt : (dt.itens || dt.data || []);
      const tipos = at.map((i: any) => { try { const o = JSON.parse(i.valor); return { v: o.v, l: o.l }; } catch { return { v: i.valor, l: i.valor }; } }).filter((x: any) => x.v);
      if (tipos.length) setAtdTipos(tipos);
      const ds = await rs.json(); const as = Array.isArray(ds) ? ds : (ds.itens || ds.data || []);
      const status = as.map((i: any) => i.valor).filter(Boolean);
      if (status.length) setAtdStatus(status);
      try {
        const rf = await fetch(`/api/listas?lista=exame_fases`, { cache: "no-store" });
        const df = await rf.json(); const af = Array.isArray(df) ? df : (df.itens || df.data || []);
        const fases = af.map((i: any) => i.valor).filter(Boolean);
        if (fases.length) setExamFases(fases);
      } catch {}
    } catch {}
  }
  async function loadAtendimentos() { try { const r = await fetch(`/api/appointments?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.appointments || d.data || []); setAtendimentos(arr.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())); } catch {} }
  async function loadHistorico() { try { const r = await fetch(`/api/pets/${petId}/historico`, { cache: "no-store" }); const d = await r.json(); setHistorico(Array.isArray(d) ? d : (d.data || [])); } catch {} }
  async function abrirDetalheHist(id: string) { try { const r = await fetch(`/api/pets/historico/${id}`, { cache: "no-store" }); const d = await r.json(); if (d?.id) setDetalheHist(d); } catch {} }
  async function loadClinDocs() { try { const r = await fetch(`/api/clinical-documents/pet/${petId}`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.documents || d.data || []); setClinDocs(arr); } catch {} }
  async function abrirAtd(id: string) { try { const a = await fetch(`/api/appointments/${id}`, { cache: "no-store" }).then(r => r.json()); setVerAtd(a); setEditAtd(false); } catch { toast.error("Erro ao abrir atendimento"); } }
  async function excluirAtendimento(id: string) {
    if (!(await confirmDelete({ entityLabel: "atendimento", itemName: "este atendimento" }))) return;
    try { const r = await fetch(`/api/appointments/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); toast.success("Atendimento excluído"); setVerAtd(null); await loadAtendimentos(); } catch { toast.error("Erro ao excluir"); }
  }
  async function salvarEditAtd() {
    if (!verAtd) return;
    try {
      const body: any = { type: editAtdForm.type, status: editAtdForm.status, notes: editAtdForm.notes ?? "" };
      // Data/hora real da sessão (pra lançar as sessões que já aconteceram na data certa).
      if (editAtdForm.date && editAtdForm.time) body.date = new Date(`${editAtdForm.date}T${editAtdForm.time}`).toISOString();
      const r = await fetch(`/api/appointments/${verAtd.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      toast.success("Atendimento atualizado");
      setVerAtd({ ...verAtd, ...body, date: body.date || verAtd.date });
      setEditAtd(false); await loadAtendimentos();
    } catch { toast.error("Erro ao salvar"); }
  }

  const tutorWhats = useMemo(() => {
    if (!pet?.tutor?.contacts) return null;
    const wa = pet.tutor.contacts.find(c => c.isWhatsApp) || pet.tutor.contacts.find(c => c.isPrimary) || pet.tutor.contacts[0];
    return wa?.number || null;
  }, [pet]);

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Carregando ficha...</div>;
  }
  if (!pet) {
    return (
      <div className="p-10 text-center">
        <div className="text-gray-700 font-semibold mb-2">Pet não encontrado</div>
        <Link href="/dashboard/erp/pets" className="text-sm" style={{ color: "#009AAC" }}>← Voltar para lista</Link>
      </div>
    );
  }

  const pipelineClinico = pet.pipelineClinicoEtapa || "—";
  const pipelineFisio = pet.pipelineFisioEtapa || "—";
  const ltvPet = (atendimentos || []).reduce((acc: number, a: any) => acc + Number(a.value || 0), 0);
  const ultimaVisita = (atendimentos || [])[0]?.date || null;

  // ── Derivados para o padrão Base44 ──────────────────────────────
  const emoji = PET_EMOJI(pet.species);
  const saude = healthStatus(pet.pipelineClinicoEtapa, pet.pipelineFisioEtapa);
  const money = (v?: number | null) =>
    v == null ? "—" : !showValues ? "R$ ••••" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const diasDesdeUltima = ultimaVisita ? Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / 86400000) : null;
  // Vacinas em dia: existe pelo menos um protocolo/atendimento de vacinação
  const temVacina = (atendimentos || []).some((a: any) => /vacin/i.test(a.type || "") || /vacin/i.test(a.description || ""));
  const castrado = pet.sterilization === "STERILIZED";
  const pesoOk = pet.weight != null && pet.weight > 0;
  const emTratamento = /trat|manut|exame|avali/i.test(saude.label + " " + pipelineClinico + " " + pipelineFisio);
  // Índice de saúde 0–100 (honesto: vacina + peso + castração + tratamento controlado)
  const selosSaude: { txt: string; ok: boolean }[] = [
    { txt: "💉 Vacinas em dia", ok: temVacina },
    { txt: "✅ Castrado", ok: castrado },
    { txt: "⚖️ Peso ok", ok: pesoOk },
    { txt: "🩺 Tratamento em dia", ok: !pet.pipelineClinicoEtapa || emTratamento },
  ];
  const healthIndex = Math.round((selosSaude.filter((s) => s.ok).length / selosSaude.length) * 100);
  const R = 26, C = 2 * Math.PI * R;
  // Pacote de fisioterapia ativo (patinhas)
  const pacFisio = (pacotes || []).find((p) => (p.data?.total || 0) > 0);
  const pacUsed = pacFisio?.data?.used || 0;
  const pacTotal = pacFisio?.data?.total || 0;

  // ── Vacinas (a partir dos protocolos reais) ──
  const vacinasResumo = (protocolos || []).filter((p: any) => p.tipo === "VACINA").map((p: any) => {
    const doses = (p.doses || []).slice().sort((a: any, b: any) => new Date(a.dataPrevista || 0).getTime() - new Date(b.dataPrevista || 0).getTime());
    const aplicadas = doses.filter((d: any) => d.status === "APLICADA" && d.dataAplicada);
    const ultima = aplicadas.length ? aplicadas[aplicadas.length - 1].dataAplicada : null;
    const proxPend = doses.find((d: any) => d.status === "PENDENTE" && d.dataPrevista);
    const prox = proxPend?.dataPrevista || null;
    const venceu = prox ? new Date(prox).getTime() < Date.now() : false;
    return { id: p.id, nome: p.nomeProtocolo, ultima, prox, venceu, temPend: !!proxPend };
  });
  // ── Medicamentos periódicos (a partir de vermífugo/ectoparasita reais) ──
  const medFromProto = (kw: RegExp, tipo: string) => {
    const cands = (protocolos || []).filter((p: any) => p.tipo === tipo || kw.test(p.nomeProtocolo || ""));
    let ultima: string | null = null, prox: string | null = null;
    for (const p of cands) {
      for (const d of (p.doses || [])) {
        if (d.status === "APLICADA" && d.dataAplicada && (!ultima || new Date(d.dataAplicada) > new Date(ultima))) ultima = d.dataAplicada;
        if (d.status === "PENDENTE" && d.dataPrevista && (!prox || new Date(d.dataPrevista) < new Date(prox))) prox = d.dataPrevista;
      }
    }
    return { ultima, prox };
  };
  const medsPeriodicos = [
    { nome: "🦟 Antipulgas / carrapaticida", periodo: "mensal", ...medFromProto(/pulga|carrapat|ecto/i, "ECTOPARASITA") },
    { nome: "🪱 Vermífugo", periodo: "trimestral", ...medFromProto(/verm[íi]fugo|verm/i, "VERMIFUGO") },
    { nome: "❤️ Vermífugo cardíaco", periodo: "mensal", ...medFromProto(/card[íi]aco|dirofilar/i, "VERMIFUGO") },
  ];

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      {/* Breadcrumb */}
      <div className="text-[12px] text-[#8A989D] mb-2 px-1">
        <Link href="/dashboard/erp/pets" className="hover:text-[#009AAC]">Pets</Link> / <b className="text-[#009AAC] font-medium">{pet.name}</b>
      </div>

      {/* ── Cabeçalho em card branco (padrão ficha do cliente) ── */}
      <div className="bg-white border border-[#E8E2D6] rounded-[14px] mb-3" style={{ padding: "14px 16px" }}>
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex items-start gap-3 flex-1" style={{ minWidth: "220px" }}>
            <div className="w-[50px] h-[50px] rounded-[13px] bg-[#FBF3E3] flex items-center justify-center text-[26px] shrink-0">{emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {editName ? (
                  <span className="flex items-center gap-1">
                    <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditName(false); }} className="text-[19px] px-2 py-0.5 border rounded-lg text-[#014D5E]" style={{ borderColor: "#009AAC" }} />
                    <button onClick={saveName} disabled={savingName} className="p-1 rounded-lg text-white disabled:opacity-50" style={{ background: "#009AAC" }} title="Salvar"><LuCheck size={14} /></button>
                    <button onClick={() => setEditName(false)} className="p-1 rounded-lg border" style={{ borderColor: "#E8E2D6", color: "#64748b" }} title="Cancelar"><LuX size={14} /></button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 group">
                    <h1 className="text-[19px] leading-tight text-[#014D5E] font-medium">{pet.name}</h1>
                    <button onClick={() => { setNameVal(pet.name || ""); setEditName(true); }} className="p-0.5 rounded text-[#c8d0d4] hover:text-[#009AAC]" title="Editar nome"><LuPencil size={12} /></button>
                  </span>
                )}
                {pet.codigo ? <span className="text-[13px] text-[#8A989D] font-medium" title="Código do pet">#{pet.codigo}</span> : null}
                <button onClick={() => setStatusOpen(true)} title="Status de saúde — clique para alterar" className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: saude.bg, color: saude.color }}>{saude.label} ▾</button>
                {pet.status === "DECEASED" && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#EEF0F2", color: "#5b6470" }}>🕊️ Óbito</span>}
                {/petlife/i.test(pet.insurancePlan || "") && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E6F0FF", color: "#0C447C" }}>🩺 Petlife</span>}
                <button onClick={() => { setNotaVal(pet.medicalNotes || ""); setNotaOpen(true); }} title={pet.medicalNotes ? `Nota médica: ${pet.medicalNotes}` : "Adicionar nota médica"} className="text-[15px] leading-none">{(pet.medicalNotes || pet.observations) ? "❤️" : "🤍"}</button>
              </div>
              <p className="text-[12.5px] text-[#5C6B70] mt-0.5">
                {[speciesLabel(pet.species), pet.breed, genderLabel(pet.gender), pet.birthDate ? ageFromBirth(pet.birthDate) : null, sterilLabel(pet.sterilization)].filter((x) => x && x !== "—").join(" · ")}
              </p>
              {pet.tutor && (
                <p className="text-[12.5px] text-[#5C6B70] mt-0.5">
                  🧑 Tutor(a): <Link href={`/dashboard/erp/tutores/${pet.tutorId}`} className="text-[#009AAC] hover:underline">{pet.tutor.name} →</Link>
                </p>
              )}
              {/* Etiquetas (chips + tag) */}
              <div className="flex flex-wrap gap-1.5 items-center mt-2">
                <span className="text-[11.5px] text-[#8A989D]">🏷️</span>
                {(pet.tags || []).map((t) => {
                  const tpl = tagTpls.find((x: any) => x.texto === t);
                  const cor = tpl?.cor || "#009AAC";
                  return (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>
                      ● {t}
                      <button onClick={() => removePetTag(t)} title="Remover" className="hover:opacity-60 font-bold">×</button>
                    </span>
                  );
                })}
                <button onClick={() => setTagPickerOpen((v) => !v)} className="border border-dashed border-[#E8E2D6] text-[#8A989D] text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
              </div>
              {tagPickerOpen && (
                <div className="mt-2 pt-2 border-t border-[#F0EBE0]">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tagTpls.filter((t: any) => !(pet.tags || []).includes(t.texto)).map((t: any) => (
                      <button key={t.texto} disabled={savingTag} onClick={() => addPetTag(t.texto)} className="text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input value={tagLivre} onChange={(e) => setTagLivre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPetTag(tagLivre); }} placeholder="Nova etiqueta livre…" className="flex-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
                    <button onClick={() => addPetTag(tagLivre)} disabled={savingTag || !tagLivre.trim()} className="bg-[#009AAC] text-white px-2.5 py-1 rounded text-[11px] disabled:opacity-50">Adicionar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={iniciarConsulta} className="bg-[#014D5E] text-white rounded-[9px] px-3.5 py-2 text-[12.5px] hover:opacity-90 flex items-center gap-1.5">🩺 Iniciar consulta</button>
            <button onClick={toggleObito} title="Registrar óbito / marcar vivo" className="border rounded-[9px] px-3 py-2 text-[12.5px] flex items-center gap-1.5" style={pet.status === "DECEASED" ? { borderColor: "#0F6E56", color: "#0F6E56", background: "#fff" } : { borderColor: "#E8E2D6", color: "#5C6B70", background: "#fff" }}>{pet.status === "DECEASED" ? "↩️ Marcar vivo" : "🕊️ Óbito"}</button>
            <button onClick={togglePetlife} title="Convênio Petlife" className="border rounded-[9px] px-3 py-2 text-[12.5px] flex items-center gap-1.5" style={/petlife/i.test(pet.insurancePlan || "") ? { borderColor: "#0C447C", color: "#0C447C", background: "#fff" } : { borderColor: "#E8E2D6", color: "#5C6B70", background: "#fff" }}>🩺 {/petlife/i.test(pet.insurancePlan || "") ? "Petlife ✓" : "Marcar Petlife"}</button>
            <button onClick={() => setShowValues((v) => !v)} className="border border-[#EAD9B6] bg-[#FBF6EC] rounded-[9px] px-3 py-2 text-[12.5px] text-[#8A5A0B] hover:border-[#E0A100] flex items-center gap-1.5">{showValues ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
            <button onClick={() => openWhatsAppMeta(tutorWhats || undefined, { nome: pet.tutor?.name, pet: pet.name })} className="bg-[#009AAC] text-white rounded-[9px] px-3.5 py-2 text-[12.5px] hover:bg-[#00808f] flex items-center gap-1.5">💬 WhatsApp</button>
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} className="border border-[#E8E2D6] bg-white rounded-[9px] px-3 py-2 text-[12.5px] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">⋯ Mais</button>
              {moreOpen && (
                <div className="absolute right-0 top-[42px] bg-white border border-[#E0DACB] rounded-[11px] shadow-lg p-1.5 z-20 min-w-[200px]" onMouseLeave={() => setMoreOpen(false)}>
                  <Link href={`/dashboard/erp/tutores/${pet.tutorId}`} onClick={() => setMoreOpen(false)} className="block text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FBF9F4] text-[#5C6B70]">✏️ Editar cadastro do tutor</Link>
                  <div className="px-1.5 py-1"><EncaminharBox tipo="pet" id={petId} nome={pet?.name || ""} onChange={loadInteracoesPet} /></div>
                  <button onClick={() => { setDelOpen(true); setMoreOpen(false); }} className="w-full text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FDECEC] text-[#b23b39] border-t border-[#F0EBE0] mt-1">🗑️ Excluir pet</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de abas ── */}
      <div className="flex border-b border-[#E8E2D6] mb-3 flex-wrap">
        {([
          { k: "GERAL", label: "👤 Visão geral" },
          { k: "CADASTRO", label: "📋 Cadastro" },
          { k: "PRONTUARIO", label: "🩺 Prontuário" },
          { k: "VACINAS", label: "💉 Vacinas & meds" },
          { k: "FISIO", label: "🌿 Fisioterapia" },
          { k: "COMPRAS", label: "🧾 Compras" },
        ] as const).map((t) => (
          <button key={t.k} onClick={() => setMainTab(t.k)} className="px-4 py-2 text-sm font-medium border-b-2 transition -mb-px" style={{ borderColor: mainTab === t.k ? "#009AAC" : "transparent", color: mainTab === t.k ? "#009AAC" : "#8A989D" }}>{t.label}</button>
        ))}
      </div>

      {/* ═══════════ ABA 👤 VISÃO GERAL ═══════════ */}
      {mainTab === "GERAL" && (
      <div className="mb-3 flex flex-col gap-3">
        {/* 1. Barra de saúde — 2 cards espelhados (anel + status/selos/patinhas) */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,auto) minmax(0,1fr)" }}>
          <div className="bg-white border border-[#E8E2D6] rounded-[14px] flex items-center gap-3.5" style={{ padding: "13px 16px" }}>
            <div className="relative w-[62px] h-[62px] shrink-0">
              <svg viewBox="0 0 62 62" className="w-full h-full -rotate-90">
                <circle cx="31" cy="31" r={R} fill="none" stroke="#F0EBE0" strokeWidth="6" />
                <circle cx="31" cy="31" r={R} fill="none" stroke="#009AAC" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (healthIndex / 100) * C} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[18px] font-medium text-[#014D5E]">{healthIndex}</div>
            </div>
            <div>
              <div className="text-[13.5px] font-medium text-[#014D5E]">🐾 Saúde</div>
              <div className="text-[11.5px] text-[#8A989D]">Índice {healthIndex}/100</div>
            </div>
          </div>
          <div className="bg-white border border-[#E8E2D6] rounded-[14px]" style={{ padding: "13px 16px" }}>
            <div className="flex justify-between items-center text-[13px] mb-1.5">
              <span className="font-medium" style={{ color: saude.color }}>{saude.label}</span>
              <button onClick={() => setStatusOpen(true)} className="text-[#8A989D] hover:text-[#009AAC] text-[11.5px]">alterar ▾</button>
            </div>
            {/* Selos reais */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selosSaude.map((s) => (
                <span key={s.txt} className="text-[11px] px-2 py-0.5 rounded-full" style={s.ok ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#F3F1EC", color: "#9a948a" }}>{s.ok ? s.txt : "○ " + s.txt.replace(/^\S+\s/, "")}</span>
              ))}
            </div>
            {/* Fisioterapia = patinhas (único lugar do pacote) */}
            {pacFisio ? (
              <div className="pt-2 border-t border-[#F0EBE0]">
                <div className="flex justify-between items-center text-[11.5px] mb-1">
                  <span className="text-[#5C6B70]">🐾 Fisioterapia <span className="text-[#8A989D]">(ligado à venda)</span></span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#014D5E] font-medium">{pacUsed}/{pacTotal}</span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: pacTotal - pacUsed > 0 ? "#FBF3E3" : "#E1F5EE", color: pacTotal - pacUsed > 0 ? "#8a6400" : "#0F6E56" }}>{Math.max(0, pacTotal - pacUsed)} pendente{pacTotal - pacUsed === 1 ? "" : "s"}</span>
                    <button onClick={() => usarSessao(pacFisio)} disabled={pacUsed >= pacTotal} className="text-[10.5px] px-2 py-0.5 rounded-full border disabled:opacity-40" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>{pacUsed >= pacTotal ? "🎉 concluído" : "usar sessão"}</button>
                  </span>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {Array.from({ length: Math.min(pacTotal, 30) }).map((_, i) => (
                    <span key={i} style={{ fontSize: "15px" }} title={`Sessão ${i + 1}`}>{i < pacUsed ? "🐾" : "⚪"}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#F0EBE0]">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-[#8A989D]">Sem pacote de fisioterapia ativo.</span>
                  <button onClick={() => setPacForm((f) => ({ ...f, open: !f.open }))} className="text-[10.5px] px-2 py-0.5 rounded-full border" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>＋ pacote</button>
                </div>
                {pacForm.open && (
                  <div className="mt-2 pt-2 border-t border-[#F0EBE0] flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[150px]"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Serviço de fisioterapia</label>
                      <select value={pacForm.serviceId} onChange={(e) => setPacForm((f) => ({ ...f, serviceId: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[12px]">
                        <option value="">— selecionar —</option>
                        {fisioSrv.map((srv: any) => <option key={srv.id} value={srv.id}>{srv.nome || srv.titulo || srv.descricao}</option>)}
                      </select>
                    </div>
                    <div className="w-[76px]"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Total</label><input inputMode="numeric" maxLength={3} value={pacForm.total} onChange={(e) => setPacForm((f) => ({ ...f, total: e.target.value.replace(/\D/g, "").slice(0, 3) }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[12px] text-center" /></div>
                    <div className="w-[76px]"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Feitas</label><input inputMode="numeric" maxLength={3} value={pacForm.jaFeitas} onChange={(e) => setPacForm((f) => ({ ...f, jaFeitas: e.target.value.replace(/\D/g, "").slice(0, 3) }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[12px] text-center" /></div>
                    <div className="w-[86px]"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Pendentes</label><div className="mt-0.5 px-2 py-1 border rounded text-[12px] text-center font-semibold" style={{ borderColor: "#E8E2D6", background: "#FBF9F4", color: "#014D5E" }}>{Math.max(0, (Number(pacForm.total) || 0) - (Number(pacForm.jaFeitas) || 0))}</div></div>
                    <button onClick={addPacote} disabled={savingPac} className="px-3 py-1 rounded text-[12px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingPac ? "..." : "Criar"}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Sinais vitais (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {[
            { emoji: "⚖️", label: "Peso", value: pet.weight ? `${pet.weight} kg` : "—" },
            { emoji: "🎂", label: "Idade", value: pet.birthDate ? ageFromBirth(pet.birthDate) : "—" },
            { emoji: "📏", label: "Porte", value: pet.weight ? (pet.weight < 10 ? "Pequeno" : pet.weight < 25 ? "Médio" : "Grande") : "—" },
            { emoji: "🩺", label: "Última visita", value: diasTxt(diasDesdeUltima) },
            { emoji: "🧾", label: "Gasto no pet", value: money(ltvPet) },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "11px 13px" }}>
              <div className="text-[11px] text-[#8A989D]">{k.emoji} {k.label}</div>
              <div className="text-[19px] text-[#014D5E] font-medium mt-0.5">{k.value}</div>
            </div>
          ))}
        </div>

        {/* 3. Alertas médicos (só se houver) */}
        {((pet.allergies && pet.allergies.length > 0) || pet.medicalNotes) && (
          <div className="bg-[#FDECEC] border border-[#f4baba] rounded-[13px]" style={{ padding: "12px 15px" }}>
            <h3 className="text-[13px] text-[#A32D2D] font-medium flex items-center gap-1.5 mb-1">⚠️ Alertas médicos</h3>
            {pet.allergies && pet.allergies.length > 0 && <div className="text-[12.5px] text-[#8a3232]">🚫 Alergias: <b>{pet.allergies.join(", ")}</b></div>}
            {pet.medicalNotes && <div className="text-[12.5px] text-[#8a3232] mt-0.5">📝 {pet.medicalNotes}</div>}
          </div>
        )}

        {/* 4. Tutor + Próximos cuidados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🧑 Tutora</h3>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {pet.tutor ? (
                <Link href={`/dashboard/erp/tutores/${pet.tutorId}`} className="flex items-center gap-3 hover:bg-[#FBF9F4] rounded-[9px] -mx-1 px-1 py-1">
                  <div className="w-[38px] h-[38px] rounded-[12px] bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[14px] font-medium shrink-0">
                    {(pet.tutor.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-[#014D5E] font-medium truncate">{pet.tutor.name}</div>
                    {tutorWhats && <div className="text-[12px] text-[#5C6B70]">📞 {tutorWhats}</div>}
                  </div>
                  <span className="text-[#8A989D] text-[16px]">›</span>
                </Link>
              ) : <p className="text-[12px] text-[#8A989D]">Sem tutor vinculado.</p>}
            </div>
          </div>
          <div className="bg-[#FBF3E3] border border-[#F0DCB0] rounded-[13px]" style={{ padding: "12px 15px" }}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[13px] text-[#8a6400] font-medium flex items-center gap-1.5">🔔 Próximos cuidados</h3>
              <button onClick={() => { setFuDate(pet.proximoFollowupAt ? String(pet.proximoFollowupAt).slice(0, 10) : ""); setFuOpen(true); }} className="text-[11.5px] text-[#8a6400] underline">📞 {pet.proximoFollowupAt ? "Alterar" : "Agendar"}</button>
            </div>
            <div className="text-[12.5px] text-[#7a6330] flex flex-col gap-1">
              {pet.proximoFollowupAt && <div>📞 Follow-up em <b>{fmtDataBR(pet.proximoFollowupAt).slice(0, 5)}</b></div>}
              {pet.birthDate && <div>🎂 Aniversário em <b>{fmtDataBR(pet.birthDate).slice(0, 5)}</b></div>}
              {pacFisio && pacUsed < pacTotal && <div>🐾 Fisio: {pacTotal - pacUsed} sessão(ões) restante(s)</div>}
              {!pet.proximoFollowupAt && !pet.birthDate && !pacFisio && <div className="text-[#a99a72]">Nenhum cuidado agendado no momento.</div>}
            </div>
          </div>
        </div>

        {/* 5. Últimos atendimentos */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🩺 Últimos atendimentos</h3>
            <button onClick={() => setMainTab("PRONTUARIO")} className="text-[11px] text-[#009AAC] hover:underline">ver prontuário →</button>
          </div>
          <div style={{ padding: "6px 15px" }}>
            {(atendimentos || []).length === 0 && <p className="text-[12.5px] text-[#8A989D] py-3 text-center">Nenhum atendimento registrado ainda.</p>}
            {(atendimentos || []).slice(0, 3).map((a: any, i: number) => (
              <button key={a.id} onClick={() => abrirAtd(a.id)} className="w-full flex items-center gap-2.5 py-2.5 text-left" style={{ borderBottom: i < Math.min(3, atendimentos.length) - 1 ? "1px solid #F0EBE0" : "none" }}>
                <span className="text-[11.5px] text-[#8A989D] w-[46px] shrink-0">{fmtDataBR(a.date).slice(0, 5)}</span>
                <span className="flex-1 text-[12.5px] text-[#1F2A2E] truncate">{ATD_TIPO_LABEL(a.type)}{a.chiefComplaint ? ` · ${a.chiefComplaint}` : ""}</span>
                <span className="text-[12.5px] text-[#014D5E] font-medium shrink-0">{money(a.value)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Relacionamento / tratamento */}
        <div className="text-[11px] text-[#8A989D] uppercase tracking-wide mb-1 mt-1 px-1">💬 Relacionamento / tratamento</div>

        {/* Tratamento em andamento — pipelines roll-up LADO A LADO */}
        <div className="text-[12px] text-[#014D5E] font-medium flex items-center gap-1.5 px-1">🔄 Tratamento em andamento</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {([
            { key: "clinico" as const, label: "Clínico", field: "pipelineClinicoEtapa" as const, etapas: pipes.clinico, atual: pet.pipelineClinicoEtapa },
            { key: "fisio" as const, label: "Fisioterapia", field: "pipelineFisioEtapa" as const, etapas: pipes.fisio, atual: pet.pipelineFisioEtapa },
          ]).map((row) => {
            const lista = row.etapas.length ? row.etapas : (row.atual ? [row.atual] : []);
            const aberto = pipeOpen[row.key];
            return (
              <div key={row.key} className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "11px 14px" }}>
                <button onClick={() => setPipeOpen((o) => ({ ...o, [row.key]: !o[row.key] }))} className="w-full flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-[#8A989D]">{row.label}</span>
                  <span className="flex items-center gap-2">
                    {row.atual ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "#009AAC", color: "#fff" }}>{row.atual}</span>
                    ) : (
                      <span className="text-[11.5px] text-[#8A989D]">— sem etapa —</span>
                    )}
                    <span className="text-[11px] text-[#8A989D]">{aberto ? "▴" : "▾"}</span>
                  </span>
                </button>
                {aberto && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#F0EBE0]">
                    <button onClick={async () => { await savePipe(row.field, ""); setPipeOpen((o) => ({ ...o, [row.key]: false })); }} disabled={savingPipe} className="text-[11px] px-2.5 py-1 rounded-full border transition disabled:opacity-50" style={!row.atual ? { background: "#E0F4F6", color: "#014D5E", borderColor: "#009AAC" } : { background: "#fff", color: "#8A989D", borderColor: "#E8E2D6" }}>— sem etapa —</button>
                    {lista.length === 0 && <span className="text-[12px] text-[#8A989D]">Nenhuma etapa configurada.</span>}
                    {lista.map((e) => (
                      <button key={e} onClick={async () => { await savePipe(row.field, e); setPipeOpen((o) => ({ ...o, [row.key]: false })); }} disabled={savingPipe} className="text-[11px] px-2.5 py-1 rounded-full border transition disabled:opacity-50" style={row.atual === e ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Follow-up | Sequências — 2 boxes lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {/* Follow-up */}
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">📞 Follow-up do tratamento</h3>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {pet.proximoFollowupAt ? (
                <div className="text-[12.5px] text-[#5C6B70]">Próximo em <b className="text-[#014D5E]">{fmtDataBR(pet.proximoFollowupAt)}</b></div>
              ) : <div className="text-[12.5px] text-[#8A989D]">Nenhum follow-up agendado.</div>}
              <div className="flex gap-1.5 mt-2.5">
                <button onClick={() => { setFuDate(pet.proximoFollowupAt ? String(pet.proximoFollowupAt).slice(0, 10) : ""); setFuOpen(true); }} className="bg-[#E0F4F6] text-[#014D5E] text-[11px] px-2.5 py-1 rounded-[8px]">{pet.proximoFollowupAt ? "Reagendar" : "Agendar"}</button>
                {pet.proximoFollowupAt && <button onClick={clearFu} className="bg-[#FBF9F4] text-[#5C6B70] text-[11px] px-2.5 py-1 rounded-[8px] border border-[#F0EBE0]">Concluir</button>}
              </div>
            </div>
          </div>
          {/* Sequências */}
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">⚡ Sequências</h3>
              <button onClick={() => setCadPick((v) => !v)} className="text-[11px] text-[#009AAC] hover:underline">+ iniciar</button>
            </div>
            <div style={{ padding: "10px 14px" }} className="flex flex-col gap-1.5">
              {cadAtivas.length === 0 && !cadPick && <p className="text-[12px] text-[#8A989D]">Nenhuma cadência ativa.</p>}
              {cadAtivas.map((c) => (
                <div key={c.id} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[10px] px-2.5 py-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="text-[#1F2A2E]">⚡ {c.data?.nome || "Cadência"}</span>
                  <button onClick={() => delCad(c.id)} className="text-[#b23b39] text-[10px]">encerrar</button>
                </div>
              ))}
              {cadPick && (
                <div className="pt-1.5 border-t border-[#F0EBE0] flex flex-wrap gap-1.5">
                  {cadOpts.length === 0 ? <p className="text-[11px] text-[#8A989D]">Nenhuma cadência cadastrada em Configurações.</p> :
                    cadOpts.map((c: any) => (<button key={c.id} disabled={savingCad} onClick={() => addCad(c)} className="text-[11px] px-2 py-1 rounded-lg border disabled:opacity-50" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>+ {c.nome || c.titulo}</button>))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acompanhamento (interações) — LARGURA TOTAL, embaixo dos 2 boxes */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🕓 Acompanhamento <span className="bg-[#E7F6EE] text-[#1c7a47] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{petInteracoes.length}</span></h3>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div className="flex gap-2 mb-2">
              <select value={intTipo} onChange={(e) => setIntTipo(e.target.value)} className="border border-[#E8E2D6] rounded px-2 py-1 text-[11px]">
                <option value="NOTA">Nota</option>
                <option value="LIGACAO">Ligação</option>
                <option value="WHATSAPP_ENVIADO">WhatsApp</option>
                <option value="PRESENCIAL">Presencial</option>
              </select>
              <input value={intTexto} onChange={(e) => setIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addInteracaoPet(); }} placeholder="Registrar a evolução do tratamento..." className="flex-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
              <button onClick={addInteracaoPet} disabled={savingInt} className="bg-[#009AAC] text-white px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50">{savingInt ? "..." : "Salvar"}</button>
            </div>
            {petInteracoes.length === 0 ? (
              <p className="text-center text-[12px] text-[#8A989D] py-4">Nenhuma interação ainda</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-72 overflow-auto">
                {petInteracoes.map((it: any) => (
                  <div key={it.id} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#009AAC]">{it.tipo}{it.canal ? ` · ${it.canal}` : ""}</span>
                      <span className="text-[10px] text-[#8A989D]">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <p className="text-[12px] text-[#1F2A2E] mt-0.5">{it.texto}</p>
                    {it.autor?.name && <p className="text-[10px] text-[#8A989D] mt-0.5">por {it.autor.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ═══════════ ABA 📋 CADASTRO ═══════════ */}
      {mainTab === "CADASTRO" && (
      <div className="mb-3">
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🐾 Dados do pet</h3>
            <button onClick={() => { setClinForm({ species: pet.species || "", breed: pet.breed || "", gender: pet.gender || "", sterilization: pet.sterilization || "", birthDate: pet.birthDate ? String(pet.birthDate).slice(0, 10) : "", weight: pet.weight ?? "", coat: pet.coat || "", coatColor: pet.coatColor || "", microchip: pet.microchip || "", allergies: (pet.allergies || []).join(", "), medicalNotes: pet.medicalNotes || "" }); setEditClin((v) => !v); }} className="text-[11px] text-[#009AAC] hover:underline">{editClin ? "✖️ Fechar" : "✏️ Editar"}</button>
          </div>
          <div style={{ padding: "13px 14px" }}>
            {editClin && (
              <div className="mb-4 pb-4 border-b border-[#F0EBE0] grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2 text-[13px]">
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Espécie</label><select value={clinForm.species ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, species: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]"><option value="">—</option>{["CANINE", "FELINE", "BIRD", "RODENT", "REPTILE", "OTHER"].map((sp) => <option key={sp} value={sp}>{speciesLabel(sp)}</option>)}</select></div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Raça</label>
                  <input list="pet-racas" value={clinForm.breed ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, breed: e.target.value }))} placeholder="Escolha ou digite…" className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" />
                  <datalist id="pet-racas">{racasCat.filter((r) => !clinForm.species || !r.especie || speciesEnum(r.especie) === clinForm.species || r.especie === clinForm.species).map((r, i) => <option key={i} value={r.nome} />)}</datalist>
                </div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Sexo</label><select value={clinForm.gender ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, gender: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]"><option value="">—</option><option value="MALE">Macho</option><option value="FEMALE">Fêmea</option><option value="OTHER">Outro</option></select></div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Castração</label><select value={clinForm.sterilization ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, sterilization: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]"><option value="">—</option><option value="NOT_STERILIZED">Não castrado</option><option value="STERILIZED">Castrado</option><option value="SCHEDULED">Agendada</option></select></div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nascimento</label><input type="date" value={clinForm.birthDate ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, birthDate: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" /></div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Peso (kg)</label><input type="number" step="0.1" value={clinForm.weight ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, weight: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" /></div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Pelagem</label>
                  <select value={COAT_VALID.has(clinForm.coat) ? clinForm.coat : ""} onChange={(e) => setClinForm((f: any) => ({ ...f, coat: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]"><option value="">—</option>{COAT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Cor</label>
                  <input list="pet-cores" value={clinForm.coatColor ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, coatColor: e.target.value }))} placeholder="Escolha ou digite…" className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" />
                  <datalist id="pet-cores">{[...coresCat, ...CORES_DEFAULT.filter((c) => !coresCat.includes(c))].map((c, i) => <option key={i} value={c} />)}</datalist>
                </div>
                <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Microchip</label><input value={clinForm.microchip ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, microchip: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" /></div>
                <div className="col-span-2 md:col-span-3"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Alergias (vírgula)</label><input value={clinForm.allergies ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, allergies: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" /></div>
                <div className="col-span-2 md:col-span-3"><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Notas médicas</label><textarea value={clinForm.medicalNotes ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, medicalNotes: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[#1F2A2E]" /></div>
                <div className="col-span-2 md:col-span-3 flex gap-2"><button onClick={saveClin} disabled={savingClin} className="px-3 py-1 rounded text-[11px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingClin ? "Salvando..." : "Salvar"}</button><button onClick={() => setEditClin(false)} className="px-3 py-1 rounded text-[11px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</button></div>
              </div>
            )}
            {/* Dados */}
            <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">Dados do pet</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Espécie</div><div className="text-[13px] text-[#1F2A2E]">{speciesLabel(pet.species)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Raça</div><div className="text-[13px] text-[#1F2A2E]">{pet.breed || "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Sexo</div><div className="text-[13px] text-[#1F2A2E]">{genderLabel(pet.gender)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nascimento</div><div className="text-[13px] text-[#1F2A2E]">{fmtDataBR(pet.birthDate)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Porte</div><div className="text-[13px] text-[#1F2A2E]">{pet.weight ? (pet.weight < 10 ? "Pequeno" : pet.weight < 25 ? "Médio" : "Grande") : "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Castração</div><div className="text-[13px] text-[#1F2A2E]">{sterilLabel(pet.sterilization)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Pelagem / cor</div><div className="text-[13px] text-[#1F2A2E]">{[pet.coat, pet.coatColor].filter(Boolean).join(" · ") || "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Peso</div><div className="text-[13px] text-[#1F2A2E]">{pet.weight ? `${pet.weight} kg` : "—"}</div></div>
              <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Microchip</div><div className="text-[13px] text-[#1F2A2E]">{pet.microchip || "—"}</div></div>
            </div>
            {/* Saúde */}
            <div className="border-t border-[#F0EBE0] pt-3 mt-4">
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">🩺 Saúde</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Alergias</div><div className="text-[13px] text-[#1F2A2E]">{(pet.allergies && pet.allergies.length) ? pet.allergies.join(", ") : "—"}</div></div>
                <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Convênio / plano</div><div className="text-[13px] text-[#1F2A2E]">{pet.insurancePlan || "—"}</div></div>
                <div className="col-span-2 md:col-span-1"><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Notas médicas</div><div className="text-[13px] text-[#1F2A2E]">{pet.medicalNotes || "—"}</div></div>
              </div>
            </div>
            {/* Extras */}
            <div className="border-t border-[#F0EBE0] pt-3 mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">✨ Extras</div>
                <button onClick={() => { setObsVal(pet.observations || ""); setEditObs((v) => !v); }} className="text-[11px] text-[#009AAC] hover:underline">{editObs ? "✖️ Fechar" : "✏️ Editar observações"}</button>
              </div>
              {editObs && (
                <div className="mb-3">
                  <textarea value={obsVal} onChange={(e) => setObsVal(e.target.value)} maxLength={280} rows={2} placeholder="Apelido, comportamento, medo, preferência…" className="w-full px-2 py-1.5 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                  <div className="flex gap-2 mt-1"><button onClick={saveObs} disabled={savingObs} className="px-3 py-1 rounded text-[11px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingObs ? "..." : "Salvar"}</button><button onClick={() => setEditObs(false)} className="px-3 py-1 rounded text-[11px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</button></div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                {/* Temperamento: era só leitura — não existia onde digitar, por isso os 6065
                    pets estavam com o campo vazio. Agora é roll-up e ALIMENTA a trava da sala. */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Temperamento</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={pet.temperament || ""}
                      disabled={savingTemp}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setSavingTemp(true);
                        try { await patchPet({ temperament: v || null }); await load(); toast.success(v ? `Temperamento: ${v}` : "Temperamento limpo"); }
                        catch { toast.error("Não consegui salvar o temperamento"); }
                        finally { setSavingTemp(false); }
                      }}
                      className="text-[13px] px-2 py-1 border rounded-[7px] bg-white disabled:opacity-60"
                      style={{ borderColor: "#E8E2D6", color: "#1F2A2E" }}>
                      <option value="">—</option>
                      {tempCat.map((t) => <option key={t} value={t}>{t}</option>)}
                      {/* valor antigo fora da lista não some da tela */}
                      {pet.temperament && !tempCat.includes(pet.temperament) && <option value={pet.temperament}>{pet.temperament}</option>}
                    </select>
                    {pet.temperament && tempTravam.includes(pet.temperament) && (
                      <span title="Este pet ocupa MAP 1 e MAP 2 ao ser agendado" className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#FCEBEB", color: "#B23B39", border: "1px solid #F0C2C2" }}>
                        🔒 ocupa a sala
                      </span>
                    )}
                  </div>
                </div>
                <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">2º responsável</div><div className="text-[13px] text-[#1F2A2E]">{pet.secondaryTutorId || "—"}</div></div>
                <div className="col-span-2 md:col-span-1"><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Observações</div><div className="text-[13px] text-[#1F2A2E]">{pet.observations || "—"}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ═══════════ ABA 🩺 PRONTUÁRIO ═══════════ */}
      {mainTab === "PRONTUARIO" && (
      <div className="mb-3 bg-white border border-[#E8E2D6] rounded-[13px] overflow-hidden">
        {/* header discreto: título + seletor pequeno de visão (sem 3 sub-abas destacadas) */}
        <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
          <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🩺 Prontuário</h3>
          <select value={["TIMELINE", "AGENDA", "EXAMES"].includes(tab) ? tab : "HISTORICO"} onChange={(e) => setTab(e.target.value as any)} className="border border-[#E8E2D6] rounded-full px-3 py-1 text-[11.5px] text-[#5C6B70] bg-white">
            <option value="HISTORICO">Histórico</option>
            <option value="EXAMES">🔬 Exames</option>
            <option value="TIMELINE">Linha do tempo</option>
            <option value="AGENDA">Agenda</option>
          </select>
        </div>
        {(tab === "HISTORICO" || !["TIMELINE", "AGENDA", "EXAMES"].includes(tab)) && (
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
              <div className="lg:order-1">
                <FeedTimeline atendimentos={atendimentos} clinDocs={clinDocs} historico={historico} onEditar={editarEntrada} onExcluir={excluirEntrada} onDetalhe={abrirDetalheHist} />
                {detalheHist && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.3)" }} onClick={() => setDetalheHist(null)}>
                    <div className="bg-white rounded-2xl w-full flex flex-col" style={{ maxWidth: 680, maxHeight: "85vh", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
                      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#F0EBE0" }}>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold truncate" style={{ color: "#014D5E" }}>{detalheHist.titulo || detalheHist.tipo}</div>
                          <div className="text-[12px]" style={{ color: "#8A989D" }}>{new Date(detalheHist.data).toLocaleDateString("pt-BR")}{detalheHist.autor ? ` · ${detalheHist.autor}` : ""} · <span style={{ color: "#8A6D3B" }}>SimplesVet</span></div>
                        </div>
                        <button onClick={() => setDetalheHist(null)} className="w-8 h-8 rounded-lg border flex items-center justify-center text-[#5C6B70] shrink-0" style={{ borderColor: "#E8E2D6" }}>✕</button>
                      </div>
                      <div className="p-5 overflow-y-auto text-[13px] leading-relaxed" style={{ color: "#1F2A2E" }} dangerouslySetInnerHTML={{ __html: (detalheHist.texto || detalheHist.resumo || "<i>Sem conteúdo.</i>").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\*([^*\n]+)\*/g, "<b>$1</b>") }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:order-2">
                {atdOpen ? (
                  <PetAtendimentoPanel pet={pet} atd={atd} setAtd={setAtd} atdTipos={atdTipos} atdStatus={atdStatus} vets={vets} items={items} servicosCat={servicosCat} pickServico={pickServico} addItem={addItem} updItem={updItem} rmItem={rmItem} saving={savingAtd} onSalvar={criarAtendimento} onFechar={() => setAtdOpen(false)} />
                ) : artefato === "PESO" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Peso</h3>
                      <div className="flex gap-2">
                        <button onClick={salvarPeso} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <label className="text-xs text-gray-500">Peso atual (kg)</label>
                    <input type="number" step="0.01" value={pesoVal} onChange={(e) => setPesoVal(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="Ex.: 6.25" />
                    <p className="text-[11px] text-gray-400 mt-2">Atualiza o peso atual do pet e entra no gráfico de peso.</p>
                  </div>
                ) : artefato === "OBS" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Observação</h3>
                      <div className="flex gap-2">
                        <button onClick={salvarObsArt} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <textarea value={obsVal} onChange={(e) => setObsVal(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", minHeight: "120px" }} placeholder="Anote algo sobre o pet…" />
                  </div>
                ) : artefato === "RECEITA" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Receita</h3>
                      <div className="flex gap-2">
                        <button onClick={() => imprimirFolha(recModeloNome || "Receita", recCorpo, vets.find((u: any) => u.id === recVetId)?.name || "")} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1" style={{ borderColor: "#E8DFC8", color: "#475569" }}><LuPrinter size={13} /> Imprimir</button>
                        <button onClick={salvarReceita} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500">Modelo</label>
                        <select value={recModeloNome} onChange={(e) => { const nm = e.target.value; setRecModeloNome(nm); const m = recModelos.find((x) => x.nome === nm); if (m && m.corpo) setRecCorpo(m.corpo); }} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                          <option value="">Selecione o modelo…</option>
                          {recModelos.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profissional</label>
                        <select value={recVetId} onChange={(e) => setRecVetId(e.target.value)} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                          <option value="">Selecionar...</option>
                          {vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={recCorpo} onChange={(e) => setRecCorpo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", minHeight: "160px" }} placeholder="Corpo da receita (escolha um modelo ou escreva)…" />
                    <p className="text-[11px] text-gray-400 mt-2">Ao salvar, entra na timeline como atendimento "Receitas". Modelos editáveis em Configurações › Modelos de Receita.</p>
                  </div>
                ) : artefato === "DOCUMENTO" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Documento</h3>
                      <div className="flex gap-2">
                        <button onClick={() => imprimirFolha(docModeloNome || "Documento", docCorpo, vets.find((u: any) => u.id === docVetId)?.name || "")} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1" style={{ borderColor: "#E8DFC8", color: "#475569" }}><LuPrinter size={13} /> Imprimir</button>
                        <button onClick={salvarDocumento} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500">Modelo</label>
                        <select value={docModeloNome} onChange={(e) => { const nm = e.target.value; setDocModeloNome(nm); const m = docModelos.find((x) => x.nome === nm); if (m && m.corpo) setDocCorpo(m.corpo); }} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                          <option value="">Selecione o modelo…</option>
                          {docModelos.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Profissional</label>
                        <select value={docVetId} onChange={(e) => setDocVetId(e.target.value)} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                          <option value="">Selecionar...</option>
                          {vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <textarea value={docCorpo} onChange={(e) => setDocCorpo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", minHeight: "160px" }} placeholder="Corpo do documento (escolha um modelo ou escreva)…" />
                    <p className="text-[11px] text-gray-400 mt-2">Ao salvar, entra na timeline como "Documento". Modelos editáveis em Configurações › Modelos de Documento.</p>
                  </div>
                ) : artefato === "VIDEO" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Vídeo (link)</h3>
                      <div className="flex gap-2">
                        <button onClick={salvarVideo} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <label className="text-xs text-gray-500">Arquivo do vídeo (até 20MB)</label>
                    <input
                      type="file" accept=".mp4,.mov,.webm"
                      onChange={(e) => setVidFile(e.target.files?.[0] || null)}
                      className="w-full mt-1 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#E0F4F6] file:text-[#00798A] file:cursor-pointer"
                    />
                    {vidFile && <p className="text-[11px] text-[#0F6E56] mt-1.5">🎥 {vidFile.name} · {(vidFile.size / 1024 / 1024).toFixed(1)}MB</p>}
                    <label className="text-xs text-gray-500 mt-2 block">…ou cole um link (YouTube, Drive — bom pra vídeo grande)</label>
                    <input value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="https://…" />
                    <p className="text-[11px] text-gray-400 mt-2">Cole o link do vídeo. Upload de arquivo (Exame/Fotos) entra quando o Cloudinary estiver ativo.</p>
                  </div>
                ) : artefato === "EXAME" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>🔬 Exame</h3>
                      <div className="flex gap-2">
                        <button onClick={salvarExameComArquivo} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <label className="text-xs text-gray-500">Exame *</label>
                    <input list="exames-catalogo-hist" value={exNome} onChange={(e) => setExNome(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="Busque no catálogo ou digite…" />
                    <datalist id="exames-catalogo-hist">{exCat.slice(0, 1000).map((e: any, i: number) => <option key={i} value={e.nome || e.titulo || e.descricao} />)}</datalist>
                    <label className="text-xs text-gray-500 mt-2 block">Laudo / resultado (opcional)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                      onChange={(e) => setExFile(e.target.files?.[0] || null)}
                      className="w-full mt-1 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#E0F4F6] file:text-[#00798A] file:cursor-pointer"
                    />
                    {exFile && <p className="text-[11px] text-[#0F6E56] mt-1.5">📄 {exFile.name} · {(exFile.size / 1024 / 1024).toFixed(1)}MB</p>}
                    <p className="text-[11px] text-gray-400 mt-2">
                      Com laudo anexado, o exame já entra como resultado. Sem laudo, entra como solicitado — dá pra anexar depois na aba Exames.
                    </p>
                  </div>
                ) : artefato === "FOTO" ? (
                  <div className="bg-white">
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "#E8DFC8" }}>
                      <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>📷 Foto</h3>
                      <div className="flex gap-2">
                        <button onClick={salvarFoto} disabled={savingArt} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingArt ? "..." : "Salvar"}</button>
                        <button onClick={() => setArtefato(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                      </div>
                    </div>
                    <label className="text-xs text-gray-500">Arquivo da foto</label>
                    <input
                      type="file" accept=".jpg,.jpeg,.png,.webp,.heic"
                      onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                      className="w-full mt-1 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#E0F4F6] file:text-[#00798A] file:cursor-pointer"
                    />
                    {fotoFile && <p className="text-[11px] text-[#0F6E56] mt-1.5">📷 {fotoFile.name} · {(fotoFile.size / 1024 / 1024).toFixed(1)}MB</p>}
                    <label className="text-xs text-gray-500 mt-2 block">…ou cole um link (Drive, etc.)</label>
                    <input value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="https://…" />
                    <label className="text-xs text-gray-500 mt-2 block">Legenda (opcional)</label>
                    <input value={fotoLegenda} onChange={(e) => setFotoLegenda(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder="Ex.: lesão na pata dianteira" />
                    {fotoUrl.trim() && <img src={fotoUrl} alt="pré-visualização" className="mt-3 max-h-48 rounded-lg border" style={{ borderColor: "#E8DFC8" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <p className="text-[11px] text-gray-400 mt-2">Anexa por link de imagem e entra na timeline como "Foto". Upload direto de arquivo chega com o Cloudinary (Fase B).</p>
                  </div>
                ) : (
                  <div className="bg-white">
                    <div className="text-[11px] text-[#8A989D] mb-2 font-semibold uppercase tracking-wide">Adicionar ao histórico</div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { label: "Atendimento", ic: "🩺", bg: "#E1F3F5", fg: "#017E8C", act: () => router.push(`/dashboard/erp/pets/${petId}/atendimentos/novo`) },
                        { label: "Peso", ic: "⚖️", bg: "#F3ECDD", fg: "#8A6D3B", act: () => { setPesoVal(pet?.weight ? String(pet.weight) : ""); setAtdOpen(false); setArtefato("PESO"); } },
                        { label: "Receita", ic: "💊", bg: "#EFE9FB", fg: "#6A4FB0", act: () => abrirReceita() },
                        { label: "Documento", ic: "📄", bg: "#E4F3EA", fg: "#2E7D53", act: () => abrirDocumento() },
                        { label: "Exame", ic: "🔬", bg: "#FCE9EE", fg: "#B0416B", act: () => abrirExame() },
                        { label: "Fotos", ic: "📷", bg: "#E8F0FA", fg: "#3E6DA6", act: () => abrirFoto() },
                        { label: "Vídeo", ic: "🎥", bg: "#E3F3EF", fg: "#2E8B72", act: () => abrirVideo() },
                        { label: "Observação", ic: "📝", bg: "#EFEEE9", fg: "#6B6A63", act: () => { setObsVal(pet?.observations || ""); setAtdOpen(false); setArtefato("OBS"); } },
                        { label: "Patologia", ic: "🦠", bg: "#F3E8F5", fg: "#8E4585", act: async () => { await abrirDocumento(); setDocModeloNome("Laudo de patologia"); } },
                      ] as const).map((c) => (
                        <button key={c.label} onClick={c.act} className="flex flex-col items-start gap-1 rounded-[13px] px-3 py-2.5 transition hover:brightness-95" style={{ background: c.bg, color: c.fg }}>
                          <span className="text-[18px] leading-none">{c.ic}</span>
                          <span className="text-[12px] font-bold">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Timeline dos atendimentos (data · tipo em pill · vet · resumo com rótulo em negrito) */}
                    <div className="mt-4 pt-3 border-t border-[#F0EBE0] flex flex-col gap-1.5">
                      {(atendimentos || []).length === 0 && <p className="text-[12px] text-[#8A989D] py-2 text-center">Nenhum atendimento registrado ainda.</p>}
                      {(atendimentos || []).map((a: any) => {
                        const resumo = a.conduct ? { l: "Conduta", v: a.conduct } : a.chiefComplaint ? { l: "Queixa", v: a.chiefComplaint } : a.diagnosis ? { l: "Diag.", v: a.diagnosis } : a.prescription ? { l: "Prescrição", v: a.prescription } : null;
                        return (
                          <button key={a.id} onClick={() => abrirAtd(a.id)} className="w-full text-left bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] px-3 py-2 hover:border-[#009AAC] transition">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-[#8A989D]">{fmtDataBR(a.date)}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#E0F4F6", color: "#014D5E" }}>{ATD_TIPO_LABEL(a.type)}</span>
                              {a.user?.name && <span className="text-[11px] text-[#5C6B70]">🩺 {a.user.name}</span>}
                              <span className="ml-auto text-[12px] text-[#014D5E] font-medium">{money(a.value)}</span>
                            </div>
                            {resumo && <div className="text-[12px] text-[#5C6B70] mt-1 truncate"><b className="text-[#1F2A2E]">{resumo.l}:</b> {resumo.v}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {tab === "TIMELINE" && <div className="p-5"><FeedTimeline atendimentos={atendimentos} clinDocs={clinDocs} historico={historico} onDetalhe={abrirDetalheHist} /></div>}
        {tab === "AGENDA" && <div className="p-5"><PetClinicaTabela view="agenda" atendimentos={atendimentos} tipoLabel={ATD_TIPO_LABEL} /></div>}
        {tab === "EXAMES" && (
          <div className="p-5">
            {/* Adicionar exame do catálogo */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <input list="exames-catalogo-pet" value={exPick} onChange={(e) => setExPick(e.target.value)} placeholder="Buscar exame no catálogo…" className="flex-1 min-w-[180px] px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px]" />
              <datalist id="exames-catalogo-pet">{exCat.slice(0, 1000).map((e: any, i: number) => <option key={i} value={e.nome || e.titulo || e.descricao} />)}</datalist>
              <button onClick={addExame} disabled={savingEx} className="px-3 py-2 rounded-[9px] text-[13px] font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuFlaskConical size={13} /> {savingEx ? "..." : "Solicitar"}</button>
            </div>
            {exames.length === 0 ? (
              <div className="border border-[#E8E2D6] rounded-[12px] p-6 text-center text-[13px] text-[#8A989D]">Nenhum exame do pet ainda. Solicite acima ou pelo formulário de atendimento.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {exames.map((x) => {
                  const fases = examFases.length ? examFases : ["Solicitado"];
                  const cur = Math.max(0, fases.indexOf(x.data.status || fases[0]));
                  return (
                    <div key={x.id} className="border border-[#E8E2D6] rounded-[12px]" style={{ padding: "11px 13px" }}>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="min-w-0">
                          {/* Nome editável: clica e corrige (regra — tudo editável e deletável) */}
                          <span
                            className="text-[13px] font-medium text-[#014D5E] cursor-pointer hover:underline"
                            title="Clique para renomear"
                            onClick={async () => {
                              const novo = window.prompt("Nome do exame:", x.data.nome || "");
                              if (novo == null || !novo.trim() || novo.trim() === x.data.nome) return;
                              try {
                                const r = await fetch(`/api/listas/${x.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...x.data, nome: novo.trim() }) }) });
                                if (!r.ok) throw new Error();
                                toast.success("Exame renomeado"); await loadPetColecoes();
                              } catch { toast.error("Não consegui renomear"); }
                            }}>
                            {x.data.nome} <LuPencil size={10} className="inline -mt-0.5 text-gray-300" />
                          </span>
                          {x.data.externo && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#EDE9FA", color: "#3C3489" }}>externo</span>}
                          <span className="text-[11px] text-[#8A989D] ml-2">{x.data.date ? fmtDataBR(x.data.date) : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Anexar ARQUIVO — o label é um file picker disfarçado de botão */}
                          <label
                            title="Subir o PDF/foto do laudo (até 20MB)"
                            className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition ${subindoEx === x.id ? "opacity-60" : "hover:border-[#009AAC]"}`}
                            style={{ borderColor: "#E8E2D6", color: "#fff", background: "#009AAC", borderWidth: 1 }}>
                            {subindoEx === x.id ? "Enviando…" : "📎 Anexar arquivo"}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                              disabled={subindoEx === x.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = ""; // permite reenviar o mesmo arquivo
                                if (f) subirResultado(x.id, x.data, f);
                              }}
                            />
                          </label>
                          <button onClick={() => anexarResultado(x.id, x.data)} title="Colar um link (Drive, etc.) em vez de subir arquivo" className="text-[11px] px-2.5 py-1 rounded-full border border-[#E8E2D6] text-[#009AAC] hover:border-[#009AAC]">🔗 Link</button>
                          <button onClick={() => delExame(x.id)} className="text-[11px] text-[#b23b39]">Excluir</button>
                        </div>
                      </div>
                      {x.data.resultadoUrl && (
                        // Mostra o NOME do arquivo quando temos; a URL crua do bucket é ilegível.
                        <a href={x.data.resultadoUrl} target="_blank" rel="noopener" className="text-[11.5px] text-[#009AAC] underline break-all block mb-2">
                          📄 {x.data.resultadoArquivo || x.data.resultadoUrl}
                        </a>
                      )}
                      {/* Status roll-up (mesmo formato do petexa_ que o Hoje lê) */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {fases.map((f, fi) => (
                          <button key={f} onClick={() => updExameStatus(x.id, x.data, f)} title={f} className="text-[11px] px-2.5 py-1 rounded-full border transition" style={fi <= cur ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>{f}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-[#8A989D] mt-3">Os exames com status aparecem em "Exames a entregar" no Hoje até serem entregues ao tutor.</p>
          </div>
        )}
      </div>
      )}

      {/* ═══════════ ABA 💉 VACINAS & MEDS ═══════════ */}
      {mainTab === "VACINAS" && (
      <div className="mb-3 flex flex-col gap-3">
        {/* 💉 Vacinas */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">💉 Vacinas</h3>
            <button onClick={() => { setProtoAuto(true); setGerenciarProto(true); }} className="text-[11px] text-[#009AAC] hover:underline">＋ Aplicar</button>
          </div>
          <div style={{ padding: "10px 14px" }} className="flex flex-col gap-2">
            {vacinasResumo.length === 0 && <p className="text-[12px] text-[#8A989D]">Nenhuma vacina registrada. Use "＋ Aplicar" para iniciar um protocolo.</p>}
            {vacinasResumo.map((v: any) => (
              <div key={v.id} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[10px] px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E] truncate">{v.nome}</div>
                  <div className="text-[11px] text-[#8A989D]">últ. {v.ultima ? fmtDataBR(v.ultima).slice(0, 5) : "—"}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {v.temPend ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={v.venceu ? { background: "#FDECEC", color: "#A32D2D" } : { background: "#FBF3E3", color: "#8a6400" }}>{v.venceu ? "vencida" : "vence"} {v.prox ? fmtDataBR(v.prox).slice(0, 5) : ""}</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#E1F5EE", color: "#0F6E56" }}>em dia</span>
                  )}
                  <button onClick={() => { setProtoAuto(true); setGerenciarProto(true); }} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>＋ Aplicar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 💊 Medicamentos periódicos */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">💊 Medicamentos periódicos</h3>
          </div>
          <div style={{ padding: "10px 14px" }} className="flex flex-col gap-2">
            {medsPeriodicos.map((m) => (
              <div key={m.nome} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[10px] px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E]">{m.nome}</div>
                  <div className="text-[11px] text-[#8A989D]">Aplicação {m.periodo}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-[11px] text-[#8A989D]">
                    <div>últ. {m.ultima ? fmtDataBR(m.ultima).slice(0, 5) : "—"}</div>
                    <div>próx. {m.prox ? fmtDataBR(m.prox).slice(0, 5) : "—"}</div>
                  </div>
                  <button onClick={() => { setProtoAuto(true); setGerenciarProto(true); }} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>＋ Adicionar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gerenciar protocolos (painel completo com todos os handlers reais) */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <button onClick={() => setGerenciarProto((v) => !v)} className="w-full flex items-center justify-between border-b border-[#F0EBE0] hover:bg-[#FBF9F4]" style={{ padding: "11px 14px" }}>
            <span className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🗂️ Gerenciar protocolos (vacinas, vermífugos, doses)</span>
            <span className="text-[11px] text-[#8A989D]">{gerenciarProto ? "▴" : "▾"}</span>
          </button>
          {gerenciarProto && (
            <div className="p-5">
              <PetProtocolosPanel petId={pet.id} autoOpen={protoAuto} onAutoOpened={() => setProtoAuto(false)} onChanged={loadProtocolos} />
            </div>
          )}
        </div>
      </div>
      )}

      {/* ═══════════ ABA 🌿 FISIOTERAPIA ═══════════ */}
      {mainTab === "FISIO" && (() => {
        const pacsFisio = (pacotes || []);
        const ativo = pacsFisio.find((p) => (p.data?.total || 0) > 0 && (p.data?.used || 0) < (p.data?.total || 0));
        const fechados = pacsFisio.filter((p) => (p.data?.total || 0) > 0 && (p.data?.used || 0) >= (p.data?.total || 0));
        const aUsed = ativo?.data?.used || 0, aTotal = ativo?.data?.total || 0;
        return (
          <div className="mb-3 flex flex-col gap-3">
            {/* 1. Cabeçalho do tratamento: patinhas + dados */}
            <div className="bg-white border border-[#E8E2D6] rounded-[14px]" style={{ padding: "14px 16px" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🌿 Tratamento em andamento</h3>
                <button onClick={() => setEditFisio((v) => !v)} className="text-[11px] text-[#009AAC] hover:underline">{editFisio ? "✖️ Fechar" : "✏️ Editar"}</button>
              </div>
              {/* Patinhas do pacote ativo */}
              {ativo ? (
                <div className="mb-3">
                  <div className="flex justify-between text-[11.5px] mb-1"><span className="text-[#5C6B70]">🐾 {ativo.data.nome}</span><span className="text-[#014D5E] font-medium">{aUsed}/{aTotal} sessões</span></div>
                  <div className="flex flex-wrap gap-0.5">{Array.from({ length: Math.min(aTotal, 40) }).map((_, i) => <span key={i} style={{ fontSize: "16px" }} title={`Sessão ${i + 1}`}>{i < aUsed ? "🐾" : "⚪"}</span>)}</div>
                </div>
              ) : <p className="text-[12px] text-[#8A989D] mb-3">Sem pacote de fisioterapia ativo. Lance um pacote pela tela de atendimento.</p>}
              {/* Campos do tratamento */}
              {editFisio ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#F0EBE0]">
                  <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Frequência das sessões</label><input value={fisioForm.frequencia} onChange={(e) => setFisioForm((f: any) => ({ ...f, frequencia: e.target.value }))} placeholder="Ex.: a cada 15 dias" className="w-full mt-0.5 px-2 py-1.5 border border-[#E8E2D6] rounded text-[13px]" /></div>
                  <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Encaminhado por</label><input value={fisioForm.encaminhadoPor} onChange={(e) => setFisioForm((f: any) => ({ ...f, encaminhadoPor: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border border-[#E8E2D6] rounded text-[13px]" /></div>
                  <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Diagnóstico</label><input value={fisioForm.diagnostico} onChange={(e) => setFisioForm((f: any) => ({ ...f, diagnostico: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border border-[#E8E2D6] rounded text-[13px]" /></div>
                  <div><label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Últimos exames</label><input value={fisioForm.ultimosExames} onChange={(e) => setFisioForm((f: any) => ({ ...f, ultimosExames: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border border-[#E8E2D6] rounded text-[13px]" /></div>
                  <div className="md:col-span-2 flex gap-2"><button onClick={saveFisioRec} disabled={savingFisio} className="px-3 py-1.5 rounded text-[12px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingFisio ? "Salvando..." : "Salvar"}</button><button onClick={() => setEditFisio(false)} className="px-3 py-1.5 rounded text-[12px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</button></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-3 border-t border-[#F0EBE0]">
                  <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Frequência</div><div className="text-[13px] text-[#1F2A2E]">{fisioRec.data.frequencia || "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Diagnóstico</div><div className="text-[13px] text-[#1F2A2E]">{fisioRec.data.diagnostico || "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Encaminhado por</div><div className="text-[13px] text-[#1F2A2E]">{fisioRec.data.encaminhadoPor || "—"}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Últimos exames</div><div className="text-[13px] text-[#1F2A2E]">{fisioRec.data.ultimosExames || "—"}</div></div>
                </div>
              )}
            </div>

            {/* 2. Boletins de sessão */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
              <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
                <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">📋 Boletins de sessão <span className="bg-[#E7F6EE] text-[#1c7a47] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{boletins.length}</span></h3>
                <button onClick={() => { setBoletimEditId(null); setBoletimOpen(true); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>➕ Novo boletim</button>
              </div>
              <div style={{ padding: "6px 14px" }}>
                {boletins.length === 0 && <p className="text-[12.5px] text-[#8A989D] py-4 text-center">Nenhum boletim registrado ainda.</p>}
                {boletins.map((b, i) => {
                  const resumo = (b.data.obsMv || "").split("\n")[0] || (b.data.obsTutor || "").split("\n")[0] || "";
                  return (
                    <div key={b.id} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: i < boletins.length - 1 ? "1px solid #F0EBE0" : "none" }}>
                      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "#EAF3DE", color: "#3B6D11" }}>#{b.data.sessaoNumero || "—"}</span>
                      <span className="text-[11.5px] text-[#8A989D] w-[42px] shrink-0">{b.data.sessaoData ? fmtDataBR(b.data.sessaoData).slice(0, 5) : "—"}</span>
                      <span className="text-[11.5px] text-[#5C6B70] shrink-0 hidden sm:block">🧑‍⚕️ {b.data.mvResponsavel || "—"}</span>
                      <span className="flex-1 text-[12.5px] text-[#1F2A2E] truncate">{resumo || <span className="text-[#8A989D]">sem observação</span>}</span>
                      {b.data.enviadoAt ? <span className="text-[10px] text-[#0F6E56] shrink-0" title="Enviado">✅</span> : <span className="text-[10px] text-[#8a6400] shrink-0" title="Não enviado">🕓</span>}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => { setBoletimEditId(b.id); setBoletimOpen(true); }} title="Ver / editar" className="text-[13px] text-[#5C6B70] hover:text-[#009AAC]">👁️</button>
                        <button onClick={() => imprimirBoletim(b)} title="Imprimir" className="text-[13px] text-[#5C6B70] hover:text-[#009AAC]">🖨️</button>
                        <button onClick={() => reenviarBoletim(b)} title="Reenviar por WhatsApp" className="text-[13px] text-[#5C6B70] hover:text-[#009AAC]">💬</button>
                        <button onClick={() => delBoletim(b.id)} title="Excluir" className="text-[13px] text-[#b23b39]">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Pacotes fechados */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
              <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
                <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🏆 Pacotes fechados</h3>
              </div>
              <div style={{ padding: "8px 14px" }}>
                {fechados.length === 0 && <p className="text-[12px] text-[#8A989D] py-1">Nenhum pacote concluído ainda.</p>}
                {fechados.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: i < fechados.length - 1 ? "1px solid #F0EBE0" : "none" }}>
                    <span className="text-[12.5px] text-[#1F2A2E]">🏆 {p.data.nome}</span>
                    <span className="text-[11px] text-[#8A989D]">{p.data.used}/{p.data.total} sessões · concluído</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════ ABA 🧾 COMPRAS — HISTÓRICO (somente leitura) ═══════════ */}
      {mainTab === "COMPRAS" && (() => {
        const MARCA: Record<string, { emoji: string; label: string; bg: string; fg: string }> = {
          EMPORIO: { emoji: "🏥", label: "Empório", bg: "#D9F0F3", fg: "#014D5E" },
          MUNDO_A_PARTE: { emoji: "🌿", label: "Mundo à Parte", bg: "#EAF3DE", fg: "#3B6D11" },
          DRA_VIVIAN: { emoji: "✨", label: "Dra. Vivian", bg: "#EDE9FA", fg: "#3C3489" },
        };
        const marcaDe = (a: any) => MARCA[(a.marca || a.brand || "EMPORIO") as string] || MARCA.EMPORIO;
        const comMarca: Record<string, number> = {};
        for (const a of atendimentos) { const m = marcaDe(a); comMarca[m.label] = (comMarca[m.label] || 0) + Number(a.value || 0); }
        const totalGasto = atendimentos.reduce((s: number, a: any) => s + Number(a.value || 0), 0);
        const resumoItens = (a: any) => {
          if (Array.isArray(a.items) && a.items.length) return a.items.map((it: any) => `${it.descricao || "Serviço"}${it.quantidade > 1 ? ` x${it.quantidade}` : ""}`).join(", ");
          return a.description || a.chiefComplaint || ATD_TIPO_LABEL(a.type);
        };
        return (
          <div className="mb-3 flex flex-col gap-3">
            {/* Total gasto (com olhinho) + resumo por marca */}
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-start">
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "13px 16px" }}>
                <div className="text-[11px] text-[#8A989D]">🧾 Total gasto no pet</div>
                <div className="text-[22px] text-[#014D5E] font-medium mt-0.5">{money(totalGasto)}</div>
                <div className="text-[11px] text-[#8A989D] mt-0.5">{atendimentos.length} atendimento(s)</div>
              </div>
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "13px 16px" }}>
                <div className="text-[11px] text-[#8A989D] mb-1.5">Por marca</div>
                {Object.keys(comMarca).length === 0 ? <p className="text-[12px] text-[#8A989D]">Sem compras ainda.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(comMarca).map(([label, v]) => { const mi = Object.values(MARCA).find((m) => m.label === label) || MARCA.EMPORIO; return (
                      <span key={label} className="text-[11.5px] px-2.5 py-1 rounded-full" style={{ background: mi.bg, color: mi.fg }}>{mi.emoji} {label}: {money(v)}</span>
                    ); })}
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de vendas/atendimentos (somente leitura) */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
              <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
                <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🧾 Histórico de compras</h3>
                <span className="text-[11px] text-[#8A989D]">registre novas vendas pelo atendimento →</span>
              </div>
              <div style={{ padding: "6px 15px" }}>
                {atendimentos.length === 0 && <p className="text-[12.5px] text-[#8A989D] py-4 text-center">Nenhuma compra registrada ainda.</p>}
                {atendimentos.map((a: any, i: number) => { const mi = marcaDe(a); return (
                  <button key={a.id} onClick={() => abrirAtd(a.id)} className="w-full flex items-center gap-2.5 py-2.5 text-left" style={{ borderBottom: i < atendimentos.length - 1 ? "1px solid #F0EBE0" : "none" }}>
                    <span className="text-[11.5px] text-[#8A989D] w-[42px] shrink-0">{fmtDataBR(a.date).slice(0, 5)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: mi.bg, color: mi.fg }}>{mi.emoji} {mi.label}</span>
                    <span className="flex-1 text-[12.5px] text-[#1F2A2E] truncate">{resumoItens(a)}</span>
                    <span className="text-[12.5px] text-[#014D5E] font-medium shrink-0">{money(a.value)}</span>
                  </button>
                ); })}
              </div>
            </div>
            <p className="text-[11px] text-[#8A989D] px-1">Somente leitura. Novas vendas, crédito e pacotes são lançados na tela de <b>Novo atendimento</b>.</p>
          </div>
        );
      })()}

      {/* ── Popups (padrão bege) ── */}
      {statusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setStatusOpen(false)}>
          <div className="bg-[#FBF9F4] rounded-[16px] w-full max-w-[360px] p-5" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-medium text-[#014D5E] mb-1">🩺 Status de saúde</h3>
            <p className="text-[12px] text-[#8A989D] mb-3">Atualize a etapa clínica de {pet.name}.</p>
            <div className="flex flex-col gap-1.5">
              {(pipes.clinico.length ? pipes.clinico : (pet.pipelineClinicoEtapa ? [pet.pipelineClinicoEtapa] : [])).map((e) => (
                <button key={e} onClick={async () => { await savePipe("pipelineClinicoEtapa", e); setStatusOpen(false); }} className="text-left text-[12.5px] px-3 py-2 rounded-[9px] border border-[#E8E2D6] hover:border-[#009AAC]" style={{ background: pet.pipelineClinicoEtapa === e ? "#E0F4F6" : "#fff", color: pet.pipelineClinicoEtapa === e ? "#014D5E" : "#1F2A2E" }}>{e}</button>
              ))}
              {pipes.clinico.length === 0 && !pet.pipelineClinicoEtapa && <p className="text-[12px] text-[#8A989D]">Nenhuma etapa configurada. Cadastre em Configurações → Pipelines.</p>}
            </div>
            <div className="flex justify-end mt-4"><button onClick={() => setStatusOpen(false)} className="text-[12.5px] px-3 py-2 rounded-[9px] text-[#5C6B70]">Fechar</button></div>
          </div>
        </div>
      )}

      {notaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setNotaOpen(false)}>
          <div className="bg-[#FBF9F4] rounded-[16px] w-full max-w-[400px] p-5" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-medium text-[#014D5E] mb-1">❤️ Nota médica</h3>
            <p className="text-[12px] text-[#8A989D] mb-3">Algo clínico que vale lembrar sobre {pet.name}.</p>
            <textarea value={notaVal} onChange={(e) => setNotaVal(e.target.value)} rows={3} placeholder="Ex.: sopro cardíaco grau II, sensível a anestesia…" className="w-full px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] bg-white" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNotaOpen(false)} className="text-[12.5px] px-3 py-2 rounded-[9px] text-[#5C6B70]">Cancelar</button>
              <button onClick={saveNotaMedica} disabled={savingNota} className="text-[12.5px] px-4 py-2 rounded-[9px] text-white" style={{ background: "#009AAC", opacity: savingNota ? 0.5 : 1 }}>{savingNota ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {fuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setFuOpen(false)}>
          <div className="bg-[#FBF9F4] rounded-[16px] w-full max-w-[360px] p-5" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-medium text-[#014D5E] mb-1">📞 Agendar follow-up</h3>
            <p className="text-[12px] text-[#8A989D] mb-3">Quando acompanhar o tratamento de {pet.name}?</p>
            <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="w-full px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] bg-white" />
            <div className="flex justify-between items-center mt-4">
              {pet.proximoFollowupAt ? <button onClick={async () => { await clearFu(); setFuOpen(false); }} className="text-[12px] text-[#b23b39]">Remover</button> : <span />}
              <div className="flex gap-2">
                <button onClick={() => setFuOpen(false)} className="text-[12.5px] px-3 py-2 rounded-[9px] text-[#5C6B70]">Cancelar</button>
                <button onClick={async () => { await saveFu(); setFuOpen(false); }} disabled={savingFu || !fuDate} className="text-[12.5px] px-4 py-2 rounded-[9px] text-white" style={{ background: "#009AAC", opacity: savingFu || !fuDate ? 0.5 : 1 }}>{savingFu ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {verAtd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10" onClick={() => setVerAtd(null)}>
          <div className="bg-white rounded-2xl w-[600px] max-w-[94vw] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: "#0E2244" }}>Atendimento · {new Date(verAtd.date).toLocaleDateString("pt-BR")} {new Date(verAtd.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</h2>
              <button onClick={() => setVerAtd(null)} className="text-gray-400 hover:text-gray-600"><LuX size={16} /></button>
            </div>
            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <div><span className="text-gray-400">Tipo:</span> {editAtd ? <select value={editAtdForm.type} onChange={(e) => setEditAtdForm((f: any) => ({ ...f, type: e.target.value }))} className="ml-1 px-1.5 py-0.5 border rounded" style={{ borderColor: "#E8DFC8" }}>{atdTipos.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select> : ATD_TIPO_LABEL(verAtd.type)}</div>
                <div><span className="text-gray-400">Status:</span> {editAtd ? <select value={editAtdForm.status} onChange={(e) => setEditAtdForm((f: any) => ({ ...f, status: e.target.value }))} className="ml-1 px-1.5 py-0.5 border rounded" style={{ borderColor: "#E8DFC8" }}>{atdStatus.map((v) => <option key={v} value={v}>{v}</option>)}</select> : (verAtd.status || "—")}</div>
                {editAtd && <div><span className="text-gray-400">Data:</span> <input type="date" value={editAtdForm.date || ""} onChange={(e) => setEditAtdForm((f: any) => ({ ...f, date: e.target.value }))} className="ml-1 px-1.5 py-0.5 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>}
                {editAtd && <div><span className="text-gray-400">Hora:</span> <input type="time" value={editAtdForm.time || ""} onChange={(e) => setEditAtdForm((f: any) => ({ ...f, time: e.target.value }))} className="ml-1 px-1.5 py-0.5 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>}
                <div><span className="text-gray-400">Profissional:</span> {verAtd.user?.name || "—"}</div>
                <div><span className="text-gray-400">Duração:</span> {verAtd.duration ? `${verAtd.duration} min` : "—"}</div>
                {verAtd.petWeight != null && <div><span className="text-gray-400">Peso:</span> {verAtd.petWeight} kg</div>}
                {verAtd.temperature != null && <div><span className="text-gray-400">Temp.:</span> {verAtd.temperature} °C</div>}
              </div>
              {editAtd && <div><span className="text-gray-400 block mb-0.5">Observações:</span><textarea value={editAtdForm.notes || ""} onChange={(e) => setEditAtdForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Acrescente uma observação da sessão…" className="w-full px-2 py-1.5 border rounded text-xs" style={{ borderColor: "#E8DFC8", minHeight: 44 }} /></div>}
              {([["Queixa principal", "chiefComplaint"], ["Anamnese", "anamnesis"], ["Exame físico", "physicalExam"], ["Diagnóstico", "diagnosis"], ["Conduta", "conduct"], ["Prescrição", "prescription"], ["Exames solicitados", "examsRequested"]] as [string, string][]).map(([l, k]) => (verAtd as any)[k] ? <div key={k}><span className="text-gray-400">{l}:</span> <span style={{ color: "#0E2244" }}>{(verAtd as any)[k]}</span></div> : null)}
              {Array.isArray(verAtd.items) && verAtd.items.length > 0 && (
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Serviços e valores</div>
                  <div className="space-y-1">
                    {verAtd.items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between bg-[#fbfaf6] rounded px-2 py-1">
                        <span>{it.descricao || "Serviço"} <span className="text-gray-400">x{it.quantidade}</span></span>
                        <span className="font-medium">{Number(it.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "#f0e8d4" }}>
                <span className="text-gray-400">Total{verAtd.paymentMethod ? ` · ${verAtd.paymentMethod}` : ""}</span>
                <span className="text-sm font-semibold" style={{ color: "#0F6E56" }}>{Number(verAtd.value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              {verAtd.nextReturnDate && <div><span className="text-gray-400">Próximo retorno:</span> {new Date(verAtd.nextReturnDate).toLocaleDateString("pt-BR")}</div>}
              {verAtd.followUpNotes && <div><span className="text-gray-400">Verificar:</span> {verAtd.followUpNotes}</div>}
              {verAtd.notes && <div><span className="text-gray-400">Obs.:</span> {verAtd.notes}</div>}
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => excluirAtendimento(verAtd.id)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#f4baba", color: "#A32D2D", background: "#fbe6e6" }}>Excluir</button>
              <div className="flex gap-2">
                {editAtd ? (
                  <>
                    <button onClick={salvarEditAtd} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
                    <button onClick={() => setEditAtd(false)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { const d = new Date(verAtd.date); const z = (n: number) => String(n).padStart(2, "0"); setEditAtdForm({ type: verAtd.type, status: verAtd.status, date: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, time: `${z(d.getHours())}:${z(d.getMinutes())}`, notes: verAtd.notes || "" }); setEditAtd(true); }} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#009AAC", color: "#00798A" }}>Editar</button>
                    <button onClick={() => setVerAtd(null)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={delOpen}
        entityLabel="Pet"
        itemName={pet.name}
        consequenceText="Os atendimentos e tratamentos vinculados também serão removidos."
        onConfirm={handleDelete}
        onClose={() => setDelOpen(false)}
      />

      {/* Boletim de fisioterapia — POPUP (novo/editar) */}
      {boletimOpen && pet && (
        <BoletimModal
          pet={pet as any}
          boletimId={boletimEditId}
          fisioRec={fisioRec.data}
          onClose={() => setBoletimOpen(false)}
          onSaved={async () => { setBoletimOpen(false); await loadBoletins(); }}
        />
      )}
    </div>
  );
}

function Field({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  return (
    <div className={block ? "md:col-span-2" : ""}>
      <div className="text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{label}</div>
      <div className="text-gray-700">{value || <span className="text-gray-300">—</span>}</div>
    </div>
  );
}

function PipelineRow({ label, stage, muted }: { label: string; stage: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50/60 transition cursor-pointer">
      <div className="font-semibold text-xs tracking-wide" style={{ color: muted ? "#94a3b8" : "#0E2244" }}>{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{
            background: muted ? "#f1f5f7" : "#fef3c7",
            color: muted ? "#94a3b8" : "#92400e",
          }}
        >
          {stage}
        </span>
        <LuArrowLeft size={14} className="rotate-180 text-gray-400" />
      </div>
    </div>
  );
}
