"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Ficha do Pet  (pets/[id])
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo (GitHub Action diária).
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft, LuPencil, LuTrash, LuPlus, LuFlaskConical,
  LuPackage, LuMessageSquare, LuShare2, LuTag, LuClock, LuCalendar, LuX, LuCheck,
} from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import EncaminharBox from "@/components/inbox/EncaminharBox";
import PetProfilePanel from "@/components/profile/PetProfilePanel";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";

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
  pipelineClinicoEtapa?: string | null;
  pipelineFisioEtapa?: string | null;
  proximoFollowupAt?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string; contacts?: { number: string; isPrimary?: boolean; isWhatsApp?: boolean }[] };
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

const ATD_TIPO_LABEL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"CLINICA" | "PACOTES" | "EXAMES">("CLINICA");
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
  const [examFases, setExamFases] = useState<string[]>([]);
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
  const [pacForm, setPacForm] = useState<{ open: boolean; serviceId: string; total: string; jaFeitas: string }>({ open: false, serviceId: "", total: "4", jaFeitas: "0" });
  const [savingPac, setSavingPac] = useState(false);
  const [exames, setExames] = useState<{ id: string; data: any }[]>([]);
  const [exCat, setExCat] = useState<any[]>([]);
  const [exPick, setExPick] = useState("");
  const [savingEx, setSavingEx] = useState(false);
  const [vets, setVets] = useState<any[]>([]);
  const [atdOpen, setAtdOpen] = useState(false);
  const [savingAtd, setSavingAtd] = useState(false);
  const ATD0 = { date: "", userId: "", type: "CONSULTA", status: "Realizado", duration: "30", chiefComplaint: "", anamnesis: "", physicalExam: "", petWeight: "", temperature: "", diagnosis: "", conduct: "", prescription: "", examsRequested: "", nextReturnDate: "", paymentMethod: "", followUpNotes: "", notes: "" };
  const [atd, setAtd] = useState<any>(ATD0);
  const [items, setItems] = useState<any[]>([]);
  const [servicosCat, setServicosCat] = useState<any[]>([]);
  const [petInteracoes, setPetInteracoes] = useState<any[]>([]);
  const [intTipo, setIntTipo] = useState("NOTA");
  const [intTexto, setIntTexto] = useState("");
  const [savingInt, setSavingInt] = useState(false);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [verAtd, setVerAtd] = useState<any>(null);

  usePageTitle(pet ? pet.name : "Pet", pet?.tutor ? `Tutor: ${pet.tutor.name}` : undefined);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/pets/${petId}`);
    const d = await safeJson<Pet | null>(res, null);
    setPet(d);
    setLoading(false);
  }
  async function loadPipes() {
    try {
      const r = await fetch(`/api/pipelines`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []);
      const pick = (kw: string) => { const p = arr.find((x: any) => (x.nome || "").toLowerCase().includes(kw) && x.ativo !== false); return p ? (p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome) : []; };
      setPipes({ clinico: pick("cl\u00edn"), fisio: pick("fisio") });
      setExamFases(pick("exame"));
    } catch {}
  }
  useEffect(() => { if (petId) { load(); loadPipes(); loadPetColecoes(); loadCatalogos(); loadInteracoesPet(); loadAtendimentos(); } /* eslint-disable-next-line */ }, [petId]);

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
  async function saveClin() {
    setSavingClin(true);
    try {
      const body: any = { species: clinForm.species || undefined, breed: clinForm.breed || undefined, gender: clinForm.gender || undefined, sterilization: clinForm.sterilization || undefined, coat: clinForm.coat || undefined, coatColor: clinForm.coatColor || undefined, microchip: clinForm.microchip || undefined, medicalNotes: clinForm.medicalNotes || undefined, allergies: clinForm.allergies ? clinForm.allergies.split(",").map((x: string) => x.trim()).filter(Boolean) : [] };
      if (clinForm.birthDate) body.birthDate = new Date(clinForm.birthDate + "T12:00:00").toISOString();
      if (clinForm.weight !== "" && clinForm.weight != null) body.weight = Number(clinForm.weight);
      await patchPet(body); toast.success("Dados cl\u00ednicos atualizados"); setEditClin(false); await load();
    } catch { toast.error("Erro ao salvar"); } finally { setSavingClin(false); }
  }
  async function saveObs() {
    setSavingObs(true);
    try { await patchPet({ observations: obsVal }); toast.success("Observa\u00e7\u00e3o salva"); setEditObs(false); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingObs(false); }
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
  }
  async function addTag(texto: string) { setSavingTag(true); try { await listasAdd(`petetq_${petId}`, texto); toast.success("Etiqueta adicionada"); await loadPetColecoes(); } catch { toast.error("Erro (talvez já exista)"); } finally { setSavingTag(false); } }
  async function delTag(id: string) { try { await listasDel(id); await loadPetColecoes(); } catch { toast.error("Erro ao remover"); } }
  async function addCad(c: any) { setSavingCad(true); try { await listasAdd(`petcad_${petId}`, JSON.stringify({ cadenciaId: c.id, nome: c.nome || c.titulo, startedAt: new Date().toISOString() })); toast.success("Cadência iniciada"); setCadPick(false); await loadPetColecoes(); } catch { toast.error("Erro"); } finally { setSavingCad(false); } }
  async function delCad(id: string) { try { await listasDel(id); toast.success("Cadência encerrada"); await loadPetColecoes(); } catch { toast.error("Erro"); } }
  async function addPacote() {
    const srv = fisioSrv.find((s: any) => String(s.id) === pacForm.serviceId);
    if (!srv) { toast.error("Escolha um serviço de fisioterapia"); return; }
    const total = Number(pacForm.total) || 0; if (total <= 0) { toast.error("Informe o total de sessões"); return; }
    setSavingPac(true);
    try { await listasAdd(`petpac_${petId}`, JSON.stringify({ serviceId: srv.id, nome: srv.nome || srv.titulo || srv.descricao, total, used: Math.min(Math.max(Number(pacForm.jaFeitas) || 0, 0), total), createdAt: new Date().toISOString() })); toast.success("Pacote criado"); setPacForm({ open: false, serviceId: "", total: "4", jaFeitas: "0" }); await loadPetColecoes(); try { await patchPet({ pipelineFisioEtapa: "Pacote em andamento" }); await load(); } catch {} } catch { toast.error("Erro ao criar pacote"); } finally { setSavingPac(false); }
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
        body.items = itensValidos.map((it: any) => ({ ...(it.servicoId ? { servicoId: it.servicoId } : {}), ...(it.descricao ? { descricao: it.descricao } : {}), ...(it.executorUserId ? { executorUserId: it.executorUserId } : {}), quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, custoUnitario: Number(it.custoUnitario) || 0, valorTotal: (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), ...(it.comissaoValor ? { comissaoTipo: "PERCENTUAL", comissaoValor: Number(it.comissaoValor) } : {}) }));
        body.value = body.items.reduce((sm: number, it: any) => sm + (it.valorTotal || 0), 0);
      }
      const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Atendimento registrado"); setAtdOpen(false); setAtd(ATD0); setItems([]); await load(); await loadAtendimentos();
    } catch { toast.error("Erro ao registrar atendimento"); } finally { setSavingAtd(false); }
  }
  function addItem() { setItems(prev => [...prev, { servicoId: "", descricao: "", quantidade: 1, valorUnitario: 0, custoUnitario: 0, executorUserId: "", comissaoValor: 0 }]); }
  function updItem(i: number, patch: any) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function rmItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function pickServico(i: number, servicoId: string) { const sv = servicosCat.find((x: any) => x.id === servicoId); updItem(i, { servicoId, descricao: sv?.nome || "", valorUnitario: sv?.valorPadrao ?? 0, custoUnitario: sv?.custoPadrao ?? 0 }); }
  async function loadInteracoesPet() { try { const r = await fetch(`/api/interacoes?petId=${petId}&limit=100`, { cache: "no-store" }); const d = await r.json(); setPetInteracoes(Array.isArray(d) ? d : (d.interacoes || d.data || [])); } catch {} }
  async function addInteracaoPet() { if (!intTexto.trim()) { toast.error("Escreva algo"); return; } setSavingInt(true); try { const r = await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tipo: intTipo, texto: intTexto.trim(), canal: "Sistema" }) }); if (!r.ok) throw new Error(); toast.success("Registrado"); setIntTexto(""); await loadInteracoesPet(); } catch { toast.error("Erro ao registrar"); } finally { setSavingInt(false); } }
  async function loadAtendimentos() { try { const r = await fetch(`/api/appointments?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.appointments || d.data || []); setAtendimentos(arr.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())); } catch {} }
  async function abrirAtd(id: string) { try { const a = await fetch(`/api/appointments/${id}`, { cache: "no-store" }).then(r => r.json()); setVerAtd(a); } catch { toast.error("Erro ao abrir atendimento"); } }

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

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard/erp/pets" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#e6f6f8", color: "#009AAC" }}>
              {pet.avatar ? <img src={pet.avatar} alt={pet.name} className="w-12 h-12 rounded-full object-cover" /> : <PetIcon species={pet.species} size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {editName ? (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditName(false); }}
                      className="text-xl font-bold px-2 py-0.5 border rounded-lg"
                      style={{ color: "#014D5E", borderColor: "#009AAC" }}
                    />
                    <button onClick={saveName} disabled={savingName} className="p-1 rounded-lg text-white disabled:opacity-50" style={{ background: "#009AAC" }} title="Salvar">
                      <LuCheck size={14} />
                    </button>
                    <button onClick={() => setEditName(false)} className="p-1 rounded-lg border" style={{ borderColor: "#E8DFC8", color: "#64748b" }} title="Cancelar">
                      <LuX size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 group">
                    <h2 className="text-xl font-bold" style={{ color: "#014D5E" }}>{pet.name}</h2>
                    <button onClick={() => { setNameVal(pet.name || ""); setEditName(true); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#009AAC]" title="Editar nome">
                      <LuPencil size={13} />
                    </button>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#eef2f4", color: "#64748b" }}>
                  {speciesLabel(pet.species)}
                </span>
                {pet.birthDate && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#eef2f4", color: "#64748b" }}>
                    {ageFromBirth(pet.birthDate)}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                  {pipelineClinico}
                </span>
              </div>
              {pet.tutor && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Tutor: <Link href={`/dashboard/erp/tutores/${pet.tutorId}`} className="hover:underline" style={{ color: "#009AAC" }}>{pet.tutor.name}</Link>
                  {tutorWhats && <span> · {tutorWhats}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tutorWhats && (
              <a
                href={`https://wa.me/${tutorWhats.replace(/\D/g, "")}`}
                target="_blank" rel="noopener"
                className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
                style={{ borderColor: "#22C55E", color: "#16a34a" }}
              >
                <LuMessageSquare size={14} /> WhatsApp
              </a>
            )}
            <EncaminharBox tipo="pet" id={petId} nome={pet?.name || ""} onChange={loadInteracoesPet} />
            <button
              onClick={() => setDelOpen(true)}
              className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
              style={{ borderColor: "#fecaca", color: "#ef4444" }}
            >
              <LuTrash size={14} /> Excluir
            </button>
          </div>
        </div>
      </div>

      {/* Sobre (1 linha) */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92611a" }}>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">💭 Sobre {pet.name}:</span>
              <button onClick={() => { setObsVal(pet.observations || ""); setEditObs(v => !v); }} className="text-xs whitespace-nowrap" style={{ color: "#009AAC" }}>{editObs ? "Fechar" : "Editar"}</button>
            </div>
            {editObs ? (
              <div className="mt-2">
                <textarea value={obsVal} onChange={(e) => setObsVal(e.target.value)} maxLength={140} rows={2} placeholder="Apelido, comportamento, medo, preferência (até 140)" className="w-full px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#fde68a", color: "#0E2244" }} />
                <div className="flex gap-2 mt-1">
                  <button onClick={saveObs} disabled={savingObs} className="px-3 py-1 rounded-lg text-xs text-white" style={{ background: "#009AAC" }}>{savingObs ? "..." : "Salvar"}</button>
                  <button onClick={() => setEditObs(false)} className="px-3 py-1 rounded-lg text-xs border" style={{ borderColor: "#fde68a", color: "#92611a" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <span> {pet.observations || <span className="italic opacity-70">Adicionar algo que vale lembrar sobre o pet — apelido, comportamento, medo, preferência (até 140 caracteres).</span>}</span>
            )}
          </div>
      </div>

      {/* Etiquetas (linha) */}
      <div className="max-w-7xl mx-auto px-6 pt-3">
          <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0E2244" }}>
                <LuTag size={14} /> Etiquetas
              </h3>
              <button onClick={() => setTagsOpen(o => !o)} className="text-xs flex items-center gap-1" style={{ color: "#009AAC" }}>
                <LuPlus size={12} /> Adicionar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {petTags.length === 0 && <span className="text-sm text-gray-400">Sem etiquetas. Use pra agrupar pets por temperamento, restrição, dieta, etc.</span>}
              {petTags.map(t => { const tpl = tagTpls.find((x: any) => x.texto === t.texto); const cor = tpl?.cor || "#009AAC"; return (
                <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>● {t.texto}<button onClick={() => delTag(t.id)} title="Remover" className="font-bold hover:opacity-60">×</button></span>
              ); })}
            </div>
            {tagsOpen && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                {tagTpls.filter((t: any) => !petTags.some(p => p.texto === t.texto)).length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhuma etiqueta de Pet disponível. Cadastre em Configurações → Etiquetas.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tagTpls.filter((t: any) => !petTags.some(p => p.texto === t.texto)).map((t: any) => (
                      <button key={t.texto} disabled={savingTag} onClick={() => addTag(t.texto)} className="text-[11px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* 3 colunas: Clínica/Pacotes/Exames | Pipelines+Cadência | Painel do pet */}
      <div className="max-w-7xl mx-auto px-6 pt-3 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="space-y-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex border-b" style={{ borderColor: "#E8DFC8" }}>
              {(
                [
                  { k: "CLINICA", label: "Clínica" },
                  { k: "PACOTES", label: "Pacotes" },
                  { k: "EXAMES", label: "Exames" },
                ] as const
              ).map(t => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="flex-1 px-4 py-3 text-sm font-medium border-b-2 transition"
                  style={{
                    borderColor: tab === t.k ? "#009AAC" : "transparent",
                    color: tab === t.k ? "#009AAC" : "#6B7280",
                    background: tab === t.k ? "#f6fdfd" : "transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          {tab === "CLINICA" && (
            <div className="p-5">
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Dados Clínicos</h3>
                    <button onClick={() => { setClinForm({ species: pet.species || "", breed: pet.breed || "", gender: pet.gender || "", sterilization: pet.sterilization || "", birthDate: pet.birthDate ? String(pet.birthDate).slice(0, 10) : "", weight: pet.weight ?? "", coat: pet.coat || "", coatColor: pet.coatColor || "", microchip: pet.microchip || "", allergies: (pet.allergies || []).join(", "), medicalNotes: pet.medicalNotes || "" }); setEditClin(v => !v); }} className="text-xs flex items-center gap-1" style={{ color: "#009AAC" }}>
                      <LuPencil size={12} /> {editClin ? "Fechar" : "Editar"}
                    </button>
                  </div>
                  {editClin && (
                    <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div><label className="text-gray-500">Espécie</label><select value={clinForm.species ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, species: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }}><option value="">—</option>{["CANINE", "FELINE", "BIRD", "RODENT", "REPTILE", "OTHER"].map(sp => <option key={sp} value={sp}>{speciesLabel(sp)}</option>)}</select></div>
                      <div><label className="text-gray-500">Raça</label><input value={clinForm.breed ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, breed: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Sexo</label><select value={clinForm.gender ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, gender: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }}><option value="">—</option><option value="MALE">Macho</option><option value="FEMALE">Fêmea</option><option value="OTHER">Outro</option></select></div>
                      <div><label className="text-gray-500">Esterilização</label><input value={clinForm.sterilization ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, sterilization: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Nascimento</label><input type="date" value={clinForm.birthDate ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, birthDate: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Peso (kg)</label><input type="number" step="0.1" value={clinForm.weight ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, weight: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Pelagem</label><input value={clinForm.coat ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, coat: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Cor</label><input value={clinForm.coatColor ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, coatColor: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div><label className="text-gray-500">Microchip</label><input value={clinForm.microchip ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, microchip: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div className="col-span-2 md:col-span-3"><label className="text-gray-500">Alergias (vírgula)</label><input value={clinForm.allergies ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, allergies: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div className="col-span-2 md:col-span-3"><label className="text-gray-500">Notas médicas</label><textarea value={clinForm.medicalNotes ?? ""} onChange={(e) => setClinForm((f: any) => ({ ...f, medicalNotes: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} /></div>
                      <div className="col-span-2 md:col-span-3 flex gap-2"><button onClick={saveClin} disabled={savingClin} className="px-3 py-1 rounded text-white" style={{ background: "#009AAC" }}>{savingClin ? "Salvando..." : "Salvar"}</button><button onClick={() => setEditClin(false)} className="px-3 py-1 rounded border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <Field label="Espécie" value={speciesLabel(pet.species)} />
                    <Field label="Raça" value={pet.breed} />
                    <Field label="Sexo" value={genderLabel(pet.gender)} />
                    <Field label="Esterilização" value={
                      !pet.sterilization ? "—" :
                      pet.sterilization.toLowerCase().includes("steril") || pet.sterilization.toLowerCase().includes("castr") ? "Sim" :
                      pet.sterilization.toLowerCase().includes("not") ? "Não" :
                      pet.sterilization
                    } />
                    <Field label="Idade" value={ageFromBirth(pet.birthDate)} />
                    <Field label="Peso" value={pet.weight ? `${pet.weight} kg` : null} />
                    <Field label="Pelagem" value={pet.coat} />
                    <Field label="Cor" value={pet.coatColor} />
                    <Field label="Microchip" value={pet.microchip} />
                  </div>
                </section>
            </div>
          )}
            {tab === "PACOTES" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Pacotes de Sessões de {pet.name}</h3>
                  <button onClick={() => setPacForm(f => ({ ...f, open: !f.open }))} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>
                    <LuPackage size={12} /> Criar Pacote
                  </button>
                </div>
                {pacForm.open && (
                  <div className="border rounded-xl p-4 mb-3 flex flex-wrap items-end gap-2" style={{ borderColor: "#E8DFC8" }}>
                    <div className="flex-1 min-w-[180px]"><label className="text-xs text-gray-500">Serviço de fisioterapia</label>
                      <select value={pacForm.serviceId} onChange={(e) => setPacForm(f => ({ ...f, serviceId: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8" }}>
                        <option value="">— selecionar —</option>
                        {fisioSrv.map((srv: any) => <option key={srv.id} value={srv.id}>{srv.nome || srv.titulo || srv.descricao}</option>)}
                      </select>
                    </div>
                    <div className="w-20"><label className="text-xs text-gray-500">Total</label><input type="number" min="1" value={pacForm.total} onChange={(e) => setPacForm(f => ({ ...f, total: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8" }} /></div>
                    <div className="w-24"><label className="text-xs text-gray-500">Já feitas</label><input type="number" min="0" value={pacForm.jaFeitas} onChange={(e) => setPacForm(f => ({ ...f, jaFeitas: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-xs" style={{ borderColor: "#1D9E75", color: "#0F6E56" }} /></div>
                    <button onClick={addPacote} disabled={savingPac} className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "#009AAC" }}>{savingPac ? "..." : "Criar"}</button>
                  </div>
                )}
                {pacotes.length === 0 ? (
                  <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>Nenhum pacote criado ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {pacotes.map(p => { const used = p.data.used || 0; const total = p.data.total || 0; const done = used >= total; return (
                      <div key={p.id} className="border rounded-xl p-3" style={{ borderColor: done ? "#0F6E56" : (total > 1 && used === total - 1 ? "#BA7517" : "#E8DFC8"), background: done ? "#F3FBF7" : "#fff" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: "#0E2244" }}>{done ? "🏆 " : "🐾 "}{p.data.nome}</span>
                          <button onClick={() => delPacote(p.id)} className="text-xs" style={{ color: "#ef4444" }}>Excluir</button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from({ length: Math.min(total, 30) }).map((_, i) => <span key={i} style={{ fontSize: "15px" }} title={`Sessão ${i + 1}`}>{i < used ? "🐾" : "⚪"}</span>)}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full transition-all" style={{ width: `${total ? Math.min(100, (used / total) * 100) : 0}%`, background: done ? "#0F6E56" : "#009AAC" }} /></div>
                          <span className="text-xs font-medium" style={{ color: done ? "#0F6E56" : "#0E2244" }}>{used}/{total}</span>
                          <button onClick={() => usarSessao(p)} disabled={done} className="px-2 py-1 rounded-lg text-xs border disabled:opacity-40" style={{ borderColor: "#E8DFC8", color: "#009AAC" }}>{done ? "🎉 Concluído" : "+1 sessão"}</button>
                        </div>
                        {!done && total > 1 && used === total - 1 && <p className="text-[11px] mt-2" style={{ color: "#BA7517" }}>⏳ Penúltima sessão — avaliar renovação com o cliente.</p>}
                        {done && <p className="text-[11px] mt-2" style={{ color: "#0F6E56" }}>🎉 Pacote concluído! Criamos um lembrete pra verificar renovação.</p>}
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            )}
            {tab === "EXAMES" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Exames e Serviços Externos</h3>
                  <div className="flex items-center gap-2">
                    <input list="exames-catalogo" value={exPick} onChange={(e) => setExPick(e.target.value)} placeholder="Buscar exame..." className="px-2 py-1.5 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8", minWidth: "180px" }} />
                    <datalist id="exames-catalogo">{exCat.slice(0, 1000).map((e: any, i: number) => <option key={i} value={e.nome || e.titulo || e.descricao} />)}</datalist>
                    <button onClick={addExame} disabled={savingEx} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuFlaskConical size={12} /> {savingEx ? "..." : "Solicitar"}</button>
                  </div>
                </div>
                {exames.length === 0 ? (
                  <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>Nenhum exame ou serviço externo registrado.</div>
                ) : (
                  <div className="space-y-2">
                    {exames.map(x => (
                      <div key={x.id} className="border rounded-xl p-3 flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
                        <div>
                          <span className="text-sm font-medium" style={{ color: "#0E2244" }}>{x.data.nome}</span>
                          <span className="text-xs text-gray-400 ml-2">{x.data.date ? new Date(x.data.date).toLocaleDateString("pt-BR") : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={x.data.status || ""} onChange={(e) => updExameStatus(x.id, x.data, e.target.value)} className="text-[11px] px-2 py-1 border rounded-lg" style={{ borderColor: "#E8DFC8", color: "#00798A" }}>
                            {x.data.status && !examFases.includes(x.data.status) && <option value={x.data.status}>{x.data.status}</option>}
                            {examFases.length === 0 && <option value="Solicitado">Solicitado</option>}
                            {examFases.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <button onClick={() => delExame(x.id)} className="text-xs" style={{ color: "#ef4444" }}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
          <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                <section>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#0E2244" }}>Pipelines do Pet</h3>
                  <div className="border rounded-xl divide-y" style={{ borderColor: "#E8DFC8" }}>
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <span className="font-semibold text-xs tracking-wide" style={{ color: "#0E2244" }}>CLÍNICO — TRATAMENTO</span>
                      <select value={pet.pipelineClinicoEtapa || ""} onChange={(e) => savePipe("pipelineClinicoEtapa", e.target.value)} disabled={savingPipe} className="px-2 py-1 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8" }}>
                        <option value="">— selecionar —</option>
                        {pet.pipelineClinicoEtapa && !pipes.clinico.includes(pet.pipelineClinicoEtapa) && <option value={pet.pipelineClinicoEtapa}>{pet.pipelineClinicoEtapa}</option>}
                        {pipes.clinico.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <span className="font-semibold text-xs tracking-wide" style={{ color: "#0E2244" }}>FISIOTERAPIA</span>
                      <select value={pet.pipelineFisioEtapa || ""} onChange={(e) => savePipe("pipelineFisioEtapa", e.target.value)} disabled={savingPipe} className="px-2 py-1 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8" }}>
                        <option value="">— selecionar —</option>
                        {pet.pipelineFisioEtapa && !pipes.fisio.includes(pet.pipelineFisioEtapa) && <option value={pet.pipelineFisioEtapa}>{pet.pipelineFisioEtapa}</option>}
                        {pipes.fisio.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
          </div>
          <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#0E2244" }}>
                    <LuClock size={14} /> Cadência de acompanhamento
                  </h3>
                  <div className="border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                    {cadAtivas.length === 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Nenhuma cadência ativa.</span>
                        <button onClick={() => setCadPick(v => !v)} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5" style={{ borderColor: "#E8DFC8", color: "#009AAC" }}><LuPlus size={12} /> Iniciar cadência</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cadAtivas.map(c => (
                          <div key={c.id} className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: "#0E2244" }}>{c.data?.nome || "Cadência"} <span className="text-xs text-gray-400">· desde {c.data?.startedAt ? new Date(c.data.startedAt).toLocaleDateString("pt-BR") : "—"}</span></span>
                            <button onClick={() => delCad(c.id)} className="text-xs" style={{ color: "#ef4444" }}>Encerrar</button>
                          </div>
                        ))}
                        <button onClick={() => setCadPick(v => !v)} className="text-xs flex items-center gap-1" style={{ color: "#009AAC" }}><LuPlus size={12} /> Iniciar outra</button>
                      </div>
                    )}
                    {cadPick && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5" style={{ borderColor: "#F0EBE0" }}>
                        {cadOpts.length === 0 ? <p className="text-xs text-gray-400">Nenhuma cadência cadastrada em Configurações.</p> :
                          cadOpts.map((c: any) => (<button key={c.id} disabled={savingCad} onClick={() => addCad(c)} className="text-[11px] px-2 py-1 rounded-lg border disabled:opacity-50" style={{ borderColor: "#E8DFC8", color: "#009AAC" }}>+ {c.nome || c.titulo}</button>))}
                      </div>
                    )}
                  </div>
                </section>
          </div>
        </div>

        <div className="space-y-4">
          <PetProfilePanel petId={pet.id} />
        </div>
      </div>

      {/* Follow-up — linha toda */}
      <div className="max-w-7xl mx-auto px-6 pt-3">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#0E2244" }}>
                    <LuCalendar size={14} /> Follow-up
                  </h3>
                  <div className="border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                    {pet.proximoFollowupAt ? (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: "#0E2244" }}><LuCalendar size={12} className="inline" /> {new Date(pet.proximoFollowupAt).toLocaleDateString("pt-BR")}</span>
                        <button onClick={clearFu} className="text-xs" style={{ color: "#ef4444" }}>Remover</button>
                      </div>
                    ) : <p className="text-sm text-gray-400 mb-2">Sem follow-up agendado</p>}
                    <div className="flex gap-2">
                      <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="flex-1 px-2 py-1.5 border rounded-lg text-xs" style={{ borderColor: "#E8DFC8" }} />
                      <button onClick={saveFu} disabled={savingFu} className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "#009AAC" }}>{savingFu ? "..." : "Agendar"}</button>
                    </div>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "#f0e8d4" }}>
                      <div className="flex items-center gap-1.5 mb-2"><span style={{ fontSize: "13px" }}>💬</span><h4 className="text-xs font-semibold" style={{ color: "#0E2244" }}>Interações <span className="text-[10px] text-gray-400">({petInteracoes.length})</span></h4></div>
                      <div className="flex gap-1.5 mb-2">
                        <select value={intTipo} onChange={(e) => setIntTipo(e.target.value)} className="border rounded px-1.5 py-1 text-[11px]" style={{ borderColor: "#E8DFC8" }}><option value="NOTA">Nota</option><option value="LIGACAO">Ligação</option><option value="WHATSAPP_ENVIADO">WhatsApp</option><option value="PRESENCIAL">Presencial</option></select>
                        <input value={intTexto} onChange={(e) => setIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addInteracaoPet(); }} placeholder="Registrar..." className="flex-1 min-w-0 border rounded px-2 py-1 text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                        <button onClick={addInteracaoPet} disabled={savingInt} className="text-white px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50" style={{ background: "#009AAC" }}>{savingInt ? "..." : "+"}</button>
                      </div>
                      {petInteracoes.length === 0 ? <p className="text-center text-[11px] text-gray-400 py-2">Nenhuma interação ainda</p> : (
                        <div className="flex flex-col gap-1.5 max-h-60 overflow-auto">
                          {petInteracoes.map((it: any) => (
                            <div key={it.id} className="bg-[#fbfaf6] rounded px-2.5 py-1.5">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-medium" style={{ color: "#00798A" }}>{it.tipo}{it.canal ? ` · ${it.canal}` : ""}</span><span className="text-[10px] text-gray-400">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</span></div>
                              <p className="text-[11px] mt-0.5" style={{ color: "#0E2244" }}>{it.texto}</p>
                              {it.autor?.name && <p className="text-[10px] text-gray-400 mt-0.5">por {it.autor.name}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
        </div>
      </div>

      {/* Histórico de Atendimentos — linha toda */}
      <div className="max-w-7xl mx-auto px-6 pt-3">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Histórico de Atendimentos</h3>
                    <button onClick={() => { setAtd(ATD0); setItems([]); setAtdOpen(true); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>
                      <LuPlus size={12} /> Novo Atendimento
                    </button>
                  </div>
                  {atendimentos.length === 0 ? (
                    <div className="border rounded-xl p-5 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>Nenhum atendimento registrado.</div>
                  ) : (
                    <div className="space-y-2">
                      {atendimentos.map((a: any) => (
                        <button key={a.id} onClick={() => abrirAtd(a.id)} className="w-full text-left border rounded-xl px-3 py-2 hover:bg-gray-50/60 flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
                          <div>
                            <div className="text-sm font-medium" style={{ color: "#0E2244" }}>{ATD_TIPO_LABEL(a.type)} <span className="text-[11px] text-gray-400">{new Date(a.date).toLocaleDateString("pt-BR")}</span></div>
                            <div className="text-[11px] text-gray-500">{a.user?.name || "—"}{a.chiefComplaint ? ` · ${a.chiefComplaint}` : ""}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium" style={{ color: "#0F6E56" }}>{Number(a.value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                            <div className="text-[10px] text-gray-400">{a.status || ""}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-3 pb-5">
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/dashboard/erp/tutores/${pet.tutorId}`}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm border flex items-center justify-center gap-2"
              style={{ borderColor: "#E8DFC8", color: "#475569" }}
            >
              Ficha do Tutor <LuArrowLeft size={14} className="rotate-180" />
            </Link>
          </div>
      </div>

      {atdOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10" onClick={() => setAtdOpen(false)}>
          <div className="bg-white rounded-2xl w-[660px] max-w-[94vw] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: "#0E2244" }}>Novo Atendimento — {pet.name}</h2>
              <button onClick={() => setAtdOpen(false)} className="text-gray-400 hover:text-gray-600"><LuX size={16} /></button>
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dados básicos</div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div><label className="text-gray-500">Data e hora *</label><input type="datetime-local" value={atd.date} onChange={(e) => setAtd((a: any) => ({ ...a, date: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Tipo</label><select value={atd.type} onChange={(e) => setAtd((a: any) => ({ ...a, type: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}>{[["CONSULTA", "Consulta"], ["RETORNO", "Retorno"], ["AVALIACAO", "Avaliação"], ["EMERGENCIA", "Emergência"], ["PROCEDIMENTO", "Procedimento"], ["VACINACAO", "Vacinação"], ["CIRURGIA", "Cirurgia"], ["SESSAO_FISIO", "Sessão de fisio"], ["OUTRO", "Outro"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><label className="text-gray-500">Profissional responsável *</label><select value={atd.userId} onChange={(e) => setAtd((a: any) => ({ ...a, userId: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}><option value="">Selecionar...</option>{vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><label className="text-gray-500">Status</label><select value={atd.status} onChange={(e) => setAtd((a: any) => ({ ...a, status: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}>{["Realizado", "Agendado", "Cancelado", "Faltou"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="text-gray-500">Duração (min)</label><input type="number" value={atd.duration} onChange={(e) => setAtd((a: any) => ({ ...a, duration: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Anamnese e exame</div>
            <div className="space-y-2 text-xs">
              <div><label className="text-gray-500">Motivo / queixa principal</label><input value={atd.chiefComplaint} onChange={(e) => setAtd((a: any) => ({ ...a, chiefComplaint: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Anamnese</label><textarea value={atd.anamnesis} onChange={(e) => setAtd((a: any) => ({ ...a, anamnesis: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Exame físico</label><textarea value={atd.physicalExam} onChange={(e) => setAtd((a: any) => ({ ...a, physicalExam: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-gray-500">Peso do pet (kg)</label><input type="number" step="0.1" value={atd.petWeight} onChange={(e) => setAtd((a: any) => ({ ...a, petWeight: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-gray-500">Temperatura (°C)</label><input type="number" step="0.1" value={atd.temperature} onChange={(e) => setAtd((a: any) => ({ ...a, temperature: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              </div>
              <div><label className="text-gray-500">Diagnóstico</label><textarea value={atd.diagnosis} onChange={(e) => setAtd((a: any) => ({ ...a, diagnosis: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Conduta</label><textarea value={atd.conduct} onChange={(e) => setAtd((a: any) => ({ ...a, conduct: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Prescrição</label><textarea value={atd.prescription} onChange={(e) => setAtd((a: any) => ({ ...a, prescription: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Exames solicitados</label><textarea value={atd.examsRequested} onChange={(e) => setAtd((a: any) => ({ ...a, examsRequested: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Serviços e valores</div>
            <div className="text-xs">
              <div className="hidden md:grid gap-1 text-[10px] text-gray-400 px-1 mb-1" style={{ gridTemplateColumns: "1fr 40px 64px 64px 1fr 48px 70px 22px" }}>
                <span>Serviço/descrição</span><span className="text-center">Qtd</span><span>Valor</span><span>Custo</span><span>Executado por</span><span className="text-center">Com.%</span><span className="text-right">Total</span><span></span>
              </div>
              {items.length === 0 && <p className="text-center text-gray-400 py-2">Nenhum serviço lançado.</p>}
              {items.map((it, i) => (
                <div key={i} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: "1fr 40px 64px 64px 1fr 48px 70px 22px" }}>
                  <input list="srvcat" value={it.descricao} onChange={(e) => { const nome = e.target.value; const sv = servicosCat.find((x: any) => x.nome === nome); if (sv) { pickServico(i, sv.id); } else { updItem(i, { descricao: nome, servicoId: "" }); } }} placeholder="Serviço..." className="px-1.5 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
                  <input type="number" value={it.quantidade} onChange={(e) => updItem(i, { quantidade: e.target.value })} className="px-1 py-1 border rounded text-center" style={{ borderColor: "#E8DFC8" }} />
                  <input type="number" value={it.valorUnitario} onChange={(e) => updItem(i, { valorUnitario: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
                  <input type="number" value={it.custoUnitario} onChange={(e) => updItem(i, { custoUnitario: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
                  <select value={it.executorUserId} onChange={(e) => updItem(i, { executorUserId: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }}><option value="">—</option>{vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  <input type="number" value={it.comissaoValor} onChange={(e) => updItem(i, { comissaoValor: e.target.value })} className="px-1 py-1 border rounded text-center" style={{ borderColor: "#E8DFC8" }} />
                  <span className="text-right tabular-nums text-[11px]">{((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  <button onClick={() => rmItem(i)} className="text-gray-400 hover:text-red-500"><LuX size={12} /></button>
                </div>
              ))}
              <datalist id="srvcat">{servicosCat.slice(0, 1000).map((sv: any) => <option key={sv.id} value={sv.nome} />)}</datalist>
              <button onClick={addItem} className="w-full mt-1 px-3 py-1.5 rounded-lg border border-dashed text-[11px]" style={{ borderColor: "#009AAC", color: "#00798A" }}>+ Adicionar serviço</button>
              {items.length > 0 && <div className="text-right text-sm font-medium mt-2" style={{ color: "#0E2244" }}>Total: {items.reduce((sm, it) => sm + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>}
            </div>

            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Pós-atendimento</div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-gray-500">Próximo retorno</label><input type="date" value={atd.nextReturnDate} onChange={(e) => setAtd((a: any) => ({ ...a, nextReturnDate: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
                <div><label className="text-gray-500">Forma de pagamento</label><select value={atd.paymentMethod} onChange={(e) => setAtd((a: any) => ({ ...a, paymentMethod: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}><option value="">Selecionar...</option>{["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Transferência", "Boleto"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <div><label className="text-gray-500">O que verificar com o cliente (guia pro próximo toque)</label><textarea value={atd.followUpNotes} onChange={(e) => setAtd((a: any) => ({ ...a, followUpNotes: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-gray-500">Observações</label><textarea value={atd.notes} onChange={(e) => setAtd((a: any) => ({ ...a, notes: e.target.value }))} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAtdOpen(false)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={criarAtendimento} disabled={savingAtd} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingAtd ? "Salvando..." : "Salvar atendimento"}</button>
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
                <div><span className="text-gray-400">Tipo:</span> {ATD_TIPO_LABEL(verAtd.type)}</div>
                <div><span className="text-gray-400">Status:</span> {verAtd.status || "—"}</div>
                <div><span className="text-gray-400">Profissional:</span> {verAtd.user?.name || "—"}</div>
                <div><span className="text-gray-400">Duração:</span> {verAtd.duration ? `${verAtd.duration} min` : "—"}</div>
                {verAtd.petWeight != null && <div><span className="text-gray-400">Peso:</span> {verAtd.petWeight} kg</div>}
                {verAtd.temperature != null && <div><span className="text-gray-400">Temp.:</span> {verAtd.temperature} °C</div>}
              </div>
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
            <div className="flex justify-end mt-4"><button onClick={() => setVerAtd(null)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button></div>
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
