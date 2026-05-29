"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LuHouse,
  LuLayoutDashboard,
  LuInbox,
  LuList,
  LuUsers,
  LuCalendar,
  LuBedDouble,
  LuSettings,
  LuMegaphone,
  LuTruck,
  LuShieldCheck,
  LuChevronDown,
  LuChevronRight,
  LuLogOut,
  LuMessageSquare,
} from "react-icons/lu";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const EmporioLogo = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
    {/* Logo SVG inline: círculo turquesa com paw print marinho */}
    <svg width={collapsed ? 32 : 38} height={collapsed ? 32 : 38} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18.5" fill="white" stroke="#009AAC" strokeWidth="1.5" />
      <path
        d="M14 18.5c0 1.4-1.1 2.5-2.5 2.5S9 19.9 9 18.5 10.1 16 11.5 16s2.5 1.1 2.5 2.5zm17 0c0 1.4-1.1 2.5-2.5 2.5S26 19.9 26 18.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5zM17 14c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zm12 0c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zm-9 16c-3.5 0-7-2-7-5.5 0-2.5 2.5-4.5 7-4.5s7 2 7 4.5c0 3.5-3.5 5.5-7 5.5z"
        fill="#0E2244"
      />
    </svg>
    {!collapsed && (
      <div className="leading-tight">
        <div className="text-[11px] font-semibold tracking-wider text-[#0E2244]">EMPÓRIO</div>
        <div className="text-[11px] font-semibold tracking-wider text-[#0E2244]">DO PET</div>
      </div>
    )}
  </div>
);

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  exact?: boolean;
  collapsed?: boolean;
}

const NavItem = ({ href, icon: Icon, label, badge, exact, collapsed }: NavItemProps) => {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
        active
          ? "bg-[#009AAC] text-white font-medium"
          : "text-[#4d5a66] hover:bg-[#FBF0DD]"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-[#E24B4A] text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

interface SubMenuProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: { href: string; label: string }[];
  collapsed?: boolean;
}

const SubMenu = ({ icon: Icon, label, children, collapsed }: SubMenuProps) => {
  const pathname = usePathname();
  const hasActiveChild = children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(hasActiveChild);

  if (collapsed) {
    return (
      <button
        title={label}
        className="w-full flex justify-center px-3 py-2.5 text-[#4d5a66] hover:bg-[#FBF0DD] rounded-lg mb-0.5 transition-colors"
      >
        <Icon className="w-[18px] h-[18px]" />
      </button>
    );
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          hasActiveChild ? "bg-[#FBF0DD] text-[#0E2244]" : "text-[#4d5a66] hover:bg-[#FBF0DD]"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Icon className="w-[18px] h-[18px]" />
          {label}
        </span>
        {open ? (
          <LuChevronDown className="w-4 h-4" />
        ) : (
          <LuChevronRight className="w-4 h-4" />
        )}
      </button>
      {open && (
        <div className="ml-5 mt-1 mb-1 pl-3 border-l border-[#e8dfc8]">
          {children.map((c) => {
            const childActive = pathname === c.href;
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`block py-1.5 px-3 text-sm rounded-md mb-0.5 transition-colors ${
                  childActive
                    ? "bg-[#FBEED8] text-[#8a6313] font-medium"
                    : "text-[#5b6470] hover:bg-[#FBF0DD]"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const collapsed = !isOpen;
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuário";
  const userEmail = session?.user?.email || "";
  const getInitials = (name: string) => {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "??";
  };

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } fixed top-0 left-0 h-screen z-50 shrink-0 transition-all duration-200 bg-[#FFFEF8] border-r border-[#e8dfc8] flex flex-col`}
    >
      <div className="px-3 py-4 flex items-center justify-between">
        <EmporioLogo collapsed={collapsed} />
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="text-[#4d5a66] hover:bg-[#FBF0DD] p-1 rounded"
            aria-label="Fechar sidebar"
          >
            ←
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto mb-2 text-[#4d5a66] hover:bg-[#FBF0DD] p-1 rounded"
          aria-label="Abrir sidebar"
        >
          →
        </button>
      )}

      <nav className="flex-1 px-2 pb-3 overflow-y-auto">
        <NavItem href="/dashboard/hoje" icon={LuHouse} label="Hoje" collapsed={collapsed} />
        <NavItem
          href="/dashboard"
          icon={LuLayoutDashboard}
          label="Dashboard"
          exact
          collapsed={collapsed}
        />
        <NavItem
          href="/dashboard/inbox"
          icon={LuInbox}
          label="Inbox"
          collapsed={collapsed}
        />
        <NavItem href="/dashboard/crm/leads" icon={LuList} label="Leads" collapsed={collapsed} />
        <NavItem
          href="/dashboard/erp/tutores"
          icon={LuUsers}
          label="Clientes"
          collapsed={collapsed}
        />
        <NavItem
          href="/dashboard/calendario"
          icon={LuCalendar}
          label="Calendário"
          collapsed={collapsed}
        />
        <NavItem
          href="/dashboard/erp/internacoes"
          icon={LuBedDouble}
          label="Internações"
          collapsed={collapsed}
        />
        <NavItem
          href="/dashboard/configuracoes"
          icon={LuSettings}
          label="Configurações"
          collapsed={collapsed}
        />

        <div className={`mt-4 ${collapsed ? "px-0" : "px-3"} pb-1`}>
          {!collapsed && (
            <div className="text-[10px] tracking-[1.5px] text-[#8a7a5a] font-medium">ADMIN</div>
          )}
        </div>

        <SubMenu
          icon={LuMegaphone}
          label="Marketing"
          collapsed={collapsed}
          children={[
            { href: "/dashboard/campanhas", label: "Campanhas" },
            { href: "/dashboard/campanhas/midia", label: "Mídia" },
            { href: "/dashboard/campanhas/funil-semana", label: "Funil Semana" },
            { href: "/dashboard/campanhas/nps", label: "NPS" },
            { href: "/dashboard/campanhas/avaliacoes-google", label: "Aval. Google" },
            { href: "/dashboard/campanhas/email", label: "Emails" },
          ]}
        />

        <SubMenu
          icon={LuTruck}
          label="Op. Terceiros"
          collapsed={collapsed}
          children={[
            { href: "/dashboard/erp/fornecedores", label: "Fornecedores" },
            { href: "/dashboard/erp/fin-terceiros", label: "Fin. Terceiros" },
            { href: "/dashboard/erp/catalogo-exames", label: "Catál. Exames" },
          ]}
        />

        <SubMenu
          icon={LuShieldCheck}
          label="Equipe"
          collapsed={collapsed}
          children={[
            { href: "/dashboard/profissionais", label: "Profissionais" },
            { href: "/dashboard/usuarios", label: "Equipe & Acesso" },
          ]}
        />
      </nav>

      <div className="px-2 pb-2 border-t border-[#e8dfc8] pt-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#009AAC] to-[#0E2244] text-white flex items-center justify-center text-[11px] font-medium flex-shrink-0">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#0E2244] font-medium truncate">{userName}</div>
              <div className="text-[10px] text-[#888780] truncate">Admin</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#009AAC] to-[#0E2244] text-white flex items-center justify-center text-[11px] font-medium" title={userName}>
              {getInitials(userName)}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-2.5 px-3 py-2 rounded-lg text-xs text-[#4d5a66] hover:bg-[#FBF0DD]`}
          title={collapsed ? "Sair" : undefined}
        >
          <LuLogOut className="w-[16px] h-[16px]" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
