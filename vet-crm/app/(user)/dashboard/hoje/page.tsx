"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuRefreshCcw, LuPhone, LuPackage,
  LuFlaskConical, LuPill, LuCake, LuChevronRight, LuClipboardCheck, LuShare2,
} from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import { roleShort } from "@/lib/ui/role";
import { PageShell, ProgressBar, B44 } from "@/components/ui/base44";

interface HojeData {
  retornosVencidos: { id: string }[];
  toques: { id: string }[];
  tutoresAcompanhar: number;
  examesAEntregar: number;
  pacotesEmRisco: number;
  aniversariantes?: number;
}

interface Pendencia {
  key: string;
  title: string;
  sub: string;
  count: number;
  link: string;
  href: string;
  Icon: any;
  emoji: string;
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

function fmtDate(d: Date) {
  const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const dd = d.getDate();
  const mes = d.toLocaleDateString("pt-BR", { month: "long" });
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${dd} de ${mes}`;
}

/* ── Peças de apresentação do Hoje (usam os tokens do kit B44) ────────
   Cores por tipo de entidade — as mesmas já aprovadas nesta tela. */
const TIPO_CHIP: Record<string, { bg: string; color: string }> = {
  Cliente: { bg: B44.tint, color: "#00798A" },
  Pet: { bg: "#E1F5EE", color: "#0F6E56" },
  Lead: { bg: "#E6F1FB", color: "#0C447C" },
};
const TipoChip = ({ tipo }: { tipo: string }) => {
  const c = TIPO_CHIP[tipo] || TIPO_CHIP.Cliente;
  return <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: c.bg, color: c.color }}>{tipo}</span>;
};
/* Bolha de contagem (número branco). */
const CountBadge = ({ n, color }: { n: number; color?: string }) => (
  <span className="text-[13px] font-medium text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: color || (n > 0 ? B44.primary : "#D3D1C7") }}>{n}</span>
);
/* Casca de um cartão-seção (Boletins, Entradas, Encaminhados). */
const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: B44.line }}>{children}</div>
);
/* Cabeçalho de um cartão-seção. */
const SectionHeader = ({ emoji, tileBg, title, sub, count, countColor }: { emoji: string; tileBg: string; title: string; sub: string; count: number; countColor?: string }) => (
  <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: B44.lineSoft }}>
    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: tileBg }}><span style={{ fontSize: "19px" }}>{emoji}</span></div>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium" style={{ color: B44.text1 }}>{title}</div>
      <div className="text-xs" style={{ color: B44.text2 }}>{sub}</div>
    </div>
    <CountBadge n={count} color={countColor} />
  </div>
);

export default function HojePage() {
  const { data: session } = useSession();
  const { effectiveRole, isPreviewing } = useRolePreview();
  const meId = (session as any)?.user?.id as string | undefined;
  const userName = session?.user?.name || "Usuário";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const hora = today.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const partes = userName.trim().split(/\s+/);
  const primeiroNome = partes[0]
    ? partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase()
    : "Usuário";
  const escopo = effectiveRole === "ADMIN" ? "Visão geral da clínica" : "Seu dia";
  usePageTitle(`${saudacao}, ${primeiroNome}`, `${escopo} · ${fmtDate(today)}`);

  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [examesPend, setExamesPend] = useState<any[]>([]);
  const [dosesPend, setDosesPend] = useState<any[]>([]);
  const [examesOpen, setExamesOpen] = useState(false);
  const [boletinsPend, setBoletinsPend] = useState<any[]>([]);
  const [fuDue, setFuDue] = useState<any[]>([]);
  const [fuDueOpen, setFuDueOpen] = useState(false);
  const [toques, setToques] = useState<any[]>([]);
  const [toquesOpen, setToquesOpen] = useState(false);
  const [aniv, setAniv] = useState<any[]>([]);
  const [anivOpen, setAnivOpen] = useState(false);
  const [pacRisco, setPacRisco] = useState<any[]>([]);
  const [pacOpen, setPacOpen] = useState(false);
  const [entradas, setEntradas] = useState<any[]>([]);
  const [entConf, setEntConf] = useState<Record<string, string>>({});
  const [entConfOpen, setEntConfOpen] = useState(false);
  const [encMine, setEncMine] = useState<any[]>([]);

  useEffect(() => {
    if (!meId) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/listas?lista=encfila`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        const mine = arr
          .map((it: any) => { try { return { entryId: it.id, ...JSON.parse(it.valor) }; } catch { return null; } })
          .filter((x: any) => x && x.toUserId === meId && x.status === "PENDENTE")
          .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
        if (alive) setEncMine(mine);
      } catch {}
    };
    load();
    const onCh = () => load();
    window.addEventListener("encfila:changed", onCh);
    const tid = setInterval(load, 30000);
    return () => { alive = false; window.removeEventListener("encfila:changed", onCh); clearInterval(tid); };
  }, [meId]);

  const encHref = (e: any) => e.tipo === "pet" ? `/dashboard/erp/pets/${e.id}` : e.tipo === "lead" ? `/dashboard/crm/leads/${e.id}` : `/dashboard/erp/tutores/${e.id}`;
  async function concluirEnc(e: any) {
    try {
      const { entryId, ...data } = e;
      await fetch(`/api/listas/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...data, status: "CONCLUIDO", concluidoEm: new Date().toISOString() }) }) });
      setEncMine((prev) => prev.filter((x) => x.entryId !== entryId));
      window.dispatchEvent(new Event("encfila:changed"));
    } catch {}
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/hoje");
      const d = await safeJson<HojeData | null>(res, null);
      setData(d);
      try {
        const [lst, pts, tts, lds, cds] = await Promise.all([
          safeJson<any>(await fetch("/api/listas"), []),
          safeJson<any>(await fetch("/api/pets?limit=1000"), []),
          safeJson<any>(await fetch("/api/tutors?limit=1000"), []),
          safeJson<any>(await fetch("/api/leads?limit=1000"), []),
          safeJson<any>(await fetch("/api/cadencias"), []),
        ]);
        const listArr = Array.isArray(lst) ? lst : (lst.itens || lst.data || []);
        const petArr = Array.isArray(pts) ? pts : (pts.pets || pts.data || []);
        const petMap: Record<string, string> = {};
        petArr.forEach((p: any) => { petMap[p.id] = p.name; });
        const ex: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petexa_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            const st = dd.status || "Solicitado";
            if (st !== "Resultado entregue ao tutor" && st !== "Pago ao laboratório") {
              const petId = it.lista.replace("petexa_", "");
              ex.push({ id: it.id, petId, petName: petMap[petId] || "Pet", nome: dd.nome, status: st });
            }
          }
        }
        setExamesPend(ex);
        // 📋 Boletins de fisio pendentes = salvos com enviadoAt === null (rascunhos/não enviados)
        // Fase 2: detectar "sessao feita sem boletim" via agenda
        const bol: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petboletim_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            if (!dd.enviadoAt) {
              const petId = it.lista.replace("petboletim_", "");
              bol.push({ id: it.id, petId, petName: petMap[petId] || dd.animal || "Pet", sessao: dd.sessaoNumero || "", mv: dd.mvResponsavel || "", date: dd.sessaoData || dd.createdAt });
            }
          }
        }
        bol.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setBoletinsPend(bol);
        try { const dz = await safeJson<any>(await fetch("/api/protocolos/doses/pendentes?dias=7"), []); setDosesPend(Array.isArray(dz) ? dz : []); } catch {}
        const tutorArr = Array.isArray(tts) ? tts : (tts.tutors || tts.data || []);
        const leadArr = Array.isArray(lds) ? lds : (lds.leads || lds.data || []);
        const tutorMap: Record<string, string> = {};
        tutorArr.forEach((t: any) => { tutorMap[t.id] = t.name; });
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        const fu: any[] = [];
        for (const t of tutorArr) if (t.proximoFollowupAt && new Date(t.proximoFollowupAt) <= endToday) fu.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.proximoFollowupAt, href: `/dashboard/erp/tutores/${t.id}` });
        for (const p of petArr) if (p.proximoFollowupAt && new Date(p.proximoFollowupAt) <= endToday) fu.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.proximoFollowupAt, href: `/dashboard/erp/pets/${p.id}` });
        for (const l of leadArr) if (l.proximoFollowupAt && new Date(l.proximoFollowupAt) <= endToday) fu.push({ id: "l" + l.id, tipo: "Lead", nome: l.name || "Lead", date: l.proximoFollowupAt, href: `/dashboard/crm/leads/${l.id}` });
        fu.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setFuDue(fu);
        // Toques de cadencia: passos das cadencias (clientes/pets) que vencem hoje
        const cadArr = Array.isArray(cds) ? cds : (cds.cadencias || cds.data || []);
        const cadById: Record<string, any> = {};
        cadArr.forEach((c: any) => { cadById[c.id] = c; });
        const msUnid: Record<string, number> = { MINUTOS: 60000, HORAS: 3600000, DIAS: 86400000, SEMANAS: 604800000, MESES: 2592000000 };
        const tq: any[] = [];
        for (const it of listArr) {
          const lista = it.lista || "";
          const isPet = lista.startsWith("petcad_"), isCli = lista.startsWith("tutcad_");
          if (!isPet && !isCli) continue;
          let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
          const cad = cadById[dd.cadenciaId]; if (!cad || !dd.startedAt) continue;
          const start = new Date(dd.startedAt).getTime();
          for (const passo of (cad.passos || [])) {
            if (passo.ativo === false) continue;
            const ms = (msUnid[passo.atrasoUnidade] || 86400000) * (Number(passo.atrasoValor) || 0);
            const due = new Date(start + ms);
            if (due >= startToday && due <= endToday) {
              const ownerId = lista.replace(isPet ? "petcad_" : "tutcad_", "");
              tq.push({ id: it.id + "_" + passo.id, tipo: isPet ? "Pet" : "Cliente", nome: isPet ? (petMap[ownerId] || "Pet") : (tutorMap[ownerId] || "Cliente"), cadencia: cad.nome, passo: passo.titulo || passo.tipo, canal: passo.tipo, href: isPet ? `/dashboard/erp/pets/${ownerId}` : `/dashboard/erp/tutores/${ownerId}` });
            }
          }
        }
        setToques(tq);
        // Aniversariantes (cliente.birthDate + pet.birthDate)
        const td = new Date(); const dd2 = td.getDate(), mm2 = td.getMonth();
        const an: any[] = [];
        for (const t of tutorArr) if (t.birthDate) { const b = new Date(t.birthDate); if (b.getDate() === dd2 && b.getMonth() === mm2) an.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.birthDate, href: `/dashboard/erp/tutores/${t.id}` }); }
        for (const p of petArr) if (p.birthDate) { const b = new Date(p.birthDate); if (b.getDate() === dd2 && b.getMonth() === mm2) an.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.birthDate, href: `/dashboard/erp/pets/${p.id}` }); }
        setAniv(an);
        const pac: any[] = [];
        for (const it of listArr) {
          if ((it.lista || "").startsWith("petpac_")) {
            let dd: any = {}; try { dd = JSON.parse(it.valor); } catch {}
            const total = Number(dd.total) || 0, used = Number(dd.used) || 0;
            if (total > 0 && (total - used) <= 1) {
              const petId = it.lista.replace("petpac_", "");
              pac.push({ id: it.id, petId, petName: petMap[petId] || "Pet", nome: dd.nome, used, total, remaining: total - used });
            }
          }
        }
        setPacRisco(pac);
        // Entradas do dia (leads + clientes novos cadastrados hoje)
        try {
          const ldNP = await safeJson<any>(await fetch("/api/leads"), []);
          const leadNew = Array.isArray(ldNP) ? ldNP : (ldNP.leads || ldNP.data || []);
          // Acompanhamento da implantacao: conta a partir de um marco fixo (hoje, na 1a vez)
          let inicio = listArr.find((it: any) => (it.lista || "") === "acompinicio")?.valor;
          if (!inicio) { inicio = new Date().toISOString(); try { await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "acompinicio", valor: inicio }) }); } catch {} }
          const floor = new Date(inicio); floor.setHours(0, 0, 0, 0);
          const baixados = new Set(listArr.filter((it: any) => (it.lista || "") === "acompbaixa").map((it: any) => it.valor));
          const isToday = (dt: any) => { if (!dt) return false; return new Date(dt).getTime() >= floor.getTime(); };
          const ent: any[] = [];
          for (const t of tutorArr) if (isToday(t.createdAt)) ent.push({ key: `cli:${t.id}`, tipo: "Cliente", nome: t.name || "Cliente", sub: t.phone || "", at: t.createdAt, href: `/dashboard/erp/tutores/${t.id}` });
          for (const l of leadNew) if (isToday(l.createdAt)) ent.push({ key: `lead:${l.id}`, tipo: "Lead", nome: l.name || "Lead", sub: l.origem || l.canal || "", at: l.createdAt, href: `/dashboard/crm/leads/${l.id}` });
          // Tambem: quem teve contato no Inbox (BC) hoje, mesmo ja cadastrado antes
          try {
            const riBC = await safeJson<any>(await fetch(`/api/interacoes?canal=${encodeURIComponent("WhatsApp BC")}&limit=1000`), []);
            const bcArr = Array.isArray(riBC) ? riBC : (riBC.interacoes || riBC.data || []);
            const tById: Record<string, any> = {}; for (const t of tutorArr) tById[t.id] = t;
            const lById: Record<string, any> = {}; for (const l of leadNew) lById[l.id] = l;
            const jaTem = new Set(ent.map((e) => e.key));
            for (const it of bcArr) {
              if (!isToday(it.createdAt)) continue;
              if (it.tutorId) {
                const k = `cli:${it.tutorId}`; if (jaTem.has(k)) continue; jaTem.add(k);
                const t = tById[it.tutorId];
                ent.push({ key: k, tipo: "Cliente", nome: t?.name || "Cliente", sub: (t?.contacts?.[0]?.number) || t?.phone || "WhatsApp BC", at: it.createdAt, href: `/dashboard/erp/tutores/${it.tutorId}` });
              } else if (it.leadId) {
                const k = `lead:${it.leadId}`; if (jaTem.has(k)) continue; jaTem.add(k);
                const l = lById[it.leadId];
                ent.push({ key: k, tipo: "Lead", nome: l?.name || "Lead", sub: "WhatsApp BC", at: it.createdAt, href: `/dashboard/crm/leads/${it.leadId}` });
              }
            }
          } catch {}
          const visiveis = ent.filter((e) => !baixados.has(e.key)).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
          setEntradas(visiveis);
        } catch {}
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function baixarEntrada(e: any) {
    setEntradas(prev => prev.filter(x => x.key !== e.key));
    try { await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "acompbaixa", valor: e.key }) }); } catch {}
  }
  async function desconferirEntrada(e: any) {
    setEntConf(m => { const n = { ...m }; delete n[e.key]; return n; });
    try {
      const r = await fetch(`/api/listas?lista=${encodeURIComponent("entradadia_" + todayKey)}`, { cache: "no-store" });
      const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const row = arr.find((x: any) => x.valor === e.key);
      if (row) await fetch(`/api/listas/${row.id}`, { method: "DELETE" });
    } catch {}
  }

  const dosesView = useMemo(() => {
    const arr = Array.isArray(dosesPend) ? dosesPend : [];
    return (effectiveRole === "VET" && meId) ? arr.filter((d: any) => d.vetId === meId) : arr;
  }, [dosesPend, effectiveRole, meId]);

  const items: Pendencia[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "retornos",
        title: "Retornos vencidos",
        sub: "Follow-ups vencidos e de hoje (Cliente/Pet/Lead)",
        count: fuDue.length,
        link: "Follow-up",
        href: "#",
        Icon: LuRefreshCcw,
        emoji: "🔁",
      },
      {
        key: "toques",
        title: "Toques de cadência",
        sub: "Passos de cadência (clientes/pets) previstos para hoje",
        count: toques.length,
        link: "Cadências",
        href: "#",
        Icon: LuPhone,
        emoji: "📞",
      },
      {
        key: "pacotes",
        title: "Pacotes em risco",
        sub: "Fisio na penúltima/última sessão",
        count: pacRisco.length,
        link: "Pacotes",
        href: "/dashboard/erp/pacotes?risco=1",
        Icon: LuPackage,
        emoji: "📦",
      },
      {
        key: "exames",
        title: "Exames a entregar",
        sub: "Resultados aguardando envio ao tutor",
        count: examesPend.length,
        link: "Pets",
        href: "/dashboard/erp/pets?exames=pendentes",
        Icon: LuFlaskConical,
        emoji: "🔬",
      },
      {
        key: "doses",
        title: "Doses a aplicar",
        sub: "Vacinas/protocolos vencidos e dos próximos 7 dias",
        count: dosesView.length,
        link: "Calendário",
        href: "/dashboard/erp/agendamentos/clinico",
        Icon: LuPill,
        emoji: "💉",
      },
      {
        key: "aniversariantes",
        title: "Aniversariantes do dia",
        sub: "Clientes e pets que fazem aniversário hoje",
        count: aniv.length,
        link: "Parabéns",
        href: "#",
        Icon: LuCake,
        emoji: "🎂",
      },
    ];
  }, [data, examesPend, dosesView, fuDue, toques, aniv, pacRisco]);

  const total = items.reduce((s, t) => s + t.count, 0);

  return (
    <PageShell pad="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-medium" style={{ color: B44.navy }}>{effectiveRole === "ADMIN" ? "O que a clínica precisa de atenção hoje" : "O que você precisa atender hoje"}</h2>
        <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: B44.tint, color: "#00798A" }}>
          {loading ? "carregando..." : `${total} pendências`}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: B44.text3 }}>
          Perfil: {roleShort(effectiveRole)}{isPreviewing && <span style={{ color: "#d97706" }}> · preview</span>}
        </span>
      </div>

      <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: B44.line }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: B44.text3 }}>Carregando seu dia...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: B44.text3 }}>Tudo em ordem por aqui. 🎉</div>
        ) : (
          items.map((p, i) => {
            const inner = (
              <>
                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: B44.tint }}>
                  <span style={{ fontSize: "19px" }}>{p.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium" style={{ color: B44.text1 }}>{p.title}</div>
                  <div className="text-xs" style={{ color: B44.text2 }}>{p.sub}</div>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide hidden sm:block" style={{ color: B44.primary }}>{p.link}</span>
                <CountBadge n={p.count} />
                <span style={{ fontSize: "16px", color: B44.text3 }} className="flex-shrink-0">›</span>
              </>
            );
            const rowCls = "flex items-center gap-3.5 px-[18px] py-[13px] border-b hover:bg-[#E0F4F6]/60 transition cursor-pointer";
            const rowStyle = { borderColor: i === items.length - 1 && !(p.key === "exames" && examesOpen) ? "transparent" : B44.lineSoft } as any;
            if (p.key === "pacotes") {
              return (
                <div key={p.key}>
                  <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setPacOpen(o => !o)}>{inner}</div>
                  {pacOpen && (
                    <div style={{ background: B44.soft }}>
                      {pacRisco.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum pacote perto de acabar.</div>
                      ) : pacRisco.map((e: any) => { const done = e.remaining <= 0; return (
                        <Link key={e.id} href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                          <span className="font-medium" style={{ color: B44.text1 }}>{e.petName}</span>
                          <span className="truncate max-w-[120px]" style={{ color: B44.text2 }}>· {e.nome}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <div style={{ width: 64 }}><ProgressBar value={e.used} max={e.total || 1} height={6} color={done ? "#0F6E56" : "#BA7517"} /></div>
                            <span className="text-[10px]" style={{ color: B44.text2 }}>{e.used}/{e.total}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={done ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#FCE5C8", color: "#8A5A0F" }}>{done ? "Concluído" : "Penúltima"}</span>
                          </div>
                        </Link>
                      ); })}
                    </div>
                  )}
                </div>
              );
            }
            const fuExpand = (list: any[], open: boolean, setOpen: (f: (o: boolean) => boolean) => void, emptyMsg: string) => (
              <div key={p.key}>
                <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setOpen(o => !o)}>{inner}</div>
                {open && (
                  <div style={{ background: B44.soft }}>
                    {list.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>{emptyMsg}</div>
                    ) : list.map((e: any) => (
                      <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                        <TipoChip tipo={e.tipo} />
                        <span className="font-medium" style={{ color: B44.text1 }}>{e.nome}</span>
                        {e.date && <span className="ml-auto" style={{ color: B44.text2 }}>{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
            if (p.key === "retornos") return fuExpand(fuDue, fuDueOpen, setFuDueOpen, "Nenhum follow-up vencido ou de hoje.");
            if (p.key === "aniversariantes") return fuExpand(aniv, anivOpen, setAnivOpen, "Ninguém faz aniversário hoje.");
            if (p.key === "toques") return (
              <div key={p.key}>
                <div className={rowCls} style={{ borderColor: B44.lineSoft }} onClick={() => setToquesOpen(o => !o)}>{inner}</div>
                {toquesOpen && (
                  <div style={{ background: B44.soft }}>
                    {toques.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum toque de cadência para hoje.</div>
                    ) : toques.map((e: any) => (
                      <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                        <TipoChip tipo={e.tipo} />
                        <span className="font-medium" style={{ color: B44.text1 }}>{e.nome}</span>
                        <span className="truncate max-w-[200px]" style={{ color: B44.text2 }}>· {e.cadencia} — {e.passo}</span>
                        {e.canal && <span className="ml-auto text-[10px] font-medium" style={{ color: B44.primary }}>{e.canal}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
            if (p.key === "exames") {
              return (
                <div key={p.key}>
                  <div className={rowCls} style={rowStyle} onClick={() => setExamesOpen(o => !o)}>{inner}</div>
                  {examesOpen && (
                    <div style={{ background: B44.soft }}>
                      {examesPend.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs border-b" style={{ color: B44.text3, borderColor: B44.lineSoft }}>Nenhum exame em acompanhamento.</div>
                      ) : examesPend.map((e: any) => (
                        <Link key={e.id} href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#E0F4F6]/60 text-xs" style={{ borderColor: B44.lineSoft }}>
                          <span className="font-medium" style={{ color: B44.text1 }}>{e.petName}</span>
                          <span style={{ color: B44.text2 }}>· {e.nome}</span>
                          <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full" style={{ background: B44.tint, color: "#00798A" }}>{e.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link key={p.key} href={p.href} className={rowCls} style={{ borderColor: i === items.length - 1 ? "transparent" : B44.lineSoft }}>{inner}</Link>
            );
          })
        )}
      </div>

      {/* 📋 Boletins pendentes — VET e ADMIN */}
      {!loading && (effectiveRole === "VET" || effectiveRole === "ADMIN") && (
        <SectionCard>
          <SectionHeader emoji="📋" tileBg="#EAF3DE" title="📋 Boletins pendentes" sub="Boletins de fisioterapia salvos e ainda não enviados ao tutor" count={boletinsPend.length} />
          {boletinsPend.length === 0 ? (
            <div className="px-[18px] py-8 text-center text-sm" style={{ color: B44.text3 }}>Nenhum boletim pendente. 🎉</div>
          ) : boletinsPend.map((b) => (
            <Link key={b.id} href={`/dashboard/erp/pets/${b.petId}/fisio/boletim/novo?id=${b.id}`} className="flex items-center gap-2.5 px-[18px] py-2.5 border-b hover:bg-[#E0F4F6]/40" style={{ borderColor: B44.lineSoft }}>
              {b.sessao && <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#EAF3DE", color: "#3B6D11" }}>#{b.sessao}</span>}
              <span className="font-medium text-[13px] truncate" style={{ color: B44.text1 }}>{b.petName}</span>
              {b.mv && <span className="text-xs hidden sm:block truncate" style={{ color: B44.text2 }}>· 🧑‍⚕️ {b.mv}</span>}
              {b.date && <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>{new Date(b.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
              <span className="text-[11px] flex-shrink-0" style={{ color: B44.primary }}>abrir / enviar →</span>
            </Link>
          ))}
        </SectionCard>
      )}

      {!loading && effectiveRole === "ADMIN" && (() => {
        const hhmm = (dt: any) => { try { return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
        const fmtDia = (dt: any) => { const d = new Date(dt), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1); const k = (x: Date) => x.toDateString(); if (k(d) === k(h)) return "Hoje"; if (k(d) === k(o)) return "Ontem"; return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
        const grupos: { dia: string; itens: any[] }[] = [];
        for (const e of entradas) { const dk = new Date(e.at).toDateString(); let g = grupos.find(x => x.dia === dk); if (!g) { g = { dia: dk, itens: [] }; grupos.push(g); } g.itens.push(e); }
        return (
          <SectionCard>
            <SectionHeader emoji="📋" tileBg={B44.tint} title="📋 Acompanhamento de entradas" sub="Leads e clientes que entraram — dê baixa ao conferir o atendimento" count={entradas.length} />
            {entradas.length === 0 ? (
              <div className="px-[18px] py-8 text-center text-sm" style={{ color: B44.text3 }}>Nenhuma entrada pendente de baixa.</div>
            ) : grupos.map((g) => (
              <div key={g.dia}>
                <div className="px-[18px] py-1.5 text-[11px] font-medium border-b" style={{ color: B44.text2, background: B44.soft, borderColor: B44.lineSoft }}>{fmtDia(g.itens[0].at)} ({g.itens.length})</div>
                {g.itens.map((e: any) => (
                  <div key={e.key} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#E0F4F6]/40" style={{ borderColor: B44.lineSoft }}>
                    <input type="checkbox" checked={false} onChange={() => baixarEntrada(e)} className="w-4 h-4 flex-shrink-0 cursor-pointer accent-[#009AAC]" title="Dar baixa (sai da lista, fica na ficha)" />
                    <TipoChip tipo={e.tipo} />
                    <Link href={e.href} className="font-medium text-[13px] hover:underline truncate" style={{ color: B44.text1 }}>{e.nome}</Link>
                    {e.sub && <span className="text-xs truncate hidden sm:block" style={{ color: B44.text2 }}>. {e.sub}</span>}
                    <span className="ml-auto text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>{hhmm(e.at)}</span>
                  </div>
                ))}
              </div>
            ))}
          </SectionCard>
        );
      })()}
      {!loading && encMine.length > 0 && (
        <SectionCard>
          <SectionHeader emoji="↔️" tileBg="#fef3c7" title="↔️ Encaminhados para mim" sub="Clientes, pets e leads que precisam do seu atendimento" count={encMine.length} countColor="#D97706" />
          {encMine.map((e) => (
            <div key={e.entryId} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#fef9ec]" style={{ borderColor: B44.lineSoft }}>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: "#FEF3C7", color: "#92611A" }}>{e.tipo}</span>
              <Link href={encHref(e)} className="font-medium text-[13px] hover:underline truncate" style={{ color: B44.text1 }}>{e.nome}</Link>
              {e.obs && <span className="text-xs truncate hidden sm:block" style={{ color: B44.text2 }}>. {e.obs}</span>}
              {e.byName && <span className="text-[11px] flex-shrink-0" style={{ color: B44.text3 }}>por {e.byName}</span>}
              <button onClick={() => concluirEnc(e)} className="ml-auto text-[11px] font-medium text-[#0F6E56] hover:underline flex-shrink-0">Concluir</button>
            </div>
          ))}
        </SectionCard>
      )}
      <div className="mt-6 text-xs text-center" style={{ color: B44.text3 }}>
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
        Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
      </div>
    </PageShell>
  );
}
