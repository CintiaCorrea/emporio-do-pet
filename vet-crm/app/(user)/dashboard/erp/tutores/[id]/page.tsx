"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Ficha do Tutor  (erp/tutores/[id])
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ───────────────────────────────────────────────────────────── */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { criarPetEAbrir } from "@/lib/actions/pets";
import { SendEmailModal } from "@/components/email/SendEmailModal";
import EncaminharBox from "@/components/inbox/EncaminharBox";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import {
  LuArrowLeft, LuStickyNote, LuPencil, LuTriangleAlert,
  LuTrash, LuPhone, LuCalendar, LuUser, LuPlus, LuCheck, LuX} from "react-icons/lu";

const CONTATO_TIPO_LABEL: Record<string, string> = { MOBILE: "Celular", PHONE: "Fixo", BUSINESS: "Comercial" };
const TIPO_PESSOA_LABEL: Record<string, string> = { INDIVIDUAL: "Pessoa física", LEGAL_ENTITY: "Pessoa jurídica" };
const GENERO_LABEL: Record<string, string> = { MALE: "Masculino", FEMALE: "Feminino", OTHER: "Outro" };
const fmtDataBR = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};
const ouTraco = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");

interface TutorDetail {
  id: string;
  name: string | null;
  email: string | null;
  type: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  howFoundUs: string | null;
  profession: string | null;
  status: string;
  classificacao: string;
  cep: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  referencePoint: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  observations: string | null;
  notaCliente: string | null;
  tags: string[];
  acceptsEmail: boolean;
  acceptsWhatsApp: boolean;
  acceptsSMS: boolean;
  acceptsSmsCampaign: boolean;
  convertedFromLeadId: string | null;
  codigo?: string | null;
  proximoFollowupAt?: string | null;
  estadoRelacionamento?: string | null;
  createdAt: string;
  primeiraCompraAt?: string | null;
  appointments?: { id: string; date: string; value?: number; description?: string | null; type?: string; pet?: { name?: string } | null }[];
  pets?: { id: string; name: string; species: string; breed?: string; birthDate?: string; codigo?: string | null; status?: string; proximoFollowupAt?: string | null }[];
  contacts?: { id: string; number: string; type: string; isPrimary: boolean; isWhatsApp: boolean; observations?: string | null }[];
  score?: {
    total: number; label: string;
    dimensions: {
      visitas: { score: number; max: number; value: number };
      ltv: { score: number; max: number; value: number };
      recencia: { score: number; max: number; value: any };
      nps: { score: number; max: number; value: any };
    };
  };
}

const PET_EMOJI = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "🐱";
  if (s === "CANINE" || s === "CACHORRO") return "🐶";
  return "🐾";
};
const ESPECIE_LABEL = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "Gato";
  if (s === "CANINE" || s === "CACHORRO") return "Cão";
  if (s === "BIRD") return "Ave";
  if (s === "RODENT") return "Roedor";
  if (s === "REPTILE") return "Réptil";
  if (s === "OTHER") return "Outro";
  return species || "";
};
const PET_IDADE = (birthDate?: string) => {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const anos = new Date().getFullYear() - d.getFullYear();
  if (anos < 0 || anos > 40) return null;
  return anos === 0 ? "filhote" : `${anos} ${anos === 1 ? "ano" : "anos"}`;
};
const HUMANIZAR = (s?: string | null) => {
  if (!s) return null;
  const t = s.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

const STATUS_BADGE = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return { label: "Em dia", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "SUSPENDED") return { label: "A recuperar", color: "#BA7517", bg: "#FCE5C8" };
  if (s === "CHURNED") return { label: "Ex-cliente", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: "Inativo", color: "#5b6470", bg: "#f0e8d4" };
};

const initials = (name?: string | null) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "??";
  return parts.map((p) => p[0]).join("").toUpperCase();
};

const MARCA_INFO: Record<string, { label: string; emoji: string; bar: string }> = {
  EMPORIO: { label: "Empório do Pet", emoji: "🏥", bar: "#009AAC" },
  MUNDO_A_PARTE: { label: "Mundo à Parte", emoji: "🌿", bar: "#639922" },
  DRA_VIVIAN: { label: "Dra. Vivian", emoji: "✨", bar: "#7F77DD" },
};
const marcaInfo = (m: string) => MARCA_INFO[m] || { label: m, emoji: "🏷️", bar: "#888780" };
const diasTxt = (d: number | null | undefined) =>
  d == null ? "—" : d === 0 ? "hoje" : d < 30 ? `${d}d` : d < 365 ? `${Math.floor(d / 30)}m` : `${Math.floor(d / 365)}a`;

// Nível do cliente derivado do Score (0-100) — reaproveita o motor que já existe (LTV+visitas+recência+NPS)
const nivelDoScore = (score?: number) => {
  const s = Math.max(0, Math.min(100, score ?? 0));
  if (s >= 80) return { nome: "Diamante", emoji: "💎", bar: "#7F77DD", bg: "#EDE9FA", fg: "#3C3489", min: 80, max: 100, prox: null as string | null, proxEmoji: "" };
  if (s >= 60) return { nome: "Ouro", emoji: "🥇", bar: "#E0A100", bg: "#FBEFD6", fg: "#8A5A0B", min: 60, max: 80, prox: "Diamante", proxEmoji: "💎" };
  if (s >= 40) return { nome: "Prata", emoji: "🥈", bar: "#9AA5AD", bg: "#EEF1F3", fg: "#49555C", min: 40, max: 60, prox: "Ouro", proxEmoji: "🥇" };
  return { nome: "Bronze", emoji: "🥉", bar: "#B87333", bg: "#F6E7D8", fg: "#7A4A1E", min: 0, max: 40, prox: "Prata", proxEmoji: "🥈" };
};

