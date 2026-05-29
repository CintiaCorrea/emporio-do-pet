"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuPlus, LuSearch, LuUserPlus, LuPencil, LuPhone, LuCalendar,
} from "react-icons/lu";

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
          metadata: c?.metadata || null,
        }));
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
          fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent,
        })));
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
    unread: conversations.reduce((s, c) => s + (c.unreadCount || 0), 0),
  }), [conversations]);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const selectedPet = tutor?.pets?.find((p) => p.id === selectedPetId);
  const primaryPhone = tutor?.contacts?.find((c) => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || selectedConv?.contactNumber;

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? messageInput).trim();
    if (!text || !selectedId) return;
    if (!textOverride) setMessageInput("");
    try {
      await fetch(`/api/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, type: "text" }),
      });
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
        fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent,
      })));
    } catch (e) { console.error(e); }
  };

  const resolverConversa = async () => {
    if (!selectedId || resolvendo) return;
    if (!confirm("Marcar conversa como resolvida?")) return;
    setResolvendo(true);
    try {
      await fetch(`/api/whatsapp/conversations/${selectedId}/close`, { method: "POST" });
      setRefreshTick((t) => t + 1);
      setSelectedId(null);
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
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, content: novaMsgText.trim(), type: "text" }),
      });
      setNovaMsgOpen(false);
      setNovaMsgPhone("");
      setNovaMsgText("");
      setRefreshTick((t) => t + 1);
    } catch (e) { console.error(e); alert("Erro ao enviar. Tente novamente."); }
    finally { setNovaMsgSending(false); }
  };

  return (
    <div className="bg-white border border-[#e8e1d2] rounded-xl overflow-hidden m-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e8e1d2] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <span style={{fontSize:"18px"}}>📥</span>
          <span className="text-lg text-[#0E2244] font-medium">Inbox</span>
          {counts.unread > 0 && (
            <span className="bg-[#E24B4A] text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
              {counts.unread}
            </span>
          )}
          <span className="text-xs text-[#888780] ml-1">Triagem, mensagens e comunicação interna</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#5F5E5A] hidden md:flex items-center gap-1.5">
            <span style={{fontSize:"13px"}}>🏆</span>
            Hoje: <b className="text-[#0F6E56]">— resolvidas</b>
          </span>
          <button onClick={() => setRefreshTick((t) => t + 1)} className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#5F5E5A] flex items-center gap-1.5 hover:bg-[#fdfaee]">
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
        <div className="grid grid-cols-[310px_1fr_340px] min-h-[640px]">
          {/* LEFT - Lista */}
          <div className="border-r border-[#e8e1d2] bg-[#fafafa] flex flex-col">
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
                  className="w-full pl-8 pr-2 py-1.5 border border-[#e8e1d2] rounded-lg text-xs bg-[#fafafa] focus:outline-none focus:border-[#009AAC]" />
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
                    className={`w-full text-left p-2.5 border-b border-[#f0e8d4] ${isSel ? "bg-white border-l-[3px] border-l-[#009AAC]" : "bg-[#fafafa] hover:bg-white"}`}>
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
                  <div className="flex gap-1.5">
                    <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1">
                      <span style={{fontSize:"10px"}}>🤖</span>IA Ativa
                    </span>
                    <button className="bg-[#FBF0DD] text-[#8a6313] text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 hover:bg-[#f5e3c6]">
                      <LuUserPlus className="w-2.5 h-2.5" />Assumir
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#fbfaf6] flex flex-col gap-2 max-h-[420px]">
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
                    <div className="bg-[#fafafa] border border-[#e8e1d2] rounded-lg p-2 mb-2 max-h-[160px] overflow-y-auto">
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

          {/* RIGHT - Ficha estilo Base44 */}
          <div className="border-l border-[#e8e1d2] bg-[#fbfaf6] p-3 flex flex-col gap-3 overflow-y-auto max-h-[700px]">
            {!selectedId ? (
              <div className="flex flex-col gap-3 opacity-50 pointer-events-none">
                <div className="bg-white border border-dashed border-[#e8e1d2] rounded-xl p-3">
                  <div className="text-[10px] text-[#888780] font-medium mb-2">CLIENTE</div>
                  <div className="h-4 bg-[#f0e8d4] rounded w-3/4 mb-1.5"></div>
                  <div className="h-2.5 bg-[#f0e8d4] rounded w-1/2"></div>
                </div>
                <div className="bg-white border border-dashed border-[#e8e1d2] rounded-xl p-3">
                  <div className="text-[10px] text-[#888780] font-medium mb-2">🐾 PETS</div>
                  <div className="h-9 bg-[#f0e8d4] rounded-lg"></div>
                </div>
                <p className="text-center text-[11px] text-[#888780] mt-2">Selecione uma conversa pra ver a ficha</p>
              </div>
            ) : !tutor ? (
              // Lead sem tutor — card com Ver lead, Encaminhar, Resolver
              <>
                <div className="bg-white border border-[#e8e1d2] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#FCEBEB] text-[#A32D2D] text-[10px] px-2 py-0.5 rounded-full font-medium">Lead</span>
                    <button className="text-[10px] text-[#5F5E5A] hover:underline">↗ Ver ficha</button>
                  </div>
                  <div className="text-base text-[#0E2244] font-medium mb-0.5">{selectedConv?.contactName || "Sem nome"}</div>
                  <div className="text-[11px] text-[#888780] mb-3">Lead em triagem</div>
                  <div className="text-[12px] text-[#5F5E5A] flex items-center gap-2 mb-1">
                    📞 {selectedConv?.contactNumber || "—"}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    <button onClick={() => setEncaminharOpen(true)} className="bg-white border border-[#185FA5] text-[#185FA5] py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-[#E6F1FB]">
                      ↗ Encaminhar
                    </button>
                    <button onClick={resolverConversa} disabled={resolvendo} className="bg-white border border-[#0F6E56] text-[#0F6E56] py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-[#E1F5EE] disabled:opacity-50">
                      ✓ {resolvendo ? "Resolvendo..." : "Resolver"}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#888780] text-center">Lead ainda não convertido em cliente. Converta na ficha do lead pra cadastrar pets.</p>
              </>
            ) : (
              <>
                {/* Header da ficha estilo Base44 */}
                <div className="bg-white border border-[#e8e1d2] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] px-2 py-0.5 rounded-full font-medium">Cliente</span>
                    <Link href={`/dashboard/erp/tutores/${tutor.id}`} className="text-[10px] text-[#5F5E5A] hover:underline flex items-center gap-1">
                      ↗ Ver ficha
                    </Link>
                  </div>
                  <div className="text-base text-[#0E2244] font-medium mb-0.5">{tutor.name || "Sem nome"}</div>
                  <div className="text-[11px] text-[#888780] mb-3">Cliente</div>
                  <div className="text-[12px] text-[#5F5E5A] flex items-center gap-2 mb-1">
                    📞 {primaryPhone || "—"}
                  </div>
                  {tutor.email && (
                    <div className="text-[12px] text-[#5F5E5A] flex items-center gap-2 mb-1">
                      ✉️ {tutor.email}
                    </div>
                  )}
                  {tutor.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tutor.tags.slice(0, 4).map((t) => (
                        <span key={t} className="bg-[#E0F4F6] text-[#00798A] text-[9px] px-1.5 py-0.5 rounded-full">⭕ {t}</span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    <button onClick={() => setEncaminharOpen(true)} className="bg-white border border-[#185FA5] text-[#185FA5] py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-[#E6F1FB]">
                      ↗ Encaminhar
                    </button>
                    <button onClick={resolverConversa} disabled={resolvendo} className="bg-white border border-[#0F6E56] text-[#0F6E56] py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-[#E1F5EE] disabled:opacity-50">
                      ✓ {resolvendo ? "..." : "Resolver"}
                    </button>
                  </div>
                </div>

                {/* PETS */}
                <div className="bg-white border border-[#e8e1d2] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#888780] font-medium">🐾 PETS ({tutor.pets?.length || 0})</span>
                    <Link href={`/dashboard/erp/tutores/${tutor.id}`} className="text-[10px] text-[#009AAC] font-medium">+ Cadastrar</Link>
                  </div>
                  {(tutor.pets?.length || 0) === 0 ? (
                    <div className="text-[11px] text-[#888780] text-center py-3">
                      Sem pets cadastrados
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {tutor.pets!.map((p) => {
                        const isSel = selectedPetId === p.id;
                        return (
                          <button key={p.id} onClick={() => setSelectedPetId(p.id)}
                            className={`text-left px-2.5 py-2 rounded-lg flex items-center justify-between ${isSel ? "bg-[#fdfaee] border border-[#009AAC]" : "bg-[#fafafa] border border-transparent hover:bg-[#fdfaee]"}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{PET_EMOJI(p.species)}</span>
                              <div>
                                <span className="text-[12px] text-[#0E2244] font-medium">{p.name}</span>
                                <span className="text-[10px] text-[#888780] ml-1">{p.species}</span>
                              </div>
                            </div>
                            {(p.tags?.length || 0) > 0 && (
                              <span className="bg-[#FBF0DD] text-[#8a6313] text-[9px] px-2 py-0.5 rounded-full">
                                {p.tags![0]}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ações no pet selecionado */}
                {selectedPet && (
                  <div className="bg-white border border-[#e8e1d2] rounded-xl p-3">
                    <div className="text-[10px] text-[#888780] font-medium mb-2">⚡ AÇÕES NO {selectedPet.name.toUpperCase()}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button className="bg-[#fafafa] border border-[#e8e1d2] px-2.5 py-1 rounded text-[10px] text-[#0E2244] flex items-center gap-1 hover:bg-[#fdfaee]">
                        <LuPencil className="w-2.5 h-2.5" />Nota
                      </button>
                      <button className="bg-[#fafafa] border border-[#e8e1d2] px-2.5 py-1 rounded text-[10px] text-[#0E2244] flex items-center gap-1 hover:bg-[#fdfaee]">
                        <LuCalendar className="w-2.5 h-2.5" />Agendar
                      </button>
                      <button className="bg-[#fafafa] border border-[#e8e1d2] px-2.5 py-1 rounded text-[10px] text-[#0E2244] flex items-center gap-1 hover:bg-[#fdfaee]">
                        🩺 Prontuário
                      </button>
                      <button className="bg-[#fafafa] border border-[#e8e1d2] px-2.5 py-1 rounded text-[10px] text-[#0E2244] flex items-center gap-1 hover:bg-[#fdfaee]">
                        🧪 Exame
                      </button>
                    </div>
                  </div>
                )}

                {/* Últimos atendimentos placeholder */}
                <div className="bg-white border border-[#e8e1d2] rounded-xl p-3">
                  <div className="text-[10px] text-[#888780] font-medium mb-2">⏱ ÚLTIMOS ATENDIMENTOS</div>
                  <p className="text-[11px] text-[#5F5E5A] text-center py-2">Nenhum atendimento registrado</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "internas" && (
        <div className="p-8 text-center text-[#5F5E5A] text-sm">
          <p>Comunicação interna entre a equipe — em construção.</p>
          <p className="text-[11px] text-[#888780] mt-1">Vai permitir mencionar colegas, anotar recados pra Vivian/Ellen/Isabela, etc.</p>
        </div>
      )}

      {tab === "encaminhadas" && (
        <div className="p-8 text-center text-[#5F5E5A] text-sm">
          <p>Conversas encaminhadas pra outra pessoa da equipe — em construção.</p>
        </div>
      )}

      {/* Rodapé gamificação */}
      <div className="px-4 py-2.5 border-t border-[#e8e1d2] bg-[#fafafa] flex items-center gap-4 text-[11px] text-[#5F5E5A] flex-wrap">
        <span className="inline-flex items-center gap-1">🔥 <b className="text-[#C2410C]">—</b> leads quentes</span>
        <span className="inline-flex items-center gap-1">⏱ <b className="text-[#BA7517]">—</b> esperando +1h</span>
        <span className="inline-flex items-center gap-1">💬 Tempo médio: <b>—</b></span>
        <span className="ml-auto inline-flex items-center gap-1">🏆 Streak: <b>—</b></span>
      </div>

      {/* MODAL Nova mensagem */}
      {novaMsgOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNovaMsgOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Nova mensagem</h3>
              <button onClick={() => setNovaMsgOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Telefone (WhatsApp)</label>
            <input value={novaMsgPhone} onChange={(e) => setNovaMsgPhone(e.target.value)} placeholder="+55 85 99999-9999"
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Mensagem</label>
            <textarea value={novaMsgText} onChange={(e) => setNovaMsgText(e.target.value)} placeholder="Digite a mensagem..."
              rows={4}
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC] resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNovaMsgOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={enviarNovaMensagem} disabled={novaMsgSending} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {novaMsgSending ? "Enviando..." : "Enviar"}
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
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#fdfaee] text-sm">👩‍⚕️ Dra. Vivian (Vet)</button>
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#fdfaee] text-sm">👩 Ellen (Recepção)</button>
              <button className="text-left px-3 py-2 border border-[#e8e1d2] rounded-lg hover:bg-[#fdfaee] text-sm">👩 Isabela (Recepção)</button>
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
