"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuPlus, LuSearch, LuUserPlus, LuPencil, LuPhone, LuCalendar, LuInbox} from "react-icons/lu";
import { usePageTitle, usePageRightSlot } from "@/lib/ui/PageHeaderContext";
type Tab = "conversas" | "internas" | "encaminhadas";
type ListFilter = "todos" | "leads" | "clientes";

interface Conversation {
  id: string;
  contactName: string | null;
  contactNumber: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  tutor?: { id: string; name: string } | null;
  source?: string;
  metadata?: { source?: string; [k: string]: any };
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string | null;
  type: string;
  createdAt: string;
  fromAgent?: boolean;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  weight?: number | null;
  tags?: string[];
}

interface TutorFull {
  id: string;
  name: string | null;
  email?: string | null;
  classificacao: string;
  status: string;
  tags: string[];
  createdAt: string;
  contacts?: { number: string; isPrimary: boolean }[];
  pets?: Pet[];
}

const PET_EMOJI = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "🐱";
  if (s === "CANINE" || s === "CACHORRO") return "🐶";
  return "🐾";
};

const getInitials = (name?: string | null) => {
  if (!name) return "??";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
};

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

// Mensagens prontas de Scripts (placeholder — virá de Configurações depois)
const SCRIPTS_PLACEHOLDER = [
  { categoria: "Saudação", titulo: "Bom dia", texto: "Bom dia! 🐾 Aqui é o Empório do Pet. Como posso ajudar?" },
  { categoria: "Qualificação", titulo: "Qual o pet", texto: "Pra entender melhor, qual o nome e a espécie do seu pet?" },
  { categoria: "Orçamento", titulo: "Pedir agenda", texto: "Posso te oferecer um horário com a Dra. Vivian. Manhã ou tarde fica melhor?" },
];

