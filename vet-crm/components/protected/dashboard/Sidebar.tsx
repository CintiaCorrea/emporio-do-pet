"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LuSun, LuLayoutDashboard, LuMessageSquare, LuList, LuUsers, LuPawPrint,
  LuCalendar, LuBuilding2, LuSettings, LuChevronLeft, LuChevronRight,
  LuLogOut, LuCircleDollarSign, LuMegaphone, LuUserCog, LuEye,
} from "react-icons/lu";
import { roleLabel, AppRole } from "@/lib/ui/role";
import { useRolePreview } from "@/lib/ui/RolePreview";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: AppRole[];
  badge?: number;
  tag?: { admin?: string; vet?: string; recep?: string };
  exact?: boolean;
};

const NAV: Item[] = [
  { href: "/dashboard/hoje", label: "Hoje", Icon: LuSun, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard", label: "Dashboard", Icon: LuLayoutDashboard, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"], exact: true },
  { href: "/dashboard/inbox", label: "Inbox Recepção", Icon: LuMessageSquare, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/crm/leads", label: "Leads", Icon: LuList, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/dashboard/erp/tutores", label: "Tutores", Icon: LuUsers, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/erp/pets", label: "Pets", Icon: LuPawPrint, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/calendario", label: "Calendário", Icon: LuCalendar, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  {
    href: "/dashboard/erp/internacoes", label: "Internação", Icon: LuBuilding2,
    roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"],
    tag: { admin: "Visualiza", vet: "Edita", recep: "Visualiza" },
  },
  { href: "/dashboard/configuracoes", label: "Configurações", Icon: LuSettings, roles: ["ADMIN"] },
];

