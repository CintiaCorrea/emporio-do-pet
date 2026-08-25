"use client";

import { use, useEffect, useState , useRef} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { SendEmailModal } from "@/components/email/SendEmailModal";
import EncaminharBox from "@/components/inbox/EncaminharBox";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import { assignFollowUpFor, loadFuRespFor } from "@/lib/followup";

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
  const jaCarregou = useRef(false);
  const [showScripts, setShowScripts] = useState(false);
  const [scriptCat, setScriptCat] = useState<keyof typeof SCRIPTS>("Saudação");
  const [pipeComercial, setPipeComercial] = useState<string[]>([]);
  const [fuDate, setFuDate] = useState("");
  const [savingFu, setSavingFu] = useState(false);
  const [fuResp, setFuResp] = useState(""); // 👤 quem acompanha (padrão único)
  const [staff, setStaff] = useState<any[]>([]);
  const [leadTags, setLeadTags] = useState<{ id: string; texto: string }[]>([]);
  const [tagTpls, setTagTpls] = useState<any[]>([]);
  const [tagPicker, setTagPicker] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [motivoId, setMotivoId] = useState<string | null>(null);
  const [wantText, setWantText] = useState("");      // "O que o lead quer" (lead.notes)
  const [savingWant, setSavingWant] = useState(false);
  const [tempManual, setTempManual] = useState("");  // temperatura manual (KV leadtemp_<id>)
  const [tempManualId, setTempManualId] = useState<string | null>(null);
  const [leadInteracoes, setLeadInteracoes] = useState<any[]>([]);
  const [intTipo, setIntTipo] = useState("NOTA");
  const [intTexto, setIntTexto] = useState("");
  const [savingInt, setSavingInt] = useState(false);
  const [classif, setClassif] = useState("Cliente");
  const [converting, setConverting] = useState(false);
  const [convWpp, setConvWpp] = useState<any>(null); // conversa do WhatsApp casada pelo telefone
  const [convWppChecado, setConvWppChecado] = useState(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLead(data);
      setWantText(data.notes || "");
    } catch (e: any) {
      toast.error("Erro ao carregar o lead: " + e.message);
    } finally { jaCarregou.current = true; setLoading(false); }
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
  async function saveWant() { setSavingWant(true); try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: wantText }) }); if (!r.ok) throw new Error(); toast.success("Salvo"); await load(); } catch { toast.error("Erro ao salvar"); } finally { setSavingWant(false); } }
  async function loadTemp() { try { const r = await fetch(`/api/listas?lista=leadtemp_${id}`, { cache: "no-store" }); const d = await r.json(); const a = Array.isArray(d) ? d : (d.itens || d.data || []); if (a[0]) { setTempManual(a[0].valor || ""); setTempManualId(a[0].id); } else { setTempManual(""); setTempManualId(null); } } catch { /* sem temp manual */ } }
  // Casa o telefone do lead com a conversa do inbox (mesmo padrão do inbox-nativo: últimos 8 dígitos) e firma o vínculo no banco.
  async function vincularConversaWpp(l: any) {
    try {
      const digitos = (l?.phone || "").replace(/\D/g, "");
      if (digitos.length < 8) { setConvWpp(null); setConvWppChecado(true); return; }
      const p8 = digitos.slice(-8);
      const r = await fetch(`/api/whatsapp/conversations?search=${encodeURIComponent(digitos)}&limit=20`, { cache: "no-store" });
      if (!r.ok) { setConvWppChecado(true); return; }
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.conversations || d.data || d.itens || []);
      const match = arr.find((c: any) => ((c.contactPhone || c.contactNumber || "").replace(/\D/g, "").slice(-8)) === p8);
      setConvWpp(match || null);
      setConvWppChecado(true);
      if (match?.id && match.id !== l?.whatsappConversationId) {
        fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsappConversationId: match.id }) }).catch(() => {});
      }
    } catch { setConvWppChecado(true); }
  }
  async function setTemperatura(t: string) {
    setTempManual(t);
    try {
      if (tempManualId) { await fetch(`/api/listas/${tempManualId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: t }) }); }
      else { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `leadtemp_${id}`, valor: t }) }).then((x) => x.json()); if (r?.id) setTempManualId(r.id); }
    } catch { toast.error("Erro ao salvar temperatura"); }
  }
  useEffect(() => { load(); loadComercial(); loadLeadTags(); loadTagTpls(); loadLeadInteracoes(); loadMotivo(); loadTemp(); }, [id]);
  useEffect(() => { if (lead?.phone) vincularConversaWpp(lead); }, [lead?.phone]);
  useEffect(() => {
    (async () => {
      try { const u = await fetch(`/api/users`, { cache: "no-store" }).then((r) => r.json()).catch(() => []); const arr = Array.isArray(u) ? u : (u.users || u.data || []); setStaff(arr.filter((x: any) => !x.isBlocked)); } catch {}
      try { const fr = await loadFuRespFor("lead", id); setFuResp(fr?.userId || ""); } catch {}
    })();
  }, [id]);

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
  async function saveFu() { if (!fuDate) { toast.error("Escolha uma data"); return; } setSavingFu(true); try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: new Date(fuDate + "T12:00:00").toISOString() }) }); if (!r.ok) throw new Error(); if (fuResp) { const nome = staff.find((s: any) => s.id === fuResp)?.name || ""; await assignFollowUpFor({ kind: "lead", id, userId: fuResp, nome, alvoNome: lead?.name, fuLabel: new Date(fuDate + "T12:00:00").toLocaleDateString("pt-BR") }); } toast.success("Follow-up agendado"); setFuDate(""); await load(); } catch { toast.error("Erro ao agendar"); } finally { setSavingFu(false); } }
  async function clearFu() { try { const r = await fetch(`/api/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) }); if (!r.ok) throw new Error(); toast.success("Follow-up removido"); await load(); } catch { toast.error("Erro"); } }
  async function addTagLead(texto: string) { setSavingTag(true); try { const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `leadtag_${id}`, valor: texto }) }); if (!r.ok) throw new Error(); toast.success("Etiqueta adicionada"); setTagPicker(false); await loadLeadTags(); } catch { toast.error("Erro (talvez já exista)"); } finally { setSavingTag(false); } }
  async function delTagLead(tid: string) { try { const r = await fetch(`/api/listas/${tid}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await loadLeadTags(); } catch { toast.error("Erro ao remover"); } }
  async function loadLeadInteracoes() { try { const r = await fetch(`/api/interacoes?leadId=${id}&limit=100`, { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); setLeadInteracoes(Array.isArray(d) ? d : (d.interacoes || d.data || [])); } catch { console.error("Falha ao carregar interações do lead"); } }
  async function addLeadInteracao() { if (!intTexto.trim()) { toast.error("Escreva algo"); return; } setSavingInt(true); try { const r = await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, tipo: intTipo, texto: intTexto.trim(), canal: "Sistema" }) }); if (!r.ok) throw new Error(); toast.success("Registrado"); setIntTexto(""); await loadLeadInteracoes(); } catch { toast.error("Erro ao registrar"); } finally { setSavingInt(false); } }

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

  if (loading) return <div className="p-6 text-center text-[#374151]">Carregando...</div>;
  if (!lead) return <div className="p-6 text-center text-[#374151]">Lead não encontrado</div>;

  const TEMP_INFO: any = { Frio: { label: "Frio", icon: "🧊", color: "#4d72a0", bg: "#E6F1FB" }, Morno: { label: "Morno", icon: "☕", color: "#B25C0A", bg: "#FBEED8" }, Quente: { label: "Quente", icon: "🔥", color: "#C2410C", bg: "#FFE2D2" } };
  const temp = (tempManual && TEMP_INFO[tempManual]) ? TEMP_INFO[tempManual] : getTemp(lead.currentScore || 0);
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
      <div className="text-[12px] text-[#374151] mb-2">
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
          <button onClick={() => openWhatsAppMeta(lead.phone)} title={convWpp ? "Conversa encontrada no inbox — abrir" : "Abrir no inbox do WhatsApp"} className="bg-white border border-[#009AAC] text-[#00798A] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-[#E0F4F6]">
            📲 WhatsApp
            {convWpp && <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" title="Conversa vinculada" />}
          </button>
          {convWppChecado && (
            convWpp
              ? <span className="text-[10px] text-[#0F6E56] bg-[#E7F6EF] border border-[#B7E4CE] px-2 py-1 rounded-lg flex items-center gap-1">🟢 Conversa vinculada</span>
              : <span className="text-[10px] text-[#8A6D00] bg-[#FCF6E3] border border-[#EAD9A0] px-2 py-1 rounded-lg flex items-center gap-1">⚪ Sem conversa no inbox</span>
          )}
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

      {/* Barra de ação: próximo contato + acompanha + temperatura */}
      <div className="bg-white rounded-xl border border-[#E8E2D6] p-3 mb-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[#8A948F] font-medium">🗓️ Próximo contato</span>
          {lead.proximoFollowupAt && <span className="text-[11px] text-[#014D5E] font-medium">{new Date(lead.proximoFollowupAt).toLocaleDateString("pt-BR")}</span>}
          <input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="border border-[#E8E2D6] rounded-lg px-2 py-1 text-[12px]" />
          <button onClick={saveFu} disabled={savingFu} className="bg-[#009AAC] text-white text-[11.5px] px-2.5 py-1 rounded-lg disabled:opacity-50">{savingFu ? "..." : "Agendar"}</button>
          {lead.proximoFollowupAt && <button onClick={clearFu} title="Remover" className="text-[11px] text-[#A32D2D]">✕</button>}
        </div>
        <div className="w-px self-stretch bg-[#F0EBE0]" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[#8A948F] font-medium">Acompanha</span>
          <select value={fuResp} onChange={(e) => setFuResp(e.target.value)} className="border border-[#E8E2D6] rounded-lg px-2 py-1 text-[12px]">
            <option value="">Ninguém específico</option>
            {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name || "Sem nome"}</option>)}
          </select>
        </div>
        <div className="w-px self-stretch bg-[#F0EBE0]" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[#8A948F] font-medium">🌡️ Temperatura</span>
          <div className="inline-flex border border-[#E8E2D6] rounded-lg overflow-hidden">
            {["Frio", "Morno", "Quente"].map((t) => { const on = temp.label === t; const ti = TEMP_INFO[t]; return (
              <button key={t} onClick={() => setTemperatura(t)} className="text-[12px] font-medium px-3 py-1 border-l first:border-l-0 border-[#F0EBE0]" style={on ? { background: ti.color, color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{t}</button>
            ); })}
          </div>
        </div>
      </div>

      {/* 2 colunas: esquerda (dados/o que quer/etiquetas/pipeline) | direita hero (conversa) */}
      <div className="grid grid-cols-2 gap-2.5 mb-3 items-start">
          {/* Dados do lead */}
          <div className={cardCls}>
            <h3 className={h3Cls}>👤 Dados do lead</h3>
            <div className="text-[11px] text-[#5C6B70] leading-loose mt-2">
              <div>📞 <span className="text-[#00798A]">{lead.phone || "—"}</span></div>
              <div><strong className="text-[#1F2A2E] font-medium">Canal:</strong> {lead.channel || "WhatsApp"}</div>
              <div><strong className="text-[#1F2A2E] font-medium">Serviço:</strong> {customFields.servicoInteresse || "—"}</div>
              <div><strong className="text-[#1F2A2E] font-medium">Valor:</strong> {customFields.valor ? `R$ ${customFields.valor}` : "—"}</div>
            </div>
          </div>

          {/* O que o lead quer */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={h3Cls + " mb-0"}>💭 O que o lead quer</h3>
              <button onClick={saveWant} disabled={savingWant} className="bg-[#009AAC] text-white px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-50">{savingWant ? "..." : "Salvar"}</button>
            </div>
            <textarea value={wantText} onChange={(e) => setWantText(e.target.value)} rows={4} placeholder="Anote com as palavras do próprio tutor o que ele procura, a dor do pet, o que já tentou, quem decide..." className="w-full bg-white border border-[#E8E2D6] rounded px-2.5 py-2 text-xs leading-relaxed focus:outline-none focus:border-[#009AAC] resize-y" />
          </div>

          {/* Etiquetas */}
          <div className={cardCls}>
            <h3 className={h3Cls}>🏷️ Etiquetas</h3>
            <div className="flex flex-wrap gap-1 items-center mt-2">
              {leadTags.length === 0 && <span className="text-[10px] text-[#374151]">Sem etiquetas</span>}
              {leadTags.map((t) => { const tpl = tagTpls.find((x: any) => x.texto === t.texto); const cor = tpl?.cor || "#009AAC"; return (
                <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: cor + "22", color: cor }}>● {t.texto}<button onClick={() => delTagLead(t.id)} className="font-bold hover:opacity-60">×</button></span>
              ); })}
              <button onClick={() => setTagPicker(v => !v)} className="border border-dashed border-[#E8E2D6] text-[#374151] text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
            </div>
            {tagPicker && (
              <div className="mt-2 pt-2 border-t border-[#F0EBE0] flex flex-wrap gap-1">
                {tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).length === 0 ? <p className="text-[10px] text-[#374151]">Nenhuma etiqueta de Lead. Cadastre em Configurações.</p> :
                  tagTpls.filter((t: any) => !leadTags.some(p => p.texto === t.texto)).map((t: any) => (<button key={t.texto} disabled={savingTag} onClick={() => addTagLead(t.texto)} className="text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-50" style={{ borderColor: (t.cor || "#009AAC") + "66", color: t.cor || "#009AAC" }}>+ {t.texto}</button>))}
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className={cardCls}>
            <h3 className={h3Cls}>🌿 Pipeline</h3>
            <select value={lead.pipelineComercialEtapa || ""} onChange={(e) => setStage(e.target.value)}
              className="w-full border border-[#009AAC] rounded px-2 py-1 text-[11px] text-[#014D5E] bg-white focus:outline-none mb-1 mt-2">
              <option value="">— selecionar —</option>
              {lead.pipelineComercialEtapa && !stages.includes(lead.pipelineComercialEtapa) && <option value={lead.pipelineComercialEtapa}>{lead.pipelineComercialEtapa}</option>}
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-[9px] text-[#374151]">"Compareceu" vira cliente</p>
            <div className="mt-2.5 pt-2.5 border-t border-[#F0EBE0]">
              <label className="text-[10px] text-[#5C6B70] font-medium">Motivo da perda</label>
              <select value={motivoPerda} onChange={(e) => saveMotivo(e.target.value)} className="w-full mt-1 border border-[#E8E2D6] rounded px-2 py-1 text-[11px] text-[#014D5E] bg-white focus:outline-none">
                <option value="">— sem motivo —</option>
                {MOTIVOS_PERDA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-[9px] text-[#374151] mt-1">Preencha quando o lead for perdido (alimenta a dashboard)</p>
            </div>
          </div>
        {/* ===== Conversa e histórico (largura total) ===== */}
        <div className={cardCls + " col-span-2"}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={h3Cls + " mb-0"}>💬 Conversa e histórico</h3>
            <span className="text-[10px] text-[#374151]">{leadInteracoes.length} registro{leadInteracoes.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex gap-1.5 mb-2.5">
            <select value={intTipo} onChange={(e) => setIntTipo(e.target.value)} className="border border-[#E8E2D6] rounded px-1.5 py-1 text-[11px]"><option value="NOTA">Nota</option><option value="LIGACAO">Ligação</option><option value="WHATSAPP_ENVIADO">WhatsApp</option><option value="PRESENCIAL">Presencial</option></select>
            <input value={intTexto} onChange={(e) => setIntTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLeadInteracao(); }} placeholder="Registrar interação..." className="flex-1 min-w-0 border border-[#E8E2D6] rounded px-2 py-1 text-[11px]" />
            <button onClick={addLeadInteracao} disabled={savingInt} className="bg-[#009AAC] text-white px-3 py-1 rounded text-[11px] font-medium disabled:opacity-50">{savingInt ? "..." : "+"}</button>
          </div>
          {leadInteracoes.length === 0 ? <p className="text-center text-[11px] text-[#374151] py-6">Nenhuma interação ainda</p> : (
            <div className="flex flex-col gap-1.5 max-h-[520px] overflow-auto">
              {leadInteracoes.map((it: any) => (
                <div key={it.id} className="bg-[#FBF9F4] rounded px-2.5 py-1.5">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-[#00798A]">{it.tipo}{it.canal ? ` · ${it.canal}` : ""}</span><span className="text-[10px] text-[#374151]">{new Date(it.createdAt).toLocaleDateString("pt-BR")}</span></div>
                  <p className="text-[11px] text-[#1F2A2E] mt-0.5">{it.texto}</p>
                  {it.autor?.name && <p className="text-[10px] text-[#374151] mt-0.5">por {it.autor.name}</p>}
                </div>
              ))}
            </div>
          )}
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