export default function InboxUnificadoPage() {
  usePageTitle("Inbox Meta", "Conversas WhatsApp Business via API Meta");
  usePageRightSlot(<div className="flex items-center gap-5"><div className="flex flex-col items-end leading-tight"><div className="text-[13px] font-bold" style={{color:"#014D5E"}}>+1h</div><div className="text-[9.5px] uppercase font-semibold text-[#94a3b8] tracking-wide">⏱ esperando</div></div><div className="flex flex-col items-end leading-tight"><div className="text-[13px] font-bold" style={{color:"#014D5E"}}>—</div><div className="text-[9.5px] uppercase font-semibold text-[#94a3b8] tracking-wide">⌛ tempo méd.</div></div><div className="flex flex-col items-end leading-tight"><div className="text-[13px] font-bold" style={{color:"#014D5E"}}>—</div><div className="text-[9.5px] uppercase font-semibold text-[#94a3b8] tracking-wide">🏆 streak</div></div></div>);
  const [tab, setTab] = useState<Tab>("conversas");
  const [filter, setFilter] = useState<ListFilter>("todos");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [tutor, setTutor] = useState<TutorFull | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Modais
  const [novaMsgOpen, setNovaMsgOpen] = useState(false);
  const [novaMsgPhone, setNovaMsgPhone] = useState("");
  const [novaMsgText, setNovaMsgText] = useState("");
  const [novaMsgSending, setNovaMsgSending] = useState(false);

  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [encaminharOpen, setEncaminharOpen] = useState(false);
  const [resolvendo, setResolvendo] = useState(false);

  // Controles IA / Agentes
  const [agentes, setAgentes] = useState<Array<{id: string; name: string}>>([]);
  const [autoReply, setAutoReply] = useState(true);
  const [assumida, setAssumida] = useState(false);

  // Agendamento de mensagem
  const [novaMsgScheduledAt, setNovaMsgScheduledAt] = useState("");
  const [novaMsgScriptOpen, setNovaMsgScriptOpen] = useState(false);

  // Internas — usuários da clínica
  const [internalUsers, setInternalUsers] = useState<Array<{id: string; name: string; email: string; role: string}>>([]);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");

  // Adicionar atendimento
  const [atendModalOpen, setAtendModalOpen] = useState(false);
  const [atendDescricao, setAtendDescricao] = useState("");
  const [atendDate, setAtendDate] = useState(() => new Date().toISOString().substring(0, 16));
  const [atendSaving, setAtendSaving] = useState(false);

  // Modal Nota clínica no pet
  const [notaPetOpen, setNotaPetOpen] = useState(false);
  const [notaPetText, setNotaPetText] = useState("");
  const [notaPetSaving, setNotaPetSaving] = useState(false);

  // Modal Agendamento clínico (no pet selecionado)
  const [agendaPetOpen, setAgendaPetOpen] = useState(false);
  const [agendaPetDate, setAgendaPetDate] = useState(() => new Date(Date.now() + 86400000).toISOString().substring(0, 16));
  const [agendaPetDesc, setAgendaPetDesc] = useState("");
  const [agendaPetSaving, setAgendaPetSaving] = useState(false);

  // Carregar usuários internos
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.data) ? data.data
                  : Array.isArray(data?.users) ? data.users
                  : Array.isArray(data) ? data : [];
        setInternalUsers(list.map((u: any) => ({
          id: u?.id || "", name: u?.name || "—", email: u?.email || "", role: u?.role || ""
        })).filter((u: any) => u.id));
      } catch { setInternalUsers([]); }
    })();
  }, []);

  // Carregar lista de agentes uma vez
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai-agents");
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.data) ? data.data
                  : Array.isArray(data?.agents) ? data.agents
                  : Array.isArray(data) ? data : [];
        setAgentes(list.map((a: any) => ({ id: a?.id || "", name: a?.name || "Agente" })).filter((a: any) => a.id));
      } catch { setAgentes([]); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/whatsapp/conversations?limit=50");
        const data = await res.json().catch(() => ({}));
        const raw = Array.isArray(data?.conversations) ? data.conversations
                  : Array.isArray(data?.data) ? data.data
                  : Array.isArray(data) ? data : [];
        const safe = raw.map((c: any) => ({
          id: c?.id || Math.random().toString(),
          contactName: c?.contactName || null,
          contactNumber: c?.contactPhone || c?.contactNumber || "",
          lastMessageAt: c?.lastMessageAt || c?.createdAt || new Date().toISOString(),
          unreadCount: typeof c?.unreadCount === "number" ? c.unreadCount : 0,
          status: c?.status || "OPEN",
          tutor: c?.tutor ? { id: c.tutor.id, name: c.tutor.name } : null,
          source: c?.metadata?.source || c?.source || null,
          metadata: c?.metadata || null}));
        setConversations(safe);
      } catch (e) { console.error(e); setConversations([]); }
      finally { setLoading(false); }
    })();
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=30`);
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.data) ? data.data
                    : Array.isArray(data?.messages) ? data.messages
                    : Array.isArray(data) ? data : [];
        setMessages(list.map((m: any) => ({
          id: m?.id || Math.random().toString(),
          direction: m?.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
          content: typeof m?.content === "string" ? m.content : null,
          type: m?.type || "TEXT",
          createdAt: m?.createdAt || new Date().toISOString(),
          fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent})));
      } catch (e) { console.error("Messages load failed", e); setMessages([]); }

      const conv = conversations.find((c) => c.id === selectedId);
      if (conv?.tutor?.id) {
        try {
          const r = await fetch(`/api/tutors/${conv.tutor.id}`);
          const t = await r.json().catch(() => null);
          if (t && t.id) {
            setTutor(t);
            setSelectedPetId(t.pets?.[0]?.id || null);
          }
        } catch { setTutor(null); }
      } else {
        setTutor(null);
        setSelectedPetId(null);
      }
    })();
  }, [selectedId, conversations]);

  const filtered = useMemo(() => {
    let arr = [...conversations];
    if (filter === "leads") arr = arr.filter((c) => !c.tutor?.id);
    if (filter === "clientes") arr = arr.filter((c) => c.tutor?.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) =>
        c.contactName?.toLowerCase().includes(q) || c.contactNumber.includes(q),
      );
    }
    return arr;
  }, [conversations, filter, search]);

  const counts = useMemo(() => ({
    total: conversations.length,
    leads: conversations.filter((c) => !c.tutor?.id).length,
    clientes: conversations.filter((c) => c.tutor?.id).length,
    unread: conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)}), [conversations]);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const selectedPet = tutor?.pets?.find((p) => p.id === selectedPetId);
  const primaryPhone = tutor?.contacts?.find((c) => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || selectedConv?.contactNumber;

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? messageInput).trim();
    if (!text || !selectedId) return;
    if (!textOverride) setMessageInput("");
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, type: "TEXT" })});
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("Send message failed:", r.status, body);
        alert(`Erro ao enviar (HTTP ${r.status}). Tenta de novo ou recarrega.`);
        return;
      }
      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=30`);
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.data) ? data.data
                  : Array.isArray(data?.messages) ? data.messages : [];
      setMessages(list.map((m: any) => ({
        id: m?.id || Math.random().toString(),
        direction: m?.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
        content: typeof m?.content === "string" ? m.content : null,
        type: m?.type || "TEXT",
        createdAt: m?.createdAt || new Date().toISOString(),
        fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent})));
    } catch (e) { console.error(e); }
  };

  const resolverConversa = async () => {
    if (!selectedId || resolvendo) return;
    if (!confirm("Marcar conversa como resolvida?")) return;
    setResolvendo(true);
    const idResolvido = selectedId;
    try {
      await fetch(`/api/whatsapp/conversations/${idResolvido}/close`, { method: "POST" });
      // tira da lista imediatamente (otimista)
      setConversations((prev) => prev.filter((c) => c.id !== idResolvido));
      setSelectedId(null);
      setRefreshTick((t) => t + 1);
    } catch (e) { console.error(e); alert("Erro ao resolver. Tente novamente."); }
    finally { setResolvendo(false); }
  };

  const enviarNovaMensagem = async () => {
    const phone = novaMsgPhone.replace(/\D/g, "");
    if (!phone || !novaMsgText.trim()) {
      alert("Telefone e mensagem são obrigatórios.");
      return;
    }
    setNovaMsgSending(true);
    try {
      if (novaMsgScheduledAt) {
        // Agendamento via /api/whatsapp/schedule
        await fetch("/api/whatsapp/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: phone,
            content: novaMsgText.trim(),
            scheduledFor: new Date(novaMsgScheduledAt).toISOString()})});
      } else {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: phone, content: novaMsgText.trim(), type: "TEXT" })});
      }
      setNovaMsgOpen(false);
      setNovaMsgPhone("");
      setNovaMsgText("");
      setNovaMsgScheduledAt("");
      setRefreshTick((t) => t + 1);
    } catch (e) { console.error(e); alert("Erro ao enviar. Tente novamente."); }
    finally { setNovaMsgSending(false); }
  };

  // Salvar nota interna
  const salvarNotaInterna = async () => {
    if (!internalSelected || !internalNote.trim()) {
      alert("Selecione uma pessoa e digite a mensagem.");
      return;
    }
    try {
      await fetch("/api/internal-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: internalSelected,
          content: internalNote.trim(),
          conversationId: selectedId || null})});
      setInternalNote("");
      setInternalSelected(null);
      alert("Nota enviada!");
    } catch (e) { console.error(e); alert("Erro ao enviar. Tente novamente."); }
  };

  // Salvar nota clínica no Pet (atualiza medicalNotes)
  const salvarNotaPet = async () => {
    if (!selectedPetId || !notaPetText.trim()) {
      alert("Escreva a nota.");
      return;
    }
    setNotaPetSaving(true);
    try {
      const r = await fetch(`/api/pets/${selectedPetId}`);
      const cur = await r.json().catch(() => ({}));
      const prev = (cur?.medicalNotes || "").toString();
      const stamp = new Date().toLocaleString("pt-BR");
      const newNote = `[${stamp}] ${notaPetText.trim()}\n${prev}`.trim();
      await fetch(`/api/pets/${selectedPetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalNotes: newNote })});
      setNotaPetOpen(false);
      setNotaPetText("");
      alert("Nota clínica salva!");
    } catch (e) { console.error(e); alert("Erro ao salvar nota."); }
    finally { setNotaPetSaving(false); }
  };

  // Agendar atendimento futuro pro pet
  const agendarPet = async () => {
    if (!selectedPetId || !tutor?.id || !agendaPetDesc.trim()) {
      alert("Descreva o agendamento.");
      return;
    }
    setAgendaPetSaving(true);
    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutor.id,
          petId: selectedPetId,
          date: new Date(agendaPetDate).toISOString(),
          description: agendaPetDesc.trim(),
          status: "SCHEDULED"})});
      setAgendaPetOpen(false);
      setAgendaPetDesc("");
      alert("Agendamento criado!");
    } catch (e) { console.error(e); alert("Erro ao agendar."); }
    finally { setAgendaPetSaving(false); }
  };

  // Adicionar atendimento ao pet selecionado
  const adicionarAtendimento = async () => {
    if (!selectedPetId || !tutor?.id || !atendDescricao.trim()) {
      alert("Selecione um pet e descreva o atendimento.");
      return;
    }
    setAtendSaving(true);
    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutor.id,
          petId: selectedPetId,
          date: new Date(atendDate).toISOString(),
          description: atendDescricao.trim(),
          status: "COMPLETED"})});
      setAtendModalOpen(false);
      setAtendDescricao("");
      alert("Atendimento registrado!");
    } catch (e) { console.error(e); alert("Erro ao registrar. Tente novamente."); }
    finally { setAtendSaving(false); }
  };

 return (
    <div className="bg-white border border-[#e8e1d2] rounded-xl overflow-hidden m-4 max-w-[1400px] mx-auto" style={{background:"#ffffff"}}>
      {/* Toolbar - Hoje + Atualizar + Nova mensagem */}
      <div className="px-4 py-3 border-b border-[#e8e1d2] flex items-center justify-end bg-white">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#5F5E5A] hidden md:flex items-center gap-1.5">
            <span style={{fontSize:"13px"}}>🏆</span>
            Hoje: <b className="text-[#0F6E56]">— resolvidas</b>
          </span>
          <button onClick={() => setRefreshTick((t) => t + 1)} className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#5F5E5A] flex items-center gap-1.5 hover:bg-[#f9f9f9]">
            <span style={{fontSize:"12px"}}>↻</span>Atualizar
          </button>
          <button onClick={() => setNovaMsgOpen(true)} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <LuPlus className="w-3.5 h-3.5" />Nova mensagem
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="px-4 border-b border-[#e8e1d2] flex gap-5 bg-white">
        <button onClick={() => setTab("conversas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "conversas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Conversas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "conversas" ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{counts.total}</span>
        </button>
        <button onClick={() => setTab("internas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "internas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Internas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "internas" ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>0</span>
        </button>
        <button onClick={() => setTab("encaminhadas")} className={`py-2.5 text-xs font-medium border-b-2 ${tab === "encaminhadas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Encaminhadas
        </button>
      </div>

      {tab === "conversas" && (
        <div className="grid grid-cols-[310px_1fr_340px] h-[calc(100vh-140px)]">
          {/* LEFT - Lista */}
          <div className="border-r border-[#e8e1d2] bg-white flex flex-col">
            <div className="p-2.5 flex gap-1.5 flex-wrap border-b border-[#e8e1d2]">
              {(["todos", "leads", "clientes"] as ListFilter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${filter === f ? "bg-[#009AAC] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>
                  {f === "todos" ? `Todos ${counts.total}` : f === "leads" ? `Leads ${counts.leads}` : `Clientes ${counts.clientes}`}
                </button>
              ))}
            </div>
            <div className="p-2.5 border-b border-[#e8e1d2] bg-white">
              <div className="relative">
                <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
                  className="w-full pl-8 pr-2 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-white focus:outline-none focus:border-[#009AAC]" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-6 text-center text-[11px] text-[#888780]">Carregando...</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-[11px] text-[#888780]">Sem conversas nesse filtro</p>
              ) : filtered.map((c) => {
                const isLead = !c.tutor?.id;
                const isSel = c.id === selectedId;
                const isBC = c.source === "BOTCONVERSA" || c.metadata?.source === "BOTCONVERSA";
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-2.5 border-b border-[#f0e8d4] ${isSel ? "bg-white border-l-[3px] border-l-[#009AAC]" : "bg-white hover:bg-white"}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isLead ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#E1F5EE] text-[#0F6E56]"}`}>
                        {isLead ? "LEAD" : "CLIENTE"}
                      </span>
                      <span className="text-[10px] text-[#888780]">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</span>
                    </div>
                    <div className={`text-xs ${isSel ? "text-[#0E2244] font-medium" : "text-[#0E2244]"}`}>
                      {c.contactName || c.tutor?.name || c.contactNumber}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <span className="bg-[#E0F4F6] text-[#00798A] text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <LuPhone className="w-2.5 h-2.5" />
                        {isBC ? "via BotConversa" : "WhatsApp Meta"}
                      </span>
                      {(c.unreadCount || 0) > 0 && (
                        <span className="bg-[#E24B4A] text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">{c.unreadCount}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER - Chat */}
          <div className="bg-white flex flex-col">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <span style={{fontSize:"36px",color:"#cfd8e0",display:"block",marginBottom:"12px"}}>💬</span>
                  <p className="text-sm text-[#5F5E5A]">Selecione uma conversa pra começar</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[11px] font-medium">
                      {getInitials(selectedConv?.contactName || selectedConv?.tutor?.name)}
                    </div>
                    <div>
                      <div className="text-xs text-[#0E2244] font-medium">
                        {selectedConv?.contactName || selectedConv?.tutor?.name || selectedConv?.contactNumber || "Sem nome"}
                      </div>
                      <div className="text-[10px] text-[#888780]">📞 {selectedConv?.contactNumber || "—"}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <button
                      onClick={() => setAutoReply(!autoReply)}
                      title={autoReply ? "Desativar IA pra essa conversa" : "Ativar IA"}
                      className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${autoReply ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-white border border-[#e8e1d2] text-[#888780]"}`}>
                      <span style={{fontSize:"10px"}}>🤖</span>IA {autoReply ? "Ativa" : "Pausada"}
                    </button>
                    <button
                      onClick={() => setAssumida(!assumida)}
                      title={assumida ? "Devolver pra IA" : "Assumir conversa (humano)"}
                      className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${assumida ? "bg-[#185FA5] text-white" : "bg-[#E6F1FB] text-[#185FA5] hover:bg-[#cce0f5]"}`}>
                      <LuUserPlus className="w-2.5 h-2.5" />{assumida ? "Assumida" : "Assumir"}
                    </button>
                    <button
                      title="Auto-resposta"
                      className="bg-white border border-[#e8e1d2] text-[#5F5E5A] text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 hover:bg-white">
                      <span style={{fontSize:"10px"}}>⚡</span>Auto
                    </button>
                    <select
                      title="Agente IA atribuído"
                      className="bg-white border border-[#e8e1d2] text-[#5F5E5A] text-[10px] px-2 py-1 rounded-full focus:outline-none focus:border-[#009AAC]">
                      <option value="">Sem agente</option>
                      {agentes.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-white flex flex-col gap-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-[11px] text-[#888780]">Sem mensagens</p>
                  ) : messages.map((m) => {
                    const outbound = m.direction === "OUTBOUND";
                    return (
                      <div key={m.id} className={`max-w-[75%] ${outbound ? "self-end" : "self-start"}`}>
                        <div className={`px-3 py-2 rounded-xl text-[13px] ${outbound ? "bg-[#009AAC] text-white rounded-br-sm" : "bg-white border border-[#e8e1d2] text-[#0E2244] rounded-bl-sm"}`}>
                          {m.fromAgent && (
                            <div className={`text-[9px] mb-1 ${outbound ? "opacity-85" : "text-[#888780]"} flex items-center gap-1`}>
                              <span style={{fontSize:"10px"}}>🤖</span>Atendente IA
                            </div>
                          )}
                          {m.content || "(mídia)"}
                        </div>
                        <div className="text-[9px] text-[#888780] mt-0.5 px-1">
                          {(() => { try { return new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input com Scripts dropdown */}
                <div className="px-4 py-2.5 border-t border-[#e8e1d2]">
                  {scriptsOpen && (
                    <div className="bg-white border border-[#e8e1d2] rounded-lg p-2 mb-2 max-h-[160px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-[#888780] font-medium">SCRIPTS · clique pra inserir</span>
                        <Link href="/dashboard/configuracoes/scripts" className="text-[10px] text-[#009AAC]">+ Gerenciar em Configurações</Link>
                      </div>
                      <div className="flex flex-col gap-1">
                        {SCRIPTS_PLACEHOLDER.map((s) => (
                          <button key={s.titulo} onClick={() => { setMessageInput(s.texto); setScriptsOpen(false); }}
                            className="text-left px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-[#e8e1d2]">
                            <div className="text-[10px] text-[#5F5E5A]"><b className="text-[#0E2244]">{s.categoria}</b> · {s.titulo}</div>
                            <div className="text-[11px] text-[#5F5E5A] truncate">{s.texto}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setScriptsOpen(!scriptsOpen)} title="Scripts"
                      className={`px-2.5 py-1.5 border rounded-lg text-xs flex items-center gap-1 ${scriptsOpen ? "bg-[#FBF0DD] border-[#8a6313] text-[#8a6313]" : "bg-white border-[#e8e1d2] text-[#5F5E5A]"}`}>
                      <span style={{fontSize:"12px"}}>📝</span>Scripts
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedConv?.contactNumber) return;
                        setNovaMsgPhone(selectedConv.contactNumber);
                        setNovaMsgText(messageInput);
                        setNovaMsgOpen(true);
                      }}
                      title="Agendar essa mensagem pra horário futuro"
                      className="px-2.5 py-1.5 border border-[#e8e1d2] rounded-lg text-xs text-[#5F5E5A] hover:bg-[#f9f9f9] flex items-center gap-1">
                      <span style={{fontSize:"12px"}}>📅</span>Agendar
                    </button>
                    <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 px-3 py-1.5 border border-[#e8e1d2] rounded-lg text-xs focus:outline-none focus:border-[#009AAC]" />
                    <button onClick={() => sendMessage()} className="bg-[#009AAC] text-white w-8 h-8 rounded-lg flex items-center justify-center" title="Enviar">
                      <span style={{fontSize:"13px"}}>➤</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT - Painel CRM unificado (igual ao Inbox BC) */}
  <InboxRightPanel canal="WhatsApp Meta" initialPhone={selectedConv?.contactNumber} />
          </div>

    )}

      {tab === "internas" && (
        <div className="grid grid-cols-[280px_1fr] min-h-[500px]">
          <div className="border-r border-[#e8e1d2] bg-white">
            <div className="px-3 py-2.5 border-b border-[#e8e1d2] text-[11px] text-[#888780] font-medium">
              EQUIPE ({internalUsers.length})
            </div>
            {internalUsers.length === 0 ? (
              <p className="p-6 text-center text-[11px] text-[#888780]">
                Cadastre usuários em<br/><Link href="/dashboard/configuracoes/usuarios" className="text-[#009AAC]">Configurações → Usuários</Link>
              </p>
            ) : internalUsers.map((u) => (
              <button key={u.id} onClick={() => setInternalSelected(u.id)}
                className={`w-full text-left p-3 border-b border-[#f0e8d4] ${internalSelected === u.id ? "bg-white border-l-[3px] border-l-[#009AAC]" : "bg-white hover:bg-[#f9f9f9]"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[11px] font-medium">
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <div className="text-xs text-[#0E2244] font-medium">{u.name}</div>
                    <div className="text-[10px] text-[#888780]">{u.role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-white p-6 flex flex-col">
            {!internalSelected ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <span style={{fontSize:"36px",color:"#cfd8e0",display:"block",marginBottom:"12px"}}>💌</span>
                  <p className="text-sm text-[#5F5E5A]">Selecione um colega pra mandar uma nota interna</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm text-[#0E2244] font-medium mb-3">
                  Mandar nota para {internalUsers.find((u) => u.id === internalSelected)?.name}
                </h3>
                <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)}
                  rows={6} placeholder="Escreva a nota..."
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none mb-3" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setInternalSelected(null); setInternalNote(""); }} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
                  <button onClick={salvarNotaInterna} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Enviar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "encaminhadas" && (
        <div className="p-8 text-center text-[#5F5E5A] text-sm">
          <p>Conversas encaminhadas pra outra pessoa da equipe — em construção.</p>
        </div>
      )}

      {/* Rodapé gamificação */}
      <div className="px-4 py-2.5 border-t border-[#e8e1d2] bg-white flex items-center gap-4 text-[11px] text-[#5F5E5A] flex-wrap">
        <span className="inline-flex items-center gap-1">🔥 <b className="text-[#C2410C]">—</b> leads quentes</span>
        <span className="inline-flex items-center gap-1">⏱ <b className="text-[#BA7517]">—</b> esperando +1h</span>
        <span className="inline-flex items-center gap-1">💬 Tempo médio: <b>—</b></span>
        <span className="ml-auto inline-flex items-center gap-1">🏆 Streak: <b>—</b></span>
      </div>

      {/* MODAL Nova mensagem com agendamento + scripts */}
      {novaMsgOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNovaMsgOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Nova mensagem</h3>
              <button onClick={() => setNovaMsgOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Telefone (WhatsApp)</label>
            <input value={novaMsgPhone} onChange={(e) => setNovaMsgPhone(e.target.value)} placeholder="+55 85 99999-9999"
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />

            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-[#5F5E5A] font-medium">Mensagem</label>
              <button onClick={() => setNovaMsgScriptOpen(!novaMsgScriptOpen)}
                className={`text-[10px] px-2 py-0.5 rounded ${novaMsgScriptOpen ? "bg-[#FBF0DD] text-[#8a6313]" : "text-[#009AAC] hover:underline"}`}>
                📝 Usar script
              </button>
            </div>
            {novaMsgScriptOpen && (
              <div className="bg-[#f9f9f9] border border-[#e8e1d2] rounded-lg p-2 mb-2 max-h-[140px] overflow-y-auto">
                {SCRIPTS_PLACEHOLDER.map((s) => (
                  <button key={s.titulo} onClick={() => { setNovaMsgText(s.texto); setNovaMsgScriptOpen(false); }}
                    className="text-left block w-full px-2 py-1.5 rounded hover:bg-white">
                    <div className="text-[10px] text-[#5F5E5A]"><b className="text-[#0E2244]">{s.categoria}</b> · {s.titulo}</div>
                    <div className="text-[11px] text-[#5F5E5A] truncate">{s.texto}</div>
                  </button>
                ))}
                <Link href="/dashboard/configuracoes/scripts" className="block text-center text-[10px] text-[#009AAC] mt-1 hover:underline">
                  + Gerenciar scripts em Configurações
                </Link>
              </div>
            )}
            <textarea value={novaMsgText} onChange={(e) => setNovaMsgText(e.target.value)} placeholder="Digite a mensagem..."
              rows={4}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />

            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">
              📅 Agendar para (opcional)
            </label>
            <input type="datetime-local" value={novaMsgScheduledAt} onChange={(e) => setNovaMsgScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            {novaMsgScheduledAt && (
              <p className="text-[10px] text-[#0F6E56] mb-2">
                ⏰ Vai enviar em {new Date(novaMsgScheduledAt).toLocaleString("pt-BR")}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setNovaMsgOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={enviarNovaMensagem} disabled={novaMsgSending} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {novaMsgSending ? (novaMsgScheduledAt ? "Agendando..." : "Enviando...") : (novaMsgScheduledAt ? "Agendar" : "Enviar agora")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Nota clínica no Pet */}
      {notaPetOpen && selectedPet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNotaPetOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Nota clínica — {selectedPet.name}</h3>
              <button onClick={() => setNotaPetOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <textarea value={notaPetText} onChange={(e) => setNotaPetText(e.target.value)}
              rows={5} placeholder="Observação clínica sobre o pet (vai pro prontuário)..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNotaPetOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={salvarNotaPet} disabled={notaPetSaving} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {notaPetSaving ? "Salvando..." : "Salvar nota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Agendar atendimento no Pet */}
      {agendaPetOpen && selectedPet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAgendaPetOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Agendar — {selectedPet.name}</h3>
              <button onClick={() => setAgendaPetOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Data/hora</label>
            <input type="datetime-local" value={agendaPetDate} onChange={(e) => setAgendaPetDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Motivo</label>
            <textarea value={agendaPetDesc} onChange={(e) => setAgendaPetDesc(e.target.value)}
              rows={3} placeholder="Ex: Consulta de rotina, vacina V10..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAgendaPetOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={agendarPet} disabled={agendaPetSaving} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {agendaPetSaving ? "Agendando..." : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Adicionar atendimento */}
      {atendModalOpen && selectedPet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAtendModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Registrar atendimento — {selectedPet.name}</h3>
              <button onClick={() => setAtendModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Data/hora do atendimento</label>
            <input type="datetime-local" value={atendDate} onChange={(e) => setAtendDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Descrição / o que foi conversado</label>
            <textarea value={atendDescricao} onChange={(e) => setAtendDescricao(e.target.value)}
              rows={5} placeholder="Tutora informou que a Mel está com vômito desde ontem..."
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAtendModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={adicionarAtendimento} disabled={atendSaving} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {atendSaving ? "Salvando..." : "Registrar atendimento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Encaminhar */}
      {encaminharOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEncaminharOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Encaminhar conversa</h3>
              <button onClick={() => setEncaminharOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <p className="text-xs text-[#5F5E5A] mb-3">Selecione pra quem encaminhar essa conversa. Funcionalidade completa em construção — por enquanto, registre como nota.</p>
            <div className="flex flex-col gap-1.5">
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#f9f9f9] text-sm">👩‍⚕️ Dra. Vivian (Vet)</button>
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#f9f9f9] text-sm">👩 Ellen (Recepção)</button>
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#f9f9f9] text-sm">👩 Isabela (Recepção)</button>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setEncaminharOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
