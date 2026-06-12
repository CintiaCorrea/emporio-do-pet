"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuPlus, LuSearch, LuUserPlus, LuPencil, LuPhone, LuCalendar, LuInbox, LuTrash} from "react-icons/lu";
import EmojiPicker from "@/components/inbox/EmojiPicker";
  import InboxRightPanel from "@/components/inbox/InboxRightPanel";
  import { usePageTitle } from "@/lib/ui/PageHeaderContext";
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
  const { data: __session } = useSession();
  const meId = (__session as any)?.user?.id as string | undefined;

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
  const [internasRecebidas, setInternasRecebidas] = useState<any[]>([]);
  const [internasNoteSel, setInternasNoteSel] = useState<string | null>(null);
  const [internasConvSel, setInternasConvSel] = useState<string | null>(null);
  const [internasReply, setInternasReply] = useState("");
  const [internasCompose, setInternasCompose] = useState(false);

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

  // Carregar profissionais cadastrados (chat interno). Mostra TODOS os profissionais
  // (de /api/profissionais) + admin/recepção (de /api/users) que não sejam profissionais.
  // Quem não tem login (userId null) aparece mas fica desabilitado (não recebe nota interna).
  useEffect(() => {
    (async () => {
      try {
        const [pr, us] = await Promise.all([
          fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
          fetch("/api/users").then((r) => r.json()).catch(() => ({})),
        ]);
        const profs = Array.isArray(pr) ? pr : (pr?.data || pr?.profissionais || pr?.items || []);
        const usersRaw = Array.isArray(us?.data) ? us.data : Array.isArray(us?.users) ? us.users : Array.isArray(us) ? us : [];
        const usados = new Set<string>();
        const list: any[] = [];
        for (const p of profs) {
          const uid = p?.userId || null;
          list.push({ id: uid || ("noacc_" + p.id), name: p?.nomeExibicao || p?.nomeCompleto || p?.nome || "—", role: p?.tipo || p?.especialidade || "Profissional", hasLogin: !!uid });
          if (uid) usados.add(uid);
        }
        for (const u of usersRaw) {
          if (!u?.id || usados.has(u.id)) continue;
          list.push({ id: u.id, name: u?.name || "—", role: u?.role || "", hasLogin: true });
        }
        // ativos com login primeiro
        list.sort((a, b) => Number(b.hasLogin) - Number(a.hasLogin));
        setInternalUsers(list);
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

  // Carregar mensagens internas recebidas (badge + aba Internas) — com poll p/ tempo real
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/internal-notes", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.notes || d.data || []);
        if (alive) setInternasRecebidas(arr);
      } catch {}
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, [refreshTick, tab]);

  // Agrupa as notas internas por colega (conversa contínua) + respostas otimistas
  const internasConversas = useMemo(() => {
    const map: Record<string, any> = {};
    for (const n of internasRecebidas) {
      const mine = !!meId && (n.fromUserId === meId || n.fromUser?.id === meId);
      const otherId = mine ? (n.toUserId || n.toUser?.id) : (n.fromUserId || n.fromUser?.id);
      const otherName = mine ? (n.toUser?.name || "Colega") : (n.fromUser?.name || "Colega");
      if (!otherId) continue;
      if (!map[otherId]) map[otherId] = { userId: otherId, name: otherName, msgs: [], unread: 0 };
      map[otherId].msgs.push({ ...n, mine });
      if (!mine && !n.readAt) map[otherId].unread++;
    }
    const arr: any[] = Object.values(map);
    for (const c of arr) c.msgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    arr.sort((a, b) => new Date(b.msgs[b.msgs.length - 1]?.createdAt || 0).getTime() - new Date(a.msgs[a.msgs.length - 1]?.createdAt || 0).getTime());
    return arr;
  }, [internasRecebidas, meId]);

  const abrirConversaInterna = async (c: any) => {
    setInternasConvSel(c.userId);
    setInternasCompose(false);
    const naoLidas = c.msgs.filter((m: any) => !m.mine && !m.readAt);
    if (naoLidas.length) {
      try { await Promise.all(naoLidas.map((m: any) => fetch(`/api/internal-notes/${m.id}/read`, { method: "PATCH" }))); } catch {}
      setInternasRecebidas((prev: any[]) => prev.map((x: any) => naoLidas.some((m: any) => m.id === x.id) ? { ...x, readAt: new Date().toISOString() } : x));
      window.dispatchEvent(new Event("internas:changed"));
    }
  };

  const enviarRespostaInterna = async (toUserId?: string | null) => {
    const alvo = toUserId || internasConvSel;
    const txt = internasReply.trim();
    if (!txt || !alvo) return;
    try {
      await fetch("/api/internal-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: alvo, content: txt }) });
      setInternasReply("");
      setRefreshTick((t) => t + 1);
    } catch { window.alert("Erro ao enviar. Tente novamente."); }
  };

  const excluirNotaInterna = async (id: string) => {
    if (!window.confirm("Excluir esta mensagem interna?")) return;
    try { await fetch(`/api/internal-notes/${id}`, { method: "DELETE" }); setRefreshTick((t) => t + 1); } catch { window.alert("Erro ao excluir."); }
  };

  const abrirNotaInterna = async (n: any) => {
    setInternasNoteSel(n.id);
    setInternasCompose(false);
    if (!n.readAt) {
      try {
        await fetch(`/api/internal-notes/${n.id}/read`, { method: "PATCH" });
        setInternasRecebidas((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
        window.dispatchEvent(new Event("internas:changed"));
      } catch {}
    }
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
      const alvo = internalSelected;
      setInternalNote("");
      setInternalSelected(null);
      setInternasCompose(false);
      setInternasConvSel(alvo);
      setRefreshTick((t) => t + 1);
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
    <div className="bg-white border border-[#e8e1d2] rounded-xl overflow-hidden mt-1 mb-3 flex flex-col h-[calc(100vh-84px)]" style={{background:"#ffffff"}}>
      {/* Tabs */}
      <div className="px-4 border-b border-[#e8e1d2] flex gap-5 bg-white items-center">
        <button onClick={() => setTab("conversas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "conversas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Conversas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "conversas" ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{counts.total}</span>
        </button>
        <button onClick={() => setTab("internas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "internas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Internas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "internas" ? "bg-[#FEF3C7] text-[#A16207]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{internasRecebidas.filter((n: any) => n.toUserId === meId && !n.readAt).length}</span>
        </button>
        <button onClick={() => setTab("encaminhadas")} className={`py-2.5 text-xs font-medium border-b-2 ${tab === "encaminhadas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Encaminhadas
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[11px] text-[#5F5E5A] hidden lg:flex items-center gap-1.5">Hoje: <b className="text-[#0F6E56]">— resolvidas</b></span>
          <button onClick={() => setRefreshTick((t) => t + 1)} title="Atualizar" className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#5F5E5A] flex items-center gap-1.5 hover:bg-[#f9f9f9]"><span style={{fontSize:"12px"}}>↻</span>Atualizar</button>
          <button onClick={() => setNovaMsgOpen(true)} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova mensagem</button>
        </div>
      </div>

      {tab === "conversas" && (
        <div className="grid grid-cols-[310px_1fr_340px] grid-rows-[minmax(0,1fr)] flex-1 min-h-0">
          {/* LEFT - Lista */}
          <div className="border-r border-[#e8e1d2] bg-white flex flex-col min-h-0">
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
          <div className="bg-white flex flex-col min-h-0 overflow-hidden">
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
                    <EmojiPicker onPick={(em) => setMessageInput((v) => v + em)} />
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
        <div className="grid grid-cols-[300px_1fr] grid-rows-[minmax(0,1fr)] flex-1 min-h-0">
          {/* LEFT - conversas internas (agrupadas por colega) */}
          <div className="border-r border-[#e8e1d2] bg-white flex flex-col min-h-0">
            <div className="px-3 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between">
              <span className="text-[11px] text-[#888780] font-medium">CONVERSAS ({internasConversas.length})</span>
              <button onClick={() => { setInternasCompose(true); setInternasConvSel(null); setInternalSelected(null); setInternalNote(""); }} className="text-[11px] text-[#009AAC] font-medium flex items-center gap-1 hover:underline"><LuPlus className="w-3 h-3" />Nova</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {internasConversas.length === 0 ? (
                <p className="p-6 text-center text-[11px] text-[#888780]">Nenhuma conversa interna ainda.</p>
              ) : internasConversas.map((c) => {
                const last = c.msgs[c.msgs.length - 1];
                return (
                <button key={c.userId} onClick={() => abrirConversaInterna(c)}
                  className={`w-full text-left p-3 border-b border-[#f0e8d4] ${internasConvSel === c.userId ? "bg-[#e6f6f8] border-l-[3px] border-l-[#009AAC]" : "bg-white hover:bg-[#f9f9f9]"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[11px] font-medium flex-shrink-0">{getInitials(c.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs text-[#0E2244] truncate ${c.unread ? "font-semibold" : "font-medium"}`}>{c.name}</span>
                        {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-[#EAB308] flex-shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#888780] truncate">{last?.mine ? "Você: " : ""}{last?.content}</div>
                    </div>
                  </div>
                </button>
              ); })}
            </div>
          </div>
          {/* RIGHT - thread OU compor */}
          <div className="bg-white flex flex-col min-h-0">
            {internasCompose ? (
              <div className="p-6 flex flex-col min-h-0 overflow-y-auto">
                <h3 className="text-sm text-[#0E2244] font-medium mb-3">Nova mensagem interna</h3>
                <div className="mb-3">
                  <label className="text-[11px] text-[#888780] block mb-1">Para</label>
                  <select value={internalSelected || ""} onChange={(e) => setInternalSelected(e.target.value || null)} className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]">
                    <option value="">Selecione um colega...</option>
                    {internalUsers.map((u) => (<option key={u.id} value={u.id} disabled={u.hasLogin === false}>{u.name}{u.role ? ` · ${u.role}` : ""}{u.hasLogin === false ? " · sem login" : ""}</option>))}
                  </select>
                </div>
                <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={6} placeholder="Escreva a mensagem..." className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none mb-3" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setInternasCompose(false); setInternalSelected(null); setInternalNote(""); }} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
                  <button onClick={salvarNotaInterna} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Enviar</button>
                </div>
              </div>
            ) : internasConvSel ? (() => {
              const c = internasConversas.find((x) => x.userId === internasConvSel);
              if (!c) return null;
              return (
                <>
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#e8e1d2] flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[12px] font-medium">{getInitials(c.name)}</div>
                    <div className="text-sm text-[#0E2244] font-medium">{c.name}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0">
                    {c.msgs.map((m: any) => (
                      <div key={m.id} className={`max-w-[75%] ${m.mine ? "self-end" : "self-start"}`}>
                        <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.mine ? "bg-[#009AAC] text-white rounded-br-sm" : "bg-[#f0f3f4] text-[#0E2244] rounded-bl-sm"}`}>{m.content}</div>
                        <div className={`text-[9.5px] text-[#94a3b8] mt-0.5 flex items-center gap-1.5 ${m.mine ? "justify-end" : ""}`}>
                          <span>{(() => { try { return new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}</span>
                          {String(m.id || "").indexOf("local_") !== 0 && <button onClick={() => excluirNotaInterna(m.id)} title="Excluir" className="text-[#cbd5e1] hover:text-[#A32D2D]"><LuTrash className="w-2.5 h-2.5" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#e8e1d2] p-3 flex items-end gap-2 flex-shrink-0">
                    <textarea value={internasReply} onChange={(e) => setInternasReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarRespostaInterna(); } }} rows={1} placeholder="Escreva uma mensagem..." className="flex-1 px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none" />
                    <button onClick={() => enviarRespostaInterna()} disabled={!internasReply.trim()} className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">Enviar</button>
                  </div>
                </>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <LuInbox size={36} className="mx-auto mb-3 text-[#cfd8e0]" />
                  <p className="text-sm text-[#5F5E5A]">Selecione uma conversa<br/>ou clique em "Nova" pra enviar</p>
                </div>
              </div>
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
