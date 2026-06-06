"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuRefreshCcw, LuPhone, LuPackage, LuHeart,
  LuFlaskConical, LuCake, LuChevronRight,
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
  const userName = session?.user?.name || "Usuário";
  const today = new Date();

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
  const [fuList, setFuList] = useState<any[]>([]);
  const [fuOpen, setFuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/hoje");
      const d = await safeJson<HojeData | null>(res, null);
      setData(d);
      try {
        const [lst, pts, tts, lds] = await Promise.all([
          safeJson<any>(await fetch("/api/listas"), []),
          safeJson<any>(await fetch("/api/pets?limit=1000"), []),
          safeJson<any>(await fetch("/api/tutors?limit=1000"), []),
          safeJson<any>(await fetch("/api/leads?limit=1000"), []),
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
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        const fu: any[] = [];
        for (const t of tutorArr) if (t.proximoFollowupAt && new Date(t.proximoFollowupAt) <= endToday) fu.push({ id: "t" + t.id, tipo: "Cliente", nome: t.name || "Cliente", date: t.proximoFollowupAt, href: `/dashboard/erp/tutores/${t.id}` });
        for (const p of petArr) if (p.proximoFollowupAt && new Date(p.proximoFollowupAt) <= endToday) fu.push({ id: "p" + p.id, tipo: "Pet", nome: p.name || "Pet", date: p.proximoFollowupAt, href: `/dashboard/erp/pets/${p.id}` });
        for (const l of leadArr) if (l.proximoFollowupAt && new Date(l.proximoFollowupAt) <= endToday) fu.push({ id: "l" + l.id, tipo: "Lead", nome: l.name || "Lead", date: l.proximoFollowupAt, href: `/dashboard/crm/leads/${l.id}` });
        fu.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setFuList(fu);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const items: Pendencia[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "retornos",
        title: "Retornos vencidos",
        sub: "Leads sem contato após retorno marcado",
        count: data.retornosVencidos.length,
        link: "Leads",
        href: "/dashboard/crm/leads?atrasados=1",
        Icon: LuRefreshCcw,
      },
      {
        key: "toques",
        title: "Próximos toques de cadência",
        sub: "Mensagens automáticas a disparar",
        count: data.toques.length,
        link: "Leads",
        href: "/dashboard/crm/leads?cadencia=hoje",
        Icon: LuPhone,
      },
      {
        key: "pacotes",
        title: "Pacotes em risco",
        sub: "Próximos do vencimento sem uso",
        count: data.pacotesEmRisco || 0,
        link: "Pacotes",
        href: "/dashboard/erp/pacotes?risco=1",
        Icon: LuPackage,
      },
      {
        key: "tutores",
        title: "Follow-ups de hoje",
        sub: "Clientes, Pets e Leads a acompanhar",
        count: fuList.length,
        link: "Tutores",
        href: "/dashboard/erp/tutores?fu=hoje",
        Icon: LuHeart,
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
        sub: "Pets que fazem aniversário hoje",
        count: data.aniversariantes || 0,
        link: "Parabéns",
        href: "/dashboard/erp/pets?aniversario=1",
        Icon: LuCake,
      },
    ];
  }, [data, examesPend, fuList]);

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
            if (p.key === "tutores") {
              const tcor: Record<string, { bg: string; fg: string }> = { Cliente: { bg: "#E0F4F6", fg: "#00798A" }, Pet: { bg: "#E1F5EE", fg: "#0F6E56" }, Lead: { bg: "#E6F1FB", fg: "#0C447C" } };
              return (
                <div key={p.key}>
                  <div className={rowCls} style={{ borderColor: "#e8edf0" }} onClick={() => setFuOpen(o => !o)}>{inner}</div>
                  {fuOpen && (
                    <div style={{ background: "#f8fafb" }}>
                      {fuList.length === 0 ? (
                        <div className="px-[58px] py-3 text-xs text-[#94a3b8] border-b" style={{ borderColor: "#e8edf0" }}>Nenhum follow-up para hoje.</div>
                      ) : fuList.map((e: any) => (
                        <Link key={e.id} href={e.href} className="flex items-center gap-2 px-[58px] py-2.5 border-b hover:bg-[#e6f6f8]/60 text-xs" style={{ borderColor: "#e8edf0" }}>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: (tcor[e.tipo] || tcor.Cliente).bg, color: (tcor[e.tipo] || tcor.Cliente).fg }}>{e.tipo}</span>
                          <span className="font-medium text-[#1e293b]">{e.nome}</span>
                          <span className="ml-auto text-[#64748b]">{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
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

      <div className="mt-6 text-xs text-[#94a3b8] text-center">
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
        Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
      </div>
    </div>
  );
}
