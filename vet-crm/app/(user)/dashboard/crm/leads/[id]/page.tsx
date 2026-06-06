"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { SendEmailModal } from "@/components/email/SendEmailModal";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import {
  LuArrowLeft, LuStickyNote, LuTrash, LuPlus, LuSparkles, LuPhone} from "react-icons/lu";

const PIPELINE_STAGES = [
  "Aguardando triagem",
  "Lead novo",
  "Em qualificação",
  "Orçamento enviado",
  "Aguardando retorno",
  "Retomar contato",
  "Reaproximação",
  "Agendado",
  "Compareceu",
  "Perdido",
];

const SCRIPTS = {
  "Saudação": [
    "Oi! Aqui é o Empório do Pet 🐾 Como posso te ajudar?",
    "Olá! Tudo bem? Sou da equipe do Empório do Pet, fico feliz em te atender.",
  ],
  "Qualificação": [
    "Pra eu te orientar melhor, posso saber qual a idade do seu pet?",
    "Ele apresentou algum sintoma específico?",
  ],
  "Orçamento": [
    "Tenho uma proposta especial pra você. Posso te enviar o orçamento agora?",
    "Esse é o valor da consulta + procedimentos. Topa agendar?",
  ],
  "Reaproximação": [
    "Oi! Te mandei o orçamento ontem, quero entender melhor o que você está pensando.",
    "Sentimos sua falta! Que tal agendar uma visita de checkup pro seu pet?",
  ],
  "Fechamento": [
    "Posso agendar pra você ainda hoje?",
    "Tenho horário disponível amanhã. Posso reservar?",
  ]};

