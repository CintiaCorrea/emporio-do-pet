"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface PageHeader {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

interface Ctx {
  header: PageHeader;
  setHeader: (h: PageHeader) => void;
  setRightSlot: (slot: ReactNode | null) => void;
}

const PageHeaderCtx = createContext<Ctx>({
  header: { title: "" },
  setHeader: () => {},
  setRightSlot: () => {},
});

/**
 * Mapa de rotas -> titulo padrao. Garante que toda pagina tem um titulo
 * mesmo quando ela nao chama `usePageTitle`. Quando a rota muda, o header
 * atualiza automaticamente. Paginas individuais ainda podem sobrescrever
 * via usePageTitle (ex: ficha do tutor com nome dinamico).
 */
const ROUTE_TITLES: Array<{ match: string; exact?: boolean; title: string; subtitle?: string }> = [
  { match: "/dashboard/hoje", exact: true, title: "Hoje", subtitle: "Sua agenda do dia" },
  { match: "/dashboard/dashboard", exact: true, title: "Dashboard", subtitle: "Indicadores e visao geral" },
  { match: "/dashboard/inbox-nativo", exact: true, title: "Inbox Meta", subtitle: "Conversas WhatsApp Business via API Meta" },
  { match: "/dashboard/inbox", exact: true, title: "Inbox BC", subtitle: "Conversas BotConversa com contexto do CRM" },
  { match: "/dashboard/leads", title: "Leads", subtitle: "Potenciais clientes em qualificacao" },
  { match: "/dashboard/tutores", title: "Tutores", subtitle: "Clientes do Emporio do Pet" },
  { match: "/dashboard/pets", title: "Pets", subtitle: "Pacientes" },
  { match: "/dashboard/calendario", title: "Calendario", subtitle: "Agendamentos e visitas" },
  { match: "/dashboard/internacao", title: "Internacao", subtitle: "Pacientes em internacao" },
  { match: "/dashboard/configuracoes", title: "Configuracoes" },
  { match: "/dashboard/perfil", exact: true, title: "Meu perfil" },
  { match: "/dashboard/erp/tutores", title: "Tutores" },
  { match: "/dashboard/erp/pets", title: "Pets" },
  { match: "/dashboard/erp/atendimentos", title: "Atendimentos" },
  { match: "/dashboard/erp/agendamentos", title: "Agendamentos" },
  { match: "/dashboard/erp/leads", title: "Leads" },
  { match: "/dashboard/erp", title: "ERP" },
  { match: "/dashboard", exact: true, title: "Dashboard" },
];

function resolveTitle(pathname: string | null): PageHeader {
  if (!pathname) return { title: "" };
  for (const r of ROUTE_TITLES) {
    if (r.exact && pathname === r.match) {
      return { title: r.title, subtitle: r.subtitle };
    }
  }
  const sorted = [...ROUTE_TITLES].sort((a, b) => b.match.length - a.match.length);
  for (const r of sorted) {
    if (pathname === r.match || pathname.startsWith(r.match + "/")) {
      return { title: r.title, subtitle: r.subtitle };
    }
  }
  return { title: "" };
}

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [header, setHeaderState] = useState<PageHeader>(() => resolveTitle(pathname));

  // Reset header quando rota muda
  useEffect(() => {
    setHeaderState(resolveTitle(pathname));
  }, [pathname]);

  function setHeader(h: PageHeader) {
    setHeaderState(prev => ({ ...prev, ...h }));
  }
  function setRightSlot(slot: ReactNode | null) {
    setHeaderState(prev => ({ ...prev, rightSlot: slot || undefined }));
  }

  return <PageHeaderCtx.Provider value={{ header, setHeader, setRightSlot }}>{children}</PageHeaderCtx.Provider>;
}

export function usePageHeader() {
  return useContext(PageHeaderCtx);
}

/**
 * Use em paginas individuais pra setar titulo customizado (ex: nome do tutor na ficha).
 * Sobrescreve o titulo padrao do mapa de rotas.
 */
export function usePageTitle(title: string, subtitle?: string) {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader({ title, subtitle });
  }, [title, subtitle]);
}

/**
 * Use em paginas que querem renderizar conteudo customizado no canto direito do header global
 * (ex: stats inline no Inbox). Limpa automaticamente quando o componente desmonta.
 */
export function usePageRightSlot(slot: ReactNode | null) {
  const { setRightSlot } = usePageHeader();
  useEffect(() => {
    setRightSlot(slot);
    return () => setRightSlot(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