const FUTURE = [
  { label: "Financeiro", Icon: LuCircleDollarSign, soon: "depois" },
  { label: "RH", Icon: LuUserCog, soon: "depois" },
  { label: "Marketing", Icon: LuMegaphone, soon: "integrado" },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const collapsed = !isOpen;
  const pathname = usePathname();
  const { data: session } = useSession();
  const { realRole, effectiveRole, isPreviewing, preview, setPreview } = useRolePreview();
  const role = effectiveRole;
  const userName = session?.user?.name || "Usuário";
  const initials = ((userName.split(/\s+/)[0]?.[0] || "") + (userName.split(/\s+/)[1]?.[0] || "")).toUpperCase() || "??";

  const isActive = (it: Item) => it.exact ? pathname === it.href : pathname.startsWith(it.href);
  const visible = (it: Item) => it.roles.includes(role);
  const tagFor = (it: Item) => {
    if (!it.tag) return null;
    return role === "ADMIN" ? it.tag.admin : role === "VETERINARIAN" ? it.tag.vet : it.tag.recep;
  };

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-[252px]"} fixed top-0 left-0 h-screen z-50 shrink-0 transition-all duration-200 bg-white border-r flex flex-col`}
      style={{ borderColor: "#e8edf0" }}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-[22px] -right-[11px] w-[22px] h-[22px] rounded-full bg-white border flex items-center justify-center text-[#94a3b8] z-10 shadow-sm hover:text-[#009AAC] transition"
        style={{ borderColor: "#e8edf0" }}
        title={collapsed ? "Expandir" : "Recolher"}
      >
        {collapsed ? <LuChevronRight size={11} /> : <LuChevronLeft size={11} />}
      </button>

      <div className={`px-4 ${collapsed ? "py-4" : "py-[18px]"} border-b flex items-center justify-center`} style={{ borderColor: "#e8edf0" }}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#009AAC] to-[#014D5E] flex items-center justify-center">
            <LuPawPrint className="text-white" size={18} />
          </div>
        ) : (
          <img src="https://emporiodopet.com.br/wp-content/uploads/2022/04/logo-emporio-do-pet-padrao.png" alt="Empório do Pet" style={{ height: 46, width: "auto" }} />
        )}
      </div>

      {/* Role Preview Switcher — só pra admin real e sidebar expandida */}
      {!collapsed && realRole === "ADMIN" && (
        <div className="px-3 pt-3 pb-1">
          <div className="text-[9.5px] font-bold tracking-[0.7px] text-[#94a3b8] uppercase mb-1.5 px-1 flex items-center gap-1">
            <LuEye size={10} /> Perfil logado (preview)
          </div>
          <div className="flex bg-[#f6f8f9] border rounded-[9px] p-[3px] gap-[2px]" style={{ borderColor: "#e8edf0" }}>
            {(["ADMIN", "VETERINARIAN", "RECEPTIONIST"] as const).map(r => {
              const on = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setPreview(r === "ADMIN" ? null : r)}
                  className="flex-1 text-[11px] font-semibold px-1 py-1.5 rounded-[7px] transition"
                  style={
                    on
                      ? { background: "linear-gradient(90deg,#009AAC,#00B4C4)", color: "#fff", boxShadow: "0 2px 6px -1px rgba(0,154,172,.4)" }
                      : { color: "#64748b" }
                  }
                >
                  {r === "ADMIN" ? "Admin" : r === "VETERINARIAN" ? "Vet" : "Recepção"}
                </button>
              );
            })}
          </div>
          {isPreviewing && (
            <div className="mt-1.5 text-[10px] text-[#d97706] bg-[#fffbeb] border border-[#fde68a] rounded-md px-2 py-1 flex items-center gap-1">
              <span>👁</span>
              <span>Modo preview · {roleLabel(role)}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto">
        <div className="flex flex-col gap-[2px]">
          {NAV.filter(visible).map((it) => {
            const active = isActive(it);
            const tag = tagFor(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                title={collapsed ? it.label : undefined}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-[9px] rounded-[9px] text-[13.5px] transition relative`}
                style={
                  active
                    ? { background: "linear-gradient(90deg, #009AAC, #00B4C4)", color: "#FFFFFF", fontWeight: 600, boxShadow: "0 4px 12px -2px rgba(0,154,172,.45)" }
                    : { color: "#475569" }
                }
              >
                <it.Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge !== undefined && it.badge > 0 && (
                      <span
                        className="text-[10.5px] font-semibold rounded-full px-1.5 min-w-[20px] h-[18px] flex items-center justify-center"
                        style={{ background: active ? "white" : "#ef4444", color: active ? "#ef4444" : "white" }}
                      >
                        {it.badge}
                      </span>
                    )}
                    {tag && (
                      <span
                        className="text-[9px] font-bold tracking-wide px-1.5 py-[2px] rounded-[6px] uppercase"
                        style={
                          active
                            ? { background: "rgba(255,255,255,.25)", color: "white" }
                            : { background: "#eef2f4", color: "#64748b" }
                        }
                      >
                        {tag}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-2 mx-1 pt-[10px]" style={{ borderTop: "1px dashed #e8edf0" }}>
            <div className="text-[10px] font-bold tracking-[0.8px] text-[#94a3b8] uppercase px-3 py-1.5">
              Módulos · em breve
            </div>
            {FUTURE.map((f) => (
              <div key={f.label} className="flex items-center gap-3 px-3 py-2 rounded-[9px] text-[#b6c1c9] text-[13px] cursor-not-allowed">
                <f.Icon size={17} />
                <span className="flex-1">{f.label}</span>
                <span className="text-[8.5px] font-bold tracking-wide bg-[#f1f5f7] text-[#94a3b8] px-1.5 py-[2px] rounded-[6px] uppercase">{f.soon}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className={`border-t ${collapsed ? "px-2 py-3" : "px-4 py-3"} flex flex-col gap-2.5`} style={{ borderColor: "#e8edf0" }}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-[10px]"}`}>
          <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0" title={userName}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[12.5px] text-[#1e293b] font-semibold truncate">{userName}</span>
              <span className="text-[11px] text-[#94a3b8]">
                {roleLabel(role)}{isPreviewing && <span className="text-[#d97706]"> · preview</span>}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} text-[#64748b] hover:text-[#ef4444] text-[12.5px]`}
          title={collapsed ? "Sair" : undefined}
        >
          <LuLogOut size={15} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
