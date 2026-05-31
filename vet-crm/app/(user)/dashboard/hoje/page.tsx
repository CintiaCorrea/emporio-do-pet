"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LuCircleCheck, LuMessageSquare, LuRefreshCcw, LuUserPlus, LuBuilding2,
  LuCake, LuCalendar, LuFlaskConical, LuChevronRight,
} from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { normalizeRole, AppRole, roleShort } from "@/lib/ui/role";

interface HojeData {
  retornosVencidos: { id: string }[];
  toques: { id: string }[];
  tutoresAcompanhar: number;
  examesAEntregar: number;
  pacotesEmRisco: number;
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
  const role: AppRole = normalizeRole(session?.user?.role);
  const userName = session?.user?.name || "Usuário";
  const today = new Date();

  usePageTitle("Hoje", `Seu dia · ${userName} · ${fmtDate(today)}`);

  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/hoje");
      const d = await safeJson<HojeData | null>(res, null);
      setData(d);
      setLoading(false);
    })();
  }, []);

  const all: Pendencia[] = useMemo(() => {
    if (!data) return [];
    return [
      { key: "confirm", title: "Confirmar agendamentos", sub: "Consultas aguardando confirmação", count: data.retornosVencidos.length, link: "Inbox", href: "/dashboard/inbox", Icon: LuCircleCheck },
      { key: "chat", title: "Responder conversas", sub: "Sem resposta no WhatsApp", count: data.toques.length, link: "Inbox", href: "/dashboard/inbox", Icon: LuMessageSquare },
      { key: "fu", title: "Follow-ups de hoje", sub: "Tutores para retomar contato", count: data.tutoresAcompanhar, link: "Tutores", href: "/dashboard/erp/tutores", Icon: LuRefreshCcw },
      { key: "lead", title: "Leads novos para triar", sub: "Aguardando triagem", count: 0, link: "Leads", href: "/dashboard/crm/leads", Icon: LuUserPlus },
      { key: "intern", title: "Internados para acompanhar", sub: "Pets em observação", count: 0, link: "Internação", href: "/dashboard/erp/internacoes", Icon: LuBuilding2 },
      { key: "exam", title: "Exames a avaliar", sub: "Resultados pendentes", count: data.examesAEntregar, link: "Pets", href: "/dashboard/erp/pets", Icon: LuFlaskConical },
      { key: "agenda", title: "Meus atendimentos de hoje", sub: "Na sua agenda", count: 0, link: "Calendário", href: "/dashboard/calendario", Icon: LuCalendar },
      { key: "birth", title: "Aniversariantes do dia", sub: "Pets que fazem aniversário hoje", count: 0, link: "Parabéns", href: "/dashboard/erp/pets?aniversario=1", Icon: LuCake },
    ];
  }, [data]);

  // Quais pendências mostrar por perfil
  const visibleKeys: Record<AppRole, string[]> = {
    ADMIN:        ["confirm", "chat", "fu", "lead", "intern", "birth"],
    VETERINARIAN: ["agenda", "fu", "exam", "intern", "birth"],
    RECEPTIONIST: ["confirm", "chat", "lead", "fu", "birth"],
  };

  const todo = all.filter((p) => visibleKeys[role].includes(p.key));
  const total = todo.reduce((s, t) => s + t.count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "#014D5E" }}>O que precisa ser feito hoje</h2>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: "#e6f6f8", color: "#009AAC" }}
        >
          {loading ? "carregando..." : `${total} pendências`}
        </span>
        <span className="ml-auto text-[11px] text-[#94a3b8]">Perfil: {roleShort(role)}</span>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Carregando seu dia...</div>
        ) : todo.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Nada pendente aqui hoje. 🎉</div>
        ) : (
          todo.map((p, i) => (
            <Link
              key={p.key}
              href={p.href}
              className="flex items-center gap-3.5 px-[18px] py-[13px] border-b hover:bg-[#e6f6f8]/60 transition cursor-pointer"
              style={{ borderColor: i === todo.length - 1 ? "transparent" : "#e8edf0" }}
            >
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "#e6f6f8", color: "#009AAC" }}>
                <p.Icon size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[#1e293b]">{p.title}</div>
                <div className="text-xs text-[#64748b]">{p.sub}</div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#009AAC] hidden sm:block">{p.link}</span>
              <span
                className="text-[13px] font-bold text-white min-w-[26px] h-6 rounded-xl flex items-center justify-center px-2 flex-shrink-0"
                style={{ background: p.count > 0 ? "linear-gradient(90deg, #009AAC, #00B4C4)" : "#cbd5e1" }}
              >
                {p.count}
              </span>
              <LuChevronRight size={16} className="text-[#94a3b8] flex-shrink-0" />
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 text-xs text-[#94a3b8] text-center">
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link> e no Inbox.
      </div>
    </div>
  );
}
