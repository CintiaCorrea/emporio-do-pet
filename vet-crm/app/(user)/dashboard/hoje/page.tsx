"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuRefreshCcw, LuPhone, LuPackage,
  LuFlaskConical, LuCake, LuChevronRight, LuClipboardCheck, LuShare2,
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
          const st0 = new Date(); st0.setHours(0, 0, 0, 0);
          const en0 = new Date(); en0.setHours(23, 59, 59, 999);
          const isToday = (dt: any) => { if (!dt) return false; const x = new Date(dt).getTime(); return x >= st0.getTime() && x <= en0.getTime(); };
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
          ent.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
          setEntradas(ent);
          const confMap: Record<string, string> = {};
          for (const it of listArr) if ((it.lista || "") === `entradadia_${todayKey}`) confMap[it.valor] = it.id;
          setEntConf(confMap);
        } catch {}
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function conferirEntrada(e: any) {
    setEntConf(m => ({ ...m, [e.key]: "1" }));
    try { await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `entradadia_${todayKey}`, valor: e.key }) }); }
    catch { setEntConf(m => { const n = { ...m }; delete n[e.key]; return n; }); }
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
        key: "aniversariantes",
        title: "Aniversariantes do dia",
        sub: "Clientes e pets que fazem aniversário hoje",
        count: aniv.length,
        link: "Parabéns",
        href: "#",
        Icon: LuCake,
      },
    ];
  }, [data, examesPend, fuDue, toques, aniv, pacRisco]);

  const total = items.reduce((s, t) => s + t.count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "#014D5E" }}>{effectiveRole === "ADMIN" ? "O que a clínica precisa de atenção hoje" : "O que você precisa atender hoje"}</h2>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: "#e6f6f8", color: "#009AAC" }}
        >
          {loading ? "carregando..." : `${total} pendências`}
        </span>
        <span className="ml-auto text-[11px] text-[#94a3b8]">
          Perfil: {roleShort(effectiveRole)}{isPreviewing && <span className="text-[#d97706]"> · preview</span>}
        </span>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Carregando seu dia...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Tudo em ordem por aqui. 🎉</div>
        ) : (
          items.map((p, i) => {
            const inner = (
              <>
                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#e6f6f8", color: "#009AAC" }}>
                  <p.Icon size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#1e293b]">{p.title}</div>
                  <div className="text-xs text-[#64748b]">{p.sub}</div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#009AAC] hidden sm:block">{p.link}</span>
                <span className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: p.count > 0 ? "linear-gradient(90deg, #009AAC, #00B4C4)" : "#cbd5e1" }}>{p.count}</span>
                <LuChevronRight size={16} className="text-[#94a3b8] flex-shrink-0" />
              </>
            );
            const rowCls = "flex items-center gap-3.5 px-[18px] py-[13px] border-b hover:bg-[#e6f6f8]/60 transition cursor-pointer";
            const rowStyle = { borderColor: i === items.length - 1 && !(p.key === "exames" && examesOpen) ? "transparent" : "#e8edf0" } as any;
            if (p.key === "pacotes") {
              return (
                <div key={p.key}>
                  <div className={rowCls} style={{ borderColor: "#e8edf0" }} onClick={() => setPacOpen(o => !o)}>{inner}</div>
                  {pacOpen && (
                    <div style={{ background: "#f8fafb" }}>
                      {pacRisco.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs text-[#94a3b8] border-b" style={{ borderColor: "#e8edf0" }}>Nenhum pacote perto de acabar.</div>
                      ) : pacRisco.map((e: any) => { const done = e.remaining <= 0; return (
                        <Link key={e.id} href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#e6f6f8]/60 text-xs" style={{ borderColor: "#e8edf0" }}>
                          <span className="font-medium text-[#1e293b]">{e.petName}</span>
                          <span className="text-[#64748b] truncate max-w-[120px]">· {e.nome}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full" style={{ width: `${e.total ? Math.min(100, (e.used / e.total) * 100) : 0}%`, background: done ? "#0F6E56" : "#BA7517" }} /></div>
                            <span className="text-[10px] text-[#64748b]">{e.used}/{e.total}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={done ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#FCE5C8", color: "#8A5A0F" }}>{done ? "Concluído" : "Penúltima"}</span>
                          </div>
                        </Link>
                      ); })}
                    </div>
                  )}
                </div>
              );
            }
            const tcor: Record<string, { bg: string; fg: string }> = { Cliente: { bg: "#E0F4F6", fg: "#00798A" }, Pet: { bg: "#E1F5EE", fg: "#0F6E56" }, Lead: { bg: "#E6F1FB", fg: "#0C447C" } };
            const fuExpand = (list: any[], open: boolean, setOpen: (f: (o: boolean) => boolean) => void, emptyMsg: string) => (
              <div key={p.key}>
                <div className={rowCls} style={{ borderColor: "#e8edf0" }} onClick={() => setOpen(o => !o)}>{inner}</div>
                {open && (
                  <div style={{ background: "#f8fafb" }}>
                    {list.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs text-[#94a3b8] border-b" style={{ borderColor: "#e8edf0" }}>{emptyMsg}</div>
                    ) : list.map((e: any) => (
                      <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#e6f6f8]/60 text-xs" style={{ borderColor: "#e8edf0" }}>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: (tcor[e.tipo] || tcor.Cliente).bg, color: (tcor[e.tipo] || tcor.Cliente).fg }}>{e.tipo}</span>
                        <span className="font-medium text-[#1e293b]">{e.nome}</span>
                        {e.date && <span className="ml-auto text-[#64748b]">{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
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
                <div className={rowCls} style={{ borderColor: "#e8edf0" }} onClick={() => setToquesOpen(o => !o)}>{inner}</div>
                {toquesOpen && (
                  <div style={{ background: "#f8fafb" }}>
                    {toques.length === 0 ? (
                      <div className="px-[58px] py-3 text-xs text-[#94a3b8] border-b" style={{ borderColor: "#e8edf0" }}>Nenhum toque de cadência para hoje.</div>
                    ) : toques.map((e: any) => (
                      <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#e6f6f8]/60 text-xs" style={{ borderColor: "#e8edf0" }}>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: (tcor[e.tipo] || tcor.Cliente).bg, color: (tcor[e.tipo] || tcor.Cliente).fg }}>{e.tipo}</span>
                        <span className="font-medium text-[#1e293b]">{e.nome}</span>
                        <span className="text-[#64748b] truncate max-w-[200px]">· {e.cadencia} — {e.passo}</span>
                        {e.canal && <span className="ml-auto text-[10px] text-[#009AAC] font-semibold">{e.canal}</span>}
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
                    <div style={{ background: "#f8fafb" }}>
                      {examesPend.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs text-[#94a3b8] border-b" style={{ borderColor: "#e8edf0" }}>Nenhum exame em acompanhamento.</div>
                      ) : examesPend.map((e: any) => (
                        <Link key={e.id} href={`/dashboard/erp/pets/${e.petId}`} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#e6f6f8]/60 text-xs" style={{ borderColor: "#e8edf0" }}>
                          <span className="font-medium text-[#1e293b]">{e.petName}</span>
                          <span className="text-[#64748b]">· {e.nome}</span>
                          <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#E0F4F6", color: "#00798A" }}>{e.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link key={p.key} href={p.href} className={rowCls} style={{ borderColor: i === items.length - 1 ? "transparent" : "#e8edf0" }}>{inner}</Link>
            );
          })
        )}
      </div>

      {!loading && (() => {
        const naoConf = entradas.filter(e => !(e.key in entConf));
        const conf = entradas.filter(e => e.key in entConf);
        const cor: Record<string, { bg: string; fg: string }> = { Cliente: { bg: "#E0F4F6", fg: "#00798A" }, Lead: { bg: "#E6F1FB", fg: "#0C447C" } };
        const hhmm = (dt: any) => { try { return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
        return (
          <div className="mt-6 bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
            <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: "#e8edf0" }}>
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#e6f6f8", color: "#009AAC" }}><LuClipboardCheck size={19} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[#1e293b]">Entradas do dia</div>
                <div className="text-xs text-[#64748b]">Leads e clientes novos de hoje — marque ao conferir o lançamento</div>
              </div>
              <span className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: naoConf.length > 0 ? "linear-gradient(90deg, #009AAC, #00B4C4)" : "#cbd5e1" }}>{naoConf.length}</span>
            </div>
            {entradas.length === 0 ? (
              <div className="px-[18px] py-8 text-center text-sm text-[#94a3b8]">Nenhuma entrada nova hoje.</div>
            ) : naoConf.length === 0 ? (
              <div className="px-[18px] py-6 text-center text-sm text-[#0F6E56]">Tudo conferido por hoje.</div>
            ) : naoConf.map(e => (
              <div key={e.key} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#e6f6f8]/40" style={{ borderColor: "#e8edf0" }}>
                <input type="checkbox" checked={false} onChange={() => conferirEntrada(e)} className="w-4 h-4 flex-shrink-0 cursor-pointer accent-[#009AAC]" title="Marcar como conferido" />
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: (cor[e.tipo] || cor.Cliente).bg, color: (cor[e.tipo] || cor.Cliente).fg }}>{e.tipo}</span>
                <Link href={e.href} className="font-medium text-[13px] text-[#1e293b] hover:underline truncate">{e.nome}</Link>
                {e.sub && <span className="text-xs text-[#64748b] truncate hidden sm:block">· {e.sub}</span>}
                <span className="ml-auto text-[11px] text-[#94a3b8] flex-shrink-0">{hhmm(e.at)}</span>
              </div>
            ))}
            {conf.length > 0 && (
              <div>
                <button onClick={() => setEntConfOpen(o => !o)} className="w-full text-left px-[18px] py-2 text-[11px] font-semibold text-[#94a3b8] hover:bg-[#f8fafb]">{entConfOpen ? "\u25be" : "\u25b8"} Conferidos hoje ({conf.length})</button>
                {entConfOpen && conf.map(e => (
                  <div key={e.key} className="flex items-center gap-3 px-[18px] py-2 border-t" style={{ borderColor: "#f1f5f9", background: "#f8fafb" }}>
                    <input type="checkbox" checked readOnly onChange={() => desconferirEntrada(e)} className="w-4 h-4 flex-shrink-0 cursor-pointer accent-[#0F6E56]" title="Desmarcar" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: (cor[e.tipo] || cor.Cliente).bg, color: (cor[e.tipo] || cor.Cliente).fg }}>{e.tipo}</span>
                    <Link href={e.href} className="text-[13px] text-[#64748b] line-through hover:underline truncate">{e.nome}</Link>
                    <span className="ml-auto text-[11px] text-[#cbd5e1] flex-shrink-0">{hhmm(e.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
      {!loading && encMine.length > 0 && (
        <div className="mt-6 bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
          <div className="flex items-center gap-3.5 px-[18px] py-[13px] border-b" style={{ borderColor: "#e8edf0" }}>
            <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7", color: "#92611A" }}><LuShare2 size={19} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-[#1e293b]">Encaminhados para mim</div>
              <div className="text-xs text-[#64748b]">Clientes, pets e leads que precisam do seu atendimento</div>
            </div>
            <span className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0" style={{ background: "linear-gradient(90deg,#D97706,#92611A)" }}>{encMine.length}</span>
          </div>
          {encMine.map((e) => (
            <div key={e.entryId} className="flex items-center gap-3 px-[18px] py-2.5 border-b hover:bg-[#fef9ec]" style={{ borderColor: "#e8edf0" }}>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 capitalize" style={{ background: "#FEF3C7", color: "#92611A" }}>{e.tipo}</span>
              <Link href={encHref(e)} className="font-medium text-[13px] text-[#1e293b] hover:underline truncate">{e.nome}</Link>
              {e.obs && <span className="text-xs text-[#64748b] truncate hidden sm:block">. {e.obs}</span>}
              {e.byName && <span className="text-[11px] text-[#94a3b8] flex-shrink-0">por {e.byName}</span>}
              <button onClick={() => concluirEnc(e)} className="ml-auto text-[11px] font-semibold text-[#0F6E56] hover:underline flex-shrink-0">Concluir</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 text-xs text-[#94a3b8] text-center">
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
        Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
      </div>
    </div>
  );
}
