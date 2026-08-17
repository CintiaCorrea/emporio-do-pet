"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { setInternasAberta } from "@/lib/ui/inboxPresence";

import { useEffect, useMemo, useState, useRef, Fragment, type ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications";

// Rótulo do separador de data entre mensagens (estilo WhatsApp): Hoje / Ontem / dd/mm/aaaa.
function rotuloDia(iso: string): string {
  try {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (mesmoDia(d, hoje)) return "Hoje";
    if (mesmoDia(d, ontem)) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
}
import toast from "react-hot-toast";
import { useSession, signOut } from "next-auth/react";
import { imprimirDocumento } from "@/lib/print";
import Link from "next/link";
import {
  LuPlus, LuSearch, LuUserPlus, LuPencil, LuPhone, LuCalendar, LuInbox, LuTrash} from "react-icons/lu";
import EmojiPicker from "@/components/inbox/EmojiPicker";
import BoletimModal from "@/components/pets/BoletimModal";
import NovoAgendamentoModal from "@/components/agendamentos/NovoAgendamentoModal";
  import InboxRightPanel from "@/components/inbox/InboxRightPanel";
  import { usePageTitle } from "@/lib/ui/PageHeaderContext";
type Tab = "conversas" | "internas" | "encaminhadas";
type ListFilter = "todos" | "leads" | "clientes";

interface Conversation {
  id: string;
  contactName: string | null;
  contactPushName?: string | null; // nome que a pessoa usa NO WhatsApp (perfil) — quem está digitando
  contactNumber: string;
  lastMessageAt: string;
  unreadCount: number;
  manualUnread?: boolean; // marcada como "não lida" à mão
  status: string;
  tutor?: { id: string; name: string } | null;
  leadMotivoPerda?: string | null; // motivo da perda (lead sem cliente marcado como Perdido)
  assignedUser?: { id: string; name: string } | null;
  source?: string;
  metadata?: { source?: string; [k: string]: any };
  lastMessage?: { content: string | null; direction: string; type?: string } | null;
  tags?: string[];
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string | null;
  type: string;
  createdAt: string;
  fromAgent?: boolean;
  mediaType?: string | null;
  hasMedia?: boolean;
  /** id da mensagem no WhatsApp — é por ele que uma resposta cita a outra */
  waMessageId?: string | null;
  /** preenchido quando ESTA mensagem é resposta a outra */
  replyToWaMessageId?: string | null;
  /** metadados (ex.: latitude/longitude de uma localização) */
  metadata?: any;
  /** status de entrega: SENT/DELIVERED/READ/FAILED (mostra os ✓✓) */
  status?: string | null;
  /** true quando esta mensagem foi encaminhada */
  encaminhado?: boolean;
  /** emoji com que o CLIENTE reagiu a esta mensagem */
  reaction?: string | null;
  /** emoji com que a EQUIPE reagiu a esta mensagem */
  myReaction?: string | null;
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

// Renderiza texto do WhatsApp no nosso inbox: quebras de linha + *negrito* _itálico_
// ~tachado~ — igual o cliente vê no app. Antes o inbox mostrava os asteriscos crus.
function inlineWa(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0]; const inner = tok.slice(1, -1);
    if (tok[0] === "*") out.push(<b key={k++}>{inner}</b>);
    else if (tok[0] === "_") out.push(<i key={k++}>{inner}</i>);
    else out.push(<s key={k++}>{inner}</s>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
function renderWa(texto: string): ReactNode {
  return (texto || "").split("\n").map((linha, i) => (
    <span key={i}>{i > 0 && <br />}{inlineWa(linha)}</span>
  ));
}
// Igual ao renderWa, mas realça (grifo amarelo) as ocorrências do termo buscado.
function renderWaHL(texto: string, termo: string): ReactNode {
  const t = (termo || "").trim().toLowerCase();
  if (!t) return renderWa(texto);
  return (texto || "").split("\n").map((linha, i) => {
    const parts: ReactNode[] = [];
    let rest = linha;
    let guard = 0;
    while (guard++ < 300) {
      const idx = rest.toLowerCase().indexOf(t);
      if (idx < 0) { if (rest) parts.push(<Fragment key={parts.length}>{inlineWa(rest)}</Fragment>); break; }
      if (idx > 0) parts.push(<Fragment key={parts.length}>{inlineWa(rest.slice(0, idx))}</Fragment>);
      parts.push(<mark key={parts.length} style={{ background: "#FFD84D", color: "inherit", borderRadius: "3px", padding: "0 1px" }}>{rest.slice(idx, idx + t.length)}</mark>);
      rest = rest.slice(idx + t.length);
      if (!rest) break;
    }
    return <span key={i}>{i > 0 && <br />}{parts}</span>;
  });
}

export default function InboxUnificadoPage() {
  usePageTitle("Inbox Meta", "Conversas WhatsApp Business via API Meta");
  const [tab, setTab] = useState<Tab>("conversas");
  const [filter, setFilter] = useState<ListFilter>("todos");
  const [viewResp, setViewResp] = useState<"todas" | "minhas" | "livres">("todas");
  // ⏰ SLA de resposta: cliente esperando há mais de X min = conversa sobe pro topo e
  // pisca (pedido da Cintia 23/07, p/ ninguém ficar esquecido). Configurável depois.
  const SLA_ESPERA_MIN = 15;
  // Há quanto tempo o cliente espera resposta (ms), ou -1 se não está esperando.
  // "Esperando" = a ÚLTIMA mensagem foi DELE (INBOUND) e ainda não respondemos —
  // vale mesmo depois de abrir/ler a conversa (abrir não é responder). Antes isso
  // dependia de "não-lida", então ABRIR a conversa apagava o aviso de atrasada.
  const esperaRespostaMs = (c: any): number => {
    // Conversa ENCERRADA não espera resposta — sem relógio, sem destaque, sem subir pro topo.
    // (Muitas terminam com um "ok"/emoji de confirmação; o relógio ali só polui.)
    if (String(c?.status).toUpperCase() === "CLOSED") return -1;
    const dir = (c as any)?.lastMessage?.direction;
    const esperando = dir ? dir === "INBOUND" : (c?.unreadCount || 0) > 0; // fallback se a direção não vier
    return esperando && c?.lastMessageAt ? Date.now() - new Date(c.lastMessageAt).getTime() : -1;
  };
  const [verEncerradas, setVerEncerradas] = useState(false); // mostrar conversas já encerradas (pra reler)
  const [filtrosOpen, setFiltrosOpen] = useState(false); // roll-up dos filtros (ocupa menos espaço)
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convError, setConvError] = useState<string | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null); // âncora p/ rolar até a última mensagem
  const msgScrollRef = useRef<HTMLDivElement>(null); // container rolável das mensagens (p/ saber se está no fim)
  const stickBottomRef = useRef(true); // true = usuário está no fim → pode rolar; false = subiu pra ler → NÃO puxa
  const prevSelRef = useRef<string | null>(null); // detecta TROCA de conversa (aí sim rola pro fim ao abrir)
  const internasEndRef = useRef<HTMLDivElement>(null); // idem, nas mensagens internas
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneParam, setPhoneParam] = useState(""); // ?phone= vindo dos botões "💬 WhatsApp"
  const autoPhoneDone = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [respondendo, setRespondendo] = useState<Message | null>(null); // mensagem sendo citada
  // Buscar DENTRO da conversa aberta (como o WhatsApp): 🔍 no topo → barrinha com contador + setas.
  const [buscaChatOpen, setBuscaChatOpen] = useState(false);
  const [buscaChat, setBuscaChat] = useState("");
  const [buscaIdx, setBuscaIdx] = useState(0);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Reagir a uma mensagem com emoji (como o WhatsApp): paleta que abre ao passar o mouse.
  const [reagindoId, setReagindoId] = useState<string | null>(null);
  const [anexando, setAnexando] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false); // pop-up de agendar consulta
  // Boletim de fisioterapia (abre a ficha de boletim do pet como popup)
  const [boletimPet, setBoletimPet] = useState<any | null>(null);
  const [boletimPicker, setBoletimPicker] = useState<any[] | null>(null); // quando o tutor tem +1 pet
  const [boletimLoading, setBoletimLoading] = useState(false);
  async function abrirBoletim() {
    const tid = selectedConv?.tutor?.id;
    if (!tid) { toast("Boletim é por pet cadastrado — este contato ainda não tem ficha de cliente.", { icon: "🐾" }); return; }
    setBoletimLoading(true);
    try {
      const r = await fetch(`/api/pets?tutorId=${tid}&limit=50`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      const pets = (Array.isArray(d) ? d : (d.pets || d.data || [])).filter((p: any) => p && p.id);
      if (pets.length === 0) { toast("Este cliente não tem pet cadastrado.", { icon: "🐾" }); return; }
      if (pets.length === 1) setBoletimPet(pets[0]);
      else setBoletimPicker(pets); // deixa escolher qual pet
    } catch { toast.error("Não consegui carregar os pets do cliente."); }
    finally { setBoletimLoading(false); }
  }

  // Envia anexo. O texto que estiver digitado vira a legenda (só foto/vídeo/documento
  // aceitam legenda — figurinha e áudio, não; o servidor cuida disso).
  async function enviarAnexo(file: File) {
    if (!selectedId || anexando) return;
    setAnexando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const legenda = messageInput.trim();
      if (legenda) fd.append("caption", legenda);
      if (respondendo?.waMessageId) fd.append("replyToWaMessageId", respondendo.waMessageId);
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/media`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "falha ao enviar");
      setMessageInput("");
      setRespondendo(null);
      setRefreshTick((t) => t + 1);
      setMsgTick((t) => t + 1); // recarrega o thread aberto → o anexo enviado aparece na hora
      toast.success("Anexo enviado");
    } catch (e: any) {
      // Erro do Meta (janela de 24h, formato, tamanho) chega inteiro aqui — melhor
      // a atendente ler o motivo do que ver o anexo sumir sem explicação.
      toast.error(String(e?.message || e).slice(0, 140));
    } finally {
      setAnexando(false);
    }
  }

  // === Figurinhas: biblioteca da clínica (Configurações › Figurinhas) enviadas com 1 clique ===
  const [stickersOpen, setStickersOpen] = useState(false);
  const [stickersList, setStickersList] = useState<{ id: string; nome?: string | null; url: string }[]>([]);
  const [stickersCarregados, setStickersCarregados] = useState(false);
  const [enviandoSticker, setEnviandoSticker] = useState(false);
  async function abrirStickers() {
    setStickersOpen((v) => !v);
    if (stickersCarregados) return;
    try {
      const r = await fetch("/api/whatsapp/stickers", { cache: "no-store" });
      const d = await r.json().catch(() => []);
      setStickersList(Array.isArray(d) ? d : []);
      setStickersCarregados(true);
    } catch { /* deixa vazio; a tela mostra o aviso */ }
  }
  async function enviarSticker(stickerId: string) {
    if (!selectedId || enviandoSticker) return;
    setEnviandoSticker(true);
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/send-sticker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "falha ao enviar");
      setStickersOpen(false);
      setRefreshTick((t) => t + 1);
      setMsgTick((t) => t + 1);
    } catch (e: any) {
      toast.error(String(e?.message || e).slice(0, 140));
    } finally {
      setEnviandoSticker(false);
    }
  }
  // === Gravar áudio (microfone) e enviar como mensagem de voz ===
  const [gravando, setGravando] = useState(false);
  const [gravSeg, setGravSeg] = useState(0);
  const gravRecRef = useRef<MediaRecorder | null>(null);
  const gravChunksRef = useRef<Blob[]>([]);
  const gravTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gravCancelRef = useRef(false);
  async function iniciarGravacao() {
    if (gravando || anexando || !selectedId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      gravChunksRef.current = [];
      gravCancelRef.current = false;
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) gravChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (gravTimerRef.current) { clearInterval(gravTimerRef.current); gravTimerRef.current = null; }
        setGravando(false); setGravSeg(0);
        if (gravCancelRef.current) return;
        const blob = new Blob(gravChunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 800) { toast.error("Gravação muito curta."); return; }
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: blob.type });
        await enviarAnexo(file);
      };
      gravRecRef.current = rec;
      rec.start();
      setGravando(true); setGravSeg(0);
      gravTimerRef.current = setInterval(() => setGravSeg((s) => s + 1), 1000);
    } catch {
      toast.error("Não consegui acessar o microfone. Permita o acesso no navegador.");
    }
  }
  function pararEnviarGravacao() { gravCancelRef.current = false; gravRecRef.current?.stop(); }
  function cancelarGravacao() { gravCancelRef.current = true; gravRecRef.current?.stop(); }

  const [tutor, setTutor] = useState<TutorFull | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [msgTick, setMsgTick] = useState(0); // recarrega as mensagens da conversa aberta (tempo real)
  const { data: __session } = useSession();
  const meId = (__session as any)?.user?.id as string | undefined;

  // ⚡ Tempo real: quando chega/sai uma mensagem no WhatsApp, atualiza a lista e, se for a
  // conversa aberta, recarrega as mensagens — sem esperar o poll de 25–30s.
  // ⚠️ DEBOUNCE (29/07): a lista NÃO recarrega uma vez por mensagem (isso martelava o banco
  // com vários atendentes e reabria a instabilidade). Rajada de mensagens = UMA recarga da
  // lista, ~1,2s depois. As mensagens da conversa ABERTA continuam atualizando na hora.
  const refreshDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useNotifications({
    onWhatsAppMessage: (e) => {
      if (refreshDebRef.current) clearTimeout(refreshDebRef.current);
      refreshDebRef.current = setTimeout(() => setRefreshTick((t) => t + 1), 1200);
      if (e?.conversationId && e.conversationId === selectedId) setMsgTick((t) => t + 1);
    },
  });
  const meNome = ((__session as any)?.user?.name as string | undefined) || ""; // preenche o {{3}} dos modelos
  // A assinatura pegava a 1ª palavra do nome: com "Dra. Vivian Corrêa" saía só "Dra.".
  // Aqui o título é separado do nome, e a assinatura vira "Dra. Vivian".
  const assinaturaNome = (() => {
    const partes = meNome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "";
    const ehTitulo = /^(dr|dra|drª|sr|sra|srª|vet|prof)\.?$/i;
    const titulo = partes.length > 1 && ehTitulo.test(partes[0]) ? partes[0] : "";
    const nome = titulo ? partes[1] : partes[0];
    return (titulo ? `${titulo} ${nome}` : nome).trim();
  })();
  const primeiroNome = assinaturaNome;
  const [assinar, setAssinar] = useState(true); // assina a mensagem com o nome de quem envia
  // Etiquetas de conversa (Fatia 4) — as que têm "Conversa" no aplicaEm, de Configurações › Etiquetas
  const [convEtiquetas, setConvEtiquetas] = useState<{ texto: string; cor: string }[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false); // menu ⋮ do cabeçalho
  const [filtroTag, setFiltroTag] = useState<string>("");
  useEffect(() => {
    fetch("/api/etiquetas/templates").then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : (d.templates || d.data || []);
      setConvEtiquetas(arr.filter((e: any) => e.ativo !== false && (e.aplicaEm || []).includes("Conversa")).map((e: any) => ({ texto: e.texto, cor: e.cor || "#009AAC" })));
    }).catch(() => {});
  }, []);
  const corTag = (texto: string) => convEtiquetas.find((e) => e.texto === texto)?.cor || "#8A928F";
  async function toggleTag(texto: string) {
    if (!selectedId) return;
    const conv = conversations.find((c) => c.id === selectedId);
    const atual = conv?.tags || [];
    const novas = atual.includes(texto) ? atual.filter((t) => t !== texto) : [...atual, texto];
    setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, tags: novas } : c))); // otimista
    try { await fetch(`/api/whatsapp/conversations/${selectedId}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: novas }) }); }
    catch { toast.error("Não consegui salvar a etiqueta."); }
  }

  // Modais
  const [novaMsgOpen, setNovaMsgOpen] = useState(false);
  const [novaMsgPhone, setNovaMsgPhone] = useState("");
  const [novaMsgText, setNovaMsgText] = useState("");
  const [novaMsgAnexo, setNovaMsgAnexo] = useState<File | null>(null);
  const [novaMsgSending, setNovaMsgSending] = useState(false);

  const [scriptsOpen, setScriptsOpen] = useState(false);
  // Mensagens prontas REAIS (Configurações › Scripts) — antes usava um placeholder fixo, então
  // os scripts cadastrados não apareciam aqui. Carrega ao abrir o painel.
  const [scriptsList, setScriptsList] = useState<{ titulo: string; texto: string; categoria?: string }[]>([]);
  useEffect(() => {
    if (!scriptsOpen) return;
    fetch("/api/scripts", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : (d.scripts || d.data || d.itens || []);
      setScriptsList(arr.filter((s: any) => s?.ativo !== false).map((s: any) => ({ titulo: s.nome, texto: s.conteudo || "", categoria: s.category?.nome || "" })));
    }).catch(() => {});
  }, [scriptsOpen]);
  const [acoesOpen, setAcoesOpen] = useState(false);
  // Atalhos rápidos de PIX e endereço (mockup aprovado 28/07). Dados fixos por enquanto (futuro: Config › Dados da Clínica).
  const MSG_PIX = "💠 *Chave PIX (CNPJ)*\n45110096000189";
  const MSG_ENDERECO = "📍 *Empório do Pet*\nAv. Eng. Leal Lima Verde, 205\nEdson Queiroz — Fortaleza/CE · CEP 60833-175\n\n🗺️ Como chegar:\nhttps://maps.google.com/?q=-3.7899632,-38.4759969";
  const [encaminharOpen, setEncaminharOpen] = useState(false);
  const [resolvendo, setResolvendo] = useState(false);
  // Encaminhar mídia/texto (uma ou VÁRIAS selecionadas) para outra conversa
  const [fwdMsgId, setFwdMsgId] = useState<string | null>(null);
  const [fwdBatch, setFwdBatch] = useState(false);
  const [fwdBusca, setFwdBusca] = useState("");
  const [fwdEnviando, setFwdEnviando] = useState(false);
  const [selMode, setSelMode] = useState(false);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const entrarSelecao = (id: string) => { setSelMode(true); setSelIds(new Set([id])); };
  const sairSelecao = () => { setSelMode(false); setSelIds(new Set()); };
  // Encaminhar UMA mensagem: também passa pelo lote (assim texto e mídia funcionam igual).
  const abrirEncaminhar = (msgId: string) => { setSelIds(new Set([msgId])); setFwdMsgId(null); setFwdBatch(true); setFwdBusca(""); };
  const abrirEncaminharLote = () => { if (!selIds.size) return; setFwdMsgId(null); setFwdBatch(true); setFwdBusca(""); };
  const encaminharPara = async (conversationId: string, nome: string) => {
    setFwdEnviando(true);
    const t = toast.loading("Encaminhando…");
    try {
      let ok = false, msg = "";
      if (fwdBatch) {
        const r = await fetch(`/api/whatsapp/messages/forward-batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msgIds: [...selIds], conversationId }) });
        const d = await r.json().catch(() => null);
        ok = r.ok && (d?.enviados ?? 0) > 0;
        msg = ok ? `${d.enviados} mensagem(ns) encaminhada(s) para ${nome} ✓${d.falhas ? ` (${d.falhas} falhou/falharam)` : ""}` : (d?.erro || d?.message || "Não consegui encaminhar (janela de 24h?).");
      } else if (fwdMsgId) {
        const r = await fetch(`/api/whatsapp/messages/${fwdMsgId}/forward`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId }) });
        const d = await r.json().catch(() => null);
        ok = r.ok && d?.success; msg = ok ? `Encaminhado para ${nome} ✓` : (d?.message || "Não consegui encaminhar (janela de 24h?).");
      }
      if (ok) { toast.success(msg, { id: t }); setFwdMsgId(null); setFwdBatch(false); sairSelecao(); }
      else toast.error(msg, { id: t });
    } catch { toast.error("Erro ao encaminhar.", { id: t }); } finally { setFwdEnviando(false); }
  };
  // ✓ enviado · ✓✓ entregue · ✓✓ azul lido · ⚠️ falhou (dados já vêm do backend)
  const statusTick = (m: any) => {
    if (m.direction !== "OUTBOUND") return null;
    if (m.status === "READ") return <span title="Lida" style={{ color: "#8DE0FF" }}>✓✓</span>;
    if (m.status === "DELIVERED") return <span title="Entregue">✓✓</span>;
    if (m.status === "FAILED") return <span title="Falhou" style={{ color: "#ffd0d0" }}>⚠️</span>;
    if (m.status === "SENT") return <span title="Enviada">✓</span>;
    return null;
  };

  // Controles IA / Agentes
  const [agentes, setAgentes] = useState<Array<{id: string; name: string}>>([]);
  const [autoReply, setAutoReply] = useState(true);
  const [assumida, setAssumida] = useState(false);

  // Agendamento de mensagem
  const [novaMsgScheduledAt, setNovaMsgScheduledAt] = useState("");
  const [novaMsgScriptOpen, setNovaMsgScriptOpen] = useState(false);
  // Iniciar conversa: busca de contato por nome + seletor de template do Meta
  const [novaMsgBusca, setNovaMsgBusca] = useState("");
  const [novaMsgResults, setNovaMsgResults] = useState<any[]>([]);
  const buscaSeqRef = useRef(0); // ordem das buscas do "Para quem?" (evita resposta atrasada apagar a lista)
  const [novaMsgNome, setNovaMsgNome] = useState("");
  const [novaMsgPet, setNovaMsgPet] = useState(""); // pet ESCOLHIDO por quem atende — vira {{2}}
  const [tutorSel, setTutorSel] = useState<any>(null); // cliente escolhido, com a lista de pets dele
  const [buscaPet, setBuscaPet] = useState(""); // campo do pet quando ainda não há cliente escolhido
  const [petResults, setPetResults] = useState<any[]>([]);
  const buscaPetSeqRef = useRef(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [novaMsgTemplate, setNovaMsgTemplate] = useState("");
  const [novaMsgVars, setNovaMsgVars] = useState<string[]>([]);
  const [templateSending, setTemplateSending] = useState(false);

  // Internas — usuários da clínica
  const [internalUsers, setInternalUsers] = useState<Array<{id: string; name: string; email: string; role: string}>>([]);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [internasAnexo, setInternasAnexo] = useState<{ url: string; name: string } | null>(null);
  const [anexandoDoc, setAnexandoDoc] = useState(false);
  const [internasRecebidas, setInternasRecebidas] = useState<any[]>([]);
  const [internasNoteSel, setInternasNoteSel] = useState<string | null>(null);
  const [internasConvSel, setInternasConvSel] = useState<string | null>(null);
  const [internasReply, setInternasReply] = useState("");
  const [internasCompose, setInternasCompose] = useState(false);

  // Aba Internas aberta? → o RecadoPopup não popa recado interno enquanto a pessoa está aqui.
  useEffect(() => { setInternasAberta(tab === "internas"); return () => setInternasAberta(false); }, [tab]);

  // Colar PRINT (imagem do clipboard) direto na conversa interna → vira anexo pra enviar.
  function colarNasInternas(e: any) {
    const items = e?.clipboardData?.items; if (!items) return;
    for (const it of Array.from(items) as any[]) {
      if (it.type && it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) {
          e.preventDefault();
          const nome = (blob.name && blob.name !== "image.png") ? blob.name : `captura-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
          uploadDocInterno(new File([blob], nome, { type: blob.type || "image/png" }));
        }
        return;
      }
    }
  }

  // Divisórias de data (estilo WhatsApp) nas mensagens internas.
  const mesmoDia = (a: string, b: string) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
  const rotuloDia = (s: string) => {
    const d = new Date(s); const hoje = new Date(); const ont = new Date(); ont.setDate(hoje.getDate() - 1);
    const eq = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (eq(d, hoje)) return "Hoje";
    if (eq(d, ont)) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

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
          if (u?.isBlocked) continue; // funcionário removido/bloqueado não aparece no chat interno
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
    let alive = true;
    const sigC = (a: any[]) => a.map((c: any) => `${c.id}|${c.status}|${c.assignedUser?.id || ""}|${c.unreadCount}|${c.lastMessageAt}|${(c.metadata?.tags || c.tags || []).join(">")}`).join(",");
    const carregar = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Encerradas: busca só as CLOSED (pra reler). Normal: as abertas.
        const res = await fetch(`/api/whatsapp/conversations?limit=400${verEncerradas ? "&status=CLOSED" : ""}`, { cache: "no-store" });
        if (!res.ok) {
          // Tropeço NUNCA apaga conversas já carregadas — a atendente continua vendo a
          // caixa mesmo durante um reinício/soluço. Só mostra aviso; só fica vazio se
          // ainda não havia nada (primeira carga sem nenhum dado).
          // 401 (sessão expirada) é sinalizado SEMPRE, mesmo no poll silencioso — senão
          // a lista trava sem aviso e parece que "as mensagens pararam de entrar".
          if (res.status === 401) setSessaoExpirada(true);
          if (!silent) {
            setConvError(res.status === 401
              ? "Sua sessão expirou. Saia e entre de novo para ver as conversas."
              : "Conexão instável — mostrando a última lista carregada.");
          }
          return;
        }
        setConvError(null); setSessaoExpirada(false);
        const data = await res.json().catch(() => ({}));
        const raw = Array.isArray(data?.conversations) ? data.conversations
                  : Array.isArray(data?.data) ? data.data
                  : Array.isArray(data) ? data : [];
        const safe = raw.map((c: any) => ({
          id: c?.id || Math.random().toString(),
          contactName: c?.contactName || null,
          contactPushName: c?.contactPushName || null,
          contactNumber: c?.contactPhone || c?.contactNumber || "",
          lastMessageAt: c?.lastMessageAt || c?.createdAt || new Date().toISOString(),
          unreadCount: typeof c?.unreadCount === "number" ? c.unreadCount : 0,
          manualUnread: !!c?.manualUnread,
          status: c?.status || "OPEN",
          tutor: c?.tutor ? { id: c.tutor.id, name: c.tutor.name } : null,
          assignedUser: c?.assignedUser ? { id: c.assignedUser.id, name: c.assignedUser.name } : null,
          leadMotivoPerda: c?.leadMotivoPerda || null,
          source: c?.metadata?.source || c?.source || null,
          metadata: c?.metadata || null,
          // Prévia da última mensagem — o backend já manda (messages take:1), só não era usado.
          lastMessage: c?.messages?.[0] ? { content: c.messages[0].content ?? null, direction: c.messages[0].direction || "INBOUND", type: c.messages[0].type } : null,
          tags: Array.isArray(c?.metadata?.tags) ? c.metadata.tags : []}));
        // Modo encerradas mostra só as CLOSED; modo normal esconde as CLOSED.
        const visiveis = verEncerradas
          ? safe.filter((c: any) => String(c.status).toUpperCase() === "CLOSED")
          : safe.filter((c: any) => String(c.status).toUpperCase() !== "CLOSED");
        // Só troca o estado (re-renderiza) se a lista realmente mudou.
        if (alive) setConversations((prev) => (sigC(prev) === sigC(visiveis) ? prev : visiveis));
      } catch { if (!silent) setConvError("Conexão instável — mostrando a última lista carregada."); }
      finally { if (!silent) setLoading(false); }
    };
    carregar(false);
    const id = setInterval(() => carregar(true), 25000);
    return () => { alive = false; clearInterval(id); };
  }, [refreshTick, verEncerradas]);

  // Botões "💬 WhatsApp" (ficha do cliente/pet) abrem /dashboard/inbox-nativo?phone=<digitos>.
  // Lê o telefone da URL e ABRE a conversa existente; se não houver, inicia uma nova com o número.
  useEffect(() => {
    try { const ph = (new URLSearchParams(window.location.search).get("phone") || "").replace(/\D/g, ""); if (ph) setPhoneParam(ph); } catch {}
  }, []);
  useEffect(() => {
    if (!phoneParam || autoPhoneDone.current || loading) return;
    const p8 = phoneParam.slice(-8);
    const match = conversations.find((c) => (c.contactNumber || "").replace(/\D/g, "").slice(-8) === p8);
    autoPhoneDone.current = true;
    if (match) { setSelectedId(match.id); return; }
    // Não há conversa ainda → abre "Nova conversa" JÁ com o cliente/pet (não só o telefone).
    let nome = "", pet = "";
    try { const u = new URLSearchParams(window.location.search); nome = u.get("nome") || ""; pet = u.get("pet") || ""; } catch {}
    abrirNovaConversa({ phone: phoneParam, busca: nome || phoneParam });
    if (nome) buscarContatoNova(nome); // mostra o cliente nos resultados pra escolher
    if (pet) setNovaMsgPet(pet);
  }, [conversations, phoneParam, loading]);

  // Mensagens da conversa selecionada — carrega ao abrir + poll leve (12s).
  // Desacoplado do array de conversas: não recarrega quando a lista atualiza.
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let cancel = false;
    setMessages([]); // troca de conversa: limpa pra não mostrar msg da conversa anterior
    const carregar = async () => {
      try {
        const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=200`);
        // Tropeço não apaga as mensagens já na tela — mantém a conversa visível.
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.data) ? data.data
                    : Array.isArray(data?.messages) ? data.messages
                    : Array.isArray(data) ? data : [];
        const next = list.map((m: any) => ({
          id: m?.id || Math.random().toString(),
          direction: m?.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
          content: typeof m?.content === "string" ? m.content : null,
          type: m?.type || "TEXT",
          createdAt: m?.createdAt || new Date().toISOString(),
          fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent, mediaType: m?.mediaType || null, hasMedia: !!(m?.mediaCloudUrl || m?.mediaUrl), status: m?.status || null, encaminhado: !!m?.metadata?.encaminhado,
          waMessageId: m?.waMessageId || null,
          reaction: m?.reaction ?? null, myReaction: m?.myReaction ?? null,
          replyToWaMessageId: m?.metadata?.replyToWaMessageId || null, metadata: m?.metadata || null }));
        // Só troca o array se ALGO mudou (id/status/reação) — senão mantém a MESMA referência.
        // Sem isso, o poll de 8s recriava tudo e o efeito de scroll te jogava pro fim toda vez ("pulo").
        const sig = (arr: any[]) => arr.map((m) => `${m.id}:${m.status || ""}:${m.myReaction || ""}:${m.reaction || ""}:${m.hasMedia ? 1 : 0}`).join("|");
        if (!cancel) setMessages((prev) => (sig(prev) === sig(next) ? prev : next));
      } catch { /* tropeço: mantém as mensagens que já estão na tela */ }
    };
    // Abrir a conversa já zera o unreadCount no servidor (getMessages) — avisa o menu p/ sumir o badge na hora.
    carregar().then(() => { if (!cancel) window.dispatchEvent(new Event("whatsapp:read")); });
    const id = setInterval(carregar, 8000);
    return () => { cancel = true; clearInterval(id); };
  }, [selectedId, msgTick]);

  // Contexto (cliente) da conversa — só recarrega quando MUDA o cliente selecionado.
  const selTutorId = conversations.find((c) => c.id === selectedId)?.tutor?.id || null;
  useEffect(() => {
    if (!selTutorId) { setTutor(null); setSelectedPetId(null); return; }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/tutors/${selTutorId}`);
        const t = await r.json().catch(() => null);
        if (!cancel && t && t.id) { setTutor(t); setSelectedPetId(t.pets?.[0]?.id || null); }
      } catch { if (!cancel) setTutor(null); }
    })();
    return () => { cancel = true; };
  }, [selTutorId]);

  // Rola até a última mensagem SÓ quando faz sentido: (a) você abriu/trocou de conversa, ou
  // (b) você já está no fim (acompanhando). Se subiu pra ler o histórico, NÃO puxa mais → fim do "pulo".
  useEffect(() => {
    const trocouConversa = prevSelRef.current !== selectedId;
    prevSelRef.current = selectedId;
    if (trocouConversa) stickBottomRef.current = true; // abrir conversa sempre começa no fim
    if (!stickBottomRef.current) return; // usuário subiu pra ler → preserva a posição
    const t = setTimeout(() => msgEndRef.current?.scrollIntoView({ block: "end" }), 60);
    return () => clearTimeout(t);
  }, [messages, selectedId]);

  const filtered = useMemo(() => {
    let arr = [...conversations];
    if (filter === "leads") arr = arr.filter((c) => !c.tutor?.id);
    if (filter === "clientes") arr = arr.filter((c) => c.tutor?.id);
    // Responsável: Minhas (atribuídas a mim) · Livres (sem responsável) · Todas
    if (viewResp === "minhas") arr = arr.filter((c) => c.assignedUser?.id && c.assignedUser.id === meId);
    if (viewResp === "livres") arr = arr.filter((c) => !c.assignedUser?.id);
    if (filtroTag) arr = arr.filter((c) => (c.tags || []).includes(filtroTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      // Busca pelos DOIS nomes (cadastro e WhatsApp) — a atendente pode digitar qualquer um.
      arr = arr.filter((c) =>
        c.tutor?.name?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.contactNumber.includes(q),
      );
    }
    // ⏰ Cliente esperando resposta há mais de SLA_ESPERA_MIN: sobe pro topo,
    // quem espera há MAIS tempo primeiro. As demais mantêm a ordem normal.
    const esperaDe = (c: any) => esperaRespostaMs(c);
    const atrasou = (c: any) => esperaDe(c) > SLA_ESPERA_MIN * 60000;
    arr.sort((a: any, b: any) => Number(atrasou(b)) - Number(atrasou(a)) || (atrasou(a) && atrasou(b) ? esperaDe(b) - esperaDe(a) : 0));
    return arr;
  }, [conversations, filter, search, viewResp, meId, filtroTag]);

  // Encaminhadas pra mim e ainda não abertas — vira o badge da aba Encaminhadas.
  const encaminhadasCount = useMemo(() => conversations.filter((c) => c.assignedUser?.id === meId && (c.unreadCount || 0) > 0).length, [conversations, meId]);
  // TODAS as conversas atribuídas a mim — uma conversa transferida SEM mensagem nova também
  // precisa aparecer, senão quem recebeu a transferência não vê nada.
  // Encaminhadas = passadas PRA MIM e ainda NÃO respondidas (última msg do cliente OU não lida).
  // Assim que respondo (última msg vira minha), some da aba. (Cintia 23/07: antes ficavam as já atendidas.)
  const minhasAtribuidas = useMemo(() => conversations.filter((c) => c.assignedUser?.id === meId && ((c as any).lastMessage?.direction === "INBOUND" || (c.unreadCount || 0) > 0)), [conversations, meId]);
  const internasNaoLidas = useMemo(() => internasRecebidas.filter((n: any) => n.toUserId === meId && !n.readAt).length, [internasRecebidas, meId]);

  // Transferir pra outro atendente. Usa o MESMO endpoint do "assumir" (assign-user),
  // que sempre aceitou qualquer userId — só faltava a tela pra escolher quem.
  const [transferindo, setTransferindo] = useState(false);
  async function transferirPara(userId: string, nome: string) {
    if (!selectedId || !userId) return;
    setTransferindo(true);
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/assign-user`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
      });
      if (!r.ok) throw new Error();
      // #7 — garante o AVISO pra quem recebeu pelo mesmo caminho do recado (que já popa):
      // manda um recado interno com o link da conversa. Best-effort.
      const cliente = selectedConv?.tutor?.name || selectedConv?.contactName || selectedConv?.contactNumber || "um cliente";
      fetch(`/api/internal-notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: userId, content: `📨 Te passei a conversa de ${cliente} — abra o inbox pra atender.`, conversationId: selectedId }),
      }).catch(() => undefined);
      toast.success(`Conversa transferida para ${nome}`);
      setEncaminharOpen(false);
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Não consegui transferir a conversa."); }
    finally { setTransferindo(false); }
  }
  // === Exportar conversa em PDF (documento com papel timbrado) ===
  const [exportOpen, setExportOpen] = useState(false);
  const [exportAuto, setExportAuto] = useState(true);
  const [exportando, setExportando] = useState(false);

  // === Galeria de mídia da conversa (fotos/vídeos/áudios/docs juntos, como o WhatsApp) ===
  type GalItem = { id: string; type: string; createdAt: string; content?: string | null };
  const [galeriaOpen, setGaleriaOpen] = useState(false);
  const [galeriaLoading, setGaleriaLoading] = useState(false);
  const [galeriaItens, setGaleriaItens] = useState<GalItem[]>([]);
  const [galeriaFiltro, setGaleriaFiltro] = useState<"todos" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT">("todos");
  async function abrirGaleria() {
    if (!selectedId) return;
    setGaleriaOpen(true);
    setGaleriaFiltro("todos");
    setGaleriaLoading(true);
    setGaleriaItens([]);
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=3000`);
      const d = await r.json().catch(() => ({}));
      const lista: any[] = Array.isArray(d?.data) ? d.data : Array.isArray(d?.messages) ? d.messages : Array.isArray(d) ? d : [];
      const midias = lista
        .filter((m) => m?.hasMedia && ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "STICKER"].includes(m?.type))
        .map((m) => ({ id: m.id, type: m.type === "STICKER" ? "IMAGE" : m.type, createdAt: m.createdAt || m.sentAt, content: m.content }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setGaleriaItens(midias);
    } catch {
      toast.error("Não foi possível carregar a galeria.");
    } finally {
      setGaleriaLoading(false);
    }
  }

  // A equipe reage a uma mensagem. Clicar no MESMO emoji remove a reação.
  const EMOJIS_REACAO = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  async function reagir(msgId: string, emoji: string) {
    const atual = messages.find((m) => m.id === msgId)?.myReaction ?? null;
    const novo = atual === emoji ? "" : emoji;
    setReagindoId(null);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, myReaction: novo || null } : m)));
    try {
      const r = await fetch(`/api/whatsapp/messages/${msgId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: novo }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, myReaction: atual } : m)));
      toast.error("Não consegui enviar a reação.");
    }
  }

  // Marca a conversa aberta como "não lida" (lembrete) e volta pra lista (senão o poll reabre e limpa).
  async function marcarConversaNaoLida() {
    if (!selectedId) return;
    const id = selectedId;
    setHeaderMenuOpen(false);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, manualUnread: true, unreadCount: c.unreadCount || 0 } : c)));
    setSelectedId(null);
    try {
      await fetch(`/api/whatsapp/conversations/${id}/mark-unread`, { method: "POST" });
      setRefreshTick((t) => t + 1);
      toast.success("Marcada como não lida");
    } catch {
      toast.error("Não consegui marcar como não lida.");
    }
  }

  function ehMsgAutomatica(m: any): boolean {
    const meta = m?.metadata || {};
    return meta.fromSystem === true || meta.senderType === "SYSTEM" || meta.senderType === "AI" || m?.type === "TEMPLATE";
  }
  function escHtml(s: any): string {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function waHtml(s: any): string {
    let t = escHtml(s);
    t = t.replace(/\*(.+?)\*/g, "<b>$1</b>").replace(/_(.+?)_/g, "<i>$1</i>").replace(/~(.+?)~/g, "<s>$1</s>");
    return t.replace(/\n/g, "<br>");
  }
  async function imgDataUri(id: string): Promise<string | null> {
    try {
      const r = await fetch(`/api/whatsapp/messages/${id}/media`);
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => res(null); fr.readAsDataURL(blob); });
    } catch { return null; }
  }
  async function exportarConversa() {
    if (!selectedId) return;
    setExportando(true);
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=3000`);
      const d = await r.json().catch(() => ({}));
      let lista: any[] = Array.isArray(d?.data) ? d.data : Array.isArray(d?.messages) ? d.messages : Array.isArray(d) ? d : [];
      lista = [...lista].sort((a, b) => new Date(a.createdAt || a.sentAt || 0).getTime() - new Date(b.createdAt || b.sentAt || 0).getTime());
      if (!exportAuto) lista = lista.filter((m) => !ehMsgAutomatica(m));
      if (lista.length === 0) { toast.error("Sem mensagens para exportar."); setExportando(false); return; }

      const clienteNome = selectedConv?.tutor?.name || selectedConv?.contactName || selectedConv?.contactNumber || "Cliente";
      const tel = selectedConv?.contactNumber || "";
      const petNome = (tutor?.pets?.[0] as any)?.name || "";
      const fmtDH = (v: any) => { try { return new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
      const fmtD = (v: any) => { try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return ""; } };

      // Pré-carrega imagens como dataURI (máx 60) — assim aparecem no PDF sem depender de rede.
      const MAX_IMG = 60; let imgCount = 0; const imgs: Record<string, string> = {};
      for (const m of lista) {
        if (m.type === "IMAGE" && imgCount < MAX_IMG) { const du = await imgDataUri(m.id); if (du) { imgs[m.id] = du; imgCount++; } }
      }

      const linhas = lista.map((m) => {
        const inbound = m.direction === "INBOUND";
        const meta = m.metadata || {};
        const quem = inbound ? clienteNome : `Empório do Pet · ${meta.senderName || (meta.senderType === "SYSTEM" || meta.fromSystem ? "Sistema" : meta.senderType === "AI" ? "Atendimento (IA)" : "Equipe")}`;
        const cap = m.mediaCaption ? waHtml(m.mediaCaption) : "";
        let corpo = "";
        if (m.type === "IMAGE") corpo = (imgs[m.id] ? `<div><img src="${imgs[m.id]}" style="max-width:280px;max-height:210px;border-radius:5px;border:1px solid #dfe7e9;margin-top:4px" /></div>` : `<span class="anx">📷 imagem</span>`) + (cap ? `<div>${cap}</div>` : "");
        else if (m.type === "AUDIO") corpo = `<span class="anx">🎤 áudio</span>${cap ? " " + cap : ""}`;
        else if (m.type === "DOCUMENT") corpo = `<span class="anx">📄 documento${cap ? " · " + cap : ""}</span>`;
        else if (m.type === "VIDEO") corpo = `<span class="anx">🎬 vídeo</span>${cap ? " " + cap : ""}`;
        else if (m.type === "STICKER") corpo = `<span class="anx">🩹 figurinha</span>`;
        else if (m.type === "LOCATION") corpo = `<span class="anx">📍 localização</span>`;
        else if (m.type === "BUTTON") corpo = `<span class="anx">🔘 ${escHtml(meta.payload || m.content || "resposta")}</span>`;
        else corpo = waHtml(m.content || "");
        return `<div class="msg ${inbound ? "cli" : "emp"}"><div class="qd">${fmtDH(m.createdAt)}</div><div><span class="qm">${escHtml(quem)}:</span> ${corpo}</div></div>`;
      }).join("");

      const html = `
        <div class="cab"><h2>Registro de Conversa — WhatsApp</h2>
          <div class="emit">Emitido em ${fmtDH(new Date().toISOString())}${meNome ? ` por ${escHtml(meNome)}` : ""}</div></div>
        <table class="ident"><tbody>
          <tr><td><b>Cliente:</b> ${escHtml(clienteNome)}</td><td><b>Telefone:</b> ${escHtml(tel)}</td></tr>
          <tr><td><b>Pet:</b> ${escHtml(petNome || "—")}</td><td><b>Período:</b> ${fmtD(lista[0].createdAt)} a ${fmtD(lista[lista.length - 1].createdAt)}</td></tr>
          <tr><td><b>Total de mensagens:</b> ${lista.length}</td><td><b>Canal:</b> WhatsApp Business (API Meta)</td></tr>
        </tbody></table>
        <h3 class="tt">Transcrição${exportAuto ? "" : " (só conversa real)"}</h3>
        <div>${linhas}</div>
        <style>
          .cab { border-bottom: 2px solid #009AAC; padding-bottom: 8px; margin-bottom: 12px; }
          .cab .emit { font-size: 11px; color: #4b5563; }
          .ident { background: #FAF8F3; border: 1px solid #E7E2D6; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }
          .ident td { padding: 5px 12px; }
          .tt { text-transform: uppercase; letter-spacing: .04em; font-size: 13px; }
          .msg { display: grid; grid-template-columns: 96px 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid #F2EFE8; font-size: 12px; page-break-inside: avoid; }
          .msg .qd { color: #4b5563; font-size: 11px; }
          .msg .qm { font-weight: 700; }
          .cli .qm { color: #8a5a00; } .emp .qm { color: #00798A; }
          .anx { display: inline-block; background: #F4F7F8; border: 1px solid #dfe7e9; border-radius: 5px; padding: 2px 7px; font-size: 11px; color: #37474f; }
        </style>`;

      await imprimirDocumento(`Conversa - ${clienteNome}`, html);
      setExportOpen(false);
    } catch { toast.error("Erro ao exportar a conversa."); }
    finally { setExportando(false); }
  }

  // Assumir o atendimento: fico responsável (assignedUserId = eu). Não esconde de ninguém.
  async function assumirAtendimento() {
    if (!selectedId || !meId) return;
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/assign-user`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: meId }),
      });
      if (!r.ok) throw new Error();
      toast.success("Você assumiu o atendimento");
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Não consegui assumir o atendimento."); }
  }

  // Devolve a conversa pro GERAL (desatribui): fica livre pra qualquer atendente pegar.
  // É o mesmo endpoint do assumir, só que com userId = null.
  async function devolverAoGeral() {
    if (!selectedId) return;
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/assign-user`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: null }),
      });
      if (!r.ok) throw new Error();
      setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, assignedUser: null } : c));
      toast.success("Conversa devolvida ao geral");
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Não consegui devolver a conversa."); }
  }

  // "Pedir a conversa": manda um recado INTERNO pro atendente que está com ela,
  // em vez de responder por cima. Ele decide se devolve.
  async function pedirConversa() {
    if (!selectedId || !selectedConv?.assignedUser?.id) return;
    const cliente = selectedConv?.tutor?.name || selectedConv?.contactName || "o cliente";
    try {
      const r = await fetch("/api/internal-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedConv.assignedUser.id, content: `🙋 ${meNome || "Alguém da equipe"} quer assumir a conversa de ${cliente}. Se puder, devolve ao geral.` }),
      });
      if (!r.ok) throw new Error();
      toast.success("Pedido enviado pro atendente 👍");
    } catch { toast.error("Não consegui enviar o pedido."); }
  }

  // Solicitar avaliação (NPS → Google Meu Negócio) do cliente desta conversa. Só pra CLIENTE
  // com ficha (tutor). Manda a pergunta "de 1 a 5" pela API — quando o cliente responde, o
  // sistema envia o link do Google. Igual ao botão da ficha do cliente.
  async function solicitarAvaliacaoNPS() {
    const tid = selectedConv?.tutor?.id;
    if (!tid) { toast("Avaliação é pra cliente com ficha — este contato ainda não tem cadastro.", { icon: "⭐" }); return; }
    try {
      const r = await fetch(`/api/survey-avaliacao/enviar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tid }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.success) throw new Error(d?.error || "Falha ao enviar");
      toast.success("Pesquisa de avaliação enviada 📲");
    } catch (e: any) { toast.error(e?.message || "Erro ao enviar a avaliação"); }
  }

  const counts = useMemo(() => ({
    total: conversations.length,
    leads: conversations.filter((c) => !c.tutor?.id).length,
    clientes: conversations.filter((c) => c.tutor?.id).length,
    unread: conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)}), [conversations]);

  // AVISO de mensagem nova: quando o total de não-lidas sobe, toca um bip + toast
  // e mostra o contador no título da aba (pra perceber mesmo em outra aba).
  const prevUnread = useRef<number | null>(null);
  useEffect(() => {
    const u = counts.unread || 0;
    if (prevUnread.current !== null && u > prevUnread.current) {
      toast("🔔 Nova mensagem no inbox", { duration: 3500 });
      try {
        const AC = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AC();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.05;
        o.start(); o.stop(ctx.currentTime + 0.15);
      } catch { /* som é best-effort */ }
    }
    prevUnread.current = u;
    try { document.title = u > 0 ? `(${u}) Inbox Meta` : "Inbox Meta"; } catch { /* */ }
  }, [counts.unread]);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const selectedPet = tutor?.pets?.find((p) => p.id === selectedPetId);

  // Busca na conversa: ids das mensagens (em ordem) que contêm o termo.
  const buscaMatches = useMemo(() => {
    const t = buscaChat.trim().toLowerCase();
    if (!t) return [] as string[];
    return messages.filter((m) => (m.content || "").toLowerCase().includes(t)).map((m) => m.id);
  }, [messages, buscaChat]);
  // Ao mudar o termo (ou abrir), começa pelo resultado mais RECENTE (último), como o WhatsApp.
  useEffect(() => {
    if (buscaChatOpen && buscaMatches.length) setBuscaIdx(buscaMatches.length - 1);
  }, [buscaChat, buscaChatOpen, buscaMatches.length]);
  // Rola até o resultado atual e o realça.
  useEffect(() => {
    if (!buscaChatOpen || !buscaMatches.length) return;
    const el = msgRefs.current[buscaMatches[buscaIdx]];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [buscaIdx, buscaMatches, buscaChatOpen]);
  // Trocar de conversa fecha a busca.
  useEffect(() => { setBuscaChatOpen(false); setBuscaChat(""); }, [selectedId]);
  const primaryPhone = tutor?.contacts?.find((c) => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || selectedConv?.contactNumber;

  // ⏱️ Janela de 24h do WhatsApp: só dá pra mandar TEXTO LIVRE se o cliente respondeu nas últimas 24h.
  // Fora disso o Meta EXIGE um MODELO (template) aprovado. Avisamos ANTES de a pessoa tentar (e recebe erro).
  const janelaAberta = useMemo(() => {
    const ins = messages.filter((m) => m.direction === "INBOUND" && m.createdAt);
    if (!ins.length) return false; // cliente nunca respondeu → precisa de modelo
    const ult = Math.max(...ins.map((m) => new Date(m.createdAt).getTime()));
    return Date.now() - ult < 24 * 60 * 60 * 1000;
  }, [messages]);

  const sendMessage = async (textOverride?: string) => {
    const raw = (textOverride ?? messageInput).trim();
    if (!raw || !selectedId) return;
    if (!textOverride) setMessageInput("");
    setRespondendo(null); // a citação vale pra UMA resposta só
    // Atalho: "/cadastro" vira a mensagem com o link público de cadastro.
    const linkCadastro = (typeof window !== "undefined" ? window.location.origin : "") + "/queremos-te-conhecer";
    let text = /^\/cadastro$/i.test(raw)
      ? `Vamos confirmar o atendimento do seu pet! 🐾 Para isso, precisamos te conhecer um pouquinho melhor — é rapidinho: ${linkCadastro}\n\nAssim que você preencher, seu agendamento fica confirmado! 💙`
      : raw;
    // Assinatura: sai o primeiro nome de quem está logado na frente da mensagem
    // (limpo, sem markup — fica legível tanto no WhatsApp quanto na nossa caixa).
    // *texto* = negrito no WhatsApp.
    if (assinar && assinaturaNome) text = `*${assinaturaNome}*:\n${text}`;
    try {
      const r = await fetch(`/api/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          type: "TEXT",
          // Só cita se a mensagem escolhida tiver id no WhatsApp (as antigas de teste não têm).
          ...(respondendo?.waMessageId ? { replyToWaMessageId: respondendo.waMessageId } : {}),
        })});
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("Send message failed:", r.status, body);
        alert(`Erro ao enviar (HTTP ${r.status}). Tenta de novo ou recarrega.`);
        return;
      }
      // Assumir automaticamente: se a conversa está LIVRE, quem respondeu vira o
      // responsável (sem precisar clicar em "Assumir"). Não rouba de quem já atende.
      const convAtual = conversations.find((c) => c.id === selectedId);
      if (meId && convAtual && !convAtual.assignedUser?.id) {
        setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, assignedUser: { id: meId, name: meNome || "você" } } : c));
        fetch(`/api/whatsapp/conversations/${selectedId}/assign-user`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: meId }),
        }).catch(() => { /* assumir é best-effort; não trava o envio */ });
      }
      const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=200`);
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.data) ? data.data
                  : Array.isArray(data?.messages) ? data.messages : [];
      setMessages(list.map((m: any) => ({
        id: m?.id || Math.random().toString(),
        direction: m?.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
        content: typeof m?.content === "string" ? m.content : null,
        type: m?.type || "TEXT",
        createdAt: m?.createdAt || new Date().toISOString(),
        fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent, mediaType: m?.mediaType || null, hasMedia: !!(m?.mediaCloudUrl || m?.mediaUrl),
          waMessageId: m?.waMessageId || null,
          reaction: m?.reaction ?? null, myReaction: m?.myReaction ?? null,
          replyToWaMessageId: m?.metadata?.replyToWaMessageId || null, metadata: m?.metadata || null})));
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
    if (!phone || (!novaMsgText.trim() && !novaMsgAnexo)) {
      alert("Telefone e mensagem (ou anexo) são obrigatórios.");
      return;
    }
    setNovaMsgSending(true);
    try {
      if (novaMsgAnexo) {
        // Anexo (documento/foto/vídeo): o texto vai como LEGENDA (uma mensagem só).
        // Áudio/figurinha não aceitam legenda no WhatsApp → o texto vai como mensagem separada.
        // (Agendamento não vale pra anexo — vai agora.)
        const re = await fetch("/api/whatsapp/conversations/ensure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phone }) });
        const rj = await re.json().catch(() => ({}));
        if (!re.ok || !rj?.conversationId) throw new Error(rj?.message || "Não consegui abrir a conversa");
        const convId = rj.conversationId;
        const mime = novaMsgAnexo.type || "";
        const semLegenda = mime.startsWith("audio/") || mime === "image/webp";
        const texto = novaMsgText.trim();
        const fd = new FormData();
        fd.append("file", novaMsgAnexo);
        if (texto && !semLegenda) fd.append("caption", texto);
        const rm = await fetch(`/api/whatsapp/conversations/${convId}/media`, { method: "POST", body: fd });
        const mj = await rm.json().catch(() => ({}));
        if (!rm.ok) throw new Error(mj?.message || mj?.error || "Falha ao enviar o anexo");
        // Áudio/figurinha: manda o texto logo em seguida pra ele não se perder.
        if (texto && semLegenda) {
          await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, content: texto, type: "TEXT" }) }).catch(() => null);
        }
        toast.success("Enviado");
      } else if (novaMsgScheduledAt) {
        // Agendamento via /api/whatsapp/schedule
        await fetch("/api/whatsapp/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: phone,
            content: novaMsgText.trim(),
            scheduledFor: new Date(novaMsgScheduledAt).toISOString()})});
        toast.success("Agendado");
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
      setNovaMsgAnexo(null);
      setRefreshTick((t) => t + 1);
    } catch (e: any) { console.error(e); toast.error(String(e?.message || "Erro ao enviar").slice(0, 140)); }
    finally { setNovaMsgSending(false); }
  };

  // Carrega os templates aprovados do Meta ao abrir "Nova conversa".
  useEffect(() => {
    if (!novaMsgOpen) return;
    (async () => {
      try {
        const r = await fetch("/api/whatsapp-templates", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        const arr = Array.isArray(d?.templates) ? d.templates : Array.isArray(d) ? d : (d.data || []);
        setTemplates(arr.filter((t: any) => (t.status || "").toUpperCase() === "APPROVED"));
      } catch { setTemplates([]); }
    })();
  }, [novaMsgOpen]);

  // Busca contato por nome (clientes + leads) pra preencher o telefone.
  // Porta ÚNICA do modal: abre sempre do zero e só então aplica o que veio de fora.
  // Antes cada botão abria direto e cada envio limpava um conjunto diferente de campos,
  // então sobrava telefone/busca/modelo da vez anterior.
  const abrirNovaConversa = (pre?: { phone?: string; busca?: string; texto?: string }) => {
    setNovaMsgPhone(pre?.phone || "");
    setNovaMsgBusca(pre?.busca || "");
    setNovaMsgText(pre?.texto || "");
    setNovaMsgNome("");
    setNovaMsgPet("");
    setTutorSel(null);
    setBuscaPet("");
    setPetResults([]);
    setNovaMsgResults([]);
    setNovaMsgTemplate("");
    setNovaMsgVars([]);
    setNovaMsgScheduledAt("");
    setNovaMsgOpen(true);
  };
  const buscarContatoNova = async (q: string) => {
    setNovaMsgBusca(q);
    // Cada tecla dispara uma busca; sem isso a resposta de "cin" chega DEPOIS da de
    // "cintia" e apaga a lista — a caixinha de sugestões fechava sozinha.
    const seq = ++buscaSeqRef.current;
    if (q.trim().length < 2) { setNovaMsgResults([]); return; }
    try {
      const [rt, rl] = await Promise.all([
        fetch(`/api/tutors?search=${encodeURIComponent(q.trim())}&take=6`, { cache: "no-store" }),
        fetch(`/api/leads?search=${encodeURIComponent(q.trim())}&limit=6`, { cache: "no-store" }),
      ]);
      const dt = await rt.json().catch(() => ({})); const dl = await rl.json().catch(() => ({}));
      const tuts = (Array.isArray(dt) ? dt : (dt.tutors || dt.data || [])).map((t: any) => ({
        nome: t.name,
        tel: (t.contacts?.find((c: any) => c.isPrimary) || t.contacts?.[0])?.number || t.phone || "",
        tipo: t.classificacao || "Cliente",
        pets: (t.pets || []).map((p: any) => p.name).filter(Boolean),
      }));
      const leads = (Array.isArray(dl) ? dl : (dl.leads || dl.data || [])).map((l: any) => ({ nome: l.name || "Lead", tel: l.phone || "", tipo: "Lead" }));
      if (seq !== buscaSeqRef.current) return; // busca antiga: já tem uma mais nova, ignora
      setNovaMsgResults([...tuts, ...leads].filter((x) => x.tel).slice(0, 8));
    } catch { if (seq === buscaSeqRef.current) setNovaMsgResults([]); }
  };
  // Escolher o cliente NÃO escolhe o pet: com vários pets, quem atende decide.
  // (Antes eu pegava o primeiro da lista e destacava como se fosse certeza — foi assim
  // que a "Cão" apareceu escolhida numa cliente com 6 pets.)
  const pickContatoNova = (c: any, petJa?: string) => {
    setNovaMsgPhone(c.tel); setNovaMsgNome(c.nome); setNovaMsgBusca(c.nome); setNovaMsgResults([]);
    setTutorSel(c);
    setBuscaPet(""); setPetResults([]);
    // Só preenche sozinho quando não há dúvida: veio do campo de pet, ou o cliente tem 1 pet.
    const pet = petJa || ((c.pets || []).length === 1 ? c.pets[0] : "");
    setNovaMsgPet(pet);
    setNovaMsgVars((vs) => (vs.length ? vs.map((v, i) => varPadrao(i, c.nome, pet) ?? v) : vs));
  };
  // Escolher pelo PET preenche os dois campos — não tem dúvida de qual pet é.
  const pickPetNova = (c: any, pet: string) => pickContatoNova(c, pet);
  // Troca só o pet (a listinha), com o cliente já escolhido.
  const trocarPet = (pet: string) => {
    setNovaMsgPet(pet);
    setNovaMsgVars((vs) => (vs.length ? vs.map((v, i) => (i === 1 ? pet : v)) : vs));
  };
  // Busca no campo do PET (só usada quando ainda não escolheram o cliente).
  const buscarPetNova = async (q: string) => {
    setBuscaPet(q);
    const seq = ++buscaPetSeqRef.current;
    if (q.trim().length < 2) { setPetResults([]); return; }
    try {
      const r = await fetch(`/api/tutors?search=${encodeURIComponent(q.trim())}&take=8`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      const arr = Array.isArray(d) ? d : (d.tutors || d.data || []);
      const termo = q.trim().toLowerCase();
      // Uma linha por PET que casou — é o pet que a pessoa está procurando.
      const linhas: any[] = [];
      for (const t of arr) {
        const pets = (t.pets || []).map((p: any) => p.name).filter(Boolean);
        const tel = (t.contacts?.find((c: any) => c.isPrimary) || t.contacts?.[0])?.number || t.phone || "";
        if (!tel) continue;
        for (const p of pets.filter((n: string) => n.toLowerCase().includes(termo))) {
          linhas.push({ pet: p, tutor: { nome: t.name, tel, tipo: t.classificacao || "Cliente", pets } });
        }
      }
      if (seq !== buscaPetSeqRef.current) return;
      setPetResults(linhas.slice(0, 8));
    } catch { if (seq === buscaPetSeqRef.current) setPetResults([]); }
  };
  // Convenção dos modelos do Meta: {{1}} cliente · {{2}} pet · {{3}} quem atende.
  // Só PRÉ-preenche — dá pra editar, e o texto do modelo aparece montado logo acima.
  const varPadrao = (i: number, nome: string, pet: string): string | null => {
    if (i === 0) return nome || null;
    if (i === 1) return pet || null;
    if (i === 2) return meNome || null;
    return null;
  };
  // Texto do corpo do template + nº de variáveis
  const templateBody = (name: string): string => {
    const t = templates.find((x) => x.name === name);
    const body = (t?.components || []).find((c: any) => (c.type || "").toUpperCase() === "BODY");
    return body?.text || "";
  };
  const onSelectTemplate = (name: string) => {
    setNovaMsgTemplate(name);
    const nVars = (templateBody(name).match(/\{\{\d+\}\}/g) || []).length;
    const arr = Array.from({ length: nVars }, (_, i) => varPadrao(i, novaMsgNome, novaMsgPet) || "");
    setNovaMsgVars(arr);
  };
  const enviarTemplate = async () => {
    const phone = novaMsgPhone.replace(/\D/g, "");
    if (!phone) { alert("Escolha o contato ou digite o telefone."); return; }
    if (!novaMsgTemplate) { alert("Escolha um modelo."); return; }
    if (novaMsgVars.some((v) => !v.trim())) { alert("Preencha todas as variáveis do modelo."); return; }
    const t = templates.find((x) => x.name === novaMsgTemplate);
    let preview = templateBody(novaMsgTemplate);
    novaMsgVars.forEach((v, i) => { preview = preview.replace(`{{${i + 1}}}`, v); });
    setTemplateSending(true);
    try {
      const r = await fetch("/api/whatsapp/send-template", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, templateName: novaMsgTemplate, language: t?.language || "pt_BR", params: novaMsgVars.map((v) => ({ type: "text", text: v })), preview }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.success === false) { alert(d?.error || "Não consegui enviar o modelo."); return; }
      toast.success("Conversa iniciada 🚀");
      setNovaMsgOpen(false); setNovaMsgPhone(""); setNovaMsgNome(""); setNovaMsgBusca(""); setNovaMsgTemplate(""); setNovaMsgVars([]);
      setRefreshTick((t) => t + 1);
    } catch { alert("Erro ao enviar o modelo."); }
    finally { setTemplateSending(false); }
  };

  // Carregar mensagens internas recebidas (badge + aba Internas) — com poll p/ tempo real
  useEffect(() => {
    let alive = true;
    const sig = (a: any[]) => a.map((x) => x.id + (x.readAt || "")).join(",");
    const load = async () => {
      try {
        const r = await fetch("/api/internal-notes", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.notes || d.data || []);
        // Só re-renderiza se algo mudou (evita re-render da página inteira à toa).
        if (alive) setInternasRecebidas((prev) => (sig(prev) === sig(arr) ? prev : arr));
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
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

  // Abre a conversa interna já na ÚLTIMA mensagem (rola pro fim ao abrir e quando chega msg nova).
  const nMsgsInternaAtiva = useMemo(() => internasConversas.find((x) => x.userId === internasConvSel)?.msgs.length || 0, [internasConversas, internasConvSel]);
  useEffect(() => {
    if (tab !== "internas" || !internasConvSel) return;
    const t = setTimeout(() => internasEndRef.current?.scrollIntoView({ block: "end" }), 60);
    return () => clearTimeout(t);
  }, [tab, internasConvSel, nMsgsInternaAtiva]);

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

  async function uploadDocInterno(file: File) {
    setAnexandoDoc(true);
    try {
      // Mesmo caminho de upload do WhatsApp/exames (storage S3 que já funciona) —
      // antes ia pro Cloudinary, que não está configurado.
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/media/upload?pasta=documentos&origem=interno", { method: "POST", body: fd });
      const up = await r.json().catch(() => ({}));
      if (!r.ok || !up?.url) throw new Error(up?.message || up?.error || "Falha no upload");
      setInternasAnexo({ url: up.url, name: file.name });
    } catch (e: any) { window.alert("Erro ao anexar: " + (e?.message || "")); }
    finally { setAnexandoDoc(false); }
  }
  const enviarRespostaInterna = async (toUserId?: string | null) => {
    const alvo = toUserId || internasConvSel;
    const txt = internasReply.trim();
    if ((!txt && !internasAnexo) || !alvo) return;
    try {
      await fetch("/api/internal-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: alvo, content: txt, attachmentUrl: internasAnexo?.url, attachmentName: internasAnexo?.name }) });
      setInternasReply(""); setInternasAnexo(null);
      setRefreshTick((t) => t + 1);
    } catch { window.alert("Erro ao enviar. Tente novamente."); }
  };

  const excluirNotaInterna = async (id: string) => {
    if (!(await confirmDelete({ entityLabel: "mensagem", itemName: "esta mensagem interna" }))) return;
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
    if (!internalSelected || (!internalNote.trim() && !internasAnexo)) {
      alert("Selecione uma pessoa e digite a mensagem (ou anexe um documento).");
      return;
    }
    try {
      await fetch("/api/internal-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: internalSelected,
          content: internalNote.trim(),
          attachmentUrl: internasAnexo?.url,
          attachmentName: internasAnexo?.name,
          conversationId: selectedId || null})});
      const alvo = internalSelected;
      setInternalNote(""); setInternasAnexo(null);
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
      {/* Sessão expirada: aviso GRANDE e impossível de ignorar. Sem isso a lista trava
          sem explicação e parece que "as mensagens pararam de entrar". */}
      {sessaoExpirada && (
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: "#FCE9EF", borderBottom: "2px solid #E9A6B8" }}>
          <span className="text-[18px]">🔒</span>
          <div className="flex-1 min-w-[220px]">
            <div className="text-[13px] font-semibold" style={{ color: "#B23A57" }}>Sua sessão expirou — o inbox parou de atualizar</div>
            <div className="text-[12px]" style={{ color: "#8a4a5a" }}>Nenhuma mensagem foi perdida. Entre de novo para voltar a receber as conversas em tempo real.</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="text-[13px] font-medium text-white px-4 py-2 rounded-lg" style={{ background: "#B23A57" }}>Entrar de novo</button>
        </div>
      )}
      {/* Tabs */}
      <div className="px-4 border-b border-[#e8e1d2] flex gap-4 md:gap-5 bg-white items-center overflow-x-auto [&>button]:shrink-0">
        <button onClick={() => setTab("conversas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "conversas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Conversas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "conversas" ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{counts.total}</span>
        </button>
        <button onClick={() => setTab("internas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 px-2 -mx-2 rounded-t-md ${tab === "internas" ? "border-[#009AAC] text-[#0E2244]" : internasNaoLidas > 0 ? "border-[#0F6E56] text-[#0F6E56] bg-[#E1F5EE]" : "border-transparent text-[#888780]"}`}>
          {internasNaoLidas > 0 && tab !== "internas" && <span className="w-2 h-2 rounded-full bg-[#0F6E56] animate-pulse" />}
          Internas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${internasNaoLidas > 0 && tab !== "internas" ? "bg-[#0F6E56] text-white" : tab === "internas" ? "bg-[#FEF3C7] text-[#A16207]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{internasNaoLidas}</span>
        </button>
        <button onClick={() => setTab("encaminhadas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "encaminhadas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Encaminhadas
          {minhasAtribuidas.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${encaminhadasCount > 0 ? "bg-[#E24B4A] text-white" : "bg-[#E0F4F6] text-[#00798A]"}`}>{minhasAtribuidas.length}</span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          {/* Assinatura das mensagens — ligar/desligar aqui no cabeçalho (no lugar do "Hoje").
              Controla o mesmo estado `assinar` do compositor: quando ligado, prefixa o nome de quem envia. */}
          <button
            onClick={() => setAssinar((v) => !v)}
            title={assinar ? `Assinando as mensagens como "${primeiroNome || "você"}" — clique para desligar` : "Mensagens sem assinatura — clique para assinar com seu nome"}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition"
            style={{ borderColor: assinar ? "#009AAC" : "#cfd8e0", background: assinar ? "#E0F4F6" : "#fff", color: assinar ? "#00798A" : "#5F5E5A" }}>
            <span style={{ fontSize: "12px" }}>✍️</span>
            <span className="hidden sm:inline">Assinar{assinar ? <>: <b>{primeiroNome || "on"}</b></> : ": off"}</span>
            <span className={`w-7 h-3.5 rounded-full relative transition shrink-0 ${assinar ? "bg-[#009AAC]" : "bg-[#cfd8e0]"}`}>
              <span className={`absolute top-[2px] w-2.5 h-2.5 rounded-full bg-white transition-all ${assinar ? "left-[15px]" : "left-[2px]"}`} />
            </span>
          </button>
          <button onClick={() => setRefreshTick((t) => t + 1)} title="Atualizar" className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#5F5E5A] flex items-center gap-1.5 hover:bg-[#f9f9f9]"><span style={{fontSize:"12px"}}>↻</span>Atualizar</button>
          <button onClick={() => abrirNovaConversa()} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova mensagem</button>
        </div>
      </div>

      {tab === "conversas" && (
        <div className="grid grid-cols-1 md:grid-cols-[310px_1fr_340px] grid-rows-[minmax(0,1fr)] flex-1 min-h-0">
          {/* LEFT - Lista (no celular: some quando uma conversa está aberta) */}
          <div className={"border-r border-[#e8e1d2] bg-white flex-col min-h-0 " + (selectedId ? "hidden md:flex" : "flex")}>
            {/* FILTROS EM ROLL-UP — ocupa 1 linha; abre o resto ao clicar */}
            <div className="px-2.5 py-1.5 border-b border-[#e8e1d2] relative">
              {(() => {
                const tipoLbl = filter === "leads" ? "Leads" : filter === "clientes" ? "Clientes" : "Todos";
                const respLbl = viewResp === "minhas" ? "Minhas" : viewResp === "livres" ? "Livres" : "Todas";
                const resumo = [tipoLbl, respLbl, verEncerradas ? "Encerradas" : null, filtroTag || null].filter(Boolean).join(" · ");
                return (
                  <button onClick={() => setFiltrosOpen((o) => !o)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[#cfd8e0] bg-white text-[#5F5E5A] hover:bg-[#FBF9F4]">
                    <span>🎛️</span><span className="flex-1 text-left truncate"><b className="text-[#0E2244]">Filtros:</b> {resumo}</span>
                    <span style={{ transform: filtrosOpen ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                );
              })()}
              {filtrosOpen && (
                <>
                <div className="fixed inset-0 z-20" onClick={() => setFiltrosOpen(false)} />
                <div className="absolute left-2.5 right-2.5 top-full mt-1 z-30 bg-white border border-[#e8e1d2] rounded-lg shadow-lg p-2.5 space-y-2.5">
                  <div>
                    <div className="text-[9.5px] text-[#888780] font-medium mb-1">TIPO</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["todos", "leads", "clientes"] as ListFilter[]).map((f) => (
                        <button key={f} onClick={() => { setFilter(f); setFiltrosOpen(false); }} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${filter === f ? "bg-[#009AAC] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>
                          {f === "todos" ? `Todos ${counts.total}` : f === "leads" ? `Leads ${counts.leads}` : `Clientes ${counts.clientes}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-[#888780] font-medium mb-1">RESPONSÁVEL</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {([["minhas", "👤 Minhas"], ["livres", "🆓 Livres"], ["todas", "Todas"]] as const).map(([v, label]) => {
                        const n = v === "minhas" ? conversations.filter((c) => c.assignedUser?.id === meId).length
                          : v === "livres" ? conversations.filter((c) => !c.assignedUser?.id).length : conversations.length;
                        return (
                          <button key={v} onClick={() => { setViewResp(v); setFiltrosOpen(false); }} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${viewResp === v ? "bg-[#0F6E56] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>{label} {n}</button>
                        );
                      })}
                      <button onClick={() => setVerEncerradas((v) => !v)} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${verEncerradas ? "bg-[#5F5E5A] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>🗂️ Encerradas</button>
                    </div>
                  </div>
                  {convEtiquetas.filter((e) => conversations.some((c) => (c.tags || []).includes(e.texto))).length > 0 && (
                    <div>
                      <div className="text-[9.5px] text-[#888780] font-medium mb-1">ETIQUETAS</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {convEtiquetas.filter((e) => conversations.some((c) => (c.tags || []).includes(e.texto))).map((e) => {
                          const n = conversations.filter((c) => (c.tags || []).includes(e.texto)).length;
                          const on = filtroTag === e.texto;
                          return (
                            <button key={e.texto} onClick={() => setFiltroTag(on ? "" : e.texto)} className="text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5" style={on ? { background: e.cor, color: "#fff" } : { background: "#fff", border: "1px solid #cfd8e0", color: "#5F5E5A" }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: on ? "#fff" : e.cor }} />{e.texto} {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                </>
              )}
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
              ) : convError ? (
                <div className="p-5 text-center">
                  <p className="text-[12px] text-[#A32D2D] font-medium mb-2">⚠️ {convError}</p>
                  <button onClick={() => setRefreshTick((t) => t + 1)} className="text-[11px] px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: "#009AAC" }}>Recarregar</button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-[11px] text-[#888780]">Sem conversas nesse filtro</p>
              ) : filtered.map((c) => {
                const isLead = !c.tutor?.id;
                const isSel = c.id === selectedId;
                const isBC = c.source === "BOTCONVERSA" || c.metadata?.source === "BOTCONVERSA";
                const naoLida = (c.unreadCount || 0) > 0 || !!c.manualUnread;
                // Mostra o nome da PESSOA do número (perfil do WhatsApp) — não o do cliente cadastrado.
                const nome = c.contactPushName || c.contactName || c.tutor?.name || c.contactNumber;
                // Prévia: "Você: ..." quando a última foi nossa; mídia vira rótulo amigável.
                const lm = c.lastMessage;
                const previa = (() => {
                  if (!lm) return "";
                  const t = (lm.type || "TEXT").toUpperCase();
                  let corpo = (lm.content || "").replace(/\n/g, " ").trim();
                  if (!corpo || corpo.startsWith("[")) {
                    corpo = t === "IMAGE" ? "📷 Foto" : t === "AUDIO" ? "🎤 Áudio" : t === "VIDEO" ? "🎥 Vídeo"
                          : t === "DOCUMENT" ? "📎 Documento" : t === "STICKER" ? "Figurinha" : corpo || "(mídia)";
                  }
                  return (lm.direction === "OUTBOUND" ? "Você: " : "") + corpo;
                })();
                // ⏰ Espera do cliente sem resposta (SLA): destaca e mostra o tempo.
                // Baseado em "última msg foi do cliente", não em "não-lida" — assim o
                // aviso NÃO some quando você só abre a conversa sem responder.
                const esperaMs = esperaRespostaMs(c);
                const atrasada = esperaMs > SLA_ESPERA_MIN * 60000;
                const esperaMin = Math.max(1, Math.floor(esperaMs / 60000));
                const esperaLbl = esperaMin >= 60 ? `${Math.floor(esperaMin / 60)}h${String(esperaMin % 60).padStart(2, "0")}` : `${esperaMin} min`;
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-[#f0e8d4] flex gap-2.5 items-start ${isSel ? "bg-[#F4FAFB] border-l-[3px] border-l-[#009AAC] pl-[9px]" : atrasada ? "bg-[#FDF1F1] hover:bg-[#FBE9E9] border-l-[3px] border-l-[#CC3366] pl-[9px]" : "bg-white hover:bg-[#FBF9F4]"}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                      style={{ background: isLead ? "#B7791F" : "#009AAC" }}>{getInitials(nome)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12.5px] truncate ${naoLida ? "font-bold text-[#0E2244]" : "font-medium text-[#0E2244]"}`}
                          title={c.tutor?.name && c.tutor.name !== nome ? `Cliente cadastrado: ${c.tutor.name}` : undefined}>{nome}</span>
                        {atrasada
                          ? <span title={`Cliente esperando resposta há ${esperaLbl}`} className="ml-auto text-[10px] font-bold text-white bg-[#CC3366] rounded-full px-1.5 py-0.5 animate-pulse whitespace-nowrap flex-shrink-0">⏰ {esperaLbl}</span>
                          : <span className="ml-auto text-[10px] text-[#A7ADA8] whitespace-nowrap flex-shrink-0">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</span>}
                      </div>
                      <div className={`text-[11.5px] truncate mt-0.5 ${naoLida ? "text-[#0E2244] font-medium" : "text-[#8A928F]"}`}>
                        {previa || <span className="italic text-[#B5AFA2]">sem mensagens</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isLead ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#E1F5EE] text-[#0F6E56]"}`}>{isLead ? "LEAD" : "CLIENTE"}</span>
                        {isLead && c.leadMotivoPerda && (
                          <span title={`Motivo da perda: ${c.leadMotivoPerda}`} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-[#FBEBEB] text-[#A32D2D] inline-flex items-center gap-1 max-w-[130px] truncate">❌ {c.leadMotivoPerda}</span>
                        )}
                        {(c.tags || []).map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ background: corTag(t) }}>{t}</span>
                        ))}
                        {isBC && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FBF0DD] text-[#8a6313]">via BotConversa</span>}
                        {c.assignedUser && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: c.assignedUser.id === meId ? "#DCFCE7" : "#EAF3DE", color: "#0F6E56" }} title={`Responsável: ${c.assignedUser.name}`}>
                            👤 {c.assignedUser.id === meId ? "Você" : (c.assignedUser.name || "").split(" ")[0]}
                          </span>
                        )}
                        {naoLida && (
                          (c.unreadCount || 0) > 0
                            ? <span className="ml-auto bg-[#009AAC] text-white text-[9px] min-w-[18px] h-[18px] px-1 rounded-full font-bold flex items-center justify-center">{c.unreadCount}</span>
                            : <span className="ml-auto bg-[#009AAC] w-[10px] h-[10px] rounded-full" title="Marcada como não lida" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER - Chat (no celular: só aparece quando há conversa aberta) */}
          <div className={"bg-white flex-col min-h-0 overflow-hidden " + (selectedId ? "flex" : "hidden md:flex")}>
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <span style={{fontSize:"36px",color:"#cfd8e0",display:"block",marginBottom:"12px"}}>💬</span>
                  <p className="text-sm text-[#5F5E5A]">Selecione uma conversa pra começar</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between relative">
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => setSelectedId(null)} title="Voltar para a lista" className="md:hidden -ml-1 mr-0.5 w-8 h-8 rounded-lg text-[#5F5E5A] hover:bg-gray-100 flex items-center justify-center text-lg shrink-0">‹</button>
                    <div className="w-8 h-8 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[11px] font-medium">
                      {getInitials(selectedConv?.contactPushName || selectedConv?.contactName || selectedConv?.tutor?.name)}
                    </div>
                    <div>
                      <div className="text-xs text-[#0E2244] font-medium flex items-center gap-1.5">
                        {selectedConv?.contactPushName || selectedConv?.contactName || selectedConv?.tutor?.name || selectedConv?.contactNumber || "Sem nome"}
                        {selectedConv?.tutor?.id && (
                          <button onClick={() => window.open(`/dashboard/erp/tutores/${selectedConv.tutor!.id}`, "_blank")}
                            title="Editar ficha do cliente (abre a ficha completa)" className="text-[#c8d0d4] hover:text-[#009AAC] text-[11px]">✏️</button>
                        )}
                      </div>
                      <div className="text-[10px] text-[#888780]">
                        📞 {selectedConv?.contactNumber || "—"}
                        {selectedConv?.tutor?.name && selectedConv.tutor.name !== (selectedConv?.contactPushName || selectedConv?.contactName) ? (
                          <span className="text-[#A8A69C]"> · cliente: {selectedConv.tutor.name}</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {selectedConv?.assignedUser?.id === meId ? (
                          <span className="text-[10px] font-medium inline-flex items-center gap-1" style={{ color: "#0F6E56" }}>🔓 Você está atendendo</span>
                        ) : selectedConv?.assignedUser ? (
                          <span className="text-[10px] font-medium inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "#FBF0DD", color: "#8a5a0b" }} title={`Responsável: ${selectedConv.assignedUser.name}`}>🔒 Com {(selectedConv.assignedUser.name || "").split(" ")[0]}</span>
                        ) : (
                          <>
                            <span className="text-[10px] font-medium inline-flex items-center gap-1" style={{ color: "#888780" }}>● No geral</span>
                            <button onClick={assumirAtendimento} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#E6F1FB] text-[#185FA5] hover:bg-[#cce0f5]">pegar p/ mim</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <button
                      onClick={() => setAutoReply(!autoReply)}
                      title={autoReply ? "Desativar IA pra essa conversa" : "Ativar IA"}
                      className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${autoReply ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-white border border-[#e8e1d2] text-[#888780]"}`}>
                      <span style={{fontSize:"10px"}}>🤖</span>IA {autoReply ? "Ativa" : "Pausada"}
                    </button>
                    {(selectedConv?.tags?.length || 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: corTag(selectedConv!.tags![0]) }} title="Etiquetas da conversa">🏷️ {selectedConv!.tags!.length}</span>
                    )}
                    <button
                      onClick={resolverConversa}
                      disabled={resolvendo}
                      title="Encerrar o atendimento — a conversa sai da caixa (volta se o cliente escrever de novo)"
                      className="text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 text-white font-medium disabled:opacity-60"
                      style={{ background: "#0F6E56" }}>
                      <span style={{fontSize:"10px"}}>✅</span>{resolvendo ? "Encerrando…" : "Encerrar"}
                    </button>
                    <button onClick={() => setBuscaChatOpen((o) => { const n = !o; if (!n) setBuscaChat(""); return n; })} title="Buscar nesta conversa"
                      className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[13px] border ${buscaChatOpen ? "bg-[#F0FBFC] border-[#009AAC] text-[#00798A]" : "bg-white border-[#e8e1d2] text-[#888780]"}`}>🔍</button>
                    {/* ⋮ ações secundárias (como no mockup) */}
                    <div className="relative">
                      <button onClick={() => setHeaderMenuOpen((o) => !o)} title="Mais ações"
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[15px] border ${headerMenuOpen ? "bg-[#F0FBFC] border-[#009AAC] text-[#00798A]" : "bg-white border-[#e8e1d2] text-[#888780]"}`}>⋮</button>
                      {headerMenuOpen && (
                        <div className="absolute right-0 top-9 z-30 bg-white border border-[#e8e1d2] rounded-lg shadow-lg w-56 overflow-hidden">
                          <button onClick={marcarConversaNaoLida} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">🔵 Marcar como não lida</button>
                          <button onClick={() => { setHeaderMenuOpen(false); setEncaminharOpen(true); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">↪ Transferir de atendente</button>
                          <button onClick={() => { setHeaderMenuOpen(false); abrirGaleria(); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">🖼️ Galeria de mídia</button>
                          <button onClick={() => { setHeaderMenuOpen(false); setExportAuto(true); setExportOpen(true); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">📄 Exportar conversa (PDF)</button>
                          <button onClick={() => { setHeaderMenuOpen(false); setTagsOpen(true); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">🏷️ Etiquetas{(selectedConv?.tags?.length || 0) > 0 ? ` (${selectedConv!.tags!.length})` : ""}</button>
                          {selectedConv?.tutor?.id && (
                            <button onClick={() => { setHeaderMenuOpen(false); window.open(`/dashboard/erp/tutores/${selectedConv.tutor!.id}`, "_blank"); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">📂 Ver ficha completa</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Seletor de etiquetas (aberto pelo menu ⋮) */}
                  {tagsOpen && (
                    <div className="absolute right-3 top-14 z-40 bg-white border border-[#e8e1d2] rounded-lg shadow-lg w-56 p-2">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[9.5px] text-[#888780] font-medium">ETIQUETAS DA CONVERSA</span>
                        <button onClick={() => setTagsOpen(false)} className="text-[#888780] text-sm">×</button>
                      </div>
                      {convEtiquetas.length === 0 ? (
                        <div className="text-[11px] text-[#888780] px-1 py-2">Nenhuma etiqueta de conversa. <Link href="/dashboard/configuracoes/etiquetas" className="text-[#009AAC]">criar</Link></div>
                      ) : convEtiquetas.map((e) => {
                        const ativa = (selectedConv?.tags || []).includes(e.texto);
                        return (
                          <button key={e.texto} onClick={() => toggleTag(e.texto)} className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-[#F0FBFC] text-left">
                            <span className="w-3 h-3 rounded-full" style={{ background: e.cor }} />
                            <span className="text-[11.5px] text-[#0E2244] flex-1">{e.texto}</span>
                            {ativa && <span className="text-[#009AAC] text-[11px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {buscaChatOpen && (
                  <div className="px-3 py-2 border-b border-[#e8e1d2] bg-[#F7FBFC] flex items-center gap-2">
                    <span className="text-[13px] text-[#888780]">🔍</span>
                    <input
                      autoFocus
                      value={buscaChat}
                      onChange={(e) => setBuscaChat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { setBuscaChatOpen(false); setBuscaChat(""); }
                        if (e.key === "Enter" && buscaMatches.length) {
                          e.preventDefault();
                          setBuscaIdx((idx) => e.shiftKey ? (idx + 1) % buscaMatches.length : (idx - 1 + buscaMatches.length) % buscaMatches.length);
                        }
                      }}
                      placeholder="Buscar nesta conversa…"
                      className="flex-1 text-[13px] bg-transparent outline-none text-[#0E2244] placeholder-[#A8A69C]" />
                    {buscaChat.trim() && (
                      <span className="text-[11px] text-[#888780] tabular-nums whitespace-nowrap">
                        {buscaMatches.length ? `${Math.min(buscaIdx + 1, buscaMatches.length)} de ${buscaMatches.length}` : "0 de 0"}
                      </span>
                    )}
                    <button disabled={!buscaMatches.length} onClick={() => setBuscaIdx((idx) => (idx - 1 + buscaMatches.length) % buscaMatches.length)} title="Resultado anterior (mais antigo)" className="w-6 h-6 rounded-md border border-[#e8e1d2] text-[#5F5E5A] disabled:opacity-40 text-[12px] leading-none">↑</button>
                    <button disabled={!buscaMatches.length} onClick={() => setBuscaIdx((idx) => (idx + 1) % buscaMatches.length)} title="Próximo resultado (mais recente)" className="w-6 h-6 rounded-md border border-[#e8e1d2] text-[#5F5E5A] disabled:opacity-40 text-[12px] leading-none">↓</button>
                    <button onClick={() => { setBuscaChatOpen(false); setBuscaChat(""); }} title="Fechar busca" className="w-6 h-6 rounded-md text-[#888780] text-[16px] leading-none">×</button>
                  </div>
                )}

                <div ref={msgScrollRef} onScroll={(e) => { const el = e.currentTarget; stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="flex-1 overflow-y-auto p-4 bg-white flex flex-col gap-2">
                  {buscaChatOpen && buscaChat.trim() && buscaMatches.length === 0 && (
                    <p className="text-center text-[11px] text-[#888780] py-2">Nada encontrado para “{buscaChat.trim()}” nesta conversa</p>
                  )}
                  {messages.length === 0 ? (
                    <p className="text-center text-[11px] text-[#888780]">Sem mensagens</p>
                  ) : messages.map((m, i) => {
                    const outbound = m.direction === "OUTBOUND";
                    // A mensagem citada por esta (se ainda estiver carregada na conversa).
                    const citada = m.replyToWaMessageId
                      ? messages.find((x) => x.waMessageId && x.waMessageId === m.replyToWaMessageId)
                      : null;
                    // Separador de data: aparece quando muda o dia em relação à mensagem anterior
                    // (e sempre na primeira). Assim dá pra saber a data sem repetir em cada mensagem.
                    const mudouDia = i === 0 || (() => {
                      try { return new Date(m.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString(); }
                      catch { return false; }
                    })();
                    // Resultado ATUAL da busca (recebe realce laranja + rolagem).
                    const ehMatch = buscaChatOpen && buscaMatches.length > 0 && buscaMatches[buscaIdx] === m.id;
                    return (
                      <Fragment key={m.id}>
                      {mudouDia && (
                        <div className="self-center my-1.5 px-3 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "#F0EBE0", color: "#8A857A" }}>
                          {rotuloDia(m.createdAt)}
                        </div>
                      )}
                      <div ref={(el) => { msgRefs.current[m.id] = el; }} onClick={selMode ? () => toggleSel(m.id) : undefined} className={`group relative max-w-[75%] ${outbound ? "self-end" : "self-start"} ${selMode ? "cursor-pointer rounded-xl transition" : ""} ${selMode && selIds.has(m.id) ? "ring-2 ring-[#009AAC] ring-offset-2" : ""} ${ehMatch ? "ring-2 ring-[#FFB300] ring-offset-2 rounded-xl" : ""}`}>
                        <div className={`px-3 py-2 rounded-xl text-[13px] ${outbound ? "bg-[#009AAC] text-white rounded-br-sm" : "bg-white border border-[#e8e1d2] text-[#0E2244] rounded-bl-sm"}`}>
                          {m.replyToWaMessageId && (
                            <div
                              className="mb-1.5 pl-2 py-1 rounded text-[11px] leading-snug"
                              style={{
                                borderLeft: `3px solid ${outbound ? "rgba(255,255,255,.6)" : "#009AAC"}`,
                                background: outbound ? "rgba(255,255,255,.15)" : "#F4F8F9",
                                color: outbound ? "rgba(255,255,255,.9)" : "#5F5E5A",
                              }}>
                              <div className="font-medium text-[9.5px] uppercase opacity-80">
                                {citada ? (citada.direction === "OUTBOUND" ? "Você" : "Cliente") : "Mensagem citada"}
                              </div>
                              <div className="line-clamp-2">
                                {citada ? (citada.content || "(mídia)") : "— não está nesta parte da conversa —"}
                              </div>
                            </div>
                          )}
                          {m.fromAgent && (
                            <div className={`text-[9px] mb-1 ${outbound ? "opacity-85" : "text-[#888780]"} flex items-center gap-1`}>
                              <span style={{fontSize:"10px"}}>🤖</span>Atendente IA
                            </div>
                          )}
                          {m.type === "IMAGE" && m.hasMedia ? (
                            <div>
                              <a href={`/api/whatsapp/messages/${m.id}/media`} target="_blank" rel="noreferrer" className="block">
                                <img src={`/api/whatsapp/messages/${m.id}/media`} alt={m.content || "Imagem"} className="rounded-lg max-w-full max-h-64 object-cover" loading="lazy" />
                              </a>
                              {m.content && !m.content.startsWith("[") && <div className="mt-1">{m.content}</div>}
                              <div className="flex gap-3 mt-1">
                                <a href={`/api/whatsapp/messages/${m.id}/media?download=1`} className="text-[10px] underline opacity-80">⬇️ Baixar</a>
                                <button onClick={() => abrirEncaminhar(m.id)} className="text-[10px] underline opacity-80">↷ Encaminhar</button>
                              </div>
                            </div>
                          ) : (m.type === "STICKER") && m.hasMedia ? (
                            <img src={`/api/whatsapp/messages/${m.id}/media`} alt="Figurinha" className="max-w-[120px]" loading="lazy" />
                          ) : m.type === "AUDIO" && m.hasMedia ? (
                            <audio controls src={`/api/whatsapp/messages/${m.id}/media`} className="max-w-full" />
                          ) : m.type === "VIDEO" && m.hasMedia ? (
                            <div>
                              <video controls preload="metadata" src={`/api/whatsapp/messages/${m.id}/media`} className="rounded-lg max-w-full max-h-72 bg-black" />
                              {m.content && !m.content.startsWith("[") && <div className="mt-1">{m.content}</div>}
                              <div className="flex gap-3 mt-1">
                                <a href={`/api/whatsapp/messages/${m.id}/media?download=1`} className="text-[10px] underline opacity-80">⬇️ Baixar</a>
                                <button onClick={() => abrirEncaminhar(m.id)} className="text-[10px] underline opacity-80">↷ Encaminhar</button>
                              </div>
                            </div>
                          ) : m.type === "DOCUMENT" && m.hasMedia ? (
                            <div className="flex flex-col gap-1">
                              <a href={`/api/whatsapp/messages/${m.id}/media`} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">📎 {m.content && !m.content.startsWith("[") ? m.content : "Abrir arquivo"}</a>
                              <div className="flex gap-3">
                                <a href={`/api/whatsapp/messages/${m.id}/media?download=1`} className="text-[10px] underline opacity-80">⬇️ Baixar</a>
                                <button onClick={() => abrirEncaminhar(m.id)} className="text-[10px] underline opacity-80">↷ Encaminhar</button>
                              </div>
                            </div>
                          ) : (m.type === "LOCATION" || m.metadata?.latitude) ? (
                            <a href={`https://www.google.com/maps?q=${m.metadata?.latitude},${m.metadata?.longitude}`} target="_blank" rel="noreferrer" className="underline flex items-center gap-1" style={{ color: "#009AAC" }}>📍 {m.metadata?.name || m.metadata?.address || "Ver localização no mapa"}</a>
                          ) : (m.mediaType || m.type === "DOCUMENT" || m.type === "IMAGE" || m.type === "AUDIO" || m.type === "VIDEO") ? (
                            <span className="italic text-[#888780]">📎 {m.content || "anexo"} <span className="text-[10px]">(não foi possível carregar o arquivo)</span></span>
                          ) : (
                            m.content ? (buscaChatOpen && buscaChat.trim() ? renderWaHL(m.content, buscaChat) : renderWa(m.content)) : "(mídia)"
                          )}
                        </div>
                        {(m.reaction || m.myReaction) && (
                          <div className={`flex gap-1 -mt-1.5 mb-0.5 ${outbound ? "justify-end pr-1" : "pl-1"}`}>
                            {m.reaction && <span className="text-[12px] bg-white border border-[#e8e1d2] rounded-full px-1.5 py-0.5 shadow-sm" title="Reação do cliente">{m.reaction}</span>}
                            {m.myReaction && <span className="text-[12px] bg-white border border-[#e8e1d2] rounded-full px-1.5 py-0.5 shadow-sm" title="Sua reação (da equipe)">{m.myReaction}</span>}
                          </div>
                        )}
                        <div className={`text-[9px] text-[#888780] mt-0.5 px-1 flex items-center gap-2 ${outbound ? "justify-end" : ""}`}>
                          {m.encaminhado && <span className="italic opacity-70">↷ encaminhada</span>}
                          {(() => { try { return new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}
                          {outbound && statusTick(m)}
                          {!selMode && m.waMessageId && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setReagindoId(reagindoId === m.id ? null : m.id); }} title="Reagir com emoji" className="opacity-0 group-hover:opacity-100 transition-opacity text-[#009AAC] font-medium hover:underline">😀 Reagir</button>
                              <button onClick={(e) => { e.stopPropagation(); setRespondendo(m); }} title="Responder citando" className="opacity-0 group-hover:opacity-100 transition-opacity text-[#009AAC] font-medium hover:underline">↩ Responder</button>
                              <button onClick={(e) => { e.stopPropagation(); abrirEncaminhar(m.id); }} title="Encaminhar esta" className="opacity-0 group-hover:opacity-100 transition-opacity text-[#009AAC] font-medium hover:underline">↷ Encaminhar</button>
                              <button onClick={(e) => { e.stopPropagation(); entrarSelecao(m.id); }} title="Selecionar várias" className="opacity-0 group-hover:opacity-100 transition-opacity text-[#009AAC] font-medium hover:underline">☑︎ Selecionar</button>
                            </>
                          )}
                        </div>
                        {reagindoId === m.id && (
                          <div className={`absolute z-30 -top-8 ${outbound ? "right-0" : "left-0"} bg-white border border-[#e8e1d2] rounded-full shadow-lg px-1.5 py-1 flex items-center gap-1`} onClick={(e) => e.stopPropagation()}>
                            {EMOJIS_REACAO.map((e) => (
                              <button key={e} onClick={() => reagir(m.id, e)} title={m.myReaction === e ? "Remover reação" : `Reagir ${e}`} className={`text-[17px] leading-none hover:scale-125 transition ${m.myReaction === e ? "" : "opacity-85"}`}>{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      </Fragment>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {selMode && (
                  <div className="px-4 py-2 border-t border-[#e8e1d2] bg-[#EAF6F7] flex items-center justify-between gap-2">
                    <span className="text-[12px] font-medium text-[#014D5E]">☑︎ {selIds.size} selecionada(s) — toque nas mensagens</span>
                    <div className="flex gap-2">
                      <button onClick={sairSelecao} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "#E8DFC8", color: "#5F5E5A" }}>Cancelar</button>
                      <button onClick={abrirEncaminharLote} disabled={!selIds.size} className="text-[12px] px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: "#009AAC" }}>↷ Encaminhar ({selIds.size})</button>
                    </div>
                  </div>
                )}

                {/* Input com Scripts dropdown */}
                <div className="px-4 py-2.5 border-t border-[#e8e1d2]">
                  {respondendo && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg pl-2 pr-1 py-1.5" style={{ background: "#F4F8F9", borderLeft: "3px solid #009AAC" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9.5px] font-medium uppercase text-[#009AAC]">
                          Respondendo {respondendo.direction === "OUTBOUND" ? "você mesma" : "o cliente"}
                        </div>
                        <div className="text-[11px] text-[#5F5E5A] truncate">{respondendo.content || "(mídia)"}</div>
                      </div>
                      <button onClick={() => setRespondendo(null)} title="Cancelar resposta" className="text-[#888780] hover:text-[#0E2244] text-sm leading-none px-1">×</button>
                    </div>
                  )}
                  {/* DONO DA CONVERSA (28/07): se OUTRA pessoa é a dona, o rodapé vira um painel
                      de trava (pra não responderem por cima). Senão, o compositor normal. */}
                  {(selectedConv?.assignedUser && selectedConv.assignedUser.id !== meId) ? (
                    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-2.5" style={{ background: "#FBF0DD", border: "1px solid #efe1c2" }}>
                      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#8a5a0b" }}>
                        <span style={{ fontSize: "17px" }}>🔒</span>
                        <span><b>{selectedConv.assignedUser.name}</b> está atendendo esta conversa.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={pedirConversa} className="flex-1 py-2 rounded-lg text-[12px] font-medium hover:brightness-95" style={{ background: "#fff", border: "1px solid #e8c98a", color: "#8a5a0b" }}>🙋 Pedir a conversa</button>
                        <button onClick={assumirAtendimento} className="py-2 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap hover:brightness-110" style={{ background: "#8a6400", color: "#fff" }}>Assumir mesmo assim</button>
                      </div>
                      <p className="text-[10.5px] text-center leading-snug" style={{ color: "#a98a4b" }}>Peça e espere ela soltar — ou assuma, se for urgente.</p>
                    </div>
                  ) : (
                  <>
                  {/* Menu de Ações — abre pelo botão ➕ da barra (redesenho 28/07, mockup aprovado).
                      Concentra tudo que antes eram pílulas soltas + Assinar, liberando o campo de escrever. */}
                  {acoesOpen && (
                    <div className="bg-white border border-[#e8e1d2] rounded-xl p-1.5 mb-2" style={{ boxShadow: "0 10px 28px rgba(20,37,58,.14)" }}>
                      {/* Assinatura saiu daqui pro CABEÇALHO (✍️ Assinar). No lugar dela: pedir a
                          avaliação (NPS → Google Meu Negócio) do cliente desta conversa. */}
                      <button onClick={() => { setAcoesOpen(false); solicitarAvaliacaoNPS(); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left">
                        <span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>⭐</span>
                        <span className="text-[12.5px] text-[#0E2244] flex-1">Solicitar avaliação <span className="text-[#888780]">(NPS / Google)</span></span>
                      </button>
                      <div className="h-px bg-[#e8e1d2] mx-1.5 my-1" />
                      <button onClick={() => { setScriptsOpen(true); setAcoesOpen(false); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>📋</span><span className="text-[12.5px] text-[#0E2244]">Mensagens prontas</span></button>
                      <button onClick={() => { const l = window.location.origin + "/queremos-te-conhecer"; setMessageInput(`Vamos confirmar o atendimento do seu pet! 🐾 Para isso, precisamos te conhecer um pouquinho melhor — é rapidinho: ${l}\n\nAssim que você preencher, seu agendamento fica confirmado! 💙`); setAcoesOpen(false); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>🔗</span><span className="text-[12.5px] text-[#0E2244]">Enviar cadastro</span></button>
                      <button onClick={() => { setAgendarOpen(true); setAcoesOpen(false); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>📅</span><span className="text-[12.5px] text-[#0E2244]">Agendar consulta</span></button>
                      <button onClick={() => { setAcoesOpen(false); const tid = selectedConv?.tutor?.id; if (!tid) { toast("Venda é pra cliente com ficha — este contato ainda não tem cadastro.", { icon: "🛒" }); return; } window.open(`/dashboard/erp/ponto-de-venda?tutorId=${tid}`, "_blank"); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>🛒</span><span className="text-[12.5px] text-[#0E2244]">Nova venda <span className="text-[#888780]">(abre o PDV com o cliente)</span></span></button>
                      <button onClick={() => { setAcoesOpen(false); abrirBoletim(); }} disabled={boletimLoading} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left disabled:opacity-50"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>🌿</span><span className="text-[12.5px] text-[#0E2244]">Boletim de fisioterapia{boletimLoading ? " …" : ""}</span></button>
                      <button onClick={() => { setAcoesOpen(false); toast("🧪 Resultado de exame entra quando terminarmos o módulo de exames.", { icon: "🛠️" }); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#FBF9F4] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>🧪</span><span className="text-[12.5px] text-[#9a948a]">Exame</span></button>
                      <div className="h-px bg-[#e8e1d2] mx-1.5 my-1" />
                      <button onClick={() => { setAcoesOpen(false); sendMessage(MSG_PIX); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>💠</span><span className="text-[12.5px] text-[#0E2244] flex-1">Enviar chave PIX</span><span className="text-[8.5px] font-bold text-[#B45309] bg-[#FBF0DD] px-1.5 py-[1px] rounded-full">NOVO</span></button>
                      <button onClick={() => { setAcoesOpen(false); sendMessage(MSG_ENDERECO); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#F0FBFC] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>📍</span><span className="text-[12.5px] text-[#0E2244] flex-1">Enviar endereço + Maps</span><span className="text-[8.5px] font-bold text-[#B45309] bg-[#FBF0DD] px-1.5 py-[1px] rounded-full">NOVO</span></button>
                      {selectedConv?.assignedUser?.id === meId && (
                        <>
                          <div className="h-px bg-[#e8e1d2] mx-1.5 my-1" />
                          <button onClick={() => { setAcoesOpen(false); devolverAoGeral(); }} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#FBF9F4] text-left"><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>↩️</span><span className="text-[12.5px] text-[#0E2244]">Devolver ao geral</span></button>
                        </>
                      )}
                    </div>
                  )}
                  {scriptsOpen && (
                    <div className="bg-white border border-[#e8e1d2] rounded-lg p-2 mb-2 max-h-[160px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-[#888780] font-medium">MENSAGENS PRONTAS · clique pra inserir</span>
                        <Link href="/dashboard/configuracoes/scripts" className="text-[10px] text-[#009AAC]">+ Gerenciar em Configurações</Link>
                      </div>
                      <div className="flex flex-col gap-1">
                        {scriptsList.length === 0 ? (
                          <div className="text-[11px] text-[#888780] px-2 py-2">Nenhuma mensagem pronta cadastrada. Crie em <b>Configurações › Scripts</b>.</div>
                        ) : scriptsList.map((s, i) => (
                          <button key={`${s.titulo}-${i}`} onClick={() => { setMessageInput(s.texto); setScriptsOpen(false); }}
                            className="text-left px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-[#e8e1d2]">
                            <div className="text-[10px] text-[#5F5E5A]">{s.categoria ? <><b className="text-[#0E2244]">{s.categoria}</b> · </> : null}{s.titulo}</div>
                            <div className="text-[11px] text-[#5F5E5A] truncate">{s.texto}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedId && !janelaAberta && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#FBF0DD", border: "1px solid #E7C888" }}>
                      <span style={{ fontSize: 15 }}>⏱️</span>
                      <span className="text-[11.5px] flex-1" style={{ color: "#8A5A0B" }}>Faz mais de 24h que o cliente não responde. O WhatsApp só entrega um <b>modelo (template) aprovado</b> agora — mensagem normal vai ser recusada.</span>
                      <button onClick={() => abrirNovaConversa({ phone: selectedConv?.contactNumber, busca: selectedConv?.tutor?.name || selectedConv?.contactName || selectedConv?.contactNumber })} className="text-[11px] font-bold text-white px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap" style={{ background: "#B45309" }}>Usar modelo</button>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setAcoesOpen((v) => !v)} title="Ações rápidas — cadastro, agendar, boletim, PIX, endereço, mensagens prontas…"
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition text-white ${acoesOpen ? "bg-[#007E8D]" : "bg-[#009AAC] hover:bg-[#008395]"}`}
                      style={{ boxShadow: "0 2px 6px rgba(0,154,172,.35)" }}>
                      <span style={{ fontSize: "20px", lineHeight: 1, marginTop: "-1px" }}>{acoesOpen ? "×" : "+"}</span>
                    </button>
                    {/* Clipe: foto, documento, vídeo ou figurinha (.webp). O texto digitado
                        vira legenda. Fora da janela de 24h o Meta recusa — o erro aparece. */}
                    <label
                      title={anexando ? "Enviando…" : "Anexar foto, documento, vídeo ou figurinha (.webp) — até 20MB"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border border-[#e8e1d2] text-[#5F5E5A] shrink-0 ${anexando ? "opacity-50" : "cursor-pointer hover:bg-[#F0FBFC]"}`}>
                      {anexando ? <span className="text-[11px]">⏳</span> : <span style={{ fontSize: "14px" }}>📎</span>}
                      <input
                        type="file"
                        className="hidden"
                        disabled={anexando}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.mp4,.mp3,.ogg"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) enviarAnexo(f);
                        }}
                      />
                    </label>
                    {/* Figurinhas da clínica (biblioteca) */}
                    <div className="relative shrink-0">
                      <button onClick={abrirStickers} title="Enviar figurinha da clínica"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border border-[#e8e1d2] text-[#5F5E5A] ${stickersOpen ? "bg-[#F0FBFC] border-[#009AAC]" : "hover:bg-[#F0FBFC]"}`}>
                        <span style={{ fontSize: "15px" }}>🩹</span>
                      </button>
                      {stickersOpen && (
                        <div className="absolute bottom-11 left-0 z-40 bg-white border border-[#e8e1d2] rounded-xl shadow-lg p-2 w-72">
                          <div className="flex items-center justify-between px-1 pb-1.5">
                            <span className="text-[10px] font-medium uppercase text-[#888780]">Figurinhas da clínica</span>
                            <button onClick={() => setStickersOpen(false)} className="text-[#888780] text-sm leading-none">×</button>
                          </div>
                          {!stickersCarregados ? (
                            <p className="text-[12px] text-[#888780] px-1 py-4 text-center">Carregando…</p>
                          ) : stickersList.length === 0 ? (
                            <p className="text-[12px] text-[#888780] px-1 py-3 text-center">Nenhuma figurinha cadastrada. Suba as suas em <Link href="/dashboard/configuracoes/figurinhas" className="text-[#009AAC] underline">Configurações › Figurinhas</Link>.</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
                              {stickersList.map((s) => (
                                <button key={s.id} onClick={() => enviarSticker(s.id)} disabled={enviandoSticker}
                                  title={s.nome || "Enviar figurinha"}
                                  className="aspect-square rounded-lg border border-[#eee] p-1 flex items-center justify-center hover:bg-[#F0FBFC] disabled:opacity-50" style={{ background: "#F4F8F9" }}>
                                  <img src={`/api/whatsapp/stickers/${s.id}/media`} alt={s.nome || "figurinha"} className="max-w-full max-h-full object-contain" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {gravando ? (
                      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 border rounded-lg" style={{ borderColor: "#E24B4A", background: "#FDECEC" }}>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E24B4A] animate-pulse shrink-0" />
                        <span className="text-xs text-[#A32D2D] font-medium tabular-nums">Gravando… {Math.floor(gravSeg / 60)}:{String(gravSeg % 60).padStart(2, "0")}</span>
                        <button onClick={cancelarGravacao} className="ml-auto text-[11px] text-[#5F5E5A] hover:underline">Cancelar</button>
                        <button onClick={pararEnviarGravacao} className="bg-[#009AAC] text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0" title="Enviar áudio">
                          <span style={{ fontSize: "13px" }}>➤</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          rows={2}
                          placeholder="Digite sua mensagem…  (Enter envia · Shift+Enter pula linha)"
                          className="flex-1 px-3.5 py-2.5 border border-[#e8e1d2] rounded-lg text-[13.5px] focus:outline-none focus:border-[#009AAC] resize-none leading-snug" style={{ maxHeight: 160, minHeight: 58 }} />
                        <EmojiPicker onPick={(em) => setMessageInput((v) => v + em)} />
                        {messageInput.trim() ? (
                          <button onClick={() => sendMessage()} className="bg-[#009AAC] text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0" title="Enviar">
                            <span style={{fontSize:"13px"}}>➤</span>
                          </button>
                        ) : (
                          <button onClick={iniciarGravacao} disabled={anexando} className="bg-[#009AAC] text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50" title="Gravar áudio de voz">
                            <span style={{fontSize:"14px"}}>🎤</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT - Painel CRM (contexto). No celular fica escondido pra o chat ocupar a tela toda. */}
          <div className="hidden md:flex flex-col min-h-0">
  {selectedId ? (
  <InboxRightPanel canal="WhatsApp Meta" initialPhone={selectedConv?.contactNumber} initialName={selectedConv?.contactName || (selectedConv as any)?.contactPushName} initialTutorId={selectedConv?.tutor?.id} conversationId={selectedConv?.id} soContexto onVinculado={() => { setRefreshTick((t) => t + 1); }} onEnviarTexto={(t) => sendMessage(t)} />
  ) : (
  <div className="border-l border-[#e8e1d2] bg-white flex-1 flex items-center justify-center text-center p-6">
    <p className="text-[11px] text-[#B4B2A9]">O contexto do cliente aparece aqui quando você abrir uma conversa.</p>
  </div>
  )}
          </div>
          </div>

    )}

      {tab === "internas" && (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] grid-rows-[minmax(0,1fr)] flex-1 min-h-0">
          {/* LEFT - conversas internas (agrupadas por colega) — no celular some quando abre uma */}
          <div className={"border-r border-[#e8e1d2] bg-white flex-col min-h-0 " + ((internasCompose || internasConvSel) ? "hidden md:flex" : "flex")}>
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
                        <span className={`text-xs text-[#0E2244] truncate ${c.unread ? "font-medium" : "font-normal"}`}>{c.name}</span>
                        {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-[#EAB308] flex-shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#888780] truncate">{last?.mine ? "Você: " : ""}{last?.content}</div>
                    </div>
                  </div>
                </button>
              ); })}
            </div>
          </div>
          {/* RIGHT - thread OU compor — no celular só aparece quando abre uma/compõe */}
          <div className={"bg-white flex-col min-h-0 " + ((internasCompose || internasConvSel) ? "flex" : "hidden md:flex")}>
            {internasCompose ? (
              <div className="p-6 flex flex-col min-h-0 overflow-y-auto">
                <h3 className="text-sm text-[#0E2244] font-medium mb-3 flex items-center gap-1"><button onClick={() => setInternasCompose(false)} title="Voltar" className="md:hidden -ml-1 w-7 h-7 rounded-lg text-[#5F5E5A] hover:bg-gray-100 flex items-center justify-center text-lg">‹</button>Nova mensagem interna</h3>
                <div className="mb-3">
                  <label className="text-[11px] text-[#888780] block mb-1">Para</label>
                  <select value={internalSelected || ""} onChange={(e) => setInternalSelected(e.target.value || null)} className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]">
                    <option value="">Selecione um colega...</option>
                    {internalUsers.map((u) => (<option key={u.id} value={u.id} disabled={u.hasLogin === false}>{u.name}{u.role ? ` · ${u.role}` : ""}{u.hasLogin === false ? " · sem login" : ""}</option>))}
                  </select>
                </div>
                {internasAnexo && (<div className="mb-2 flex items-center gap-2 text-[11px] bg-[#F1EFE8] rounded px-2 py-1 w-fit"><span>📎 {internasAnexo.name}</span><button onClick={() => setInternasAnexo(null)} className="text-[#A32D2D] font-medium">remover</button></div>)}
                <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} onPaste={colarNasInternas} rows={6} placeholder="Escreva a mensagem… (pode colar um print)" className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none mb-3" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <EmojiPicker onPick={(em) => setInternalNote((v) => v + em)} />
                    <label className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f0f0ea]" title="Anexar documento"><input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocInterno(f); e.currentTarget.value = ""; }} /><span style={{ fontSize: "15px" }}>{anexandoDoc ? "…" : "📎"}</span></label>
                  </div>
                  <div className="flex gap-2">
                  <button onClick={() => { setInternasCompose(false); setInternalSelected(null); setInternalNote(""); }} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
                  <button onClick={salvarNotaInterna} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium">Enviar</button>
                  </div>
                </div>
              </div>
            ) : internasConvSel ? (() => {
              const c = internasConversas.find((x) => x.userId === internasConvSel);
              if (!c) return null;
              return (
                <>
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#e8e1d2] flex-shrink-0">
                    <button onClick={() => setInternasConvSel(null)} title="Voltar" className="md:hidden -ml-2 w-8 h-8 rounded-lg text-[#5F5E5A] hover:bg-gray-100 flex items-center justify-center text-lg shrink-0">‹</button>
                    <div className="w-9 h-9 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[12px] font-medium">{getInitials(c.name)}</div>
                    <div className="text-sm text-[#0E2244] font-medium">{c.name}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0">
                    {c.msgs.map((m: any, i: number) => {
                      const prev = c.msgs[i - 1];
                      const showData = i === 0 || (prev && !mesmoDia(prev.createdAt, m.createdAt));
                      const isImg = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(m.attachmentUrl || "") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(m.attachmentName || "");
                      return (
                      <Fragment key={m.id}>
                        {showData && (
                          <div className="self-center my-1.5 text-[10px] text-[#5F5E5A] bg-[#EDE7D8] rounded-full px-3 py-0.5">{rotuloDia(m.createdAt)}</div>
                        )}
                        <div className={`max-w-[75%] ${m.mine ? "self-end" : "self-start"}`}>
                          <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.mine ? "bg-[#009AAC] text-white rounded-br-sm" : "bg-[#F1EFE8] text-[#0E2244] rounded-bl-sm"}`}>{m.content}
                            {m.attachmentUrl && isImg && (<a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1"><img src={m.attachmentUrl} alt={m.attachmentName || "imagem"} className="rounded-lg max-h-56 max-w-full" /></a>)}
                            {m.attachmentUrl && !isImg && (<a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-1 flex items-center gap-1 text-[12px] underline ${m.mine ? "text-white" : "text-[#0C447C]"}`}>📎 {m.attachmentName || "documento"}</a>)}
                          </div>
                          <div className={`text-[9.5px] text-[#374151] mt-0.5 flex items-center gap-1.5 ${m.mine ? "justify-end" : ""}`}>
                            <span>{(() => { try { return new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}</span>
                            {String(m.id || "").indexOf("local_") !== 0 && <button onClick={() => excluirNotaInterna(m.id)} title="Excluir" className="text-[#B4B2A9] hover:text-[#A32D2D]"><LuTrash className="w-2.5 h-2.5" /></button>}
                          </div>
                        </div>
                      </Fragment>
                      );
                    })}
                    <div ref={internasEndRef} />
                  </div>
                  <div className="border-t border-[#e8e1d2] p-3 flex-shrink-0">
                    {internasAnexo && (<div className="mb-2 flex items-center gap-2 text-[11px] bg-[#F1EFE8] rounded px-2 py-1 w-fit"><span>📎 {internasAnexo.name}</span><button onClick={() => setInternasAnexo(null)} className="text-[#A32D2D] font-medium">remover</button></div>)}
                    <div className="flex items-end gap-2">
                    <label className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f0f0ea]" title="Anexar documento"><input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocInterno(f); e.currentTarget.value = ""; }} /><span style={{ fontSize: "15px" }}>{anexandoDoc ? "…" : "📎"}</span></label>
                    <textarea value={internasReply} onChange={(e) => setInternasReply(e.target.value)} onPaste={colarNasInternas} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarRespostaInterna(); } }} rows={1} placeholder="Escreva uma mensagem… (pode colar um print)" className="flex-1 px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none" />
                    <EmojiPicker onPick={(em) => setInternasReply((v) => v + em)} />
                    <button onClick={() => enviarRespostaInterna()} disabled={!internasReply.trim() && !internasAnexo} className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">Enviar</button>
                    </div>
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
        <div className="flex-1 overflow-y-auto">
          {minhasAtribuidas.length === 0 ? (
            <div className="p-8 text-center text-[#5F5E5A] text-sm flex flex-col items-center gap-3">
              <div style={{ fontSize: 34 }}>↪️</div>
              <p>Nenhuma conversa encaminhada pra você no momento.</p>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-[11.5px] text-[#5F5E5A] border-b" style={{ borderColor: "#e8e1d2" }}>
                <b>{minhasAtribuidas.length}</b> conversa{minhasAtribuidas.length > 1 ? "s" : ""} atribuída{minhasAtribuidas.length > 1 ? "s" : ""} a você
                {encaminhadasCount > 0 ? ` · ${encaminhadasCount} com mensagem nova` : ""}
              </div>
              {minhasAtribuidas.map((c) => (
                <button key={c.id} onClick={() => { setSelectedId(c.id); setTab("conversas"); }}
                  className="w-full text-left px-3 py-2.5 border-b hover:bg-[#F0FBFC] flex items-center gap-2.5" style={{ borderColor: "#F0EBE0" }}>
                  <div className="w-9 h-9 rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[12px] font-semibold shrink-0">
                    {getInitials(c.tutor?.name || c.contactName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#0E2244] truncate">{c.tutor?.name || c.contactName || c.contactNumber}</div>
                    <div className="text-[11.5px] text-[#374151] truncate">{c.lastMessage?.content || "—"}</div>
                  </div>
                  {(c.unreadCount || 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#E24B4A] text-white shrink-0">{c.unreadCount}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Rodapé de gamificação removido: eram só placeholders "—", nunca calculados. */}

      {/* Boletim: seletor de pet quando o cliente tem mais de um */}
      {boletimPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setBoletimPicker(null)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base text-[#0E2244] font-medium mb-1">Boletim — qual pet?</h3>
            <p className="text-[12px] text-[#888780] mb-3">Este cliente tem mais de um pet. Escolha para qual é o boletim:</p>
            <div className="flex flex-col gap-1.5">
              {boletimPicker.map((p) => (
                <button key={p.id} onClick={() => { setBoletimPet(p); setBoletimPicker(null); }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-[#e8e1d2] hover:border-[#009AAC] hover:bg-[#F0FBFC] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#E0F4F6] text-[#00798A] flex items-center justify-center text-sm">🐾</span>
                  <div><div className="text-[13px] font-medium text-[#014D5E]">{p.name}</div><div className="text-[10.5px] text-[#888780]">{[p.breed, p.species].filter(Boolean).join(" · ")}</div></div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3"><button onClick={() => setBoletimPicker(null)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button></div>
          </div>
        </div>
      )}
      {boletimPet && (
        <BoletimModal pet={boletimPet} boletimId={null} onClose={() => setBoletimPet(null)} onSaved={() => { setBoletimPet(null); toast.success("Boletim salvo na ficha do pet"); }} />
      )}
      {/* Agendar consulta em pop-up (o mesmo modal da agenda), já com o cliente da conversa */}
      <NovoAgendamentoModal open={agendarOpen} onClose={() => setAgendarOpen(false)}
        agendarAposCriar={!selectedConv?.tutor?.id}
        defaults={selectedConv?.tutor?.id
          ? { tutor: { id: selectedConv.tutor.id, name: selectedConv.tutor.name } }
          : { novoCliente: { nome: selectedConv?.contactName || "", tel: selectedConv?.contactNumber || "" } }}
        onCreated={(info) => {
          setAgendarOpen(false); toast.success("Consulta agendada");
          // 📅 Envia AUTOMATICAMENTE a confirmação do agendamento pra conversa (pergunta 3, 31/07).
          if (info?.date && info?.time) {
            const [, mm, dd] = String(info.date).split("-");
            const diaBR = dd && mm ? `${dd}/${mm}` : info.date;
            const petTxt = info.petNome ? `${info.petNome} — ` : "";
            const msg = `✅ Agendamento confirmado! ${petTxt}${diaBR} às ${info.time}. Qualquer coisa é só chamar por aqui. 🐾`;
            sendMessage(msg);
          }
          // Contato sem cadastro: já deixa o link de cadastro pronto pra mandar ao tutor completar.
          if (!selectedConv?.tutor?.id) {
            const l = window.location.origin + "/queremos-te-conhecer";
            setMessageInput(`Prontinho, agendei o atendimento do seu pet! 🐾 Pra confirmar, é só completar seu cadastro rapidinho: ${l}\n\nAssim que você preencher, está tudo certo! 💙`);
          }
        }} />

      {/* MODAL Galeria de mídia da conversa */}
      {galeriaOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setGaleriaOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-[#e8e1d2] flex items-center justify-between">
              <h3 className="text-base text-[#0E2244] font-medium">🖼️ Galeria de mídia
                {!galeriaLoading && <span className="text-[12px] text-[#888780] font-normal"> · {galeriaItens.length} {galeriaItens.length === 1 ? "item" : "itens"}</span>}
              </h3>
              <button onClick={() => setGaleriaOpen(false)} className="text-[#5F5E5A] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-2 border-b border-[#e8e1d2] flex gap-1.5 flex-wrap">
              {(([["todos", "Tudo"], ["IMAGE", "📷 Fotos"], ["VIDEO", "🎬 Vídeos"], ["AUDIO", "🎤 Áudios"], ["DOCUMENT", "📄 Docs"]]) as [typeof galeriaFiltro, string][]).map(([k, label]) => {
                const n = k === "todos" ? galeriaItens.length : galeriaItens.filter((x) => x.type === k).length;
                return (
                  <button key={k} onClick={() => setGaleriaFiltro(k)}
                    className={`text-[12px] px-2.5 py-1 rounded-full border transition ${galeriaFiltro === k ? "bg-[#009AAC] text-white border-[#009AAC]" : "bg-white text-[#5F5E5A] border-[#e8e1d2] hover:border-[#009AAC]"}`}>
                    {label}{n ? ` (${n})` : ""}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {galeriaLoading ? (
                <p className="text-center text-[12px] text-[#888780] py-10">Carregando mídias…</p>
              ) : galeriaItens.length === 0 ? (
                <p className="text-center text-[12px] text-[#888780] py-10">Esta conversa não tem fotos, vídeos, áudios ou documentos.</p>
              ) : (() => {
                const itens = galeriaFiltro === "todos" ? galeriaItens : galeriaItens.filter((x) => x.type === galeriaFiltro);
                if (!itens.length) return <p className="text-center text-[12px] text-[#888780] py-10">Nada nesse filtro.</p>;
                const dt = (v: any) => { try { return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }); } catch { return ""; } };
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {itens.map((it) => {
                      const url = `/api/whatsapp/messages/${it.id}/media`;
                      if (it.type === "IMAGE") return (
                        <a key={it.id} href={url} target="_blank" rel="noreferrer" className="relative block aspect-square rounded-lg overflow-hidden border border-[#e8e1d2] bg-[#F4F8F9]">
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded">{dt(it.createdAt)}</span>
                        </a>
                      );
                      if (it.type === "VIDEO") return (
                        <a key={it.id} href={url} target="_blank" rel="noreferrer" className="relative block aspect-square rounded-lg overflow-hidden border border-[#e8e1d2] bg-black">
                          <video src={url} preload="metadata" className="w-full h-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center text-white text-2xl pointer-events-none">▶</span>
                          <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded">{dt(it.createdAt)}</span>
                        </a>
                      );
                      if (it.type === "AUDIO") return (
                        <div key={it.id} className="aspect-square rounded-lg border border-[#e8e1d2] bg-[#F4F8F9] p-2 flex flex-col items-center justify-center gap-1 text-center">
                          <span className="text-2xl">🎤</span>
                          <audio controls src={url} className="w-full" style={{ height: "32px" }} />
                          <span className="text-[9px] text-[#888780]">{dt(it.createdAt)}</span>
                        </div>
                      );
                      return (
                        <a key={it.id} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg border border-[#e8e1d2] bg-[#F4F8F9] p-2 flex flex-col items-center justify-center gap-1 text-center hover:bg-[#F0FBFC]">
                          <span className="text-2xl">📄</span>
                          <span className="text-[10px] text-[#0E2244] line-clamp-2 break-words">{it.content && !it.content.startsWith("[") ? it.content : "Documento"}</span>
                          <span className="text-[9px] text-[#888780]">{dt(it.createdAt)}</span>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL Exportar conversa (PDF) */}
      {exportOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !exportando && setExportOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base text-[#0E2244] font-medium mb-1">📄 Exportar conversa</h3>
            <p className="text-[12px] text-[#5F5E5A] mb-3">Gera um PDF com papel timbrado (cliente, telefone, datas e todas as mensagens). Use "Salvar como PDF" na janela de impressão.</p>
            <label className="flex items-start gap-2 text-[13px] text-[#0E2244] cursor-pointer mb-4">
              <input type="checkbox" checked={exportAuto} onChange={(e) => setExportAuto(e.target.checked)} className="mt-0.5" />
              <span>Incluir mensagens automáticas <span className="text-[11px] text-[#888780]">(aniversário, confirmação, boletim, IA). Desmarque para "só conversa real".</span></span>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setExportOpen(false)} disabled={exportando} className="px-3 py-1.5 text-xs text-[#5F5E5A] disabled:opacity-50">Cancelar</button>
              <button onClick={exportarConversa} disabled={exportando} className="px-4 py-1.5 text-xs text-white rounded-lg font-medium disabled:opacity-60" style={{ background: "#009AAC" }}>{exportando ? "Gerando…" : "Exportar PDF"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Nova mensagem com agendamento + scripts */}
      {novaMsgOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNovaMsgOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base text-[#0E2244] font-medium">Nova conversa</h3>
              <button onClick={() => setNovaMsgOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>

            {/* 1) Buscar contato por nome */}
            {/* CLIENTE */}
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Para quem? (nome do cliente ou telefone)</label>
            <div className="relative mb-2">
              <input value={novaMsgBusca} onChange={(e) => { buscarContatoNova(e.target.value); if (tutorSel) { setTutorSel(null); setNovaMsgPet(""); } }}
                placeholder="Buscar cliente ou lead por nome..."
                className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              {novaMsgResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {novaMsgResults.map((c, i) => (
                    <button key={i} onClick={() => pickContatoNova(c)} className="w-full text-left px-3 py-2 hover:bg-[#F0FBFC] border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                      <div className="text-[12.5px] text-[#0E2244] font-medium">{c.nome} <span className="text-[10px] text-[#888780]">· {c.tipo}</span></div>
                      <div className="text-[10.5px] text-[#888780]">{c.tel}</div>
                      {(c.pets || []).length > 0 && (
                        <div className="text-[9.5px] text-[#888780] mt-0.5">🐾 {c.pets.length === 1 ? c.pets[0] : `${c.pets.length} pets`}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PET — ligado ao cliente. Sem cliente escolhido, busca pelo nome do animal. */}
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">
              Pet {tutorSel && (tutorSel.pets || []).length > 1 && <span className="text-[#B23B39]">· escolha qual</span>}
            </label>
            {tutorSel ? (
              (tutorSel.pets || []).length === 0 ? (
                <div className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 text-[#888780] bg-[#FBF9F4]">
                  {tutorSel.nome} não tem pet cadastrado
                </div>
              ) : (
                <select value={novaMsgPet} onChange={(e) => trocarPet(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-3 bg-white focus:outline-none"
                  style={{ borderColor: (tutorSel.pets || []).length > 1 && !novaMsgPet ? "#F0C2C2" : "#e8e1d2" }}>
                  <option value="">— escolha o pet —</option>
                  {(tutorSel.pets || []).map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>
              )
            ) : (
              <div className="relative mb-3">
                <input value={buscaPet} onChange={(e) => buscarPetNova(e.target.value)}
                  placeholder="…ou busque pelo nome do animal"
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#00798A]" />
                {petResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {petResults.map((r, i) => (
                      <button key={i} onClick={() => pickPetNova(r.tutor, r.pet)} className="w-full text-left px-3 py-2 hover:bg-[#F0FBFC] border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                        <div className="text-[12.5px] text-[#0E2244] font-medium">🐾 {r.pet}</div>
                        <div className="text-[10.5px] text-[#888780]">de {r.tutor.nome} · {r.tutor.tel}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <input value={novaMsgPhone} onChange={(e) => setNovaMsgPhone(e.target.value)} placeholder="+55 85 99999-9999"
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-3 focus:outline-none focus:border-[#009AAC]" />

            {/* 2) Modelo do Meta — para iniciar conversa nova (fora das 24h) */}
            <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Modelo do Meta (para iniciar conversa nova)</label>
            <select value={novaMsgTemplate} onChange={(e) => onSelectTemplate(e.target.value)} className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-2 focus:outline-none focus:border-[#009AAC]">
              <option value="">— escolha um modelo aprovado —</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            {novaMsgTemplate && (
              <div className="bg-[#F0FBFC] border border-[#cfeef2] rounded-lg p-2.5 mb-3">
                <div className="text-[11px] text-[#0E2244] whitespace-pre-wrap mb-2">{(() => { let p = templateBody(novaMsgTemplate); novaMsgVars.forEach((v, i) => { p = p.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`); }); return p; })()}</div>
                {novaMsgVars.map((v, i) => (
                  <input key={i} value={v} onChange={(e) => setNovaMsgVars((vs) => vs.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={["Cliente {{1}}", "Pet {{2}}", "Quem atende {{3}}"][i] || `Variável {{${i + 1}}}`}
                    className="w-full px-2.5 py-1.5 border border-[#e8e1d2] rounded-lg text-[12px] mb-1.5 focus:outline-none focus:border-[#009AAC]" />
                ))}
                <button onClick={enviarTemplate} disabled={templateSending} className="w-full mt-1 bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">
                  {templateSending ? "Enviando…" : "🚀 Enviar modelo (iniciar conversa)"}
                </button>
              </div>
            )}

            <div className="border-t my-2" style={{ borderColor: "#eee" }} />
            <div className="text-[10px] text-[#888780] mb-2">Ou <b>texto livre</b> — só funciona se a pessoa te enviou mensagem nas últimas 24h:</div>

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
              className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm mb-2 focus:outline-none focus:border-[#009AAC] resize-none" />

            {/* Anexar documento/foto — vale pra qualquer mensagem (vai como legenda). */}
            <div className="mb-3">
              {novaMsgAnexo ? (
                <span className="inline-flex items-center gap-2 text-[11px] bg-[#F1EFE8] rounded px-2 py-1">
                  📎 {novaMsgAnexo.name}
                  <button onClick={() => setNovaMsgAnexo(null)} className="text-[#A32D2D] font-medium">remover</button>
                </span>
              ) : (
                <label className="inline-flex items-center gap-1 text-[11px] text-[#009AAC] cursor-pointer hover:underline">
                  📎 Anexar documento ou foto
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.mp4,.mp3,.ogg" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setNovaMsgAnexo(f); }} />
                </label>
              )}
            </div>

            {!novaMsgAnexo && (
              <>
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
              </>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setNovaMsgOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={enviarNovaMensagem} disabled={novaMsgSending} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {novaMsgSending ? "Enviando..." : (novaMsgAnexo ? "Enviar com anexo" : (novaMsgScheduledAt ? "Agendar" : "Enviar agora"))}
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
            <p className="text-[11.5px] text-[#5F5E5A] mb-2">
              Quem receber fica responsável pelo atendimento. Os outros continuam vendo a conversa —
              aparece um aviso pra ninguém responder por cima.
            </p>
            {selectedConv?.assignedUser && (
              <div className="text-[11px] mb-2 px-2.5 py-1.5 rounded-lg" style={{ background: "#FBF3E3", color: "#8a6400" }}>
                Hoje está com <b>{selectedConv.assignedUser.name}</b>.
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
              {internalUsers.filter((u) => u.hasLogin && u.id !== selectedConv?.assignedUser?.id).length === 0 ? (
                <div className="text-[12px] text-[#888780] py-6 text-center">Nenhum outro atendente com login disponível.</div>
              ) : (
                internalUsers
                  .filter((u) => u.hasLogin && u.id !== selectedConv?.assignedUser?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      disabled={transferindo}
                      onClick={() => transferirPara(u.id, u.name)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F0FBFC] border-b last:border-b-0 flex items-center gap-2.5 disabled:opacity-50"
                      style={{ borderColor: "#F0EBE0" }}>
                      <div className="w-7 h-7 rounded-full bg-[#E0F4F6] text-[#00798A] flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] text-[#0E2244] font-medium truncate">{u.name}{u.id === meId ? " (você)" : ""}</div>
                        {u.role && <div className="text-[10px] text-[#888780] truncate">{u.role}</div>}
                      </div>
                    </button>
                  ))
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setEncaminharOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Encaminhar mídia/texto para outra conversa */}
      {(fwdMsgId || fwdBatch) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]" onClick={() => { if (!fwdEnviando) { setFwdMsgId(null); setFwdBatch(false); } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}>
              <h3 className="text-[15px] font-semibold text-[#014D5E]">↷ Encaminhar {fwdBatch && selIds.size > 1 ? `${selIds.size} mensagens ` : ""}para…</h3>
              <button onClick={() => { setFwdMsgId(null); setFwdBatch(false); }} className="text-[#94a3b8] text-lg leading-none">×</button>
            </div>
            <div className="p-3 border-b" style={{ borderColor: "#F0EBE0" }}>
              <input autoFocus value={fwdBusca} onChange={(e) => setFwdBusca(e.target.value)} placeholder="🔍 Buscar cliente/conversa…" className="w-full border rounded-lg px-3 py-2 text-[13px]" style={{ borderColor: "#E8DFC8" }} />
            </div>
            <div className="overflow-y-auto flex-1">
              {conversations
                .filter((c) => { const q = fwdBusca.trim().toLowerCase(); const nm = (c.tutor?.name || c.contactName || c.contactNumber || "").toLowerCase(); return !q || nm.includes(q) || (c.contactNumber || "").includes(q); })
                .slice(0, 40)
                .map((c) => { const nome = c.tutor?.name || c.contactName || c.contactNumber || "Sem nome"; return (
                  <button key={c.id} disabled={fwdEnviando} onClick={() => encaminharPara(c.id, nome)} className="w-full text-left px-4 py-2.5 hover:bg-[#F6FDFD] border-b flex items-center gap-2 disabled:opacity-50" style={{ borderColor: "#F5F1E8" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ background: "#E0F4F6", color: "#014D5E" }}>{getInitials(c.tutor?.name || c.contactName)}</div>
                    <div className="min-w-0"><div className="text-[13px] font-medium text-[#0E2244] truncate">{nome}</div><div className="text-[11px] text-[#94a3b8]">{c.contactNumber}</div></div>
                  </button>
                ); })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
