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
  const [caixaVisivel, setCaixaVisivel] = useState(false);
  const [orcamentos, setOrcamentos] = useState(0);

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
        try { const dz = await safeJson<any>(await fetch("/api/protocolos/doses/pendentes?dias=7"), []); setDosesPend(Array.isArray(dz) ? dz : []); } catch {}
        const tutorArr = Array.isArray(tts) ? tts : (tts.tutors || tts.data || []);
        const leadArr = Array.isArray(lds) ? lds : (lds.leads || lds.data || []);
        setOrcamentos((Array.isArray(leadArr) ? leadArr : []).filter((l: any) => /or[çc]amento/i.test(l.pipelineComercialEtapa || "")).length);
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
      },
      {
        key: "toques",
        title: "Toques de cadência",
        sub: "Passos de cadência (clientes/pets) previstos para hoje",
        count: toques.length,
        link: "Cadências",
        href: "#",
        Icon: LuPhone,
      },
      {
        key: "pacotes",
        title: "Pacotes em risco",
        sub: "Fisio na penúltima/última sessão",
        count: pacRisco.length,
        link: "Pacotes",
        href: "/dashboard/erp/pacotes?risco=1",
        Icon: LuPackage,
      },
      {
        key: "exames",
        title: "Exames a entregar",
        sub: "Resultados aguardando envio ao tutor",
        count: examesPend.length,
        link: "Pets",
        href: "/dashboard/erp/pets?exames=pendentes",
        Icon: LuFlaskConical,
      },
      {
        key: "doses",
        title: "Doses a aplicar",
        sub: "Vacinas/protocolos vencidos e dos próximos 7 dias",
        count: dosesView.length,
        link: "Calendário",
        href: "/dashboard/erp/agendamentos/clinico",
        Icon: LuPill,
      },
      {
        key: "aniversariantes",
        title: "Aniversariantes do dia",
        sub: "Clientes e pets que fazem aniversário hoje",
        count: aniv.length,
        link: "Parabéns",
        href: "#",
        Icon: LuCake,
      },
    ];
  }, [data, examesPend, dosesView, fuDue, toques, aniv, pacRisco]);

  const total = items.reduce((s, t) => s + t.count, 0);

  const isAdmin = effectiveRole === "ADMIN";
  const isVet = effectiveRole === "VETERINARIAN";
  const isRecep = effectiveRole === "RECEPTIONIST";
  const novosLeads = entradas.filter((e: any) => e.tipo === "Lead").length;

  // ---- Sub-componentes locais (Base44) ----
  const Kpi = ({ emoji, label, value, sub, soon, turquesa }: { emoji: string; label: string; value: any; sub: string; soon?: boolean; turquesa?: boolean }) => (
    <div className={`bg-white rounded-[12px] p-3 ${turquesa ? "border border-[#009AAC]" : "border border-[#E8E2D6]"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-[#8A989D]">{emoji} {label}</span>
        {soon && <span className="text-[8.5px] bg-[#F3F1EC] text-[#9a948a] px-1.5 rounded-full">em breve</span>}
      </div>
      <div className="text-[22px] font-medium text-[#014D5E] leading-tight">{value}</div>
      <div className={`text-[9.5px] ${soon ? "text-[#8A989D]" : "text-[#1c7a47]"}`}>{sub}</div>
    </div>
  );

  const Painel = ({ titulo, soon, children }: { titulo: string; soon?: boolean; children: any }) => (
    <div className="bg-white border border-[#E8E2D6] rounded-[12px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-semibold text-[#014D5E]">{titulo}</span>
        {soon && <span className="text-[8.5px] bg-[#F3F1EC] text-[#9a948a] px-1.5 rounded-full">em breve</span>}
      </div>
      {children}
    </div>
  );

  const SoonPlaceholder = ({ texto }: { texto: string }) => (
    <div className="py-8 text-center text-[12px] text-[#8A989D]">{texto}</div>
  );

  const LinhaAtencao = ({ emoji, cor, titulo, sub }: { emoji: string; cor: string; titulo: string; sub: string }) => (
    <div className="flex items-center gap-2.5 py-2">
      <span className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[15px] flex-shrink-0" style={{ background: cor }}>{emoji}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[#1F2A2E]">{titulo}</div>
        <div className="text-[11px] text-[#8A989D]">{sub}</div>
      </div>
    </div>
  );

  const BarraProgresso = ({ label, pct, valor }: { label: string; pct: number; valor: string }) => (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#5C6B70]">{label}</span>
        <span className="text-[11px] text-[#8A989D]">{valor}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#EAE3D4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#009AAC" }} />
      </div>
    </div>
  );

  // ---- Painéis reaproveitados (JSX original) ----
  const PainelEntradas = () => (!loading && isAdmin ? (() => {
    const cor: Record<string, { bg: string; fg: string }> = { Cliente: { bg: "#E0F4F6", fg: "#00798A" }, Lead: { bg: "#E6F1FB", fg: "#0C447C" } };
    const hhmm = (dt: any) => { try { return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
    const fmtDia = (dt: any) => { const d = new Date(dt), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1); const k = (x: Date) => x.toDateString(); if (k(d) === k(h)) return "Hoje"; if (k(d) === k(o)) return "Ontem"; return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
    const grupos: { dia: string; itens: any[] }[] = [];
    for (const e of entradas) { const dk = new Date(e.at).toDateString(); let g = grupos.find(x => x.dia === dk); if (!g) { g = { dia: dk, itens: [] }; grupos.push(g); } g.itens.push(e); }
    return (
      <div className="bg-white border border-[#E8E2D6] rounded-[12px] overflow-hidden">
        <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: "#E8E2D6" }}>
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#E0F4F6", color: "#009AAC" }}><LuClipboardCheck size={19} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-[#014D5E]">📥 Acompanhamento de entradas</div>
            <div className="text-xs text-[#8A989D]">Leads e clientes que entraram — dê baixa ao conferir o atendimento</div>
          </div>
          <span className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: entradas.length > 0 ? "linear-gradient(90deg, #009AAC, #00B4C4)" : "#cbd5e1" }}>{entradas.length}</span>
        </div>
        {entradas.length === 0 ? (
          <div className="px-[18px] py-8 text-center text-sm text-[#8A989D]">Nenhuma entrada pendente de baixa.</div>
        ) : grupos.map((g) => (
          <div key={g.dia}>
            <div className="px-[18px] py-1.5 text-[11px] font-semibold text-[#5C6B70] bg-[#F6F2EA] border-b" style={{ borderColor: "#eef2f4" }}>{fmtDia(g.itens[0].at)} ({g.itens.length})</div>
            {g.itens.map((e: any) => (
              <div key={e.key} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#E0F4F6]/40" style={{ borderColor: "#E8E2D6" }}>
                <input type="checkbox" checked={false} onChange={() => baixarEntrada(e)} className="w-4 h-4 flex-shrink-0 cursor-pointer accent-[#009AAC]" title="Dar baixa (sai da lista, fica na ficha)" />
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: (cor[e.tipo] || cor.Cliente).bg, color: (cor[e.tipo] || cor.Cliente).fg }}>{e.tipo}</span>
                <Link href={e.href} className="font-medium text-[13px] text-[#1F2A2E] hover:underline truncate">{e.nome}</Link>
                {e.sub && <span className="text-xs text-[#8A989D] truncate hidden sm:block">. {e.sub}</span>}
                <span className="ml-auto text-[11px] text-[#8A989D] flex-shrink-0">{hhmm(e.at)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  })() : null);

  const PainelEncaminhados = () => (!loading && encMine.length > 0 ? (
    <div className="bg-white border border-[#E8E2D6] rounded-[12px] overflow-hidden">
      <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: "#E8E2D6" }}>
        <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7", color: "#92611A" }}><LuShare2 size={19} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-[#014D5E]">📨 Encaminhados para mim</div>
          <div className="text-xs text-[#8A989D]">Clientes, pets e leads que precisam do seu atendimento</div>
        </div>
        <span className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: "linear-gradient(90deg,#D97706,#92611A)" }}>{encMine.length}</span>
      </div>
      {encMine.map((e) => (
        <div key={e.entryId} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#fef9ec]" style={{ borderColor: "#E8E2D6" }}>
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: "#FEF3C7", color: "#92611A" }}>{e.tipo}</span>
          <Link href={encHref(e)} className="font-medium text-[13px] text-[#1F2A2E] hover:underline truncate">{e.nome}</Link>
          {e.obs && <span className="text-xs text-[#8A989D] truncate hidden sm:block">. {e.obs}</span>}
          {e.byName && <span className="text-[11px] text-[#8A989D] flex-shrink-0">por {e.byName}</span>}
          <button onClick={() => concluirEnc(e)} className="ml-auto text-[11px] font-semibold text-[#0F6E56] hover:underline flex-shrink-0">Concluir</button>
        </div>
      ))}
    </div>
  ) : null);

  return (
    <div className="p-6 min-h-screen bg-[#F6F2EA]">
      {loading ? (
        <div className="py-16 text-center text-sm text-[#8A989D]">Carregando seu dia...</div>
      ) : (
        <>
          {/* ===================== ADMIN ===================== */}
          {isAdmin && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Kpi emoji="📋" label="Atendimentos hoje" value={0} soon sub="chega com a Fase 2" />
                <Kpi emoji="🎯" label="Novos leads" value={novosLeads} sub="dado real" />
                <div className="bg-white rounded-[12px] p-3 border border-[#009AAC]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#8A989D]">💰 Caixa do dia</span>
                    <button onClick={() => setCaixaVisivel(v => !v)} className="text-[13px] leading-none" title="Mostrar/ocultar">👁️</button>
                  </div>
                  <div className="text-[22px] font-medium text-[#014D5E] leading-tight">{caixaVisivel ? "R$ 0" : "R$ ••••"}</div>
                  <div className="text-[9.5px] text-[#8A989D]">só admin · em breve</div>
                </div>
                <Kpi emoji="💵" label="Faturamento do mês" value="—" soon sub="chega com a Fase 2" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Painel titulo="📅 Próximos atendimentos" soon>
                  <SoonPlaceholder texto="A agenda de atendimentos aparece aqui na Fase 2." />
                </Painel>

                <Painel titulo="⚠️ Precisa de atenção">
                  <div className="divide-y divide-[#F1ECE0]">
                    <LinhaAtencao emoji="💉" cor="#FFE2D2" titulo={`${dosesView.length} vacinas vencendo`} sub="doses a aplicar" />
                    <LinhaAtencao emoji="📞" cor="#E0F4F6" titulo={`${fuDue.length} follow-ups`} sub="tutores para tocar" />
                    <LinhaAtencao emoji="📄" cor="#E1F5EE" titulo={`${orcamentos} orçamentos`} sub="aguardando resposta" />
                  </div>
                </Painel>

                <Painel titulo="🏆 Metas da clínica" soon>
                  <BarraProgresso label="Atendimentos" pct={0} valor="0%" />
                  <BarraProgresso label="Novos leads" pct={0} valor="0%" />
                  <BarraProgresso label="Faturamento" pct={0} valor="0%" />
                </Painel>

                <PainelEntradas />
                <PainelEncaminhados />
              </div>
            </>
          )}

          {/* ===================== VETERINARIAN ===================== */}
          {isVet && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Kpi emoji="📋" label="Meus atendimentos hoje" value={0} soon sub="chega com a Fase 2" />
                <Kpi emoji="🎯" label="Minha meta do mês" value="0%" soon sub="chega com a Fase 2" />
                <Kpi emoji="💉" label="Doses a aplicar" value={dosesView.length} sub="dado real" />
                <Kpi emoji="🔬" label="Exames a entregar" value={examesPend.length} sub="dado real" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Painel titulo="📅 Minha agenda de hoje" soon>
                  <SoonPlaceholder texto="Sua agenda de atendimentos aparece aqui na Fase 2." />
                </Painel>

                <Painel titulo="🔁 Retornos a dar">
                  <div className="divide-y divide-[#F1ECE0]">
                    <LinhaAtencao emoji="🩺" cor="#E0F4F6" titulo="Consultas de retorno" sub="em breve" />
                    <LinhaAtencao emoji="💉" cor="#FFE2D2" titulo={`${dosesView.length} vacinas`} sub="doses a aplicar" />
                    <LinhaAtencao emoji="🔬" cor="#E1F5EE" titulo={`${examesPend.length} exames`} sub="resultados a entregar" />
                  </div>
                </Painel>

                <Painel titulo="🎖️ Conquistas" soon>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#FFE2D2", color: "#993C1D" }}>🔥 7 dias seguidos</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>🏅 Meta do mês</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full opacity-60" style={{ background: "#F0EBE0", color: "#9a948a" }}>🔒 100 atend.</span>
                  </div>
                </Painel>

                <PainelEncaminhados />
              </div>
            </>
          )}

          {/* ===================== RECEPTIONIST ===================== */}
          {isRecep && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Kpi emoji="🎯" label="Novos leads" value={novosLeads} sub="dado real" />
                <Kpi emoji="📞" label="Follow-ups hoje" value={fuDue.length} sub="dado real" />
                <Kpi emoji="📅" label="Agendamentos do dia" value={0} soon sub="chega com a Fase 2" />
                <Kpi emoji="🎂" label="Aniversariantes" value={aniv.length} sub="dado real" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Painel titulo="⚠️ Precisa de atenção">
                  <div className="divide-y divide-[#F1ECE0]">
                    <LinhaAtencao emoji="📞" cor="#E0F4F6" titulo={`${fuDue.length} follow-ups`} sub="tutores para tocar" />
                    <LinhaAtencao emoji="📄" cor="#E1F5EE" titulo={`${orcamentos} orçamentos`} sub="aguardando resposta" />
                    <LinhaAtencao emoji="🎂" cor="#FFE2D2" titulo={`${aniv.length} aniversariantes`} sub="parabenizar hoje" />
                  </div>
                </Painel>

                <Painel titulo="🎯 Conversão de leads" soon>
                  <BarraProgresso label="Conversão do mês" pct={0} valor="0%" />
                  <div className="mt-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#FFE2D2", color: "#993C1D" }}>🔥 follow-ups em dia</span>
                  </div>
                </Painel>

                <PainelEncaminhados />
              </div>
            </>
          )}

          {/* Fallback: perfil sem layout dedicado (mostra encaminhados) */}
          {!isAdmin && !isVet && !isRecep && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PainelEncaminhados />
            </div>
          )}

          <div className="mt-6 text-xs text-[#8A989D] text-center">
            Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
            Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
          </div>
        </>
      )}
    </div>
  );
}
