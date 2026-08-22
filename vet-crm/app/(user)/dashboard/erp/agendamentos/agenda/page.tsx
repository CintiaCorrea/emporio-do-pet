"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import NovoAgendamentoModal from "@/components/agendamentos/NovoAgendamentoModal";
import BoletimModal from "@/components/pets/BoletimModal";
import Link from "next/link";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import toast from "react-hot-toast";

// Nome do pet/tutor CLICÁVEL no card da agenda → abre a ficha. stopPropagation pra não abrir o menu do card.
function NomeClicavel({ a, tutor = true }: { a: any; tutor?: boolean }) {
  const petId = a?.pet?.id || a?.petId; const petName = a?.pet?.name;
  const tutorId = a?.tutor?.id || a?.tutorId; const tutorName = a?.tutor?.name;
  const Pet = petName ? (petId ? <Link href={`/dashboard/erp/pets/${petId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{petName}</Link> : <>{petName}</>) : null;
  const Tut = tutorName ? (tutorId ? <Link href={`/dashboard/erp/tutores/${tutorId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{tutorName}</Link> : <>{tutorName}</>) : null;
  if (!Pet && !Tut) return <>Agendamento</>;
  if (!Pet) return <>{Tut}</>;
  return <>{Pet}{tutor && Tut ? <> · {Tut}</> : null}</>;
}
// Lógica pura da grade (testada em lib/agenda.blindagem.test.ts) — a tela usa o MESMO código dos testes.
import { corServico, corConfirmacao, ESTAGIOS, PREV_STATUS, estagioIdx, layoutSobreposicao, posicaoCard, agendaDoDia as agendaDoDiaLib } from "@/lib/agenda";

const STATUS_COR: Record<string, { c: string; bg: string }> = {
  "Agendado": { c: "#185FA5", bg: "#E6F1FB" }, "Confirmado": { c: "#0F6E56", bg: "#E1F5EE" },
  "Em espera": { c: "#854F0B", bg: "#FAEEDA" }, "Aguardando": { c: "#854F0B", bg: "#FAEEDA" },
  "Em atendimento": { c: "#0F6E56", bg: "#E1F5EE" }, "Atendido": { c: "#3B6D11", bg: "#EAF3DE" },
  "Realizado": { c: "#3B6D11", bg: "#EAF3DE" }, "Atrasado": { c: "#A32D2D", bg: "#FCEBEB" },
  "Cancelado": { c: "#5F5E5A", bg: "#F1EFE8" }, "Faltou": { c: "#A32D2D", bg: "#FCEBEB" },
};
function corDe(st?: string, cores?: any) { const base = STATUS_COR[st || ""] || { c: "#5F5E5A", bg: "#F1EFE8" }; return { c: base.c, bg: (cores && cores[st || ""]) || base.bg }; }
function ymd(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function hm(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
function nomeCurto(p: any) { if (p.nomeExibicao && p.nomeExibicao.trim()) return p.nomeExibicao; const w = (p.nomeCompleto || "Profissional").trim().split(/\s+/); return w.slice(0, 2).map(cap).join(" "); }
function norm(s?: string) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(dra?|dr)\.?\b/g, "").replace(/\s+/g, " ").trim(); }
function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function addD(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const DIAS_SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "s\u00e1b"];

export default function AgendaPage() {
  usePageTitle("Agenda", "Agendamentos do dia por profissional");
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === "ADMIN";
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const mostrarValores = isAdmin && valoresVisiveis;
  const [dia, setDia] = useState<Date>(() => new Date());
  const [appts, setAppts] = useState<any[]>([]);
  const [profs, setProfs] = useState<any[]>([]);
  const [avulsas, setAvulsas] = useState<any[]>([]); // agendas avulsas (Parceiro/MAP)
  const [fisioEquipe, setFisioEquipe] = useState<string[]>([]); // userIds da equipe de fisio (Config)
  const [terceiroProf, setTerceiroProf] = useState<Record<string, { id: string; nome: string }>>({}); // appointmentId -> parceiro que atende
  const [arrastando, setArrastando] = useState<any>(null); // agendamento sendo arrastado (drag pra mudar horário)
  const { data: _sess } = useSession();
  const meId = (_sess as any)?.user?.id as string | undefined;
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoDefaults, setNovoDefaults] = useState<any>(null);
  const [editAppt, setEditAppt] = useState<any>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [externosDia, setExternosDia] = useState<Record<string, string[]>>({}); // profs habilitados sob demanda por dia (yyyy-mm-dd -> [profId])
  const [incluirOpen, setIncluirOpen] = useState(false);
  const [cfg, setCfg] = useState<any>(null);
  const [view, setView] = useState<"dia" | "semana" | "mes">("dia");
  const [menuAppt, setMenuAppt] = useState<{ a: any; x: number; y: number } | null>(null);
  const [filasOpen, setFilasOpen] = useState(false); // roll-up do seletor de profissionais/filas
  const [mobProf, setMobProf] = useState<string | null>(null); // filtro de profissional na lista do CELULAR
  const [avancandoId, setAvancandoId] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<any>(null); // agendamento na prévia de confirmação
  const [cancelData, setCancelData] = useState<any>(null); // agendamento na tela de cancelar
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelObs, setCancelObs] = useState("");
  const [sending, setSending] = useState(false);
  const [boletimPet, setBoletimPet] = useState<any>(null); // pet (com tutor/contatos) p/ o popup de boletim
  const [boletimAgenda, setBoletimAgenda] = useState<{ data?: string; entrada?: string; saida?: string } | null>(null);
  const [boletinsEnv, setBoletinsEnv] = useState<Set<string>>(new Set()); // chave `${petId}|${data}` dos boletins já ENVIADOS
  const MOTIVOS_CANCEL = ["Outro compromisso", "Pet indisposto", "Esqueceu", "Financeiro", "Não tenho interesse", "Outro"];

  async function abrirBoletim(a: any) {
    try {
      const p = await fetch(`/api/pets/${a.pet?.id || a.petId}`, { cache: "no-store" }).then((r) => r.json());
      if (!p?.id) throw new Error();
      // Pré-preenche a Sessão do boletim com data/entrada/saída deste agendamento.
      const d = new Date(a.date); const z = (n: number) => String(n).padStart(2, "0");
      const fim = new Date(d.getTime() + (Number(a.duration) || 60) * 60000);
      setBoletimAgenda({ data: ymd(d), entrada: `${z(d.getHours())}:${z(d.getMinutes())}`, saida: `${z(fim.getHours())}:${z(fim.getMinutes())}` });
      setBoletimPet(p);
    } catch { toast.error("Não consegui abrir o boletim (pet não encontrado)"); }
  }

  useEffect(() => { try { const s = localStorage.getItem("agenda_filas_hidden"); if (s) setHidden(new Set(JSON.parse(s))); } catch {} }, []);
  function persist(s: Set<string>) { try { localStorage.setItem("agenda_filas_hidden", JSON.stringify([...s])); } catch {} }

  // "Carregando..." só na PRIMEIRA carga. Depois de confirmar, avançar estágio, dar
  // baixa etc., os dados são trocados por baixo sem desmontar a tela — senão a agenda
  // inteira some e volta, jogando o usuário pro topo a cada clique.
  const jaCarregou = useRef(false);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      // 🛡️ cada chamada devolve NULL em falha (não []): assim um blip de rede OU o reinício do
      // backend num deploy NÃO zera a tela — só atualizamos o que veio de fato.
      const [a, p, c, av, tp, fe] = await Promise.all([
        fetch("/api/appointments?limit=1000", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/profissionais", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/listas?lista=agenda_config", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/listas?lista=agenda_avulsa", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/listas?lista=agenda_terceiro_prof", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/listas?lista=fisio_equipe", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      const apptsArr = Array.isArray(a) ? a : (a?.data || a?.appointments || a?.items || null);
      if (apptsArr) setAppts(apptsArr);            // só troca se veio válido (senão mantém o que estava)
      const profsArr = Array.isArray(p) ? p : (p?.data || p?.items || null);
      if (profsArr) setProfs(profsArr);
      if (fe != null) { try { const arr = Array.isArray(fe) ? fe : (fe.itens || fe.data || []); setFisioEquipe(arr.map((x: any) => x.valor).filter(Boolean)); } catch {} }
      if (c != null) { try { const arr = Array.isArray(c) ? c : (c.itens || c.data || []); if (arr[0]?.valor) setCfg(JSON.parse(arr[0].valor)); } catch {} }
      if (av != null) { try { const arr = Array.isArray(av) ? av : (av.itens || av.data || []); setAvulsas(arr.map((i: any) => { try { return { _id: i.id, ...JSON.parse(i.valor) }; } catch { return null; } }).filter(Boolean)); } catch {} }
      if (tp != null) { try { const arr = Array.isArray(tp) ? tp : (tp.itens || tp.data || []); const m: Record<string, { id: string; nome: string }> = {}; arr.forEach((x: any) => { try { const v = JSON.parse(x.valor); if (v.appointmentId) m[v.appointmentId] = { id: v.id, nome: v.nome }; } catch {} }); setTerceiroProf(m); } catch {} }
    } catch {}
    jaCarregou.current = true;
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Atualização quase em tempo real: recarrega sozinho a cada 10s — SILENCIOSO (sem "carregando")
  // e SEM atrapalhar quando você está arrastando um card, com um modal ou menu aberto, ou com a
  // aba em segundo plano. Ao voltar o foco pra aba, atualiza na hora.
  const interagindoRef = useRef(false);
  interagindoRef.current = !!(arrastando || novoOpen || cancelData || menuAppt);
  // ⚡ Tempo real: qualquer mudança de agendamento (aqui ou em outra máquina) recarrega
  // na hora — respeitando o mesmo cuidado do poll (não recarrega arrastando/com modal aberto).
  useNotifications({
    onAgenda: () => { if (document.visibilityState === "visible" && !interagindoRef.current) load(); },
  });
  useEffect(() => {
    const podeRecarregar = () => document.visibilityState === "visible" && !interagindoRef.current;
    const id = setInterval(() => { if (podeRecarregar()) load(); }, 30000);
    const onVis = () => { if (podeRecarregar()) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profsAtende = useMemo(() => profs.filter((p: any) => p.ativo !== false && !["RECEPCIONISTA", "GERENTE"].includes(p.tipo) && !((cfg?.profsOcultos || []).includes(p.id))), [profs, cfg]);
  const hIni = Number(cfg?.horaInicio ?? 8); const hFim = Number(cfg?.horaFim ?? 19);
  const horas = useMemo(() => Array.from({ length: Math.max(hFim - hIni + 1, 1) }, (_, i) => i + hIni), [hIni, hFim]);
  const slots = useMemo(() => (Number(cfg?.intervalo) === 15 ? [0, 15, 30, 45] : [0, 30]), [cfg]);
  const wdAtual = dia.getDay();
  const diaStr = ymd(dia);
  function normEsc(v: any) { let o: any = v; if (typeof v === "string") { try { o = JSON.parse(v); } catch { o = null; } } return o && typeof o === "object" ? o : null; }
  function escDe(p: any) { return normEsc(p?.escala); }
  // fim vazio = folga de UM dia só (o de início) — NÃO "pra sempre" (senão bloqueia o profissional indefinidamente).
  function bloqueadoNoDia(e: any) { return !!(e && Array.isArray(e.bloqueios) && e.bloqueios.some((b: any) => b.inicio && (b.fim ? (diaStr >= b.inicio && diaStr <= b.fim) : diaStr === b.inicio))); }
  function temEscala(e: any) { return !!(e && e.semana && Object.keys(e.semana).length > 0); }
  function expedienteNoDia(e: any) { if (!temEscala(e)) return false; if (bloqueadoNoDia(e)) return false; return (e.semana[String(wdAtual)] || []).length > 0; }

  // Cancelado e Remarcado SAEM da agenda (somem do quadro e liberam o horário), mas continuam no histórico do pet (consulta à parte).
  // Dia/Semana/Mês usam a MESMA regra (lib/agenda.agendaDoDia, testada): sem Cancelado/Remarcado,
  // sem artefatos (Documento/Receita/Peso/Venda/Observação) e dedup por id — pra não trazer "lixo".
  const doDia = useMemo(() => agendaDoDiaLib(appts, diaStr), [appts, diaStr]);
  function agendaDoDia(ds: string) { return agendaDoDiaLib(appts, ds); }
  function valorDe(a: any) { const tr = a.treatments || []; return tr.reduce((s: number, t: any) => s + (Number(t.product?.price) || Number(t.valorUnitario) || 0) * (Number(t.quantidade) || 1), 0); }
  const profUserIds = useMemo(() => new Set(profsAtende.map((p: any) => p.userId).filter(Boolean)), [profsAtende]);
  function ehDoProf(a: any, prof: any) {
    if (prof.userId && a.userId === prof.userId) return true;
    if (!profUserIds.has(a.userId)) { const an = norm(a.user?.name); if (an && (an === norm(prof.nomeCompleto) || an === norm(prof.nomeExibicao))) return true; }
    return false;
  }
  // Coluna do profissional aparece hoje? Expediente na escala OU já tem atendimento OU habilitado sob demanda.
  function profVisivelHoje(p: any) {
    const e = escDe(p);
    const habilitado = (externosDia[diaStr] || []).includes(p.id);
    const temAtend = doDia.some((a: any) => ehDoProf(a, p));
    if (e && e.sobDemanda) return habilitado || temAtend;
    if (temEscala(e)) return expedienteNoDia(e) || habilitado || temAtend;
    return true; // sem escala configurada → coluna fixa (comportamento atual)
  }
  function foraDoHorario(p: any, h: number, m: number) {
    const e = p._avulsa ? normEsc(p._horario) : escDe(p);
    if (!temEscala(e)) return false;
    if (bloqueadoNoDia(e)) return true;
    const js = e.semana[String(wdAtual)] || []; if (js.length === 0) return true;
    const t = h * 60 + m; return !js.some((par: any) => { const a = (par[0] || "0:0").split(":"); const b = (par[1] || "0:0").split(":"); return t >= (+a[0]) * 60 + (+a[1]) && t < (+b[0]) * 60 + (+b[1]); });
  }
  function avulsaVisivelHoje(a: any) { const e = normEsc(a.horario); if (!temEscala(e)) return true; if (bloqueadoNoDia(e)) return doDia.some((x: any) => x.agendaAvulsa === a.id); return expedienteNoDia(e) || doDia.some((x: any) => x.agendaAvulsa === a.id); }

  const visiveis = useMemo(() => profsAtende.filter((p: any) => !hidden.has(p.id) && profVisivelHoje(p)), [profsAtende, hidden, externosDia, diaStr, doDia]);
  // Ordena as agendas avulsas por nome com ordenação NUMÉRICA (MAP 1, MAP 2, MAP 3… e depois Terceiros).
  const avulsasAtivas = useMemo(() => avulsas.filter((a: any) => a.ativo !== false)
    .sort((x: any, y: any) => String(x.nome || "").localeCompare(String(y.nome || ""), "pt-BR", { numeric: true })), [avulsas]);
  // Avulsa aparece se NÃO estiver desligada no seletor Filas (e for do dia); OU se já tiver
  // agendamento no dia (assim, mesmo desligada, ela volta quando tem algo marcado).
  const avulsasVis = useMemo(() => avulsasAtivas.filter((a: any) => (hidden.has(a.id) ? doDia.some((x: any) => x.agendaAvulsa === a.id) : avulsaVisivelHoje(a))), [avulsasAtivas, diaStr, doDia, hidden]);
  // Colunas da agenda = profissionais visíveis + agendas avulsas (Parceiro/MAP) que funcionam hoje.
  const colunas = useMemo(() => [
    ...visiveis.map((p: any) => ({ ...p, _avulsa: false })),
    // grupo: agendas do mesmo grupo ("Sala MAP") se travam juntas quando o pet é bravo
    ...avulsasVis.map((a: any) => ({ _avulsa: true, id: a.id, nomeCompleto: a.nome, nomeExibicao: a.nome, corAvatar: a.cor || "#7C3AED", userId: null, _horario: a.horario, grupo: a.grupo || null })),
  ], [visiveis, avulsasVis]);
  // Profissionais que NÃO estão na agenda hoje (folga ou externo) — podem ser incluídos sob demanda.
  const foraHoje = useMemo(() => profsAtende.filter((p: any) => !hidden.has(p.id) && !profVisivelHoje(p)), [profsAtende, hidden, externosDia, diaStr, doDia]);
  function incluirExterno(id: string) { setExternosDia((m) => ({ ...m, [diaStr]: [...(m[diaStr] || []), id] })); setIncluirOpen(false); }

  // Observação que a recepção precisa VER (ex.: "está vomitando", "assinar o termo").
  // O campo `notes` também é usado pela internação pra guardar JSON dela — isso não é
  // recado pra ninguém e não pode aparecer na agenda como se fosse.
  const obsDe = (a: any): string | null => {
    const t = String(a?.notes || "").trim();
    if (!t) return null;
    if (t.startsWith("{") || t.startsWith("[")) return null; // payload técnico, não recado
    return t;
  };
  // Pet bravo ocupa a SALA inteira, não só a coluna: a fisio dele numa MAP bloqueia a
  // outra MAP no mesmo horário (animal bravo não pode cruzar com outro).
  // Quais temperamentos travam vem de Configurações; o grupo ("Sala MAP") vem da própria
  // agenda avulsa — MAP 3 amanhã é só pôr no mesmo grupo, sem tocar em código.
  const travaSala = (a: any) => {
    const t = a?.pet?.temperament;
    return !!t && (cfg?.temperamentosQueTravam || []).includes(t);
  };
  const grupoDaAvulsa = (id: string) => avulsas.find((x: any) => x.id === id)?.grupo || null;
  // Este agendamento (de OUTRA avulsa) ocupa a coluna `prof` por ser do mesmo grupo?
  const ocupaEstaAvulsa = (a: any, prof: any) => {
    if (!a.agendaAvulsa || a.agendaAvulsa === prof.id) return false;
    if (!travaSala(a)) return false;
    const g = grupoDaAvulsa(a.agendaAvulsa);
    return !!g && g === prof.grupo;
  };
  // GRADE (blocos contínuos): px por minuto + os agendamentos de UMA coluna (sem filtro por slot).
  const PXMIN = 100 / 30; // 30 min ≈ 100px — espaço p/ hora + pet + tipo + acompanhamento sem apertar
  const totalMinDia = (hFim - hIni + 1) * 60;
  function apptsDaColuna(p: any) {
    return doDia.filter((a: any) => {
      if (!a.date) return false;
      if (p._avulsa) return a.agendaAvulsa === p.id || ocupaEstaAvulsa(a, p);
      return ehDoProf(a, p) && !a.agendaAvulsa;
    });
  }
  const doDiaVis = useMemo(() => doDia.filter((a: any) => visiveis.some((p: any) => ehDoProf(a, p))), [doDia, visiveis, profUserIds]);
  const previsao = useMemo(() => doDiaVis.reduce((s: number, a: any) => s + valorDe(a), 0), [doDiaVis]);
  // Sala de espera = TODOS que chegaram hoje (inclui MAP/Parceiro/avulsas). Antes usava
  // doDiaVis (só profs fixos via ehDoProf), então quem chegava numa coluna MAP não marcava
  // presença (bug relatado pela Cintia 23/07). É uma sala compartilhada: mostra todo mundo.
  const espera = useMemo(() => doDia.filter((a: any) => ["Em espera", "Aguardando", "Em atendimento"].includes(a.status)), [doDia]);

  function addDays(n: number) { const d = new Date(dia); if (view === "mes") d.setMonth(d.getMonth() + n); else if (view === "semana") d.setDate(d.getDate() + n * 7); else d.setDate(d.getDate() + n); setDia(d); }
  function cardMenu(e: any, a: any) { e.stopPropagation(); setMenuAppt({ a, x: e.clientX, y: e.clientY }); }
  function toggleFila(id: string) { const s = new Set(hidden); s.has(id) ? s.delete(id) : s.add(id); setHidden(s); persist(s); }
  function soEste(id: string) { const s = new Set(profsAtende.filter((p: any) => p.id !== id).map((p: any) => p.id)); setHidden(s); persist(s); }

  // ---- Confirmação por WhatsApp (Fatia 1) ----
  function tipoFisio(a: any) { return `${a?.type || ""} ${a?.description || ""}`.toLowerCase().includes("fisio"); }
  // Descobre quais sessões de fisio do dia já tiveram o boletim ENVIADO (marca no card do MAP).
  useEffect(() => {
    const petIds = [...new Set(doDia.filter((a: any) => tipoFisio(a) && (a.pet?.id || a.petId)).map((a: any) => a.pet?.id || a.petId))];
    if (!petIds.length) { setBoletinsEnv(new Set()); return; }
    let cancelled = false;
    (async () => {
      const set = new Set<string>();
      await Promise.all(petIds.map(async (pid) => {
        try {
          const r = await fetch(`/api/listas?lista=petboletim_${pid}`, { cache: "no-store" });
          const d = await r.json();
          const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
          for (const it of arr) { let o: any = {}; try { o = JSON.parse(it.valor); } catch {} if (o.enviadoAt && o.sessaoData) set.add(`${pid}|${String(o.sessaoData).slice(0, 10)}`); }
        } catch { /* best-effort */ }
      }));
      if (!cancelled) setBoletinsEnv(set);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaStr, appts]);
  function tplConfirmacao(a: any) { return tipoFisio(a) ? "confirmacao_fisioterapia" : "confirmacao_agendamento"; }
  function msgConfirmacao(a: any) {
    const d = new Date(a.date); const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0"); const min = d.getMinutes(); const hora = min ? `${hh}h${String(min).padStart(2, "0")}` : `${hh}h`;
    const tutor = (a.tutor?.name || "tutor").trim().split(/\s+/)[0]; const pet = a.pet?.name || "seu pet"; const prof = (a.user?.name || "nossa equipe").trim();
    if (tipoFisio(a)) {
      return `Olá, ${tutor}! 🩵☀️🐾\n\nInformamos que amanhã, ${dd}/${mm}, às ${hora}, o seu pet ${pet} tem fisioterapia na Mundo à Parte.\n\n‼️ ATENÇÃO:\n\n➡️ Cancelamentos ou transferências deverão ser informados com até 04 (quatro) horas de antecedência. Caso este tempo seja excedido e a mensagem não for confirmada, ou ocorra o não comparecimento no horário agendado, ou atraso superior a 20 minutos, a sessão será automaticamente cancelada e considerada como realizada, sendo descontado o valor da mesma.\n\n➡️ Se seu pet realiza hidroesteira, lembre-se de trazer uma toalha.\n\n➡️ Para pacientes agendados com recorrência, ao renovar o pacote verifique novamente na recepção as próximas datas.\n\nPodemos confirmar o agendamento? Aguardamos seu retorno! ☺️`;
    }
    return `Olá, ${tutor}! Confirmamos o agendamento do(a) ${pet} no Empório do Pet para o dia ${dd}/${mm}, às ${hora}, com ${prof}. Podemos confirmar sua presença? Aguardamos seu retorno! 🐾`;
  }
  async function enviarConfirmacao(a: any) {
    setSending(true);
    try {
      const r = await fetch(`/api/appointments/${a.id}/confirmar-whatsapp`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.success === false) throw new Error(d?.error || "Falha ao enviar");
      toast.success("Confirmação enviada no WhatsApp ✅");
      setConfirmData(null); load();
    } catch (e: any) { toast.error(e?.message || "Erro ao enviar"); }
    setSending(false);
  }
  // Confirmar presença MANUALMENTE (sem enviar WhatsApp) — ex.: cliente confirmou por telefone/pessoalmente.
  async function confirmarManual(a: any) {
    setSending(true);
    try {
      const r = await fetch(`/api/appointments/${a.id}/confirmar-manual`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error();
      toast.success("Presença confirmada ✅");
      load();
    } catch (e: any) { toast.error("Não consegui confirmar. Tente de novo."); }
    setSending(false);
  }
  // Baixa AUTOMÁTICA da sessão de fisio quando o pet CHEGA. Idempotente: guarda o id
  // do agendamento em `baixas` no pacote (petpac_<petId>) pra nunca baixar 2x.
  async function darBaixaFisio(a: any) {
    const petId = a.pet?.id || a.petId;
    if (!petId) return;
    try {
      const r = await fetch(`/api/listas?lista=petpac_${petId}`, { cache: "no-store" });
      const d = await r.json();
      const arr = (Array.isArray(d) ? d : (d.itens || d.data || [])).map((i: any) => { try { return { id: i.id, data: JSON.parse(i.valor) }; } catch { return null; } }).filter(Boolean);
      const pk = arr.find((x: any) => (x.data.used || 0) < (x.data.total || 0));
      if (!pk) return; // sem pacote ativo — nada a baixar
      const baixas: string[] = Array.isArray(pk.data.baixas) ? pk.data.baixas : [];
      if (baixas.includes(a.id)) return; // já deu baixa nesse agendamento
      const used = Math.min((pk.data.used || 0) + 1, pk.data.total);
      await fetch(`/api/listas/${pk.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...pk.data, used, baixas: [...baixas, a.id] }) }) });
      toast.success(`🐾 Baixa da fisio: ${used}/${pk.data.total}`);
    } catch { /* baixa é best-effort; não trava o fluxo */ }
  }
  // Avança o atendimento pro próximo estágio (Agendado → Chegou → Em atendimento → Concluído).
  async function avancarEstagio(a: any) {
    const next = ESTAGIOS[estagioIdx(a.status)].next;
    if (!next) return;
    setAvancandoId(a.id);
    try {
      const r = await fetch(`/api/appointments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: next }) });
      if (!r.ok) throw new Error();
      if (next === "Em espera") { // cliente CHEGOU
        if (tipoFisio(a)) await darBaixaFisio(a); // chegou numa fisio → baixa
        notificarChegada(a); // #8 — avisa o profissional que o cliente chegou (pop-up)
      }
      load();
    } catch { toast.error("Não consegui atualizar o estágio."); }
    setAvancandoId(null);
  }
  // #8 — quando a recepção marca "chegou", manda um aviso (pop-up) pro profissional do
  // atendimento. Usa o recado interno (caminho que já popa). Best-effort; não avisa a si mesmo.
  function notificarChegada(a: any) {
    const cliente = a.tutor?.name || "O cliente";
    const pet = a.pet?.name ? ` (${a.pet.name})` : "";
    const hora = (() => { try { return new Date(a.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })();
    const avisar = (toUserId: string, texto: string) => {
      if (!toUserId || toUserId === meId) return false;
      fetch(`/api/internal-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId, content: texto }) }).catch(() => undefined);
      return true;
    };
    // MAP (Sala MAP) = agenda avulsa: o "profissional" costuma ser quem agendou, então avisa a
    // EQUIPE DE FISIO (Config › lista fisio_equipe). Fora do MAP: avisa o profissional do atendimento.
    const av = a.agendaAvulsa ? avulsas.find((x: any) => (x.id || x._id) === a.agendaAvulsa) : null;
    const ehMap = !!av && (av.grupo === "Sala MAP" || /MAP/i.test(av.nome || ""));
    if (ehMap) {
      const sala = av?.nome || "MAP";
      let n = 0;
      for (const uid of fisioEquipe) { if (avisar(uid, `🚪 ${cliente}${pet} chegou${hora ? ` — ${hora}` : ""} na ${sala}. Está na recepção.`)) n++; }
      if (n > 0) toast.success(`Equipe de fisio avisada — cliente chegou na ${sala} 🔔`, { duration: 2500 });
      return;
    }
    if (avisar(a.userId, `🚪 ${cliente}${pet} chegou${hora ? ` — agendamento das ${hora}` : ""}. Está na recepção.`) && a.user?.name) {
      toast.success(`${a.user.name.split(" ")[0]} foi avisado(a) que o cliente chegou 🔔`, { duration: 2500 });
    }
  }
  // Volta o atendimento pro estágio anterior (corrigir clique errado). Por índice de estágio (PREV_STATUS da lib).
  async function retrocederEstagio(a: any) {
    const prev = PREV_STATUS[estagioIdx(a.status)];
    if (!prev) return;
    setAvancandoId(a.id);
    try {
      const r = await fetch(`/api/appointments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: prev }) });
      if (!r.ok) throw new Error();
      load();
    } catch { toast.error("Não consegui voltar o estágio."); }
    setAvancandoId(null);
  }
  // Arrastar o card e soltar num horário/coluna → move o agendamento (muda a data e,
  // se soltar em outra coluna, o profissional/agenda). Confirma antes, pra um arrasto
  // sem querer não bagunçar a agenda.
  async function moverAppt(a: any, p: any, h: number, m: number) {
    if (!a || !p) { setArrastando(null); return; }
    const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const novaData = new Date(`${diaStr}T${hhmm}:00`);
    const d0 = new Date(a.date);
    const mesmoHorario = d0.getHours() === h && d0.getMinutes() === m;
    const mesmaColuna = p._avulsa ? a.agendaAvulsa === p.id : (!a.agendaAvulsa && a.userId === p.userId);
    if (mesmoHorario && mesmaColuna) { setArrastando(null); return; }
    const quem = a.pet?.name ? `${a.pet.name}${a.tutor?.name ? " · " + a.tutor.name : ""}` : (a.tutor?.name || "agendamento");
    const paraCol = p._avulsa || !mesmaColuna ? ` · ${p.nomeExibicao || p.nomeCompleto || p.nome || ""}` : "";
    if (!confirm(`Mover ${quem} para ${hhmm}${paraCol}?`)) { setArrastando(null); return; }
    const body: any = { date: novaData.toISOString() };
    if (p._avulsa) body.agendaAvulsa = p.id;
    else { body.userId = p.userId; body.agendaAvulsa = ""; } // coluna de profissional
    try {
      const r = await fetch(`/api/appointments/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      toast.success("Agendamento movido ✅");
      load();
    } catch { toast.error("Não consegui mover o agendamento."); }
    finally { setArrastando(null); }
  }
  async function cancelarAgendamento(a: any) {
    setSending(true);
    try {
      const r = await fetch(`/api/appointments/${a.id}/cancelar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo: cancelMotivo || undefined, observacao: cancelObs || undefined }) });
      if (!r.ok) throw new Error("Falha ao cancelar");
      toast.success("Agendamento cancelado");
      setCancelData(null); setCancelMotivo(""); setCancelObs(""); load();
    } catch (e: any) { toast.error(e?.message || "Erro ao cancelar"); }
    setSending(false);
  }
  const label = dia.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
  const tituloView = view === "mes" ? cap(dia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })) : view === "semana" ? (() => { const i = startOfWeek(dia); const f = addD(i, 6); return `${i.getDate()}/${i.getMonth() + 1} – ${f.getDate()}/${f.getMonth() + 1}`; })() : labelCap;
  const cols = `52px repeat(${Math.max(colunas.length, 1)}, minmax(0, 1fr))`;
  // Selo da confirmação por WhatsApp (campo separado do estágio): 📲 enviada, ✅ confirmou, 🔄 quer remarcar.
  const CONF_BADGE: Record<string, { t: string; c: string; nome: string; curto: string }> = { ENVIADA: { t: "📲", c: "#854F0B", nome: "Confirmação enviada", curto: "Aguardando" }, CONFIRMADO: { t: "✅", c: "#0F6E56", nome: "Presença confirmada", curto: "Confirmado" }, REMARCAR: { t: "🔄", c: "#A32D2D", nome: "Cliente quer remarcar", curto: "Quer remarcar" } };

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => addDays(-1)} aria-label="Dia anterior" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[#5C6B70] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><LuChevronLeft size={16} /></button>
          <button onClick={() => setDia(new Date())} className="px-3 h-8 rounded-lg border text-[13px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>Hoje</button>
          <button onClick={() => addDays(1)} aria-label="Próximo dia" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[#5C6B70] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><LuChevronRight size={16} /></button>
          <span className="text-[14px] font-medium ml-2" style={{ color: "#014D5E" }}>{tituloView}</span>
        </div>
        <div className="flex-1" />
        <input type="date" value={diaStr} onChange={(e) => { if (e.target.value) setDia(new Date(e.target.value + "T12:00:00")); }} className="hidden md:block text-[13px] px-2 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6" }} />
        <div className="hidden md:flex gap-0.5 border rounded-lg p-0.5" style={{ borderColor: "#E8E2D6" }}>
          {(([["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]]) as [any, string][]).map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} className="text-[12px] px-3 py-1.5 rounded-md" style={view === v ? { background: "#009AAC", color: "#fff" } : { color: "#5C6B70" }}>{lbl}</button>
          ))}
        </div>
        {/* Escala agora fica no cadastro do profissional: Configurações › Equipe. */}
        {/* Config da agenda agora só em Configurações › Agenda & Atendimento. */}
        {(profsAtende.length > 0 || avulsasAtivas.length > 0) && (
          <div className="relative hidden md:block">
            <button onClick={() => setFilasOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6", background: "#fff", color: "#5C6B70" }}>
              👥 Filas · {profsAtende.filter((p: any) => !hidden.has(p.id)).length + avulsasAtivas.filter((a: any) => !hidden.has(a.id)).length}/{profsAtende.length + avulsasAtivas.length}
              <span style={{ transform: filasOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
            </button>
            {filasOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilasOpen(false)} />
                <div className="absolute right-0 mt-1 z-50 bg-white border rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5 w-[320px]" style={{ borderColor: "#E8E2D6" }}>
                  {profsAtende.map((p: any) => { const on = !hidden.has(p.id); return (
                    <span key={p.id} className="inline-flex items-center rounded-full border text-[11px]" style={on ? { background: "#E1F3F5", color: "#014D5E", borderColor: "#9ED8DE" } : { background: "#fff", color: "#374151", borderColor: "#E8E2D6" }}>
                      <button onClick={() => toggleFila(p.id)} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"><span className="w-2 h-2 rounded-full" style={{ background: p.corAvatar || "#009AAC" }} />{nomeCurto(p)}{on ? <span className="text-[11px]">✓</span> : null}</button>
                      <button onClick={() => soEste(p.id)} title="Mostrar só este" className="text-[10px] pr-2.5 pl-1 py-1 opacity-70 hover:opacity-100">só</button>
                    </span>
                  ); })}
                  {avulsasAtivas.length > 0 && (
                    <>
                      <div className="w-full border-t mt-1 pt-1.5" style={{ borderColor: "#F0EBE0" }} />
                      <div className="w-full text-[9px] uppercase tracking-wide text-gray-400 px-1 -mb-0.5">Agendas avulsas (MAP, parceiros, RX…)</div>
                      {avulsasAtivas.map((a: any) => { const on = !hidden.has(a.id); return (
                        <span key={a.id} className="inline-flex items-center rounded-full border text-[11px]" style={on ? { background: "#E1F3F5", color: "#014D5E", borderColor: "#9ED8DE" } : { background: "#fff", color: "#374151", borderColor: "#E8E2D6" }}>
                          <button onClick={() => toggleFila(a.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1"><span className="w-2 h-2 rounded-full" style={{ background: a.cor || "#7C3AED" }} />{a.nome}{on ? <span className="text-[11px]">✓</span> : null}</button>
                        </span>
                      ); })}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {foraHoje.length > 0 && (
          <div className="relative">
            <button onClick={() => setIncluirOpen((v) => !v)} className="text-[13px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#fff" }}>➕ Incluir profissional</button>
            {incluirOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIncluirOpen(false)} />
                <div className="absolute right-0 mt-1 z-50 bg-white border rounded-xl shadow-lg py-1 min-w-[220px]" style={{ borderColor: "#E8E2D6" }}>
                  <div className="px-3 py-1.5 text-[11px] text-gray-400">Não estão na agenda hoje</div>
                  {foraHoje.map((p: any) => { const ext = escDe(p)?.sobDemanda; return (
                    <button key={p.id} onClick={() => incluirExterno(p.id)} className="w-full text-left px-3 py-2 hover:bg-[#F6FDFD] text-[13px] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.corAvatar || "#009AAC" }} />
                      <span className="flex-1">{p.nomeExibicao || p.nomeCompleto}</span>
                      <span className="text-[11px] text-gray-400">{ext ? "externo" : "de folga"}</span>
                    </button>
                  ); })}
                </div>
              </>
            )}
          </div>
        )}
        <button onClick={() => { setEditAppt(null); setNovoDefaults({ date: diaStr, duration: cfg?.duracaoPadrao }); setNovoOpen(true); }} className="text-[13px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>➕ Agendar</button>
      </div>

      {view === "dia" && (<>
      {/* Sala de espera: faixa HORIZONTAL acima da agenda, TRAVADA no topo (não some ao rolar). */}
      <div className="bg-white border rounded-2xl mb-3 sticky z-30" style={{ borderColor: "#E8E2D6", top: 64, boxShadow: "0 8px 16px -10px rgba(1,77,94,.20)" }}>
        <div className="px-3.5 py-2 flex items-center gap-2 border-b" style={{ borderColor: "#F0EBE0" }}>
          <span className="text-[14px]">🪑</span>
          <span className="text-[13px] font-medium" style={{ color: "#014D5E" }}>Sala de espera</span>
          <span className="text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: "#854F0B" }}>{espera.length}</span>
        </div>
        {espera.length === 0 ? (
          <div className="text-[12px] text-gray-400 px-3.5 py-3">Ninguém aguardando agora.</div>
        ) : (
          <div className="flex gap-2 p-2 overflow-x-auto">
            {espera.map((a: any) => {
              const emAtend = a.status === "Em atendimento";
              const diff = Math.round((Date.now() - new Date(a.date).getTime()) / 60000);
              const atrasado = !emAtend && diff > 15;
              const bg = emAtend ? "#E1F5EE" : atrasado ? "#FCEBEB" : "#FAEEDA";
              const cor = emAtend ? "#0F6E56" : atrasado ? "#A32D2D" : "#854F0B";
              return (
                <div key={a.id} className="rounded-lg px-2.5 py-2 shrink-0" style={{ background: bg, minWidth: 186, maxWidth: 230 }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[12px] font-medium truncate" style={{ color: "#014D5E" }}><NomeClicavel a={a} /></span>
                    <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: cor }}>{emAtend ? "🩺 atendendo" : atrasado ? `⚠ atrasado ${diff} min` : diff > 0 ? `⏱ há ${diff} min` : "⏱ na hora"}</span>
                  </div>
                  <div className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: cor }}>
                    <span>🕐 {hm(new Date(a.date))}</span><span className="opacity-60">·</span><span className="truncate">{a.type || "Atendimento"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ AGENDA NO CELULAR — lista do dia (só telas pequenas) ═══════ */}
      <div className="md:hidden mb-3">
        {/* filtro por profissional */}
        {colunas.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setMobProf(null)} className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border" style={mobProf === null ? { background: "#014D5E", color: "#fff", borderColor: "#014D5E" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>Todos</button>
            {colunas.map((p: any) => (
              <button key={"m-" + p.id} onClick={() => setMobProf(p.id)} className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5" style={mobProf === p.id ? { background: "#014D5E", color: "#fff", borderColor: "#014D5E" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: p.corAvatar || p.cor || "#009AAC" }} />{nomeCurto(p)}
              </button>
            ))}
          </div>
        )}
        {/* resumo em chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1" style={{ scrollbarWidth: "none" }}>
          <span className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border" style={{ background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>🗓️ {doDia.length} agendamento{doDia.length === 1 ? "" : "s"}</span>
          {mostrarValores && previsao > 0 && <span className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border" style={{ background: "#E8F5EE", color: "#1c6e4c", borderColor: "#cfe9dc" }}>💰 {brl(previsao)}</span>}
          {espera.length > 0 && <span className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border" style={{ background: "#FBF3E3", color: "#8a6400", borderColor: "#f0dcb0" }}>⏳ {espera.length} em espera</span>}
        </div>
        {/* lista do dia */}
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-10">Carregando agenda...</div>
        ) : (() => {
          const col = mobProf ? colunas.find((c: any) => c.id === mobProf) : null;
          let lista = [...doDia].sort((x: any, y: any) => new Date(x.date).getTime() - new Date(y.date).getTime());
          if (col) lista = lista.filter((a: any) => col._avulsa ? a.agendaAvulsa === col.id : ehDoProf(a, col));
          if (lista.length === 0) return <div className="text-center text-sm text-gray-400 py-10 bg-white border rounded-2xl" style={{ borderColor: "#E8E2D6" }}>Nenhum agendamento neste dia.</div>;
          let periodo = "";
          return (
            <div className="flex flex-col gap-2">
              {lista.map((a: any) => {
                const d = new Date(a.date);
                const per = d.getHours() < 12 ? "Manhã" : "Tarde";
                const showHdr = per !== periodo; periodo = per;
                const cor = corDe(a.status, cfg?.cores);
                const v = valorDe(a);
                const c = colunas.find((x: any) => x._avulsa ? x.id === a.agendaAvulsa : ehDoProf(a, x));
                const profNome = c ? (c.nomeExibicao || c.nomeCompleto || c.nome) : (a.user?.name || "—");
                const profCor = c?.corAvatar || c?.cor || "#009AAC";
                const idx = estagioIdx(a.status); const est = ESTAGIOS[idx];
                const petlife = /petlife/i.test(a.pet?.insurancePlan || "");
                const confCor = corConfirmacao(a.confirmacaoStatus);
                return (
                  <div key={"m-" + a.id}>
                    {showHdr && <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A857A] mt-2 mb-1 px-1">{per}</div>}
                    <div onClick={(e) => cardMenu(e, a)} className="bg-white rounded-[13px] p-3 flex gap-3 relative overflow-hidden active:bg-[#FBF9F4]" style={{ border: confCor ? `2px solid ${confCor}` : "1px solid #E8E2D6" }}>
                      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: profCor }} />
                      <div className="text-[13px] font-bold pl-1.5 w-[46px] shrink-0 flex flex-col items-start" style={{ color: "#014D5E" }}>{hm(d)}{a.confirmacaoStatus && CONF_BADGE[a.confirmacaoStatus] ? <span className="text-[11px]" title={CONF_BADGE[a.confirmacaoStatus].nome}>{CONF_BADGE[a.confirmacaoStatus].t}</span> : null}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-[#1F2A2E] flex items-center gap-1.5 truncate">
                          {petlife && <span style={{ fontSize: "8.5px", fontWeight: 700, background: "#EDE7F6", color: "#5E35B1", borderRadius: 4, padding: "1px 5px" }}>🩺 Petlife</span>}
                          <span className="truncate"><NomeClicavel a={a} /></span>
                        </div>
                        <div className="text-[12px] text-[#5C6B70] mt-0.5 flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: profCor }} /><span className="truncate">{profNome} · {a.type || "Atendimento"}</span></div>
                        <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {idx > 0 && <button onClick={() => retrocederEstagio(a)} disabled={avancandoId === a.id} title="Voltar estágio" className="text-[12px] font-bold w-6 h-6 rounded-md border disabled:opacity-50" style={{ borderColor: "#E8E2D6", color: "#374151" }}>‹</button>}
                          <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: est.bg, color: est.cor }}>{est.label}</span>
                          {est.next && <button onClick={() => avancarEstagio(a)} disabled={avancandoId === a.id} title={`Avançar para ${est.next}`} className="text-[12px] font-bold w-6 h-6 rounded-md border disabled:opacity-50" style={{ borderColor: "#E8E2D6", color: "#009AAC" }}>›</button>}
                        </div>
                      </div>
                      {mostrarValores && v > 0 && <div className="text-[12px] font-semibold shrink-0" style={{ color: "#0F6E56" }}>{brl(v)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>


      {/* Grade do dia — blocos coloridos por serviço; cabeçalho e sala de espera travados. */}
      <div className="hidden md:block">
        <div className="bg-white border rounded-2xl" style={{ borderColor: "#E8E2D6" }}>
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-12">Carregando agenda...</div>
          ) : colunas.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-12">{profsAtende.length === 0 ? "Cadastre profissionais em Configurações › Equipe." : "Nenhuma fila selecionada — escolha acima."}</div>
          ) : (
            <div>
              {/* cabeçalho dos profissionais TRAVADO (mesmo offset da grade atual) */}
              <div className="grid border-b sticky z-20 rounded-t-2xl" style={{ gridTemplateColumns: cols, borderColor: "#F0EBE0", background: "#FBF9F4", top: 172 }}>
                <div />
                {colunas.map((p: any) => (
                  <div key={(p._avulsa ? "nv-av-" : "nv-") + p.id} className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 border-l" style={{ borderColor: "#ECE6D8" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.corAvatar || "#009AAC" }} />
                      <span className="text-[13px] font-semibold" style={{ color: "#014D5E" }}>{nomeCurto(p)}</span>
                    </div>
                    {p._avulsa && <span className="text-[8px] font-bold uppercase px-1 rounded" style={{ color: "#7C3AED", background: "#F5F3FF" }}>avulsa</span>}
                    {!p._avulsa && (externosDia[diaStr] || []).includes(p.id) && <span className="text-[8px] font-bold uppercase px-1 rounded" style={{ color: "#B45309", background: "#FCF3E7" }}>externo</span>}
                  </div>
                ))}
              </div>
              {/* corpo: gutter de horas + lanes com blocos contínuos */}
              <div className="grid" style={{ gridTemplateColumns: cols }}>
                <div style={{ position: "relative", height: totalMinDia * PXMIN }}>
                  {horas.map((h) => (
                    <div key={"g" + h} className="text-[11px] text-right pr-2" style={{ position: "absolute", top: (h - hIni) * 60 * PXMIN - 7, right: 0, color: "#8FA0A0", fontWeight: 600 }}>{String(h).padStart(2, "0")}:00</div>
                  ))}
                </div>
                {colunas.map((p: any) => {
                  const items = apptsDaColuna(p);
                  const laid = layoutSobreposicao(items);
                  return (
                    <div key={(p._avulsa ? "lane-av-" : "lane-") + p.id} className="border-l" style={{ position: "relative", height: totalMinDia * PXMIN, borderColor: "#ECE6D8", overflow: "hidden" }}>
                      {/* fundo: slots (linhas + fora do horário + clique cria + soltar arrasta) */}
                      {horas.flatMap((h) => slots.map((m) => {
                        const top = ((h * 60 + m) - hIni * 60) * PXMIN;
                        const sh = (slots[1] || 30) * PXMIN;
                        const fora = foraDoHorario(p, h, m);
                        return (
                          <div key={`s${h}-${m}`}
                            onClick={() => {
                              if (p._avulsa) { if (!meId) { toast("Recarregue a página."); return; } setEditAppt(null); setNovoDefaults({ date: diaStr, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, agendaAvulsa: p.id, avulsaNome: p.nomeCompleto, userId: meId, duration: cfg?.duracaoPadrao }); setNovoOpen(true); return; }
                              if (!p.userId) { toast("Profissional sem login — cadastre o acesso em Configurações › Equipe"); return; }
                              setEditAppt(null); setNovoDefaults({ date: diaStr, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, userId: p.userId, duration: cfg?.duracaoPadrao }); setNovoOpen(true);
                            }}
                            onDragOver={(e) => { if (arrastando) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                            onDrop={(e) => { if (arrastando) { e.preventDefault(); moverAppt(arrastando, p, h, m); } }}
                            className="hover:bg-[#EAF6F7]"
                            style={{ position: "absolute", left: 0, right: 0, top, height: sh, borderTop: m === 0 ? "1px solid #EFE8D9" : "1px dashed #F3EEE1", background: fora ? "repeating-linear-gradient(45deg,#f5f6f4,#f5f6f4 4px,#e9ebe6 4px,#e9ebe6 8px)" : undefined, cursor: "pointer" }} />
                        );
                      }))}
                      {/* agendamentos: 1 bloco CONTÍNUO cada, posicionado por hora+duração; sobrepostos ficam lado a lado */}
                      {laid.map(({ a, track, cols }: any) => {
                        const d = new Date(a.date);
                        const dur = Number(a.duration) || 30; // duração real (exibida)
                        const slotSize = slots[1] || 30;
                        // ENCAIXA no box (lib/agenda.posicaoCard, testada): card na linha da grade mais próxima; hora exata no texto.
                        const { top, height } = posicaoCard(d, dur, hIni, slotSize, PXMIN);
                        const cor = corDe(a.status, cfg?.cores);
                        const terc = terceiroProf[a.id];
                        const v = valorDe(a);
                        const quem = a.pet?.name ? `${a.pet.name}${a.tutor?.name ? ` · ${a.tutor.name}` : ""}` : (a.tutor?.name || "Agendamento");
                        const espelho = p._avulsa && a.agendaAvulsa !== p.id;
                        const idx = estagioIdx(a.status); const est = ESTAGIOS[idx];
                        // Confirmação FIXA no card (bate o olho): borda verde = confirmou, vermelha = quer remarcar.
                        const confCor = corConfirmacao(a.confirmacaoStatus);
                        return (
                          <div key={"nv" + a.id}
                            draggable={!espelho}
                            onDragStart={(e) => { if (espelho) return; setArrastando(a); try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", a.id); } catch {} }}
                            onDragEnd={() => setArrastando(null)}
                            onClick={(e) => cardMenu(e, a)}
                            title={espelho ? `Sala ocupada por ${quem}` : "Arraste para mudar o horário · clique para as ações"}
                            className="rounded-xl cursor-pointer overflow-hidden"
                            style={{ position: "absolute", top, height, left: cols <= 1 ? 5 : `calc(${track * (100 / cols)}% + 2px)`, right: cols <= 1 ? 5 : undefined, width: cols <= 1 ? undefined : `calc(${100 / cols}% - 4px)`, background: `color-mix(in srgb, ${corServico(a.type)} 16%, #ffffff)`, border: confCor ? `2px solid ${confCor}` : `1px solid color-mix(in srgb, ${corServico(a.type)} 42%, #EAE3D4)`, boxShadow: confCor ? `0 1px 3px color-mix(in srgb, ${confCor} 30%, transparent)` : `0 1px 2px color-mix(in srgb, ${corServico(a.type)} 22%, transparent)`, opacity: espelho ? 0.7 : (arrastando?.id === a.id ? 0.4 : 1), zIndex: 2, padding: "4px 9px", display: "flex", flexDirection: "column", gap: 2, maxWidth: "100%", boxSizing: "border-box" }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10.5px] font-bold flex items-center gap-1" style={{ color: cor.c }}>{hm(d)}<span className="font-normal" style={{ opacity: .75 }}>· {dur}min</span>{a.confirmacaoStatus && CONF_BADGE[a.confirmacaoStatus] ? <span title={CONF_BADGE[a.confirmacaoStatus].nome}>{CONF_BADGE[a.confirmacaoStatus].t}</span> : null}{tipoFisio(a) && boletinsEnv.has(`${a.pet?.id || a.petId}|${diaStr}`) ? <span title="Boletim de fisio enviado">🌿</span> : null}{obsDe(a) ? <span title={obsDe(a) || undefined}>📝</span> : null}</span>
                              {mostrarValores && v > 0 ? <span className="text-[10px] font-semibold" style={{ color: "#0F6E56" }}>{brl(v)}</span> : (travaSala(a) ? <span title="Ocupa a sala inteira">🔒</span> : null)}
                            </div>
                            {a.confirmacaoStatus && CONF_BADGE[a.confirmacaoStatus] ? <span className="self-start text-[9px] font-extrabold rounded px-1.5 py-[1px] leading-tight shrink-0" title={CONF_BADGE[a.confirmacaoStatus].nome} style={{ background: CONF_BADGE[a.confirmacaoStatus].c, color: "#fff" }}>{CONF_BADGE[a.confirmacaoStatus].t} {CONF_BADGE[a.confirmacaoStatus].curto}</span> : null}
                            <div className="text-[13px] font-semibold truncate" style={{ color: "#013D4A" }}>{/petlife/i.test(a.pet?.insurancePlan || "") && <span title="Petlife" style={{ fontSize: "8px", fontWeight: 700, background: "#EDE7F6", color: "#5E35B1", borderRadius: 4, padding: "0 4px", marginRight: 3 }}>🩺</span>}{a.origem === "PORTAL" && <span title="O próprio tutor marcou pelo Portal do Tutor" className="shrink-0" style={{ marginRight: 3 }}>📱</span>}<NomeClicavel a={a} /></div>
                            {height > 44 && <div className="text-[10.5px] truncate" style={{ color: cor.c }}>{a.type || "Atendimento"}{terc?.nome ? ` · 🤝 ${terc.nome}` : ""}</div>}
                            {height > 58 && !espelho && (
                              <div className="inline-flex items-center rounded-md overflow-hidden border" style={{ borderColor: "#00000012" }} onClick={(e) => e.stopPropagation()}>
                                {idx > 0 && <button onClick={() => retrocederEstagio(a)} disabled={avancandoId === a.id} className="px-1.5 py-[2px] text-[9.5px] font-bold border-r disabled:opacity-50" style={{ background: "#fff", color: "#374151", borderColor: "#00000012" }}>‹</button>}
                                <span className="px-2 py-[2px] text-[9.5px] font-bold" style={{ background: est.bg, color: est.cor }}>{est.label}</span>
                                {est.next && <button onClick={() => avancarEstagio(a)} disabled={avancandoId === a.id} className="px-1.5 py-[2px] text-[9.5px] font-bold border-l disabled:opacity-50" style={{ background: "#fff", color: "#009AAC", borderColor: "#00000012" }}>{avancandoId === a.id ? "…" : est.acao}</button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 flex-wrap px-3 py-2 border-t text-[11px] text-[#5C6B70]" style={{ borderColor: "#F0EBE0" }}>
                <span>🎨 Cor por serviço · barrinha/cabeçalho = profissional · clique num horário livre pra agendar · arraste pra remarcar.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      </>)}

      {view === "semana" && (
        <div className="bg-white border rounded-2xl overflow-x-auto" style={{ borderColor: "#E8E2D6" }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(120px,1fr))" }}>
            {Array.from({ length: 7 }, (_, i) => addD(startOfWeek(dia), i)).map((d) => {
              const ds = ymd(d); const hoje = ds === ymd(new Date());
              const list = agendaDoDia(ds);
              return (
                <div key={ds} className="border-l first:border-l-0 min-h-[360px]" style={{ borderColor: "#F0EBE0" }}>
                  <button onClick={() => { setDia(d); setView("dia"); }} className="w-full text-center py-2 border-b hover:bg-[#f6fdfd]" style={{ borderColor: "#F0EBE0", background: hoje ? "#E1F3F5" : "#FBF9F4" }}>
                    <div className="text-[10px] uppercase text-[#374151]">{DIAS_SEM[d.getDay()]}</div>
                    <div className="text-[13px] font-medium" style={{ color: hoje ? "#014D5E" : "#014D5E" }}>{d.getDate()}</div>
                  </button>
                  <div className="p-1 space-y-1">
                    {list.length === 0 ? <div className="text-[10px] text-gray-300 text-center py-3">—</div> : list.map((a: any) => { const cor = corDe(a.status, cfg?.cores); return (
                      <div key={a.id} onClick={(e) => cardMenu(e, a)} title="Clique para ações" className="rounded-r-md px-1.5 py-1 cursor-pointer" style={{ borderLeft: `3px solid ${cor.c}`, background: cor.bg }}>
                        <div className="text-[10px] font-medium" style={{ color: cor.c }}>{hm(new Date(a.date))}</div>
                        <div className="text-[11px] truncate" style={{ color: "#014D5E" }}><NomeClicavel a={a} tutor={false} /></div>
                      </div>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "mes" && (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <div className="grid text-center text-[10px] uppercase text-[#374151] border-b" style={{ gridTemplateColumns: "repeat(7,1fr)", borderColor: "#F0EBE0", background: "#FBF9F4" }}>
            {DIAS_SEM.map((d) => <div key={d} className="py-1.5">{d}</div>)}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
            {Array.from({ length: 42 }, (_, i) => addD(startOfWeek(new Date(dia.getFullYear(), dia.getMonth(), 1)), i)).map((d) => {
              const ds = ymd(d); const inMonth = d.getMonth() === dia.getMonth(); const hoje = ds === ymd(new Date());
              const list = agendaDoDia(ds);
              return (
                <div key={ds} onClick={() => { setDia(d); setView("dia"); }} className="border-l border-t p-1 min-h-[92px] cursor-pointer hover:bg-[#f9fbfb]" style={{ borderColor: "#F0EBE0", opacity: inMonth ? 1 : 0.4, background: hoje ? "#F2FBFC" : undefined }}>
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: hoje ? "#014D5E" : "#014D5E" }}>{d.getDate()}</div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((a: any) => { const cor = corDe(a.status, cfg?.cores); return (
                      <div key={a.id} onClick={(e) => cardMenu(e, a)} className="rounded px-1 truncate text-[9.5px]" style={{ background: cor.bg, color: cor.c }}>{hm(new Date(a.date))} {a.pet?.name || a.tutor?.name || ""}</div>
                    ); })}
                    {list.length > 3 ? <div className="text-[9px] text-gray-400">+{list.length - 3}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {menuAppt && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAppt(null)} />
          <div className="fixed z-50 bg-white border rounded-lg shadow-lg py-1 text-[13px]" style={{ left: Math.min(menuAppt.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 230), top: Math.min(menuAppt.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 330), minWidth: 216, borderColor: "#E8E2D6" }}>
            <div className="px-3 py-1.5 text-[11px] text-[#374151] border-b truncate" style={{ borderColor: "#F0EBE0" }}>{menuAppt.a.pet?.name || menuAppt.a.tutor?.name || "Agendamento"}</div>
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); setConfirmData(a); }} className="w-full text-left px-3 py-2 flex items-center gap-2 font-medium" style={{ color: "#0B7A47", background: "#EAFBF0" }}>📲 Confirmar no WhatsApp</button>
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); confirmarManual(a); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#0B7A47" }}>✅ Confirmar presença (manual)</button>
            {tipoFisio(menuAppt.a) ? (
              <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); abrirBoletim(a); }} className="w-full text-left px-3 py-2 flex items-center gap-2 font-medium" style={{ color: "#017E8C", background: "#E1F3F5" }}>🌿 Boletim de fisioterapia</button>
            ) : null}
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); setNovoDefaults(null); setEditAppt(a.agendaAvulsa ? { ...a, agendaAvulsaNome: (avulsas.find((x: any) => x.id === a.agendaAvulsa)?.nome || "Agenda avulsa") } : a); setNovoOpen(true); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">📅 Remarcar (editar horário)</button>
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); setCancelMotivo(""); setCancelObs(""); setCancelData(a); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#A32D2D" }}>❌ Cancelar agendamento</button>
            <div style={{ borderTop: "1px solid #F0EBE0", margin: "3px 0" }} />
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); setNovoDefaults(null); setEditAppt(a.agendaAvulsa ? { ...a, agendaAvulsaNome: (avulsas.find((x: any) => x.id === a.agendaAvulsa)?.nome || "Agenda avulsa") } : a); setNovoOpen(true); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">✏️ Editar agendamento</button>
            <button onClick={() => { const id = menuAppt.a.id; setMenuAppt(null); window.location.href = `/dashboard/erp/atendimentos/${id}`; }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">🩺 Abrir atendimento</button>
            <button onClick={() => { const id = menuAppt.a.id; setMenuAppt(null); window.location.href = `/dashboard/erp/consultas/${id}/gravar`; }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">🎤 Gravar consulta</button>
          </div>
        </>
      )}

      {/* Prévia de confirmação pelo WhatsApp */}
      {confirmData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.28)" }} onClick={() => !sending && setConfirmData(null)}>
          <div className="bg-white rounded-2xl overflow-hidden w-full" style={{ maxWidth: 420, border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#014D5E" }}>Confirmar agendamento</div>
              <div className="text-[12px] mt-1 flex gap-3 flex-wrap" style={{ color: "#5C6B70" }}>
                <span>👤 {confirmData.tutor?.name || "—"}</span><span>🐾 {confirmData.pet?.name || "—"}</span><span>📅 {hm(new Date(confirmData.date))}</span>
              </div>
            </div>
            <div className="px-4 pt-3 text-[11px]" style={{ color: "#5C6B70" }}>Modelo: <b style={{ color: "#0F6E56" }}>{tplConfirmacao(confirmData)}</b></div>
            <div className="p-4">
              <div style={{ background: "#DCF8C6", borderRadius: "10px 10px 10px 2px", padding: "10px 12px", fontSize: 12.5, color: "#1f2a2e", whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>{msgConfirmacao(confirmData)}</div>
              {/* Botões que vêm no template da Meta — o cliente toca e a agenda atualiza sozinha. */}
              <div style={{ marginTop: 6, borderRadius: 10, overflow: "hidden", border: "1px solid #E3E8EA", background: "#fff" }}>
                <div style={{ padding: "9px", textAlign: "center", fontSize: 12.5, color: "#0a7cff", fontWeight: 600 }}>Confirmar</div>
                <div style={{ padding: "9px", textAlign: "center", fontSize: 12.5, color: "#0a7cff", fontWeight: 600, borderTop: "1px solid #E3E8EA" }}>Remarcar</div>
              </div>
              <div className="text-[11px] mt-2" style={{ color: "#374151" }}>É o <b>template aprovado da Meta</b>, com esses <b>botões</b>: o cliente toca e a agenda atualiza sozinha (Confirmado / Remarcar). Nome, data, hora, pet e profissional vêm do agendamento.</div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "#F0EBE0" }}>
              <button disabled={sending} onClick={() => setConfirmData(null)} className="px-4 py-2.5 rounded-xl text-[13px]" style={{ background: "#fff", border: "1px solid #E8E2D6", color: "#5C6B70" }}>Cancelar</button>
              <button disabled={sending} onClick={() => enviarConfirmacao(confirmData)} className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold text-white flex items-center justify-center gap-2" style={{ background: "#25D366" }}>{sending ? "Enviando…" : "📲 Enviar confirmação"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelar agendamento com motivo */}
      {cancelData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.28)" }} onClick={() => !sending && setCancelData(null)}>
          <div className="bg-white rounded-2xl overflow-hidden w-full" style={{ maxWidth: 400, border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#014D5E" }}>Cancelar agendamento</div>
              <div className="text-[12px] mt-1 flex gap-3 flex-wrap" style={{ color: "#5C6B70" }}>
                <span>🐾 {cancelData.pet?.name || "—"}</span><span>👤 {cancelData.tutor?.name || "—"}</span><span>📅 {hm(new Date(cancelData.date))}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="text-[12px] font-medium mb-2" style={{ color: "#5C6B70" }}>Motivo <span style={{ color: "#374151", fontWeight: 400 }}>(opcional)</span></div>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS_CANCEL.map((m) => (
                  <button key={m} onClick={() => setCancelMotivo(m === cancelMotivo ? "" : m)} className="text-[11.5px] px-2.5 py-1 rounded-full border" style={m === cancelMotivo ? { background: "#FCEBEB", borderColor: "#eecccc", color: "#A32D2D", fontWeight: 600 } : { background: "#FBF9F4", borderColor: "#E8E2D6", color: "#5C6B70" }}>{m}</button>
                ))}
              </div>
              <div className="text-[12px] font-medium mt-3 mb-1" style={{ color: "#5C6B70" }}>Observação <span style={{ color: "#374151", fontWeight: 400 }}>(opcional)</span></div>
              <textarea value={cancelObs} onChange={(e) => setCancelObs(e.target.value)} placeholder="Ex: cliente vai viajar, remarca na volta…" className="w-full rounded-lg border px-3 py-2 text-[13px]" style={{ borderColor: "#E8E2D6", minHeight: 56, resize: "none", color: "#1F2A2E", fontFamily: "inherit" }} />
            </div>
            <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "#F0EBE0" }}>
              <button disabled={sending} onClick={() => setCancelData(null)} className="px-4 py-2.5 rounded-xl text-[13px]" style={{ background: "#fff", border: "1px solid #E8E2D6", color: "#5C6B70" }}>Voltar</button>
              <button disabled={sending} onClick={() => cancelarAgendamento(cancelData)} className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold text-white" style={{ background: "#A32D2D" }}>{sending ? "Cancelando…" : "Confirmar cancelamento"}</button>
            </div>
          </div>
        </div>
      )}

      {boletimPet && <BoletimModal pet={boletimPet} boletimId={null} agenda={boletimAgenda || undefined} onClose={() => { setBoletimPet(null); setBoletimAgenda(null); }} onSaved={() => { setBoletimPet(null); setBoletimAgenda(null); load(); }} />}

      <NovoAgendamentoModal open={novoOpen} defaults={novoDefaults} editAppt={editAppt} onClose={() => { setNovoOpen(false); setNovoDefaults(null); setEditAppt(null); }} onCreated={() => { setNovoOpen(false); setNovoDefaults(null); setEditAppt(null); load(); }} />
    </div>
  );
}
