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
  usePageTitle(`${saudacao}, ${primeiroNome}`, fmtDate(today));

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
        title: "Tutores a acompanhar",
        sub: "Follow-ups previstos para hoje",
        count: data.tutoresAcompanhar || 0,
        link: "Tutores",
        href: "/dashboard/erp/tutores?fu=hoje",
        Icon: LuHeart,
      },
      {
        key: "exames",
        title: "Exames a entregar",
        sub: "Resultados aguardando envio ao tutor",
        count: data.examesAEntregar || 0,
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
  }, [data]);

  const total = items.reduce((s, t) => s + t.count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "#014D5E" }}>O que precisa de atenção hoje</h2>
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
          items.map((p, i) => (
            <Link
              key={p.key}
              href={p.href}
              className="flex items-center gap-3.5 px-[18px] py-[13px] border-b hover:bg-[#e6f6f8]/60 transition cursor-pointer"
              style={{ borderColor: i === items.length - 1 ? "transparent" : "#e8edf0" }}
            >
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: "#e6f6f8", color: "#009AAC" }}
              >
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
        Métricas e relatórios ficam no <Link href="/dashboard" className="underline">Dashboard</Link>.
        Conversas no <Link href="/dashboard/inbox" className="underline">Inbox</Link>.
      </div>
    </div>
  );
}