function getTemp(score: number) {
  if (score <= 40) return { label: "Frio", icon: "🧊", color: "#4d72a0", bg: "#E6F1FB" };
  if (score <= 70) return { label: "Morno", icon: "☕", color: "#B25C0A", bg: "#FBEED8" };
  return { label: "Quente", icon: "🔥", color: "#C2410C", bg: "#FFE2D2" };
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showScripts, setShowScripts] = useState(false);
  const [scriptCat, setScriptCat] = useState<keyof typeof SCRIPTS>("Saudação");
  const [pipeComercial, setPipeComercial] = useState<string[]>([]);
  const [fuDate, setFuDate] = useState("");
  const [savingFu, setSavingFu] = useState(false);
  const [leadTags, setLeadTags] = useState<{ id: string; texto: string }[]>([]);
  const [tagTpls, setTagTpls] = useState<any[]>([]);
  const [tagPicker, setTagPicker] = useState(false);
  const [savingTag, setSavingTag] = useState(false);

  const [qual, setQual] = useState({
    qualSituacaoPet: "",
    qualQueMaisIncomoda: "",
    qualTentouOutroVet: "",
    qualOQueMudaResolver: "",
    qualQuemDecide: ""});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      setLead(data);
      setQual({
        qualSituacaoPet: data.qualSituacaoPet || "",
        qualQueMaisIncomoda: data.qualQueMaisIncomoda || "",
        qualTentouOutroVet: data.qualTentouOutroVet || "",
        qualOQueMudaResolver: data.qualOQueMudaResolver || "",
        qualQuemDecide: data.qualQuemDecide || ""});
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setLoading(false); }
  };

  async function loadComercial() { try { const r = await fetch(`/api/pipelines`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []); const p = arr.find((x: any) => (x.escopo === "LEAD" || (x.nome || "").toLowerCase().includes("comercial")) && x.ativo !== false); if (p) setPipeComercial((p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome)); } catch {} }
  async function loadLeadTags() { try { const r = await fetch(`/api/listas?lista=leadtag_${id}`, { cache: "no-store" }); const d = await r.json(); const a = Array.isArray(d) ? d : (d.itens || d.data || []); setLeadTags(a.map((i: any) => ({ id: i.id, texto: i.valor }))); } catch {} }
  async function loadTagTpls() { try { const r = await fetch(`/api/etiquetas/templates`, { cache: "no-store" }); const d = await r.json(); const a = Array.isArray(d) ? d : (d.templates || d.data || []); setTagTpls(a.filter((t: any) => t.ativo !== false && (t.aplicaEm || []).includes("Lead"))); } catch {} }
  useEffect(() => { load(); loadComercial(); loadLeadTags(); loadTagTpls(); }, [id]);
  async function setStage(stage: string) {
    try {
      if (stage === "Compareceu") {
        const r = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
        const d = await r.json().catch(() => ({}));
        if (d?.tutorId) { toast.success("Lead convertido em cliente!"); router.push(`/dashboard/erp/tutores/${d.tutorId}`); return; }
      }
      const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineComercialEtapa: stage || null }) });
      if (!r.ok) throw new Error(String(r.status));
      toast.success(stage ? `Etapa: ${stage}` : "Etapa limpa");
      await load();
    } catch (e: any) { toast.error("Erro: " + (e?.message || "")); }
  }
  async function saveFu() { if (!fuDate) { toast.error("Escolha uma data"); return; } setSavingFu(true); try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date(fuDate + "T12:00:00").toISOString() }) }); if (!r.ok) throw new Error(); toast.success("Follow-up agendado"); setFuDate(""); await load(); } catch { toast.error("Erro ao agendar"); } finally { setSavingFu(false); } }
  async function clearFu() { try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) }); if (!r.ok) throw new Error(); toast.success("Follow-up removido"); await load(); } catch { toast.error("Erro"); } }
  async function addTagLead(texto: string) { setSavingTag(true); try { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `leadtag_${id}`, valor: texto }) }); if (!r.ok) throw new Error(); toast.success("Etiqueta adicionada"); setTagPicker(false); await loadLeadTags(); } catch { toast.error("Erro (talvez já exista)"); } finally { setSavingTag(false); } }
  async function delTagLead(tid: string) { try { const r = await fetch(`/api/listas/${tid}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await loadLeadTags(); } catch { toast.error("Erro ao remover"); } }

  const saveQualification = async () => {
    try {
      const res = await fetch(`/api/leads/${id}/qualification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qual)});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLead(data);
      toast.success("Qualificação salva!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
  };

  const changeStage = async (stage: string) => {
    try {
      const res = await fetch(`/api/leads/${id}/pipeline-stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage })});
      const data = await res.json();
      if (stage === "Compareceu" && data.tutorId) {
        toast.success("Lead convertido em cliente!");
        router.push(`/dashboard/erp/tutores/${data.tutorId}`);
      } else {
        toast.success(`Etapa mudou para "${stage}"`);
        load();
      }
    } catch (e: any) { toast.error("Erro: " + e.message); }
  };

  async function handleDelete() {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Lead removido");
      router.push("/dashboard/crm/leads");
    } catch (e: any) {
      toast.error("Erro ao remover: " + (e?.message || ""));
    }
    setDelOpen(false);
  }

  async function encaminharLead(destino: string) {
    try {
      const r = await fetch("/api/interacoes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ leadId: id, tipo: "ENCAMINHAMENTO", texto: `Encaminhado para: ${destino}`, canal: "Sistema" }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success(`Encaminhado para ${destino}`);
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    }
  }

  async function naoELead() {
    if (!window.confirm("Marcar este contato como 'não lead' e remover da lista?")) return;
    try {
      const r = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Removido da lista de leads");
      router.push("/dashboard/crm/leads");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    }
  }

  const convertNow = async () => {
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
      const data = await res.json();
      toast.success("Convertido!");
      if (data.tutorId) router.push(`/dashboard/erp/tutores/${data.tutorId}`);
    } catch (e: any) { toast.error("Erro: " + e.message); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;
  if (!lead) return <div className="p-6 text-center text-gray-500">Lead não encontrado</div>;

  const temp = getTemp(lead.currentScore || 0);
  const answered = Object.values(qual).filter((v) => v.trim().length > 0).length;
  const customFields = lead.customFields || {};
  const initials = (lead.name || "??").split(/\s+/).slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header com toolbar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/leads" className="bg-white border border-[#cfd8e0] rounded-lg p-1.5">
            <LuArrowLeft className="w-4 h-4 text-[#0E2244]" />
          </Link>
          <div className="w-11 h-11 rounded-full bg-[#FBEED8] text-[#8a6313] flex items-center justify-center font-medium">{initials}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl text-[#0E2244] font-medium">{lead.name || "Sem nome"}</h1>
              <span className="bg-[#E0F4F6] text-[#00798A] text-[11px] font-medium px-2 py-0.5 rounded-full">{lead.status}</span>
              <span style={{ background: temp.bg, color: temp.color }} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full">
                <span className="text-[11px]">{temp.icon}</span>{temp.label}
              </span>
            </div>
            <p className="text-[11px] text-[#5b6470]">{customFields.petName && `🐾 ${customFields.petName}`}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap relative">
          <button onClick={convertNow} className="bg-[#0F6E56] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <span style={{fontSize:"14px"}}>✓</span>Converter pra cliente
          </button>
          <button onClick={() => openWhatsAppMeta(lead.phone)} className="bg-white border border-[#009AAC] text-[#00798A] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
            <LuStickyNote className="w-3.5 h-3.5" />WhatsApp
          </button>
          <button onClick={() => setEmailOpen(true)} className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
            <span style={{fontSize:"14px"}}>✉️</span>Email
          </button>
          <button className="bg-white border border-[#cfd8e0] text-[#0C447C] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" onClick={() => encaminharLead("vet")}>
            <span style={{fontSize:"14px"}}>🩺</span>Com o vet
          </button>
          <button className="bg-white border border-[#cfd8e0] text-[#993556] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" onClick={() => encaminharLead("administração")}>
            <span style={{fontSize:"14px"}}>💼</span>Com a adm
          </button>
          <button onClick={() => changeStage("Resolver")} className="bg-white border border-[#cfd8e0] text-[#0F6E56] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
            <span style={{fontSize:"14px"}}>✓</span>Resolver
          </button>
          <button onClick={() => setShowScripts(!showScripts)} className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
            <span style={{fontSize:"14px"}}>📖</span>Scripts
          </button>
          <button onClick={naoELead} className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-3 py-1.5 rounded-lg text-xs">Não é lead</button>
          <button onClick={() => setDelOpen(true)} className="bg-[#fbe6e6] border border-[#f4baba] text-[#A32D2D] px-2.5 py-1.5 rounded-lg text-xs"><LuTrash className="w-3.5 h-3.5" /></button>

          {showScripts && (
            <div className="absolute right-0 top-12 z-50 w-80 bg-white border border-[#d8d0bc] rounded-xl shadow-lg p-3">
              <div className="flex gap-1 mb-2 flex-wrap">
                {(Object.keys(SCRIPTS) as Array<keyof typeof SCRIPTS>).map((cat) => (
                  <button key={cat} onClick={() => setScriptCat(cat)} className={`text-[11px] px-2 py-0.5 rounded ${scriptCat === cat ? "bg-[#009AAC] text-white" : "bg-[#f8f3e4] text-[#4d5a66]"}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {SCRIPTS[scriptCat].map((s, i) => (
                  <button key={i} onClick={() => { navigator.clipboard.writeText(s); toast.success("Copiado!"); }} className="text-left text-xs text-[#0E2244] bg-[#fbf6ea] hover:bg-[#FBEED8] p-2 rounded">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo (full width) */}
      <div className="bg-gradient-to-r from-[#E0F4F6] to-[#FBEED8] rounded-xl border border-[#b5dde2] p-4 mb-3">
        <div className="grid grid-cols-3 gap-5 items-start">
          <div>
            <div className="text-[10px] text-[#5b6470] tracking-wide font-medium mb-1">RESUMO DA CONVERSA</div>
            <div className="text-[11px] text-[#0E2244]"><strong className="font-medium">Qualificação:</strong> <span className="italic text-gray-500">{answered}/5 respondidas</span></div>
          </div>
          <div>
            <div className="text-[10px] text-[#5b6470] tracking-wide font-medium mb-1">SCORE DE QUALIFICAÇÃO</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#f0e8d4] rounded-full">
                <div style={{ width: `${lead.currentScore || 0}%`, background: temp.color }} className="h-full rounded-full" />
              </div>
              <span style={{ color: temp.color }} className="text-sm font-medium">{lead.currentScore || 0}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#5b6470] tracking-wide font-medium mb-1">ÚLTIMAS INTERAÇÕES</div>
            <div className="text-[11px] text-[#0E2244]">{customFields.resumoIA || lead.notes || "Sem registro"}</div>
          </div>
        </div>
      </div>

      {/* Qualificação destacada (em cima — falta preencher) */}
      <div className="bg-[#FFF8E1] border border-[#FCD194] border-l-[3px] border-l-[#BA7517] rounded-xl p-4 mb-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span style={{fontSize:"14px"}}>📋</span>
            <h3 className="text-sm text-[#0E2244] font-medium">Qualificação — preencha agora</h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${answered === 5 ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#FCE5C8] text-[#8A5A0F]"}`}>
              {answered === 5 ? "✓ Completa" : `⚠ ${answered}/5 respondidas`}
            </span>
          </div>
          <div className="text-[11px] text-[#8A5A0F]">+10 pontos por resposta · 5/5 desbloqueia <strong className="font-medium">Investigador</strong></div>
        </div>
        <div className="flex gap-1 mb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i < answered ? "bg-[#BA7517]" : "bg-[#BA7517]/20"}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["qualSituacaoPet", "1. Situação do pet hoje?"],
            ["qualQueMaisIncomoda", "2. O que mais incomoda?"],
            ["qualTentouOutroVet", "3. Já tentou outro vet?"],
            ["qualOQueMudaResolver", "4. O que muda ao resolver?"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-[#0E2244] font-medium mb-1">{label}</label>
              <input value={(qual as any)[key]} onChange={(e) => setQual({ ...qual, [key]: e.target.value })} placeholder="Resposta..." className="w-full bg-white border border-[#d8d0bc] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#009AAC]" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs text-[#0E2244] font-medium mb-1">5. Quem decide?</label>
            <input value={qual.qualQuemDecide} onChange={(e) => setQual({ ...qual, qualQuemDecide: e.target.value })} placeholder="Resposta..." className="w-full bg-white border border-[#d8d0bc] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#009AAC]" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={saveQualification} className="bg-[#BA7517] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Salvar respostas</button>
        </div>
      </div>

      {/* Score + Pipeline + Follow-up + Etiquetas (4 col) — sobe FU e Etiquetas do final */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <div className="flex items-center gap-2 mb-2"><span style={{fontSize:"14px"}}>🔥</span><h3 className="text-[12px] text-[#0E2244] font-medium">Score</h3></div>
          <div className="flex items-baseline gap-1 mb-1">
            <span style={{ color: temp.color }} className="text-3xl font-medium">{lead.currentScore || 0}</span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
          <span style={{ color: temp.color }} className="text-[10px] font-medium inline-flex items-center gap-1">{temp.icon}{temp.label}</span>
          <div className="relative h-1.5 bg-[#f0e8d4] rounded-full mt-2 mb-1">
            <div style={{ width: `${lead.currentScore || 0}%`, background: temp.color }} className="absolute left-0 top-0 bottom-0 rounded-full" />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>🧊</span><span>☕</span><span>🔥</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <div className="flex items-center gap-2 mb-2"><span style={{fontSize:"14px"}}>🌿</span><h3 className="text-[12px] text-[#0E2244] font-medium">Pipeline</h3></div>
          <select value={lead.pipelineComercialEtapa || ""} onChange={(e) => setStage(e.target.value)}
            className="w-full border border-[#009AAC] rounded px-2 py-1 text-[11px] text-[#0E2244] bg-white focus:outline-none mb-1">
            <option value="">— selecionar —</option>
            {lead.pipelineComercialEtapa && !(pipeComercial.length ? pipeComercial : PIPELINE_STAGES).includes(lead.pipelineComercialEtapa) && <option value={lead.pipelineComercialEtapa}>{lead.pipelineComercialEtapa}</option>}
            {(pipeComercial.length ? pipeComercial : PIPELINE_STAGES).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-[9px] text-gray-400">Compareceu vira cliente</p>
        </div>

        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] text-[#0E2244] font-medium">📅 Follow-up</h3>
          </div>
          {lead.proximoFollowupAt ? (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#0E2244]">{new Date(lead.proximoFollowupAt).toLocaleDateString("pt-BR")}</span>
              <button onClick={clearFu} className="text-[10px] text-[#A32D2D]">Remover</button>
            </div>
          ) : <p className="text-[11px] text-gray-400 mb-1.5">Sem follow-up agendado</p>}
          <div className="flex gap-1">
            <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="flex-1 min-w-0 border border-[#d8d0bc] rounded px-1.5 py-1 text-[10px]" />
            <button onClick={saveFu} disabled={savingFu} className="bg-[#009AAC] text-white px-2 py-1 rounded text-[10px] disabled:opacity-50">{savingFu ? "..." : "Agendar"}</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] text-[#0E2244] font-medium">🏷 Etiquetas</h3>
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            {leadTags.length === 0 && <span className="text-[10px] text-gray-400">Sem etiquetas</span>}
            {leadTags.map((t) => { const tpl = tagTpls.find((x: any) => x.texto === t.texto); const cor = tpl?.cor || "#009AAC"; return (
              <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>● {t.texto}<button onClick={() => delTagLead(t.id)} className="font-bold hover:opacity-60">×</button></span>
            ); })}
            <button onClick={() => setTagPicker(v => !v)} className="border border-dashed border-[#cfd8e0] text-gray-400 text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
          </div>
          {tagPicker && (
            <div className="mt-2 pt-2 border-t border-[#f0e8d4] flex flex-wrap gap-1">
              {tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).length === 0 ? <p className="text-[10px] text-gray-400">Nenhuma etiqueta de Lead. Cadastre em Configurações.</p> :
                tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).map((t: any) => (<button key={t.texto} disabled={savingTag} onClick={() => addTagLead(t.texto)} className="text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>))}
            </div>
          )}
        </div>
      </div>

      {/* 2 cards inferiores: Dados do Lead + Conquistas (FU e Etiquetas subiram pro topo) */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <h3 className="text-[11px] text-[#5b6470] tracking-wide font-medium mb-2">DADOS DO LEAD</h3>
          <div className="text-[11px] text-[#4d5a66] leading-loose">
            <div><LuPhone className="inline w-3 h-3 text-[#0C447C]" /> <span className="text-[#00798A]">{lead.phone || "—"}</span></div>
            <div><strong className="text-[#0E2244] font-medium">Canal:</strong> {lead.channel || "WhatsApp"}</div>
            <div><strong className="text-[#0E2244] font-medium">Serviço:</strong> {customFields.servicoInteresse || "—"}</div>
            <div><strong className="text-[#0E2244] font-medium">Valor:</strong> {customFields.valor ? `R$ ${customFields.valor}` : "—"}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#d8d0bc] p-3">
          <h3 className="text-[11px] text-[#5b6470] tracking-wide font-medium mb-2">CONQUISTAS · 3/8</h3>
          <div className="grid grid-cols-8 gap-1">
            <div className="aspect-square bg-[#E0F4F6] rounded flex items-center justify-center" title="Primeiro contato"><span style={{fontSize:"14px"}}>💬</span></div>
            <div className="aspect-square bg-[#E1F5EE] rounded flex items-center justify-center" title="WhatsApp ativo"><LuStickyNote className="w-3 h-3 text-[#0F6E56]" /></div>
            <div className="aspect-square bg-[#FFE2D2] rounded flex items-center justify-center text-xs" title="Quente">🔥</div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-[#f0e8d4] rounded flex items-center justify-center opacity-40"><span style={{fontSize:"14px"}}>🔒</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
