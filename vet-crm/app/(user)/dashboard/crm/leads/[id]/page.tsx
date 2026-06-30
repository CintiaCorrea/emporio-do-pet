"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { SendEmailModal } from "@/components/email/SendEmailModal";
import EncaminharBox from "@/components/inbox/EncaminharBox";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";

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

const MOTIVOS_PERDA = ["Escolheu outra clínica", "Preço/valor", "Distância", "Sem retorno do cliente", "Só queria informação", "Resolveu sozinho", "Outro"];

const CLASSIFICACOES: [string, string][] = [["Cliente", "Cliente"], ["Fornecedor", "Fornecedor"], ["Parceiro", "Parceiro"], ["Ex_cliente", "Ex-cliente"]];

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
  const [motivoPerda, setMotivoPerda] = useState("");
  const [motivoId, setMotivoId] = useState<string | null>(null);
  const [leadInteracoes, setLeadInteracoes] = useState<any[]>([]);
  const [intTipo, setIntTipo] = useState("NOTA");
  const [intTexto, setIntTexto] = useState("");
  const [savingInt, setSavingInt] = useState(false);
  const [classif, setClassif] = useState("Cliente");
  const [converting, setConverting] = useState(false);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLead(data);
      setQual({
        qualSituacaoPet: data.qualSituacaoPet || "",
        qualQueMaisIncomoda: data.qualQueMaisIncomoda || "",
        qualTentouOutroVet: data.qualTentouOutroVet || "",
        qualOQueMudaResolver: data.qualOQueMudaResolver || "",
        qualQuemDecide: data.qualQuemDecide || ""});
    } catch (e: any) {
      toast.error("Erro ao carregar o lead: " + e.message);
    } finally { setLoading(false); }
  };

  async function loadComercial() { try { const r = await fetch(`/api/pipelines`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.pipelines || d.data || []); const p = arr.find((x: any) => (x.escopo === "LEAD" || (x.nome || "").toLowerCase().includes("comercial")) && x.ativo !== false); if (p) setPipeComercial((p.estagios || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((e: any) => e.nome)); } catch { console.error("Falha ao carregar pipeline comercial"); } }
  async function loadLeadTags() { try { const r = await fetch(`/api/listas?lista=leadtag_${id}`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); const a = Array.isArray(d) ? d : (d.itens || d.data || []); setLeadTags(a.map((i: any) => ({ id: i.id, texto: i.valor }))); } catch { console.error("Falha ao carregar etiquetas do lead"); } }
  async function loadTagTpls() { try { const r = await fetch(`/api/etiquetas/templates`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); const a = Array.isArray(d) ? d : (d.templates || d.data || []); setTagTpls(a.filter((t: any) => t.ativo !== false && (t.aplicaEm || []).includes("Lead"))); } catch { console.error("Falha ao carregar templates de etiqueta"); } }
  async function loadMotivo() { try { const r = await fetch(`/api/listas?lista=leadperda_${id}`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); const a = Array.isArray(d) ? d : (d.itens || d.data || []); if (a[0]) { setMotivoPerda(a[0].valor || ""); setMotivoId(a[0].id); } else { setMotivoPerda(""); setMotivoId(null); } } catch { console.error("Falha ao carregar motivo de perda"); } }
  async function saveMotivo(m: string) {
    setMotivoPerda(m);
    try {
      if (!m && motivoId) { await fetch(`/api/listas/${motivoId}`, { method: "DELETE" }); setMotivoId(null); }
      else if (motivoId) { await fetch(`/api/listas/${motivoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: m }) }); }
      else if (m) { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `leadperda_${id}`, valor: m }) }); const d = await r.json(); if (d?.id) setMotivoId(d.id); }
      toast.success("Motivo salvo");
    } catch { toast.error("Erro ao salvar motivo"); }
  }
  useEffect(() => { load(); loadComercial(); loadLeadTags(); loadTagTpls(); loadLeadInteracoes(); loadMotivo(); }, [id]);

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
    } catch (e: any) { toast.error("Erro ao mudar etapa: " + (e?.message || "")); }
  }
  async function saveFu() { if (!fuDate) { toast.error("Escolha uma data"); return; } setSavingFu(true); try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date(fuDate + "T12:00:00").toISOString() }) }); if (!r.ok) throw new Error(); toast.success("Follow-up agendado"); setFuDate(""); await load(); } catch { toast.error("Erro ao agendar"); } finally { setSavingFu(false); } }
  async function clearFu() { try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) }); if (!r.ok) throw new Error(); toast.success("Follow-up removido"); await load(); } catch { toast.error("Erro"); } }
  async function addTagLead(texto: string) { setSavingTag(true); try { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `leadtag_${id}`, valor: texto }) }); if (!r.ok) throw new Error(); toast.success("Etiqueta adicionada"); setTagPicker(false); await loadLeadTags(); } catch { toast.error("Erro (talvez já exista)"); } finally { setSavingTag(false); } }
  async function delTagLead(tid: string) { try { const r = await fetch(`/api/listas/${tid}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await loadLeadTags(); } catch { toast.error("Erro ao remover"); } }
  async function loadLeadInteracoes() { try { const r = await fetch(`/api/interacoes?leadId=${id}&limit=100`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); setLeadInteracoes(Array.isArray(d) ? d : (d.interacoes || d.data || [])); } catch { console.error("Falha ao carregar interações do lead"); } }
  async function addLeadInteracao() { if (!intTexto.trim()) { toast.error("Escreva algo"); return; } setSavingInt(true); try { const r = await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, tipo: intTipo, texto: intTexto.trim(), canal: "Sistema" }) }); if (!r.ok) throw new Error(); toast.success("Registrado"); setIntTexto(""); await loadLeadInteracoes(); } catch { toast.error("Erro ao registrar"); } finally { setSavingInt(false); } }

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
    } catch (e: any) { toast.error("Erro ao salvar qualificação: " + e.message); }
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

  const convertNow = async (classificacao: string = "Cliente") => {
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classificacao }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const label = CLASSIFICACOES.find(([v]) => v === classificacao)?.[1] || "cliente";
      toast.success(`Convertido em ${label}!`);
      if (data.tutorId) router.push(`/dashboard/erp/tutores/${data.tutorId}`);
    } catch (e: any) { toast.error("Erro ao converter: " + e.message); } finally { setConverting(false); }
  };

  if (loading) return <div className="p-6 text-center text-[#8A989D]">Carregando...</div>;
  if (!lead) return <div className="p-6 text-center text-[#8A989D]">Lead não encontrado</div>;

  const temp = getTemp(lead.currentScore || 0);
  const answered = Object.values(qual).filter((v) => v.trim().length > 0).length;
  const customFields = lead.customFields || {};
  const initials = (lead.name || "??").split(/\s+/).slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();
  const stages = pipeComercial.length ? pipeComercial : PIPELINE_STAGES;

  const cardCls = "bg-white rounded-[12px] border border-[#E8E2D6] p-3";
  const h3Cls = "text-[12.5px] text-[#014D5E] font-medium flex items-center gap-1.5";
  const outlineBtn = "bg-white border border-[#E8E2D6] text-[#5C6B70] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-[#FBF9F4]";

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <Toaster position="top-right" />

      {/* Breadcrumb */}
      <div className="text-[12px] text-[#8A989D] mb-2">
        <Link href="/dashboard/crm/leads" className="hover:text-[#009AAC]">Leads</Link> / <span className="text-[#014D5E]">{lead.name || "Sem nome"}</span>
      </div>

      {/* Header com toolbar */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center font-medium">{initials}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl text-[#014D5E] font-medium">{lead.name || "Sem nome"}</h1>
              <span className="bg-[#E0F4F6] text-[#00798A] text-[11px] font-medium px-2 py-0.5 rounded-full">{lead.status}</span>
              <span style={{ background: temp.bg, color: temp.color }} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full">
                {temp.icon} {temp.label}
              </span>
            </div>
            <p className="text-[11px] text-[#5C6B70] mt-0.5">{customFields.petName ? `🐾 ${customFields.petName}` : "🐾 sem pet"}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap relative items-center">
          {/* Botão único Converter em [classificação] */}
          <div className="flex">
            <button onClick={() => convertNow(classif)} disabled={converting} className="bg-[#0F6E56] text-white px-3 py-1.5 rounded-l-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
              ✓ {converting ? "Convertendo..." : "Converter em"}
            </button>
            <select value={classif} onChange={(e) => setClassif(e.target.value)} className="bg-white border border-[#0F6E56] border-l-0 text-[#0F6E56] text-xs font-medium px-2 rounded-r-lg focus:outline-none cursor-pointer">
              {CLASSIFICACOES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <button onClick={() => openWhatsAppMeta(lead.phone)} className="bg-white border border-[#009AAC] text-[#00798A] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-[#E0F4F6]">
            📲 WhatsApp
          </button>
          <button onClick={() => setEmailOpen(true)} className={outlineBtn}>✉️ E-mail</button>
          <EncaminharBox tipo="lead" id={id} nome={lead?.name || ""} onChange={loadLeadInteracoes} />
          <button onClick={() => setShowScripts(!showScripts)} className={outlineBtn}>📖 Scripts</button>
          <button onClick={() => setDelOpen(true)} className="bg-[#F9EAEA] border border-[#f0caca] text-[#A32D2D] px-2.5 py-1.5 rounded-lg text-xs">🗑️</button>

          {showScripts && (
            <div className="absolute right-0 top-12 z-50 w-80 bg-white border border-[#E8E2D6] rounded-xl shadow-lg p-3">
              <div className="flex gap-1 mb-2 flex-wrap">
                {(Object.keys(SCRIPTS) as Array<keyof typeof SCRIPTS>).map((cat) => (
                  <button key={cat} onClick={() => setScriptCat(cat)} className={`text-[11px] px-2 py-0.5 rounded ${scriptCat === cat ? "bg-[#009AAC] text-white" : "bg-[#F6F2EA] text-[#5C6B70]"}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {SCRIPTS[scriptCat].map((s, i) => (
                  <button key={i} onClick={() => { navigator.clipboard.writeText(s); toast.success("Copiado!"); }} className="text-left text-xs text-[#1F2A2E] bg-[#FBF9F4] hover:bg-[#E0F4F6] p-2 rounded">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo (full width) */}
      <div className="bg-[#FBF6EC] rounded-xl border border-[#ECE2CE] p-4 mb-3">
        <div className="grid grid-cols-3 gap-5 items-start">
          <div>
            <div className="text-[10px] text-[#8A989D] tracking-wide font-medium mb-1">RESUMO DA CONVERSA</div>
            <div className="text-[11px] text-[#1F2A2E]"><strong className="font-medium">Qualificação:</strong> <span className="italic text-[#8A989D]">{answered}/5 respondidas</span></div>
          </div>
          <div>
            <div className="text-[10px] text-[#8A989D] tracking-wide font-medium mb-1">SCORE DE QUALIFICAÇÃO</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#EAE3D4] rounded-full">
                <div style={{ width: `${lead.currentScore || 0}%`, background: temp.color }} className="h-full rounded-full" />
              </div>
              <span style={{ color: temp.color }} className="text-sm font-medium">{lead.currentScore || 0}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#8A989D] tracking-wide font-medium mb-1">ÚLTIMAS INTERAÇÕES</div>
            <div className="text-[11px] text-[#5C6B70]">{customFields.resumoIA || lead.notes || "Sem registro"}</div>
          </div>
        </div>
      </div>

      {/* Score + Pipeline + Conquistas + Etiquetas (4 col) */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        <div className={cardCls}>
          <h3 className={h3Cls}>🔥 Score</h3>
          <div className="flex items-baseline gap-1 mb-1 mt-2">
            <span style={{ color: temp.color }} className="text-3xl font-medium">{lead.currentScore || 0}</span>
            <span className="text-[10px] text-[#8A989D]">/100</span>
          </div>
          <span style={{ color: temp.color }} className="text-[10px] font-medium inline-flex items-center gap-1">{temp.icon} {temp.label}</span>
          <div className="relative h-1.5 bg-[#EAE3D4] rounded-full mt-2 mb-1">
            <div style={{ width: `${lead.currentScore || 0}%`, background: temp.color }} className="absolute left-0 top-0 bottom-0 rounded-full" />
          </div>
          <div className="flex justify-between text-[9px] text-[#8A989D]">
            <span>🧊</span><span>☕</span><span>🔥</span>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className={h3Cls}>🌿 Pipeline</h3>
          <select value={lead.pipelineComercialEtapa || ""} onChange={(e) => setStage(e.target.value)}
            className="w-full border border-[#009AAC] rounded px-2 py-1 text-[11px] text-[#014D5E] bg-white focus:outline-none mb-1 mt-2">
            <option value="">— selecionar —</option>
            {lead.pipelineComercialEtapa && !stages.includes(lead.pipelineComercialEtapa) && <option value={lead.pipelineComercialEtapa}>{lead.pipelineComercialEtapa}</option>}
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-[9px] text-[#8A989D]">"Compareceu" vira cliente</p>
          <div className="mt-2.5 pt-2.5 border-t border-[#F0EBE0]">
            <label className="text-[10px] text-[#5C6B70] font-medium">Motivo da perda</label>
            <select value={motivoPerda} onChange={(e) => saveMotivo(e.target.value)} className="w-full mt-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px] text-[#014D5E] bg-white focus:outline-none">
              <option value="">— sem motivo —</option>
              {MOTIVOS_PERDA.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <p className="text-[9px] text-[#8A989D] mt-1">Preencha quando o lead for perdido (alimenta a dashboard)</p>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className={h3Cls}>🏆 Conquistas</h3>
          <div className="grid grid-cols-8 gap-1 mt-2">
            <div className="aspect-square bg-[#E0F4F6] rounded flex items-center justify-center" title="Primeiro contato">💬</div>
            <div className="aspect-square bg-[#E1F5EE] rounded flex items-center justify-center" title="WhatsApp ativo">📲</div>
            <div className="aspect-square bg-[#FFE2D2] rounded flex items-center justify-center" title="Quente">🔥</div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-[#F0EBE0] rounded flex items-center justify-center opacity-40">🔒</div>
            ))}
          </div>
          <p className="text-[9px] text-[#8A989D] mt-2">3 de 8 desbloqueadas</p>
        </div>

        <div className={cardCls}>
          <h3 className={h3Cls}>🏷️ Etiquetas</h3>
          <div className="flex flex-wrap gap-1 items-center mt-2">
            {leadTags.length === 0 && <span className="text-[10px] text-[#8A989D]">Sem etiquetas</span>}
            {leadTags.map((t) => { const tpl = tagTpls.find((x: any) => x.texto === t.texto); const cor = tpl?.cor || "#009AAC"; return (
              <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>● {t.texto}<button onClick={() => delTagLead(t.id)} className="font-bold hover:opacity-60">×</button></span>
            ); })}
            <button onClick={() => setTagPicker(v => !v)} className="border border-dashed border-[#E8E2D6] text-[#8A989D] text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
          </div>
          {tagPicker && (
            <div className="mt-2 pt-2 border-t border-[#F0EBE0] flex flex-wrap gap-1">
              {tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).length === 0 ? <p className="text-[10px] text-[#8A989D]">Nenhuma etiqueta de Lead. Cadastre em Configurações.</p> :
                tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).map((t: any) => (<button key={t.texto} disabled={savingTag} onClick={() => addTagLead(t.texto)} className="text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>))}
            </div>
          )}
        </div>
      </div>

      {/* Dados do Lead + Qualificação | Follow-up + Histórico */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className={cardCls}>
          <h3 className={h3Cls}>👤 Dados do lead</h3>
          <div className="text-[11px] text-[#5C6B70] leading-loose mt-2">
            <div>📞 <span className="text-[#00798A]">{lead.phone || "—"}</span></div>
            <div><strong className="text-[#1F2A2E] font-medium">Canal:</strong> {lead.channel || "WhatsApp"}</div>
            <div><strong className="text-[#1F2A2E] font-medium">Serviço:</strong> {customFields.servicoInteresse || "—"}</div>
            <div><strong className="text-[#1F2A2E] font-medium">Valor:</strong> {customFields.valor ? `R$ ${customFields.valor}` : "—"}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EBE0]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] text-[#014D5E] tracking-wide font-medium flex items-center gap-1.5">✅ Qualificação <span className="text-[#8A989D]">· {answered}/5</span></h3>
              <button onClick={saveQualification} className="bg-[#009AAC] text-white px-3 py-1 rounded-lg text-[10px] font-medium">Salvar</button>
            </div>
            <div className="space-y-2">
              {([["qualSituacaoPet", "1. Situação do pet hoje?"], ["qualQueMaisIncomoda", "2. O que mais incomoda?"], ["qualTentouOutroVet", "3. Já tentou outro vet?"], ["qualOQueMudaResolver", "4. O que muda ao resolver?"], ["qualQuemDecide", "5. Quem decide?"]] as [string, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[11px] text-[#1F2A2E] font-medium mb-0.5">{label}</label>
                  <input value={(qual as any)[key]} onChange={(e) => setQual({ ...qual, [key]: e.target.value })} placeholder="Resposta..." className="w-full bg-white border border-[#E8E2D6] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#009AAC]" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={cardCls}>
          <h3 className={h3Cls}>📅 Follow-up</h3>
          <div className="mt-2">
          {lead.proximoFollowupAt ? (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#1F2A2E]">{new Date(lead.proximoFollowupAt).toLocaleDateString("pt-BR")}</span>
              <button onClick={clearFu} className="text-[10px] text-[#A32D2D]">Remover</button>
            </div>
          ) : <p className="text-[11px] text-[#8A989D] mb-1.5">Sem follow-up agendado</p>}
          <div className="flex gap-1">
            <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="flex-1 min-w-0 border border-[#E8E2D6] rounded px-1.5 py-1 text-[10px]" />
            <button onClick={saveFu} disabled={savingFu} className="bg-[#009AAC] text-white px-2 py-1 rounded text-[10px] disabled:opacity-50">{savingFu ? "..." : "Agendar"}</button>
          </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EBE0]">
            <h4 className="text-[11px] font-medium text-[#014D5E] flex items-center gap-1.5 mb-2">💬 Histórico de interações <span className="text-[10px] text-[#8A989D]">({leadInteracoes.length})</span></h4>
            <div className="flex gap-1.5 mb-2">
              <select value={intTipo} onChange={(e) => setIntTipo(e.target.value)} className="border border-[#E8E2D6] rounded px-1.5 py-1 text-[11px]"><option value="NOTA">Nota</option><option value="LIGACAO">Ligação</option><option value="WHATSAPP_ENVIADO">WhatsApp</option><option value="PRESENCIAL">Presencial</option></select>
              <input value={intTexto} onChange={(e) => setIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLeadInteracao(); }} placeholder="Registrar..." className="flex-1 min-w-0 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
              <button onClick={addLeadInteracao} disabled={savingInt} className="bg-[#009AAC] text-white px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50">{savingInt ? "..." : "+"}</button>
            </div>
            {leadInteracoes.length === 0 ? <p className="text-center text-[11px] text-[#8A989D] py-2">Nenhuma interação ainda</p> : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-auto">
                {leadInteracoes.map((it: any) => (
                  <div key={it.id} className="bg-[#FBF9F4] rounded px-2.5 py-1.5">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-[#00798A]">{it.tipo}{it.canal ? ` · ${it.canal}` : ""}</span><span className="text-[10px] text-[#8A989D]">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</span></div>
                    <p className="text-[11px] text-[#1F2A2E] mt-0.5">{it.texto}</p>
                    {it.autor?.name && <p className="text-[10px] text-[#8A989D] mt-0.5">por {it.autor.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        defaultTo={lead.email || ""}
        defaultSubject={`Sobre ${(lead.name || "").split(" ")[0] || "voce"}`}
        defaultHtml="<p>Olá!</p>"
      />
      <ConfirmDeleteModal
        isOpen={delOpen}
        entityLabel="Lead"
        itemName={lead.name || "este lead"}
        consequenceText="O lead e seu histórico serão removidos."
        onConfirm={handleDelete}
        onClose={() => setDelOpen(false)}
      />
    </div>
  );
}
