"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useSession, signOut } from "next-auth/react";
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
  contactNumber: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  tutor?: { id: string; name: string } | null;
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

export default function InboxUnificadoPage() {
  usePageTitle("Inbox Meta", "Conversas WhatsApp Business via API Meta");
  const [tab, setTab] = useState<Tab>("conversas");
  const [filter, setFilter] = useState<ListFilter>("todos");
  const [viewResp, setViewResp] = useState<"todas" | "minhas" | "livres">("todas");
  const [verEncerradas, setVerEncerradas] = useState(false); // mostrar conversas já encerradas (pra reler)
  const [filtrosOpen, setFiltrosOpen] = useState(false); // roll-up dos filtros (ocupa menos espaço)
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convError, setConvError] = useState<string | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null); // âncora p/ rolar até a última mensagem
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneParam, setPhoneParam] = useState(""); // ?phone= vindo dos botões "💬 WhatsApp"
  const autoPhoneDone = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [respondendo, setRespondendo] = useState<Message | null>(null); // mensagem sendo citada
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
      toast.success("Anexo enviado");
    } catch (e: any) {
      // Erro do Meta (janela de 24h, formato, tamanho) chega inteiro aqui — melhor
      // a atendente ler o motivo do que ver o anexo sumir sem explicação.
      toast.error(String(e?.message || e).slice(0, 140));
    } finally {
      setAnexando(false);
    }
  }
  const [tutor, setTutor] = useState<TutorFull | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const { data: __session } = useSession();
  const meId = (__session as any)?.user?.id as string | undefined;
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
    let alive = true;
    const sigC = (a: any[]) => a.map((c: any) => `${c.id}|${c.status}|${c.assignedUser?.id || ""}|${c.unreadCount}|${c.lastMessageAt}|${(c.metadata?.tags || c.tags || []).join(">")}`).join(",");
    const carregar = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Encerradas: busca só as CLOSED (pra reler). Normal: as abertas.
        const res = await fetch(`/api/whatsapp/conversations?limit=50${verEncerradas ? "&status=CLOSED" : ""}`, { cache: "no-store" });
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
          contactNumber: c?.contactPhone || c?.contactNumber || "",
          lastMessageAt: c?.lastMessageAt || c?.createdAt || new Date().toISOString(),
          unreadCount: typeof c?.unreadCount === "number" ? c.unreadCount : 0,
          status: c?.status || "OPEN",
          tutor: c?.tutor ? { id: c.tutor.id, name: c.tutor.name } : null,
          assignedUser: c?.assignedUser ? { id: c.assignedUser.id, name: c.assignedUser.name } : null,
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
    const id = setInterval(() => carregar(true), 15000);
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
        const res = await fetch(`/api/whatsapp/conversations/${selectedId}/messages?limit=30`);
        // Tropeço não apaga as mensagens já na tela — mantém a conversa visível.
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.data) ? data.data
                    : Array.isArray(data?.messages) ? data.messages
                    : Array.isArray(data) ? data : [];
        if (!cancel) setMessages(list.map((m: any) => ({
          id: m?.id || Math.random().toString(),
          direction: m?.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
          content: typeof m?.content === "string" ? m.content : null,
          type: m?.type || "TEXT",
          createdAt: m?.createdAt || new Date().toISOString(),
          fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent, mediaType: m?.mediaType || null, hasMedia: !!(m?.mediaCloudUrl || m?.mediaUrl),
          waMessageId: m?.waMessageId || null,
          replyToWaMessageId: m?.metadata?.replyToWaMessageId || null, metadata: m?.metadata || null})));
      } catch { /* tropeço: mantém as mensagens que já estão na tela */ }
    };
    // Abrir a conversa já zera o unreadCount no servidor (getMessages) — avisa o menu p/ sumir o badge na hora.
    carregar().then(() => { if (!cancel) window.dispatchEvent(new Event("whatsapp:read")); });
    const id = setInterval(carregar, 12000);
    return () => { cancel = true; clearInterval(id); };
  }, [selectedId]);

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

  // Ao abrir uma conversa ou chegar mensagem nova, rola até a última mensagem.
  useEffect(() => {
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
    return arr;
  }, [conversations, filter, search, viewResp, meId, filtroTag]);

  // Encaminhadas pra mim e ainda não abertas — vira o badge da aba Encaminhadas.
  const encaminhadasCount = useMemo(() => conversations.filter((c) => c.assignedUser?.id === meId && (c.unreadCount || 0) > 0).length, [conversations, meId]);

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
      toast.success(`Conversa transferida para ${nome}`);
      setEncaminharOpen(false);
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Não consegui transferir a conversa."); }
    finally { setTransferindo(false); }
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
  const primaryPhone = tutor?.contacts?.find((c) => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || selectedConv?.contactNumber;

  const sendMessage = async (textOverride?: string) => {
    const raw = (textOverride ?? messageInput).trim();
    if (!raw || !selectedId) return;
    if (!textOverride) setMessageInput("");
    setRespondendo(null); // a citação vale pra UMA resposta só
    // Atalho: "/cadastro" vira a mensagem com o link público de cadastro.
    const linkCadastro = (typeof window !== "undefined" ? window.location.origin : "") + "/queremos-te-conhecer";
    let text = /^\/cadastro$/i.test(raw)
      ? `Oi! 🐾 Pra gente te conhecer melhor e cuidar bem do seu pet, preenche rapidinho aqui: ${linkCadastro} 💙`
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
        fromAgent: !!m?.metadata?.fromAgent || !!m?.fromAgent, mediaType: m?.mediaType || null, hasMedia: !!(m?.mediaCloudUrl || m?.mediaUrl),
          waMessageId: m?.waMessageId || null,
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
    const id = setInterval(load, 15000);
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
      <div className="px-4 border-b border-[#e8e1d2] flex gap-5 bg-white items-center">
        <button onClick={() => setTab("conversas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "conversas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Conversas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "conversas" ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{counts.total}</span>
        </button>
        <button onClick={() => setTab("internas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "internas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Internas
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "internas" ? "bg-[#FEF3C7] text-[#A16207]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>{internasRecebidas.filter((n: any) => n.toUserId === meId && !n.readAt).length}</span>
        </button>
        <button onClick={() => setTab("encaminhadas")} className={`py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 ${tab === "encaminhadas" ? "border-[#009AAC] text-[#0E2244]" : "border-transparent text-[#888780]"}`}>
          Encaminhadas
          {encaminhadasCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#E24B4A] text-white">{encaminhadasCount}</span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[11px] text-[#5F5E5A] hidden lg:flex items-center gap-1.5">Hoje: <b className="text-[#0F6E56]">— resolvidas</b></span>
          <button onClick={() => setRefreshTick((t) => t + 1)} title="Atualizar" className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#5F5E5A] flex items-center gap-1.5 hover:bg-[#f9f9f9]"><span style={{fontSize:"12px"}}>↻</span>Atualizar</button>
          <button onClick={() => abrirNovaConversa()} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova mensagem</button>
        </div>
      </div>

      {tab === "conversas" && (
        <div className="grid grid-cols-[310px_1fr_340px] grid-rows-[minmax(0,1fr)] flex-1 min-h-0">
          {/* LEFT - Lista */}
          <div className="border-r border-[#e8e1d2] bg-white flex flex-col min-h-0">
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
                        <button key={f} onClick={() => setFilter(f)} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${filter === f ? "bg-[#009AAC] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>
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
                          <button key={v} onClick={() => setViewResp(v)} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${viewResp === v ? "bg-[#0F6E56] text-white" : "bg-white border border-[#cfd8e0] text-[#5F5E5A]"}`}>{label} {n}</button>
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
                const naoLida = (c.unreadCount || 0) > 0;
                const nome = c.tutor?.name || c.contactName || c.contactNumber;
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
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-[#f0e8d4] flex gap-2.5 items-start ${isSel ? "bg-[#F4FAFB] border-l-[3px] border-l-[#009AAC] pl-[9px]" : "bg-white hover:bg-[#FBF9F4]"}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                      style={{ background: isLead ? "#B7791F" : "#009AAC" }}>{getInitials(nome)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12.5px] truncate ${naoLida ? "font-bold text-[#0E2244]" : "font-medium text-[#0E2244]"}`}
                          title={c.tutor?.name && c.contactName && c.contactName !== c.tutor.name ? `No WhatsApp: ${c.contactName}` : undefined}>{nome}</span>
                        <span className="ml-auto text-[10px] text-[#A7ADA8] whitespace-nowrap flex-shrink-0">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</span>
                      </div>
                      <div className={`text-[11.5px] truncate mt-0.5 ${naoLida ? "text-[#0E2244] font-medium" : "text-[#8A928F]"}`}>
                        {previa || <span className="italic text-[#B5AFA2]">sem mensagens</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isLead ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#E1F5EE] text-[#0F6E56]"}`}>{isLead ? "LEAD" : "CLIENTE"}</span>
                        {(c.tags || []).map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ background: corTag(t) }}>{t}</span>
                        ))}
                        {isBC && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FBF0DD] text-[#8a6313]">via BotConversa</span>}
                        {c.assignedUser && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: c.assignedUser.id === meId ? "#DCFCE7" : "#EAF3DE", color: "#0F6E56" }} title={`Responsável: ${c.assignedUser.name}`}>
                            👤 {c.assignedUser.id === meId ? "Você" : (c.assignedUser.name || "").split(" ")[0]}
                          </span>
                        )}
                        {naoLida && <span className="ml-auto bg-[#009AAC] text-white text-[9px] min-w-[18px] h-[18px] px-1 rounded-full font-bold flex items-center justify-center">{c.unreadCount}</span>}
                      </div>
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
                <div className="px-4 py-2.5 border-b border-[#e8e1d2] flex items-center justify-between relative">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[11px] font-medium">
                      {getInitials(selectedConv?.tutor?.name || selectedConv?.contactName)}
                    </div>
                    <div>
                      <div className="text-xs text-[#0E2244] font-medium flex items-center gap-1.5">
                        {selectedConv?.tutor?.name || selectedConv?.contactName || selectedConv?.contactNumber || "Sem nome"}
                        {selectedConv?.tutor?.id && (
                          <button onClick={() => window.open(`/dashboard/erp/tutores/${selectedConv.tutor!.id}`, "_blank")}
                            title="Editar ficha do cliente (abre a ficha completa)" className="text-[#c8d0d4] hover:text-[#009AAC] text-[11px]">✏️</button>
                        )}
                      </div>
                      <div className="text-[10px] text-[#888780]">
                        📞 {selectedConv?.contactNumber || "—"}
                        {selectedConv?.tutor?.name && selectedConv?.contactName && selectedConv.contactName !== selectedConv.tutor.name ? (
                          <span className="text-[#A8A69C]"> · no WhatsApp: {selectedConv.contactName}</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {selectedConv?.assignedUser?.id === meId ? (
                          <span className="text-[10px] font-medium" style={{ color: "#0F6E56" }}>👤 Você está atendendo</span>
                        ) : selectedConv?.assignedUser ? (
                          <>
                            <span className="text-[10px] font-medium" style={{ color: "#0F6E56" }}>👤 Em atendimento por {selectedConv.assignedUser.name}</span>
                            <button onClick={assumirAtendimento} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#E6F1FB] text-[#185FA5] hover:bg-[#cce0f5]">assumir p/ mim</button>
                          </>
                        ) : (
                          <button onClick={assumirAtendimento} className="text-[9.5px] px-2 py-0.5 rounded-full text-white font-medium" style={{ background: "#0F6E56" }}>👤 Assumir atendimento</button>
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
                    {/* ⋮ ações secundárias (como no mockup) */}
                    <div className="relative">
                      <button onClick={() => setHeaderMenuOpen((o) => !o)} title="Mais ações"
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[15px] border ${headerMenuOpen ? "bg-[#F0FBFC] border-[#009AAC] text-[#00798A]" : "bg-white border-[#e8e1d2] text-[#888780]"}`}>⋮</button>
                      {headerMenuOpen && (
                        <div className="absolute right-0 top-9 z-30 bg-white border border-[#e8e1d2] rounded-lg shadow-lg w-56 overflow-hidden">
                          <button onClick={() => { setHeaderMenuOpen(false); setEncaminharOpen(true); }} className="w-full text-left px-3 py-2.5 text-[12px] hover:bg-[#F0FBFC] flex items-center gap-2 text-[#0E2244]">↪ Transferir de atendente</button>
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

                <div className="flex-1 overflow-y-auto p-4 bg-white flex flex-col gap-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-[11px] text-[#888780]">Sem mensagens</p>
                  ) : messages.map((m) => {
                    const outbound = m.direction === "OUTBOUND";
                    // A mensagem citada por esta (se ainda estiver carregada na conversa).
                    const citada = m.replyToWaMessageId
                      ? messages.find((x) => x.waMessageId && x.waMessageId === m.replyToWaMessageId)
                      : null;
                    return (
                      <div key={m.id} className={`group max-w-[75%] ${outbound ? "self-end" : "self-start"}`}>
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
                            <a href={`/api/whatsapp/messages/${m.id}/media`} target="_blank" rel="noreferrer" className="block">
                              <img src={`/api/whatsapp/messages/${m.id}/media`} alt={m.content || "Imagem"} className="rounded-lg max-w-full max-h-64 object-cover" loading="lazy" />
                              {m.content && !m.content.startsWith("[") && <div className="mt-1">{m.content}</div>}
                            </a>
                          ) : (m.type === "STICKER") && m.hasMedia ? (
                            <img src={`/api/whatsapp/messages/${m.id}/media`} alt="Figurinha" className="max-w-[120px]" loading="lazy" />
                          ) : m.type === "AUDIO" && m.hasMedia ? (
                            <audio controls src={`/api/whatsapp/messages/${m.id}/media`} className="max-w-full" />
                          ) : (m.type === "VIDEO" || m.type === "DOCUMENT") && m.hasMedia ? (
                            <a href={`/api/whatsapp/messages/${m.id}/media`} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">📎 {m.content && !m.content.startsWith("[") ? m.content : "Abrir arquivo"}</a>
                          ) : (m.type === "LOCATION" || m.metadata?.latitude) ? (
                            <a href={`https://www.google.com/maps?q=${m.metadata?.latitude},${m.metadata?.longitude}`} target="_blank" rel="noreferrer" className="underline flex items-center gap-1" style={{ color: "#009AAC" }}>📍 {m.metadata?.name || m.metadata?.address || "Ver localização no mapa"}</a>
                          ) : (m.mediaType || m.type === "DOCUMENT" || m.type === "IMAGE" || m.type === "AUDIO" || m.type === "VIDEO") ? (
                            <span className="italic text-[#888780]">📎 {m.content || "anexo"} <span className="text-[10px]">(não foi possível carregar o arquivo)</span></span>
                          ) : (
                            m.content ? renderWa(m.content) : "(mídia)"
                          )}
                        </div>
                        <div className={`text-[9px] text-[#888780] mt-0.5 px-1 flex items-center gap-2 ${outbound ? "justify-end" : ""}`}>
                          {(() => { try { return new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}
                          {m.waMessageId && (
                            <button
                              onClick={() => setRespondendo(m)}
                              title="Responder citando esta mensagem"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#009AAC] font-medium hover:underline">
                              ↩ Responder
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {/* Input com Scripts dropdown */}
                <div className="px-4 py-2.5 border-t border-[#e8e1d2]">
                  {/* AVISO (não trava): a conversa é de outra pessoa. Fica aqui em cima do
                      campo — no cabeçalho ninguém vê na hora de digitar. */}
                  {selectedConv?.assignedUser && selectedConv.assignedUser.id !== meId && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[11.5px]"
                      style={{ background: "#FBF3E3", border: "1px solid #efe1c2", color: "#8a6400" }}>
                      <span>👤</span>
                      <span className="flex-1">
                        <b>{selectedConv.assignedUser.name}</b> está atendendo esta conversa. Você pode responder,
                        mas combine antes pra não falar por cima.
                      </span>
                      <button onClick={assumirAtendimento} className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                        style={{ background: "#8a6400", color: "white" }}>
                        assumir p/ mim
                      </button>
                    </div>
                  )}
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
                  {/* Assinar + botões rápidos (Fatia 2) */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <button onClick={() => setAssinar((v) => !v)} title="Assinar a mensagem com seu nome" className="flex items-center gap-1.5">
                      <span className={`w-8 h-[18px] rounded-full relative transition ${assinar ? "bg-[#009AAC]" : "bg-[#d8d0bc]"}`}>
                        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${assinar ? "left-[18px]" : "left-[2px]"}`} />
                      </span>
                      <span className="text-[11px] text-[#5F5E5A]">{assinar ? <>Assinar como <b>{primeiroNome || "você"}</b></> : "Sem assinatura"}</span>
                    </button>
                    <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => { const l = window.location.origin + "/queremos-te-conhecer"; setMessageInput(`Oi! 🐾 Pra gente te conhecer melhor, preenche rapidinho aqui: ${l} 💙`); }}
                        className="text-[10.5px] px-2 py-1 rounded-full border border-dashed border-[#009AAC] text-[#00798A] hover:bg-[#F0FBFC]">🔗 Enviar cadastro</button>
                      <button onClick={() => { if (!selectedConv?.tutor?.id) { toast("Agendar consulta é pra cliente com ficha — este contato ainda não tem cadastro.", { icon: "📅" }); return; } setAgendarOpen(true); }}
                        className="text-[10.5px] px-2 py-1 rounded-full border border-dashed border-[#009AAC] text-[#00798A] hover:bg-[#F0FBFC]">📅 Agendar consulta</button>
                      <button onClick={abrirBoletim} disabled={boletimLoading}
                        className="text-[10.5px] px-2 py-1 rounded-full border border-dashed border-[#009AAC] text-[#00798A] hover:bg-[#F0FBFC] disabled:opacity-50" title="Boletim de fisioterapia do pet">🌿 {boletimLoading ? "…" : "Boletim"}</button>
                      <button onClick={() => toast("🧪 Resultado de exame entra quando terminarmos o módulo de exames.", { icon: "🛠️" })}
                        className="text-[10.5px] px-2 py-1 rounded-full border border-dashed border-[#d8d0bc] text-[#9a948a] hover:bg-[#FBF9F4]" title="Em breve — módulo de exames em construção">🧪 Exame</button>
                    </div>
                  </div>
                  {scriptsOpen && (
                    <div className="bg-white border border-[#e8e1d2] rounded-lg p-2 mb-2 max-h-[160px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-[#888780] font-medium">MENSAGENS PRONTAS · clique pra inserir</span>
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
                    <button onClick={() => setScriptsOpen(!scriptsOpen)} title="Mensagens prontas"
                      className={`px-2.5 py-1.5 border rounded-lg text-xs flex items-center gap-1 ${scriptsOpen ? "bg-[#FBF0DD] border-[#8a6313] text-[#8a6313]" : "bg-white border-[#e8e1d2] text-[#5F5E5A]"}`}>
                      <span style={{fontSize:"12px"}}>📋</span>Prontas
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
                    <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Digite uma mensagem…  (dica: /cadastro envia o link de cadastro)"
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

          {/* RIGHT - Painel CRM unificado (igual ao Inbox BC) — fecha junto com a conversa */}
  {selectedId ? (
  <InboxRightPanel canal="WhatsApp Meta" initialPhone={selectedConv?.contactNumber} initialTutorId={selectedConv?.tutor?.id} conversationId={selectedConv?.id} soContexto onVinculado={() => { setRefreshTick((t) => t + 1); }} />
  ) : (
  <div className="border-l border-[#e8e1d2] bg-white flex items-center justify-center text-center p-6">
    <p className="text-[11px] text-[#B4B2A9]">O contexto do cliente aparece aqui quando você abrir uma conversa.</p>
  </div>
  )}
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
                {internasAnexo && (<div className="mb-2 flex items-center gap-2 text-[11px] bg-[#F1EFE8] rounded px-2 py-1 w-fit"><span>📎 {internasAnexo.name}</span><button onClick={() => setInternasAnexo(null)} className="text-[#A32D2D] font-medium">remover</button></div>)}
                <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={6} placeholder="Escreva a mensagem..." className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none mb-3" />
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
                    <div className="w-9 h-9 rounded-full bg-[#009AAC] text-white flex items-center justify-center text-[12px] font-medium">{getInitials(c.name)}</div>
                    <div className="text-sm text-[#0E2244] font-medium">{c.name}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0">
                    {c.msgs.map((m: any) => (
                      <div key={m.id} className={`max-w-[75%] ${m.mine ? "self-end" : "self-start"}`}>
                        <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.mine ? "bg-[#009AAC] text-white rounded-br-sm" : "bg-[#F1EFE8] text-[#0E2244] rounded-bl-sm"}`}>{m.content}{m.attachmentUrl && (<a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-1 flex items-center gap-1 text-[12px] underline ${m.mine ? "text-white" : "text-[#0C447C]"}`}>📎 {m.attachmentName || "documento"}</a>)}</div>
                        <div className={`text-[9.5px] text-[#8A989D] mt-0.5 flex items-center gap-1.5 ${m.mine ? "justify-end" : ""}`}>
                          <span>{(() => { try { return new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}</span>
                          {String(m.id || "").indexOf("local_") !== 0 && <button onClick={() => excluirNotaInterna(m.id)} title="Excluir" className="text-[#B4B2A9] hover:text-[#A32D2D]"><LuTrash className="w-2.5 h-2.5" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#e8e1d2] p-3 flex-shrink-0">
                    {internasAnexo && (<div className="mb-2 flex items-center gap-2 text-[11px] bg-[#F1EFE8] rounded px-2 py-1 w-fit"><span>📎 {internasAnexo.name}</span><button onClick={() => setInternasAnexo(null)} className="text-[#A32D2D] font-medium">remover</button></div>)}
                    <div className="flex items-end gap-2">
                    <label className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f0f0ea]" title="Anexar documento"><input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocInterno(f); e.currentTarget.value = ""; }} /><span style={{ fontSize: "15px" }}>{anexandoDoc ? "…" : "📎"}</span></label>
                    <textarea value={internasReply} onChange={(e) => setInternasReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarRespostaInterna(); } }} rows={1} placeholder="Escreva uma mensagem..." className="flex-1 px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none" />
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
        <div className="p-8 text-center text-[#5F5E5A] text-sm flex flex-col items-center gap-3">
          <div style={{ fontSize: 34 }}>↪️</div>
          {encaminhadasCount > 0 ? (
            <p><b>{encaminhadasCount}</b> conversa{encaminhadasCount > 1 ? "s" : ""} encaminhada{encaminhadasCount > 1 ? "s" : ""} pra você e ainda não aberta{encaminhadasCount > 1 ? "s" : ""}.</p>
          ) : (
            <p>Nenhuma conversa encaminhada pra você no momento.</p>
          )}
          <p className="text-[12px] text-[#888780]">As conversas encaminhadas ficam atribuídas a você — na aba <b>Conversas</b>, filtro <b>👤 Minhas</b>.</p>
          <button onClick={() => { setTab("conversas"); setViewResp("minhas"); }}
            className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-xs font-medium">Ver minhas conversas</button>
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
        defaults={selectedConv?.tutor ? { tutor: { id: selectedConv.tutor.id, name: selectedConv.tutor.name } } : undefined}
        onCreated={() => { setAgendarOpen(false); toast.success("Consulta agendada"); }} />

      {/* MODAL Nova mensagem com agendamento + scripts */}
      {novaMsgOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNovaMsgOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