function AccordionCard({
  icon: Icon, title, count, badge, action, children
}: {
  icon: any; title: string; count?: number; badge?: { label: string; color: string; bg: string };
  action?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-[#E8E2D6] rounded-[13px] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between border-b border-[#F0EBE0] hover:bg-[#FBF9F4]" style={{ padding: "11px 14px" }}>
        <div className="flex items-center gap-2">
          {open ? <span style={{fontSize:"11px"}}>▼</span> : <span style={{fontSize:"11px"}}>▶</span>}
          <Icon className="w-4 h-4 text-[#009AAC]" />
          <span className="text-[13px] text-[#014D5E] font-medium">{title}</span>
          {typeof count === "number" && (
            <span className="bg-[#E7F6EE] text-[#1c7a47] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{count}</span>
          )}
          {badge && (
            <span style={{ background: badge.bg, color: badge.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{badge.label}</span>
          )}
        </div>
        {action}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

export default function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<"GERAL" | "CADASTRO" | "ANIMAIS" | "COMPRAS">("GERAL");
  const [stats, setStats] = useState<any>(null);
  const [showValues, setShowValues] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fuOpen, setFuOpen] = useState(false);
  const [comprasPet, setComprasPet] = useState<string>("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState("");
  const [notaSaving, setNotaSaving] = useState(false);
  const [editDados, setEditDados] = useState(false);
  const [dadosForm, setDadosForm] = useState<any>({});
  const [savingDados, setSavingDados] = useState(false);
  const [tagPicker, setTagPicker] = useState(false);
  const [tplTags, setTplTags] = useState<any[]>([]);
  const [savingTag, setSavingTag] = useState(false);
  const [fuDate, setFuDate] = useState("");
  const [savingFu, setSavingFu] = useState(false);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [intTipo, setIntTipo] = useState("NOTA");
  const [intTexto, setIntTexto] = useState("");
  const [savingInt, setSavingInt] = useState(false);
  const [editIntId, setEditIntId] = useState<string | null>(null);
  const [editIntTexto, setEditIntTexto] = useState("");
  const [savingEditInt, setSavingEditInt] = useState(false);
  const [estagios, setEstagios] = useState<string[]>([]);
  const [pipelineNome, setPipelineNome] = useState("");
  const [savingEstagio, setSavingEstagio] = useState(false);
  const [contatoForm, setContatoForm] = useState<any>({ number: "", type: "MOBILE", isWhatsApp: false, observations: "" });
  const [addingContato, setAddingContato] = useState(false);
  const [editContatoId, setEditContatoId] = useState<string | null>(null);
  const [savingContato, setSavingContato] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutors/${id}`);
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object" && data.id) {
        setTutor(data);
        setNota(data.notaCliente || "");
      } else {
        setTutor(null);
      }
    } catch (e) {
      console.error(e);
      setTutor(null);
    }
    finally { setLoading(false); }
  };

  async function saveDados() {
    setSavingDados(true);
    try {
      const res = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dadosForm) });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Dados atualizados");
      setEditDados(false);
      await load();
    } catch (e) { toast.error("Erro ao salvar"); }
    finally { setSavingDados(false); }
  }

  async function addTag(texto: string) {
    if (!tutor) return;
    const novas = Array.from(new Set([...(tutor.tags || []), texto]));
    setSavingTag(true);
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: novas }) }); if (!r.ok) throw new Error(); toast.success("Etiqueta adicionada"); setTagPicker(false); await load(); } catch { toast.error("Erro ao adicionar etiqueta"); } finally { setSavingTag(false); }
  }
  async function removeTag(texto: string) {
    if (!tutor) return;
    const novas = (tutor.tags || []).filter((t) => t !== texto);
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: novas }) }); if (!r.ok) throw new Error(); await load(); } catch { toast.error("Erro ao remover etiqueta"); }
  }
  async function saveFollowup() {
    if (!fuDate) { toast.error("Escolha uma data"); return; }
    setSavingFu(true);
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date(fuDate + "T12:00:00").toISOString() }) }); if (!r.ok) throw new Error(); toast.success("Follow-up agendado"); setFuDate(""); await load(); } catch { toast.error("Erro ao agendar"); } finally { setSavingFu(false); }
  }
  async function clearFollowup() {
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) }); if (!r.ok) throw new Error(); toast.success("Follow-up removido"); await load(); } catch { toast.error("Erro ao remover"); }
  }
  async function addInteracao() {
    if (!intTexto.trim()) { toast.error("Escreva algo"); return; }
    setSavingInt(true);
    try { const r = await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: id, tipo: intTipo, texto: intTexto.trim(), canal: "Sistema" }) }); if (!r.ok) throw new Error(); toast.success("Registrado"); setIntTexto(""); await loadInteracoes(); } catch { toast.error("Erro ao registrar"); } finally { setSavingInt(false); }
  }
  async function deleteInteracao(itId: string) {
    if (!(await confirmDelete({ entityLabel: "interação", itemName: "esta interação" }))) return;
    try { const r = await fetch(`/api/interacoes/${itId}`, { method: "DELETE" }); if (!r.ok) throw new Error(); setInteracoes((prev) => prev.filter((x) => x.id !== itId)); toast.success("Interação excluída"); } catch { toast.error("Erro ao excluir"); }
  }
  async function saveEditInteracao() {
    if (!editIntId) return;
    if (!editIntTexto.trim()) { toast.error("Escreva algo"); return; }
    setSavingEditInt(true);
    try { const r = await fetch(`/api/interacoes/${editIntId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: editIntTexto.trim() }) }); if (!r.ok) throw new Error(); setEditIntId(null); setEditIntTexto(""); await loadInteracoes(); toast.success("Interação atualizada"); } catch { toast.error("Erro ao salvar"); } finally { setSavingEditInt(false); }
  }
  async function saveClassificacao(valor: string) {
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classificacao: valor }) }); if (!r.ok) throw new Error(); toast.success("Classificação atualizada"); await load(); } catch { toast.error("Erro ao classificar"); }
  }
  async function saveEstagio(valor: string) {
    setSavingEstagio(true);
    try { const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estadoRelacionamento: valor || null }) }); if (!r.ok) throw new Error(); toast.success("Estágio atualizado"); await load(); } catch { toast.error("Erro ao atualizar estágio"); } finally { setSavingEstagio(false); }
  }

  async function loadInteracoes() {
    try { const r = await fetch(`/api/interacoes?tutorId=${id}&limit=100`, { cache: "no-store" }); const d = await r.json(); setInteracoes(Array.isArray(d) ? d : (d.interacoes || d.data || [])); } catch {}
  }
  async function loadTemplates() {
    try { const r = await fetch(`/api/etiquetas/templates`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.templates || d.data || []); setTplTags(arr.filter((t: any) => t.ativo !== false && (t.aplicaEm || []).includes("Cliente"))); } catch {}
  }
  async function loadPipelineCliente() {
    try {
      const r = await fetch(`/api/pipelines`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []);
      const cliente = arr.filter((p: any) => p.escopo === "CLIENTE" && p.ativo !== false);
      const p = cliente.find((x: any) => x.isPadrao) || cliente[0];
      if (p) { setPipelineNome(p.nome); setEstagios((p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome)); }
    } catch {}
  }
  async function loadStats() {
    try { const r = await fetch(`/api/tutors/${id}/profile-stats`); if (r.ok) setStats(await r.json()); } catch {}
  }
  useEffect(() => { load(); loadStats(); loadInteracoes(); loadTemplates(); loadPipelineCliente(); }, [id]);

  const saveNota = async () => {
    setNotaSaving(true);
    try {
      const res = await fetch(`/api/tutors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notaCliente: nota })});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Nota salva!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setNotaSaving(false); }
  };

  async function handleDelete() {
    try {
      const res = await fetch(`/api/tutors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Tutor removido");
      router.push("/dashboard/erp/tutores");
    } catch (e: any) {
      toast.error("Erro ao remover: " + (e?.message || ""));
    }
    setDelOpen(false);
  }

  async function marcarRecuperar() {
    try {
      const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ estadoRelacionamento: "A recuperar" }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Marcado a recuperar");
      load();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    }
  }

  async function encaminhar() {
    const destino = window.prompt("Encaminhar para quem? (vet, recepção, admin)");
    if (!destino || !destino.trim()) return;
    try {
      const r = await fetch("/api/interacoes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ tutorId: id, tipo: "ENCAMINHAMENTO", texto: `Encaminhado para: ${destino}`, canal: "Sistema" }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success(`Encaminhado para ${destino}`);
    } catch (e: any) {
      toast.error("Erro ao encaminhar: " + (e?.message || ""));
    }
  }

  async function retomarComoLead() {
    if (!tutor) return;
    if (!window.confirm(`Retomar ${tutor.name} como Lead? Ela volta para a lista de Leads marcada como "Reativação". O cadastro continua único (não duplica).`)) return;
    try {
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ estadoRelacionamento: "Reativação" }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Retomada como Lead (Reativação)");
      router.push(`/dashboard/crm/leads`);
    } catch (e: any) {
      toast.error("Erro ao retomar como Lead: " + (e?.message || ""));
    }
  }

  const resetContato = () => { setContatoForm({ number: "", type: "MOBILE", isWhatsApp: false, observations: "" }); setEditContatoId(null); setAddingContato(false); };

  const salvarContato = async () => {
    if (!contatoForm.number?.trim()) { toast.error("Informe o n\u00famero"); return; }
    setSavingContato(true);
    try {
      const payload: any = { number: contatoForm.number.trim(), type: contatoForm.type, isWhatsApp: !!contatoForm.isWhatsApp, observations: contatoForm.observations?.trim() || null };
      if (editContatoId) {
        const r = await fetch(`/api/contacts/${editContatoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error();
      } else {
        const semPrincipal = !(tutor?.contacts || []).some((c) => c.isPrimary);
        const r = await fetch(`/api/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, tutorId: id, isPrimary: semPrincipal }) });
        if (!r.ok) throw new Error();
      }
      toast.success("Contato salvo");
      resetContato();
      await load();
    } catch { toast.error("Erro ao salvar contato"); } finally { setSavingContato(false); }
  };

  const editarContato = (c: any) => { setEditContatoId(c.id); setContatoForm({ number: c.number || "", type: c.type || "MOBILE", isWhatsApp: !!c.isWhatsApp, observations: c.observations || "" }); setAddingContato(true); };

  const excluirContato = async (c: any) => {
    if (!(await confirmDelete({ entityLabel: "Contato", itemName: c.number }))) return;
    try { const r = await fetch(`/api/contacts/${c.id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); toast.success("Contato removido"); await load(); } catch { toast.error("Erro ao remover"); }
  };

  const marcarPrincipal = async (c: any) => {
    try {
      const outros = (tutor?.contacts || []).filter((x) => x.isPrimary && x.id !== c.id);
      for (const o of outros) { await fetch(`/api/contacts/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPrimary: false }) }); }
      const r = await fetch(`/api/contacts/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPrimary: true }) });
      if (!r.ok) throw new Error();
      toast.success("Telefone principal atualizado");
      await load();
    } catch { toast.error("Erro ao atualizar principal"); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;
  if (!tutor) return <div className="p-6 text-center text-gray-500">Cliente não encontrado</div>;

  const status = STATUS_BADGE(tutor.status);
  const phone = tutor.contacts?.find((c) => c.isPrimary)?.number;
  const pets = tutor.pets || [];
  const compras = tutor.appointments || [];
  const porMarca: { marca: string; valor: number; pct: number }[] = stats?.porMarca || [];
  const money = (v?: number | null) =>
    v == null ? "—" : !showValues ? "R$ ••••" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const scoreTotal = tutor.score?.total ?? 0;
  const nivel = nivelDoScore(scoreTotal);
  const nivelProg = Math.round(((Math.min(100, Math.max(0, scoreTotal)) - nivel.min) / (nivel.max - nivel.min)) * 100);
  const faltamPts = Math.max(0, nivel.max - Math.round(scoreTotal));
  // Compras agrupadas por pet (o pet é o centro de tudo)
  const comprasPorPet: Record<string, ApptLite[]> = {};
  for (const a of compras) {
    const k = a.pet?.name || "Sem pet";
    (comprasPorPet[k] = comprasPorPet[k] || []).push(a);
  }
  const comprasFiltradas = comprasPet && comprasPorPet[comprasPet] ? comprasPorPet[comprasPet] : compras;
  // Selos de conquista (dados reais)
  const anosCasa = Math.max(0, new Date().getFullYear() - new Date(tutor.primeiraCompraAt || tutor.createdAt).getFullYear());
  const aniversarioNoMes = tutor.birthDate ? new Date(tutor.birthDate).getMonth() === new Date().getMonth() : false;
  const selos: { txt: string; bg: string; fg: string }[] = [];
  if (anosCasa >= 2) selos.push({ txt: `🏅 Fiel (${anosCasa} anos)`, bg: "#FBF3E3", fg: "#8a6400" });
  if ((tutor as any).rankingAbc === "A") selos.push({ txt: "⭐ Top 20%", bg: "#E1F5EE", fg: "#0F6E56" });
  if (stats && stats.diasDesdeUltima != null && stats.diasDesdeUltima < 45) selos.push({ txt: "🔁 Frequente", bg: "#EDE9FA", fg: "#3C3489" });
  if (aniversarioNoMes) selos.push({ txt: "🎂 Aniversariante do mês", bg: "#FDECEC", fg: "#A32D2D" });

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <Toaster position="top-right" />

      {/* Breadcrumb */}
      <div className="text-[12px] text-[#8A989D] mb-2 px-1">
        <Link href="/dashboard/erp/tutores" className="hover:text-[#009AAC]">Clientes</Link> / <b className="text-[#009AAC] font-medium">{tutor.name || "Sem nome"}</b>
      </div>

      {/* Cabeçalho leve */}
      <div className="flex justify-between items-start mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-[50px] h-[50px] rounded-[13px] bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[17px] font-semibold shrink-0">
            {initials(tutor.name)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] leading-tight text-[#014D5E] font-medium">{tutor.name || "Sem nome"}</h1>
              {tutor.codigo ? <span className="text-[13px] text-[#8A989D] font-medium" title="Código do cliente">#{tutor.codigo}</span> : null}
              <span style={{ background: status.bg, color: status.color }} className="text-[11px] font-medium px-2 py-0.5 rounded-full">{status.label}</span>
            </div>
            <p className="text-[12.5px] text-[#5C6B70] mt-0.5">
              Cliente desde {new Date(tutor.primeiraCompraAt || tutor.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} · {pets.length} {pets.length === 1 ? "pet" : "pets"}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button onClick={() => setShowValues((v) => !v)} className="border border-[#EAD9B6] bg-[#FBF6EC] rounded-[9px] px-3 py-2 text-[12.5px] text-[#8A5A0B] hover:border-[#E0A100] flex items-center gap-1.5">{showValues ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
          <button onClick={() => openWhatsAppMeta(phone)} className="border border-[#E8E2D6] bg-white rounded-[9px] px-3 py-2 text-[12.5px] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center gap-1.5">📲 WhatsApp</button>
          <div className="relative">
            <button onClick={() => setMoreOpen((v) => !v)} className="border border-[#E8E2D6] bg-white rounded-[9px] px-3 py-2 text-[12.5px] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">⋯ Mais</button>
            {moreOpen && (
              <div className="absolute right-0 top-[42px] bg-white border border-[#E0DACB] rounded-[11px] shadow-lg p-1.5 z-20 min-w-[190px]" onMouseLeave={() => setMoreOpen(false)}>
                <button onClick={() => { setEmailOpen(true); setMoreOpen(false); }} className="w-full text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FBF9F4] text-[#5C6B70]">✉️ Email</button>
                <button onClick={() => { marcarRecuperar(); setMoreOpen(false); }} className="w-full text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FBF9F4] text-[#5C6B70]">⚠️ A recuperar</button>
                <div className="px-1.5 py-1"><EncaminharBox tipo="cliente" id={id} nome={tutor?.name || ""} onChange={loadInteracoes} /></div>
                <button onClick={() => { retomarComoLead(); setMoreOpen(false); }} className="w-full text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FBF9F4] text-[#5C6B70]">🔄 Retomar lead</button>
                <button onClick={() => { setDelOpen(true); setMoreOpen(false); }} className="w-full text-left text-[12.5px] px-3 py-2 rounded-[7px] hover:bg-[#FDECEC] text-[#b23b39] border-t border-[#F0EBE0] mt-1">🗑️ Excluir</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caixinha lembrar */}
      <div className="bg-[#FBF3E3] border border-dashed border-[#E0A100] rounded-[11px] px-3.5 py-2 mb-3">
        <div className="flex items-center gap-2">
          <span style={{fontSize:"14px"}}>💗</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={`Adicionar algo que vale lembrar sobre ${tutor.name?.split(" ")[0] || "este cliente"}...`}
            className="flex-1 bg-transparent border-none outline-none text-xs text-[#8a6400] italic"
          />
          {nota !== (tutor.notaCliente || "") && (
            <button onClick={saveNota} disabled={notaSaving} className="text-[#E0A100] text-[11px] font-medium">
              {notaSaving ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </div>

      {/* Etiquetas — barra slim, logo abaixo da caixinha lembrar */}
      <div className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] mb-3" style={{ padding: "7px 12px" }}>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[12px] text-[#5C6B70] flex items-center gap-1">🏷️ Etiquetas</span>
          {tutor.tags?.map((t) => {
            const tpl = tplTags.find((x: any) => x.texto === t);
            const cor = tpl?.cor || "#009AAC";
            return (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>
                ● {t}
                <button onClick={() => removeTag(t)} title="Remover" className="hover:opacity-60 font-bold">×</button>
              </span>
            );
          })}
          <button onClick={() => setTagPicker((v) => !v)} className="border border-dashed border-[#E8E2D6] text-[#8A989D] text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
        </div>
        {tagPicker && (
          <div className="mt-2 pt-2 border-t border-[#F0EBE0]">
            {tplTags.filter((t: any) => !(tutor.tags || []).includes(t.texto)).length === 0 ? (
              <p className="text-[10px] text-[#8A989D]">Nenhuma etiqueta de Cliente disponível. Cadastre em Configurações → Etiquetas.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tplTags.filter((t: any) => !(tutor.tags || []).includes(t.texto)).map((t: any) => (
                  <button key={t.texto} disabled={savingTag} onClick={() => addTag(t.texto)} className="text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de abas */}
      <div className="flex border-b border-[#E8E2D6] mb-3">
        {([
          { k: "GERAL", label: "👤 Visão geral" },
          { k: "ANIMAIS", label: "🐾 Pets" },
          { k: "COMPRAS", label: "🧾 Compras" },
          { k: "CADASTRO", label: "📋 Cadastro" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition -mb-px"
            style={{ borderColor: tab === t.k ? "#009AAC" : "transparent", color: tab === t.k ? "#009AAC" : "#8A989D" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "GERAL" && (
      <div className="mb-3 flex flex-col gap-3">
        {/* Gamificação: Score + Nível + selos */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,auto) minmax(0,1fr)" }}>
          {tutor.score && (
            <div className="bg-white border border-[#E8E2D6] rounded-[14px] flex items-center gap-3.5" style={{ padding: "13px 16px" }}>
              <div className="relative w-[62px] h-[62px] shrink-0">
                <svg viewBox="0 0 62 62" className="w-full h-full -rotate-90">
                  <circle cx="31" cy="31" r="26" fill="none" stroke="#F0EBE0" strokeWidth="6" />
                  <circle cx="31" cy="31" r="26" fill="none" stroke="#009AAC" strokeWidth="6" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset={163.4 - (scoreTotal / 100) * 163.4} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[18px] font-medium text-[#014D5E]">{scoreTotal}</div>
              </div>
              <div>
                <div className="text-[13.5px] font-medium text-[#014D5E]">{tutor.score.label || "Cliente"}</div>
                <div className="text-[11.5px] text-[#8A989D]">Score {scoreTotal}/100</div>
              </div>
            </div>
          )}
          <div className="bg-white border border-[#E8E2D6] rounded-[14px]" style={{ padding: "13px 16px" }}>
            <div className="flex justify-between items-center text-[13px] mb-1.5">
              <span className="font-medium" style={{ color: nivel.fg }}>{nivel.emoji} Nível {nivel.nome}</span>
              {nivel.prox && <span className="text-[#8A989D]">próximo: {nivel.proxEmoji} {nivel.prox}</span>}
            </div>
            <div className="h-[9px] bg-[#F0EBE0] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${nivelProg}%`, background: nivel.bar }} /></div>
            <div className="text-[11px] text-[#8A989D] mt-1.5">{nivel.prox ? `Faltam ${faltamPts} pontos pra ${nivel.proxEmoji} ${nivel.prox}` : "Nível máximo alcançado 🎉"}</div>
            {selos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {selos.map((s) => (<span key={s.txt} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>{s.txt}</span>))}
              </div>
            )}
            {tutor.score && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-[#F0EBE0]">
                {[["Visitas", tutor.score.dimensions.visitas], ["LTV", tutor.score.dimensions.ltv], ["Recência", tutor.score.dimensions.recencia], ["NPS", tutor.score.dimensions.nps]].map(([label, d]: any) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] mb-0.5"><span className="text-[#5C6B70]">{label}</span><span className="text-[#1F2A2E] font-medium">{d.score}/{d.max}</span></div>
                    <div className="h-[3px] bg-[#F0EBE0] rounded-full overflow-hidden"><div className="h-full bg-[#009AAC] rounded-full" style={{ width: `${(d.score / d.max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {[
            { emoji: "💰", label: "Total gasto", value: money(stats?.valorTotal) },
            { emoji: "🎯", label: "Ticket médio", value: money(stats?.ticketMedio) },
            { emoji: "🛒", label: "Compras", value: String(stats?.totalAppointments ?? 0) },
            { emoji: "📅", label: "Última visita", value: diasTxt(stats?.diasDesdeUltima) },
            { emoji: "⏳", label: "A receber", value: money(stats?.valorAReceber) },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "11px 13px" }}>
              <div className="text-[11px] text-[#8A989D]">{k.emoji} {k.label}</div>
              <div className="text-[19px] text-[#014D5E] font-medium mt-0.5">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {/* Pets */}
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🐾 Pets {pets.length > 0 && <span className="text-[#8A989D] font-normal">({pets.length})</span>}</h3>
            </div>
            <div style={{ padding: "8px 14px" }}>
              {pets.length === 0 && <p className="text-[12px] text-[#8A989D] py-1">Nenhum pet vinculado.</p>}
              {pets.map((p, i) => (
                <Link key={p.id} href={`/dashboard/erp/pets/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-[#FBF9F4] rounded-[9px]" style={{ borderBottom: i < pets.length - 1 ? "1px solid #F0EBE0" : "none" }}>
                  <div className="w-[38px] h-[38px] rounded-[12px] bg-[#E0F4F6] flex items-center justify-center text-[19px] shrink-0">{PET_EMOJI(p.species)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-[#014D5E] font-medium truncate">{p.name}{p.status && p.status !== "ACTIVE" && <span className="text-[10px] text-[#b23b39]"> · inativo</span>}</div>
                    <div className="text-[12px] text-[#5C6B70] truncate">{[ESPECIE_LABEL(p.species), p.breed, PET_IDADE(p.birthDate)].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className="text-[#8A989D] text-[16px]">›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Share of wallet por marca */}
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🎯 Onde gasta (por marca)</h3>
            </div>
            <div style={{ padding: "13px 14px" }}>
              {porMarca.length === 0 && <p className="text-[12px] text-[#8A989D]">Aparece quando houver compras registradas.</p>}
              {porMarca.map((s) => {
                const mi = marcaInfo(s.marca);
                return (
                  <div key={s.marca} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-[12px] mb-1"><span className="text-[#1F2A2E]">{mi.emoji} {mi.label}</span><span className="text-[#8A989D]">{money(s.valor)} · {s.pct}%</span></div>
                    <div className="h-2 bg-[#F0EBE0] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: mi.bar }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Últimas compras */}
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">🧾 Últimas compras</h3>
          </div>
          <div style={{ padding: "8px 14px" }}>
            {compras.length === 0 && <p className="text-[12px] text-[#8A989D] py-1">Nenhuma compra registrada ainda.</p>}
            {compras.slice(0, 6).map((a, i) => (
              <div key={a.id} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < Math.min(compras.length, 6) - 1 ? "1px solid #F0EBE0" : "none" }}>
                <span className="text-[11.5px] text-[#8A989D] w-[46px] shrink-0">{fmtDataBR(a.date).slice(0, 5)}</span>
                <span className="flex-1 text-[12.5px] text-[#1F2A2E] truncate">{a.description || a.type || "Atendimento"}{a.pet?.name && <span className="text-[#8A989D]"> · {a.pet.name}</span>}</span>
                <span className="text-[12.5px] text-[#014D5E] font-medium">{money(a.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas ações */}
        <div className="bg-[#FBF3E3] border border-[#F0DCB0] rounded-[13px]" style={{ padding: "12px 15px" }}>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[13px] text-[#8a6400] font-medium flex items-center gap-1.5">🔔 Próximas ações</h3>
            <button onClick={() => { setFuDate(tutor.proximoFollowupAt ? String(tutor.proximoFollowupAt).slice(0, 10) : ""); setFuOpen(true); }} className="text-[11.5px] text-[#8a6400] underline">📞 {tutor.proximoFollowupAt ? "Alterar" : "Agendar"} follow-up</button>
          </div>
          <div className="text-[12.5px] text-[#7a6330] flex flex-col gap-1">
            {tutor.birthDate && <div>🎂 Aniversário em <b>{fmtDataBR(tutor.birthDate).slice(0, 5)}</b> — enviar mensagem</div>}
            {tutor.proximoFollowupAt && <div>📞 Follow-up em <b>{fmtDataBR(tutor.proximoFollowupAt).slice(0, 5)}</b></div>}
            {stats && stats.futurasAgendadas > 0 && <div>📅 {stats.futurasAgendadas} agendamento(s) futuro(s)</div>}
            {stats && stats.valorAReceber > 0 && <div>⏳ Há valores a receber deste cliente</div>}
            {!tutor.birthDate && !tutor.proximoFollowupAt && !(stats && stats.futurasAgendadas > 0) && !(stats && stats.valorAReceber > 0) && <div className="text-[#a99a72]">Nenhuma ação pendente no momento.</div>}
          </div>
        </div>
      </div>
      )}

      {tab === "CADASTRO" && (
      <div className="mb-3">
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
          {/* Cabeçalho do box único */}
          <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">👤 Dados do cliente</h3>
            <button onClick={() => { setDadosForm({ name: tutor.name || "", email: tutor.email || "", type: tutor.type || "", cpf: tutor.cpf || "", rg: tutor.rg || "", birthDate: tutor.birthDate ? String(tutor.birthDate).slice(0, 10) : "", gender: tutor.gender || "", nationality: tutor.nationality || "", howFoundUs: tutor.howFoundUs || "", profession: tutor.profession || "", cep: tutor.cep || "", address: tutor.address || "", addressNumber: tutor.addressNumber || "", complement: tutor.complement || "", referencePoint: tutor.referencePoint || "", neighborhood: tutor.neighborhood || "", city: tutor.city || "", state: tutor.state || "", acceptsEmail: !!tutor.acceptsEmail, acceptsWhatsApp: !!tutor.acceptsWhatsApp, acceptsSMS: !!tutor.acceptsSMS, acceptsSmsCampaign: !!tutor.acceptsSmsCampaign }); setEditDados(v => !v); }} className="text-[11px] text-[#009AAC] hover:underline">{editDados ? "✖️ Fechar" : "✏️ Editar"}</button>
          </div>

          <div style={{ padding: "13px 14px" }}>

          {/* Formulário de edição completo */}
          {editDados && (
            <div className="mb-4 pb-4 border-b border-[#F0EBE0] flex flex-col gap-2.5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nome</label>
                  <input value={dadosForm.name ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Email</label>
                  <input value={dadosForm.email ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, email: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Tipo</label>
                  <select value={dadosForm.type ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, type: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]">
                    <option value="">—</option>
                    <option value="INDIVIDUAL">Pessoa física</option>
                    <option value="LEGAL_ENTITY">Pessoa jurídica</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">CPF</label>
                  <input value={dadosForm.cpf ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, cpf: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">RG</label>
                  <input value={dadosForm.rg ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, rg: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nascimento</label>
                  <input type="date" value={dadosForm.birthDate ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, birthDate: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Sexo</label>
                  <select value={dadosForm.gender ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, gender: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]">
                    <option value="">—</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Feminino</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nacionalidade</label>
                  <input value={dadosForm.nationality ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, nationality: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Como conheceu</label>
                  <input value={dadosForm.howFoundUs ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, howFoundUs: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Profissão</label>
                  <input value={dadosForm.profession ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, profession: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
              </div>

              {/* Endereço (edição) */}
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mt-1">📍 Endereço</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">CEP</label>
                  <input value={dadosForm.cep ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, cep: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Logradouro</label>
                  <input value={dadosForm.address ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, address: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Número</label>
                  <input value={dadosForm.addressNumber ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, addressNumber: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Complemento</label>
                  <input value={dadosForm.complement ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, complement: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Ponto de referência</label>
                  <input value={dadosForm.referencePoint ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, referencePoint: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Bairro</label>
                  <input value={dadosForm.neighborhood ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, neighborhood: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Cidade</label>
                  <input value={dadosForm.city ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, city: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Estado</label>
                  <input value={dadosForm.state ?? ""} onChange={e => setDadosForm((f: any) => ({ ...f, state: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
              </div>

              {/* Privacidade (edição) */}
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mt-1">🔔 Privacidade</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
                {(([["acceptsEmail", "E-mail"], ["acceptsWhatsApp", "WhatsApp"], ["acceptsSMS", "SMS"], ["acceptsSmsCampaign", "Campanha SMS"]]) as [string, string][]).map(([k, label]) => (
                  <div key={k}>
                    <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">{label}</label>
                    <select value={dadosForm[k] ? "1" : "0"} onChange={e => setDadosForm((f: any) => ({ ...f, [k]: e.target.value === "1" }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]">
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-1">
                <button onClick={saveDados} disabled={savingDados} className="px-3 py-1 rounded text-[11px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingDados ? "Salvando..." : "Salvar"}</button>
                <button onClick={() => setEditDados(false)} className="px-3 py-1 rounded text-[11px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</button>
              </div>
            </div>
          )}

          {/* SEÇÃO a) DADOS */}
          <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">Dados</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Tipo</div><div className="text-[13px] text-[#1F2A2E]">{tutor.type ? (TIPO_PESSOA_LABEL[tutor.type] || tutor.type) : "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">CPF</div><div className="text-[13px] text-[#1F2A2E]">{ouTraco(tutor.cpf)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">RG</div><div className="text-[13px] text-[#1F2A2E]">{ouTraco(tutor.rg)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nascimento</div><div className="text-[13px] text-[#1F2A2E]">{fmtDataBR(tutor.birthDate)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Sexo</div><div className="text-[13px] text-[#1F2A2E]">{tutor.gender ? (GENERO_LABEL[tutor.gender] || tutor.gender) : "—"}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Nacionalidade</div><div className="text-[13px] text-[#1F2A2E]">{ouTraco(tutor.nationality)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Como conheceu</div><div className="text-[13px] text-[#1F2A2E]">{ouTraco(tutor.howFoundUs)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Profissão</div><div className="text-[13px] text-[#1F2A2E]">{ouTraco(tutor.profession)}</div></div>
            <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Primeira visita</div><div className="text-[13px] text-[#1F2A2E]">{fmtDataBR(tutor.createdAt)}</div></div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Tipo de relacionamento</div>
              <select value={tutor.classificacao || "Cliente"} onChange={(e) => saveClassificacao(e.target.value)} className="bg-[#E0F4F6] text-[#009AAC] text-[12px] px-1.5 py-0.5 rounded border border-[#bfe3e8] mt-0.5">
                <option value="Cliente">Cliente</option>
                <option value="Fornecedor">Fornecedor</option>
                <option value="Parceiro">Parceiro</option>
                <option value="Ex_cliente">Ex-cliente</option>
              </select>
            </div>
          </div>

          {/* SEÇÃO b) CONTATOS */}
          <div className="border-t border-[#F0EBE0] pt-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">📞 Contatos</div>
              <button onClick={() => { resetContato(); setAddingContato(true); }} className="text-[11px] text-[#009AAC] hover:underline">➕ Adicionar</button>
            </div>
            {tutor.email && (
              <div className="mb-2 text-[13px] text-[#1F2A2E] flex items-center gap-1.5 break-all">✉️ {tutor.email}</div>
            )}
            <div className="flex flex-col gap-1.5">
              {(tutor.contacts || []).length === 0 && !addingContato && (
                <p className="text-[12px] text-[#8A989D]">Nenhum telefone cadastrado.</p>
              )}
              {(tutor.contacts || []).map((c) => (
                <div key={c.id} className="flex items-start gap-1.5 text-[11px] border-b border-[#F0EBE0] pb-1.5 last:border-0">
                  <button onClick={() => marcarPrincipal(c)} title="Marcar como principal" className="mt-0.5" style={{ color: c.isPrimary ? "#E0A100" : "#cfd8e0", fontSize: "13px", lineHeight: 1 }}>★</button>
                  <div className="flex-1">
                    <div className="text-[13px] text-[#1F2A2E] font-medium flex items-center gap-1.5 flex-wrap">
                      {c.number}
                      {c.isWhatsApp && <span className="bg-[#E0F4F6] text-[#009AAC] px-1 py-px rounded text-[9px]">WhatsApp</span>}
                      <span className="text-[#8A989D] text-[10px]">{CONTATO_TIPO_LABEL[c.type] || c.type}</span>
                    </div>
                    {c.observations && <div className="text-[#5C6B70] text-[10px]">{c.observations}</div>}
                  </div>
                  <button onClick={() => editarContato(c)} className="text-[#009AAC] mt-0.5"><LuPencil className="w-3 h-3" /></button>
                  <button onClick={() => excluirContato(c)} className="text-[#b23b39] mt-0.5"><LuTrash className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            {addingContato && (
              <div className="mt-2 pt-2 border-t border-[#F0EBE0] flex flex-col gap-1.5 text-[11px]">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Número</label>
                  <input value={contatoForm.number} onChange={(e) => setContatoForm((f: any) => ({ ...f, number: e.target.value }))} placeholder="(85) 99999-9999" className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#8A989D]">Identificação (ex: Esposo, Trabalho, Filha)</label>
                  <input value={contatoForm.observations} onChange={(e) => setContatoForm((f: any) => ({ ...f, observations: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]" />
                </div>
                <div className="flex items-center gap-3">
                  <select value={contatoForm.type} onChange={(e) => setContatoForm((f: any) => ({ ...f, type: e.target.value }))} className="px-2 py-1 border border-[#E8E2D6] rounded text-[13px] text-[#1F2A2E]">
                    <option value="MOBILE">Celular</option>
                    <option value="PHONE">Fixo</option>
                    <option value="BUSINESS">Comercial</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-[#5C6B70]"><input type="checkbox" checked={!!contatoForm.isWhatsApp} onChange={(e) => setContatoForm((f: any) => ({ ...f, isWhatsApp: e.target.checked }))} /> É WhatsApp</label>
                </div>
                <div className="flex gap-2 mt-1">
                  <button onClick={salvarContato} disabled={savingContato} className="px-3 py-1 rounded text-[11px] text-white disabled:opacity-50 flex items-center gap-1" style={{ background: "#009AAC" }}><LuCheck className="w-3 h-3" />{savingContato ? "Salvando..." : "Salvar"}</button>
                  <button onClick={resetContato} className="px-3 py-1 rounded text-[11px] border border-[#E8E2D6] text-[#5C6B70] flex items-center gap-1"><LuX className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO c) PRIVACIDADE */}
          <div className="border-t border-[#F0EBE0] pt-3 mt-4">
            <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">🔔 Privacidade</div>
            <div className="flex flex-wrap gap-1.5">
              {(([["E-mail", tutor.acceptsEmail], ["WhatsApp", tutor.acceptsWhatsApp], ["SMS", tutor.acceptsSMS], ["Campanha SMS", tutor.acceptsSmsCampaign]]) as [string, boolean][]).map(([label, ok]) => (
                <span key={label} className={`text-[11px] px-2 py-0.5 rounded-full ${ok ? "bg-[#E7F6EE] text-[#1c7a47]" : "bg-[#F3F1EC] text-[#9a948a]"}`}>{ok ? "✓" : "✗"} {label}</span>
              ))}
            </div>
          </div>

          {/* SEÇÃO d) ENDEREÇO */}
          <div className="border-t border-[#F0EBE0] pt-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">📍 Endereço</div>
              <button onClick={() => { setDadosForm({ name: tutor.name || "", email: tutor.email || "", type: tutor.type || "", cpf: tutor.cpf || "", rg: tutor.rg || "", birthDate: tutor.birthDate ? String(tutor.birthDate).slice(0, 10) : "", gender: tutor.gender || "", nationality: tutor.nationality || "", howFoundUs: tutor.howFoundUs || "", profession: tutor.profession || "", cep: tutor.cep || "", address: tutor.address || "", addressNumber: tutor.addressNumber || "", complement: tutor.complement || "", referencePoint: tutor.referencePoint || "", neighborhood: tutor.neighborhood || "", city: tutor.city || "", state: tutor.state || "", acceptsEmail: !!tutor.acceptsEmail, acceptsWhatsApp: !!tutor.acceptsWhatsApp, acceptsSMS: !!tutor.acceptsSMS, acceptsSmsCampaign: !!tutor.acceptsSmsCampaign }); setEditDados(true); }} className="text-[11px] text-[#009AAC] hover:underline">✏️ Editar</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
              {tutor.cep && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">CEP</div><div className="text-[13px] text-[#1F2A2E]">{tutor.cep}</div></div>}
              {(tutor.address || tutor.addressNumber) && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Logradouro</div><div className="text-[13px] text-[#1F2A2E]">{(tutor.address || "") + (tutor.addressNumber ? ", " + tutor.addressNumber : "")}</div></div>}
              {tutor.complement && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Complemento</div><div className="text-[13px] text-[#1F2A2E]">{tutor.complement}</div></div>}
              {tutor.referencePoint && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Ponto de referência</div><div className="text-[13px] text-[#1F2A2E]">{tutor.referencePoint}</div></div>}
              {tutor.neighborhood && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Bairro</div><div className="text-[13px] text-[#1F2A2E]">{tutor.neighborhood}</div></div>}
              {tutor.city && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Cidade</div><div className="text-[13px] text-[#1F2A2E]">{tutor.city}</div></div>}
              {tutor.state && <div><div className="text-[10px] uppercase tracking-wide text-[#8A989D]">Estado</div><div className="text-[13px] text-[#1F2A2E]">{tutor.state}</div></div>}
              {!(tutor.cep || tutor.address || tutor.addressNumber || tutor.complement || tutor.referencePoint || tutor.neighborhood || tutor.city || tutor.state) && (
                <p className="text-[12px] text-[#8A989D]">Endereço não cadastrado.</p>
              )}
            </div>
          </div>

          {tutor.convertedFromLeadId && (
            <div className="mt-4 pt-3 border-t border-[#F0EBE0] text-[12px] text-[#5C6B70]">
              <strong className="text-[#1F2A2E] font-medium">Origem:</strong> Lead convertido · <Link href={`/dashboard/crm/leads/${tutor.convertedFromLeadId}`} className="text-[#009AAC]">Ver lead →</Link>
            </div>
          )}

          </div>
        </div>
      </div>
      )}

      {tab === "ANIMAIS" && (
      <div className="mb-3">
        <div className="grid grid-cols-2 gap-3 items-start">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/dashboard/erp/pets/${pet.id}`} className="flex items-center gap-3 bg-white border border-[#E8E2D6] rounded-[13px] hover:border-[#009AAC] transition" style={{ padding: "13px 14px" }}>
              <div className="w-[46px] h-[46px] rounded-[14px] bg-[#E0F4F6] flex items-center justify-center text-[22px] shrink-0">{PET_EMOJI(pet.species)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#014D5E] font-medium truncate">{pet.name}</div>
                <div className="text-[12px] text-[#5C6B70] truncate">{[ESPECIE_LABEL(pet.species), pet.breed, PET_IDADE(pet.birthDate)].filter(Boolean).join(" · ")}</div>
                {pet.codigo ? <div className="text-[10px] text-[#8A989D]">#{pet.codigo}</div> : null}
              </div>
              <span className="text-[#8A989D] text-[18px]">›</span>
            </Link>
          ))}
          <button onClick={() => criarPetEAbrir(tutor.id)} className="flex items-center justify-center gap-2 border border-dashed border-[#E8E2D6] rounded-[13px] text-[#009AAC] hover:border-[#009AAC] transition text-[13px]" style={{ padding: "13px 14px", minHeight: "74px" }}>
            ➕ Adicionar Pet
          </button>
        </div>
      </div>
      )}

      {tab === "COMPRAS" && (
      <div className="mb-3">
        <div className="text-[12px] text-[#8A989D] mb-2">🐾 Toda compra é registrada no pet. Filtre por pet ou veja tudo. Valores ocultos — use o 👁️ no topo.</div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setComprasPet("")} className="text-[12px] px-3 py-1 rounded-full border" style={{ borderColor: comprasPet === "" ? "#009AAC" : "#E8E2D6", color: comprasPet === "" ? "#009AAC" : "#5C6B70", background: comprasPet === "" ? "#E0F4F6" : "#fff" }}>Todos</button>
          {pets.map((p) => (
            <button key={p.id} onClick={() => setComprasPet(p.name)} className="text-[12px] px-3 py-1 rounded-full border flex items-center gap-1" style={{ borderColor: comprasPet === p.name ? "#009AAC" : "#E8E2D6", color: comprasPet === p.name ? "#009AAC" : "#5C6B70", background: comprasPet === p.name ? "#E0F4F6" : "#fff" }}>{PET_EMOJI(p.species)} {p.name}</button>
          ))}
        </div>
        <div className="flex gap-2.5 mb-3 flex-wrap">
          <div className="bg-white border border-[#E8E2D6] rounded-[12px] flex-1 min-w-[130px]" style={{ padding: "11px 14px" }}>
            <div className="text-[11px] text-[#8A989D]">💰 Total {comprasPet ? `(${comprasPet})` : "gasto"}</div>
            <div className="text-[19px] font-medium text-[#014D5E]" >{money(comprasFiltradas.reduce((s, a) => s + (a.value || 0), 0))}</div>
          </div>
          <div className="bg-white border border-[#E8E2D6] rounded-[12px] flex-1 min-w-[130px]" style={{ padding: "11px 14px" }}>
            <div className="text-[11px] text-[#8A989D]">🛒 Nº de compras</div>
            <div className="text-[19px] font-medium text-[#014D5E]">{comprasFiltradas.length}</div>
          </div>
        </div>
        <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "6px 15px" }}>
          {comprasFiltradas.length === 0 && <p className="text-[12.5px] text-[#8A989D] py-3 text-center">Nenhuma compra registrada{comprasPet ? ` para ${comprasPet}` : ""} ainda.</p>}
          {comprasFiltradas.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: i < comprasFiltradas.length - 1 ? "1px solid #F0EBE0" : "none" }}>
              <span className="text-[11.5px] text-[#8A989D] w-[46px] shrink-0">{fmtDataBR(a.date).slice(0, 5)}</span>
              <span className="flex-1 text-[12.5px] text-[#1F2A2E] truncate">{a.description || a.type || "Atendimento"}</span>
              {a.pet?.name && <span className="text-[11px] text-[#8A989D] shrink-0">🐾 {a.pet.name}</span>}
              <span className="text-[12.5px] text-[#014D5E] font-medium shrink-0">{money(a.value)}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {tab === "GERAL" && (
      <>
        <div className="text-[11px] text-[#8A989D] uppercase tracking-wide mb-2 mt-1 px-1">💬 Relacionamento</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start mb-3">

        {/* Coluna esquerda — Ciclo + Score + Avaliações */}
        <div className="flex flex-col gap-2.5">
          {/* Situação do relacionamento (editável) */}
          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">♻️ Situação</h3>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {estagios.length > 0 ? (
                <select value={tutor.estadoRelacionamento || ""} onChange={(e) => saveEstagio(e.target.value)} disabled={savingEstagio} className="w-full bg-[#E0F4F6] text-[#009AAC] text-[12.5px] px-2 py-1.5 rounded-[9px] border border-[#bfe3e8]">
                  <option value="">{status.label} (padrão)</option>
                  {estagios.map((e) => (<option key={e} value={e}>{e}</option>))}
                </select>
              ) : (
                <div className="text-[13px] text-[#1F2A2E] font-medium">{HUMANIZAR(tutor.estadoRelacionamento) || status.label}</div>
              )}
              <p className="text-[11px] text-[#8A989D] mt-2">Estágio do cliente no relacionamento.</p>
            </div>
          </div>

          <div className="bg-white border border-[#E8E2D6] rounded-[13px]">
            <div className="flex items-center justify-between border-b border-[#F0EBE0]" style={{ padding: "11px 14px" }}>
              <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">⭐ Avaliações Google</h3>
              <button className="text-[11px] text-[#009AAC] hover:underline">+ Solicitar</button>
            </div>
            <div style={{ padding: "13px 14px" }}>
              <p className="text-[12px] text-[#8A989D]">Nenhuma avaliação solicitada</p>
            </div>
          </div>
        </div>

        {/* Coluna meio — Histórico de Interações (grande, cresce com uso) */}
        <div className="flex flex-col gap-2.5">
          {/* Histórico de Interações — observações pros próximos atendentes (cresce com uso) */}
          <AccordionCard icon={() => <span style={{fontSize:"14px"}}>🕓</span>} title="Histórico de interações" count={interacoes.length}>
            <div className="flex gap-2 mb-2">
              <select value={intTipo} onChange={(e) => setIntTipo(e.target.value)} className="border border-[#E8E2D6] rounded px-2 py-1 text-[11px]">
                <option value="NOTA">Nota</option>
                <option value="LIGACAO">Ligação</option>
                <option value="WHATSAPP_ENVIADO">WhatsApp</option>
                <option value="PRESENCIAL">Presencial</option>
              </select>
              <input value={intTexto} onChange={(e) => setIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addInteracao(); }} placeholder="Registrar o que foi feito..." className="flex-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
              <button onClick={addInteracao} disabled={savingInt} className="bg-[#009AAC] text-white px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50">{savingInt ? "..." : "Salvar"}</button>
            </div>
            {interacoes.length === 0 ? (
              <p className="text-center text-[12px] text-[#8A989D] py-4">Nenhuma interação ainda</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-72 overflow-auto">
                {interacoes.map((it: any) => (
                  <div key={it.id} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#009AAC]">{it.tipo}{it.canal ? ` · ${it.canal}` : ""}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#8A989D]">{new Date(it.createdAt).toLocaleDateString("pt-BR")} {new Date(it.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {editIntId !== it.id && (
                          <>
                            <button onClick={() => { setEditIntId(it.id); setEditIntTexto(it.texto || ""); }} className="text-[#8A989D] hover:text-[#009AAC]" title="Editar"><LuPencil className="w-3 h-3" /></button>
                            <button onClick={() => deleteInteracao(it.id)} className="text-[#8A989D] hover:text-[#b23b39]" title="Excluir"><LuTrash className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>
                    {editIntId === it.id ? (
                      <div className="flex gap-1 mt-1">
                        <input autoFocus value={editIntTexto} onChange={(e) => setEditIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditInteracao(); if (e.key === "Escape") setEditIntId(null); }} className="flex-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
                        <button onClick={saveEditInteracao} disabled={savingEditInt} className="bg-[#009AAC] text-white px-2 py-1 rounded text-[11px] disabled:opacity-50" title="Salvar"><LuCheck className="w-3 h-3" /></button>
                        <button onClick={() => setEditIntId(null)} className="border border-[#E8E2D6] px-2 py-1 rounded text-[11px]" title="Cancelar"><LuX className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#1F2A2E] mt-0.5">{it.texto}</p>
                    )}
                    {it.autor?.name && <p className="text-[10px] text-[#8A989D] mt-0.5">por {it.autor.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </AccordionCard>
        </div>

        {/* Coluna direita — Atendimentos + Sequências + Emails (compactos) */}
        <div className="flex flex-col gap-2.5">
          <AccordionCard icon={() => <span style={{fontSize:"14px"}}>⚡</span>} title="Sequências" badge={{ label: "Em breve", color: "#009AAC", bg: "#E0F4F6" }}>
            <div className="flex flex-col gap-1">
              <div className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] px-2 py-1.5 flex items-center justify-between text-[11px]">
                <span className="text-[#1F2A2E] truncate">📧 Boas-vindas</span>
                <span className="bg-[#FBF3E3] text-[#8a6400] text-[9px] px-1.5 py-0.5 rounded-full ml-1">pendente</span>
              </div>
              <div className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] px-2 py-1.5 flex items-center justify-between text-[11px]">
                <span className="text-[#1F2A2E] truncate">🗒️ Retorno 30d</span>
                <span className="bg-[#E0F4F6] text-[#009AAC] text-[9px] px-1.5 py-0.5 rounded-full ml-1">aguardando</span>
              </div>
            </div>
          </AccordionCard>

          <AccordionCard icon={() => <span style={{fontSize:"14px"}}>✉️</span>} title="E-mails" count={0}
            action={<button onClick={() => setEmailOpen(true)} className="text-[11px] text-[#009AAC] hover:underline">+ Enviar</button>}>
            <p className="text-center text-[12px] text-[#8A989D] py-2">Nenhum email</p>
          </AccordionCard>
        </div>
      </div>
      </>
      )}

      {fuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setFuOpen(false)}>
          <div className="bg-[#FBF9F4] rounded-[16px] w-full max-w-[360px] p-5" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-medium text-[#014D5E] mb-1">📞 Agendar follow-up</h3>
            <p className="text-[12px] text-[#8A989D] mb-3">Quando falar de novo com {tutor.name?.split(" ")[0] || "o cliente"}?</p>
            <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="w-full px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] bg-white" />
            <div className="flex justify-between items-center mt-4">
              {tutor.proximoFollowupAt ? <button onClick={async () => { await clearFollowup(); setFuOpen(false); }} className="text-[12px] text-[#b23b39]">Remover</button> : <span />}
              <div className="flex gap-2">
                <button onClick={() => setFuOpen(false)} className="text-[12.5px] px-3 py-2 rounded-[9px] text-[#5C6B70]">Cancelar</button>
                <button onClick={async () => { await saveFollowup(); setFuOpen(false); }} disabled={savingFu || !fuDate} className="text-[12.5px] px-4 py-2 rounded-[9px] text-white" style={{ background: "#009AAC", opacity: savingFu || !fuDate ? 0.5 : 1 }}>{savingFu ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        defaultTo={tutor.email || ""}
        defaultSubject={`Sobre ${tutor.name?.split(" ")[0] || "voce"}`}
        defaultHtml="<p>Ola!</p>"
        tutorId={tutor.id}
      />
      <ConfirmDeleteModal
        isOpen={delOpen}
        entityLabel="Tutor"
        itemName={tutor.name || "Tutor"}
        consequenceText="Os pets, atendimentos e historico vinculados tambem serao removidos."
        onConfirm={handleDelete}
        onClose={() => setDelOpen(false)}
      />
    </div>
  );
}
