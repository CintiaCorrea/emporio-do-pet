"use client";
// [EMP-COWORK] label do menu Tutores -> Clientes (Cintia 06/06). Rota /tutores inalterada.
// [EMP-COWORK] grupos recolhíveis Financeiro + Marketing (Cintia 07/06).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuSun, LuLayoutDashboard, LuMessageSquare, LuList, LuUsers, LuPawPrint,
  LuCalendar, LuBuilding2, LuSettings, LuChevronLeft, LuChevronRight, LuChevronDown,
  LuCircleDollarSign, LuMegaphone, LuUserCog, LuEye, LuCircleHelp, LuStar,
  LuSparkles, LuFileText, LuRefreshCcw, LuExternalLink,
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

type Group = {
  group: true;
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: AppRole[];
  children: Item[];
};

type Entry = Item | Group;
const isGroup = (e: Entry): e is Group => (e as Group).group === true;

const NAV: Entry[] = [
  { href: "/dashboard/hoje", label: "Hoje", Icon: LuSun, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard", label: "Dashboard", Icon: LuLayoutDashboard, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"], exact: true },
  { href: "/dashboard/inbox", label: "Inbox BC", Icon: LuMessageSquare, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/inbox-nativo", label: "Inbox Meta", Icon: LuMessageSquare, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/crm/leads", label: "Leads", Icon: LuList, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/dashboard/erp/tutores", label: "Clientes", Icon: LuUsers, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/erp/pets", label: "Pets", Icon: LuPawPrint, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  { href: "/dashboard/erp/agendamentos/clinico", label: "Calendário", Icon: LuCalendar, roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"] },
  {
    href: "/dashboard/erp/internacoes", label: "Internação", Icon: LuBuilding2,
    roles: ["ADMIN", "VETERINARIAN", "RECEPTIONIST"],
  },
  {
    group: true, key: "financeiro", label: "Financeiro", Icon: LuCircleDollarSign, roles: ["ADMIN"],
    children: [
      { href: "/dashboard/erp/financeiro-terceiros", label: "Fin. Terceiros", Icon: LuCircleDollarSign, roles: ["ADMIN"] },
    ],
  },
  {
    group: true, key: "marketing", label: "Marketing", Icon: LuMegaphone, roles: ["ADMIN"],
    children: [
      { href: "/dashboard/marketing/funil-semana", label: "Funil Semana", Icon: LuList, roles: ["ADMIN"] },
      { href: "/dashboard/marketing/nps", label: "NPS", Icon: LuStar, roles: ["ADMIN"] },
      { href: "/dashboard/marketing/avaliacoes-google", label: "Aval. Google", Icon: LuStar, roles: ["ADMIN"] },
      { href: "/dashboard/marketing/campanhas", label: "Campanhas", Icon: LuMegaphone, roles: ["ADMIN"] },
      { href: "/dashboard/marketing/midia", label: "Mídia", Icon: LuCircleDollarSign, roles: ["ADMIN"] },
      { href: "/dashboard/marketing/emails", label: "Emails", Icon: LuMessageSquare, roles: ["ADMIN"] },
    ],
  },
  {
    group: true, key: "ia", label: "IA / Atendimento", Icon: LuSparkles, roles: ["ADMIN"],
    children: [
      { href: "/dashboard/ai-agents/agents", label: "Agentes", Icon: LuSparkles, roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/conhecimento", label: "Conhecimento", Icon: LuFileText, roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/automacoes", label: "Automações", Icon: LuRefreshCcw, roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/conexoes", label: "Conexões", Icon: LuExternalLink, roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/templates", label: "Templates", Icon: LuList, roles: ["ADMIN"] },
    ],
  },
  { href: "/dashboard/configuracoes", label: "Configurações", Icon: LuSettings, roles: ["ADMIN"] },
];

const FUTURE = [
  { label: "RH", Icon: LuUserCog, soon: "depois" },
  { label: "Academia", Icon: LuLayoutDashboard, soon: "depois" },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const collapsed = !isOpen;
  const pathname = usePathname();
  const { realRole, effectiveRole, isPreviewing, setPreview } = useRolePreview();
  const role = effectiveRole;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [internasUnread, setInternasUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/internal-notes", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.notes || d.data || []);
        if (alive) setInternasUnread(arr.filter((x: any) => !x.readAt).length);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [pathname]);

  const isActive = (it: Item) => {
    if (it.exact) return pathname === it.href;
    return pathname === it.href || pathname.startsWith(it.href + "/");
  };
  const visible = (it: Item) => it.roles.includes(role);
  const tagFor = (it: Item) => {
    if (!it.tag) return null;
    return role === "ADMIN" ? it.tag.admin : role === "VETERINARIAN" ? it.tag.vet : it.tag.recep;
  };

  const renderLink = (it: Item, indented = false) => {
    const active = isActive(it);
    const tag = tagFor(it);
    const badge = it.href === "/dashboard/inbox-nativo" ? internasUnread : (it.badge ?? 0);
    return (
      <Link
        key={it.href}
        href={it.href}
        title={collapsed ? it.label : undefined}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-[9px] rounded-[9px] ${indented ? "text-[12.5px]" : "text-[13.5px]"} transition relative`}
        style={
          active
            ? { background: "linear-gradient(90deg, #009AAC, #00B4C4)", color: "#FFFFFF", fontWeight: 600, boxShadow: "0 4px 12px -2px rgba(0,154,172,.45)" }
            : { color: "#475569" }
        }
      >
        <it.Icon size={indented ? 16 : 18} className="flex-shrink-0" />
        {collapsed && badge > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: it.href === "/dashboard/inbox-nativo" ? "#EAB308" : "#E24B4A" }} />
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{it.label}</span>
            {badge > 0 && (
              <span
                className="text-[10.5px] font-semibold rounded-full px-1.5 min-w-[20px] h-[18px] flex items-center justify-center"
                style={{ background: active ? "white" : (it.href === "/dashboard/inbox-nativo" ? "#EAB308" : "#ef4444"), color: active ? (it.href === "/dashboard/inbox-nativo" ? "#A16207" : "#ef4444") : "white" }}
              >
                {badge}
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
          {NAV.map((entry) => {
            if (!isGroup(entry)) return renderLink(entry);

            const kids = entry.children.filter(visible);
            if (kids.length === 0) return null;

            // recolhido: mostra os filhos como ícones soltos
            if (collapsed) return <div key={entry.key} className="flex flex-col gap-[2px]">{kids.map((it) => renderLink(it))}</div>;

            const childActive = kids.some(isActive);
            const open = openGroups[entry.key] ?? childActive;
            return (
              <div key={entry.key}>
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [entry.key]: !(s[entry.key] ?? childActive) }))}
                  className="flex items-center gap-3 w-full px-3 py-[9px] rounded-[9px] text-[13.5px] transition"
                  style={{ color: childActive ? "#0E2244" : "#475569", fontWeight: childActive ? 600 : 500 }}
                >
                  <entry.Icon size={18} className="flex-shrink-0" />
                  <span className="flex-1 truncate text-left">{entry.label}</span>
                  {open ? <LuChevronDown size={14} className="text-[#94a3b8]" /> : <LuChevronRight size={14} className="text-[#94a3b8]" />}
                </button>
                {open && (
                  <div className="flex flex-col gap-[2px] mt-[2px] ml-[15px] pl-[11px]" style={{ borderLeft: "1px solid #eef2f4" }}>
                    {kids.map((it) => renderLink(it, true))}
                  </div>
                )}
              </div>
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

      {/* Rodapé enxuto: só Ajuda */}
      <div className={`border-t ${collapsed ? "px-2 py-3" : "px-3 py-3"}`} style={{ borderColor: "#e8edf0" }}>
        <Link
          href="/dashboard/ajuda"
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-3 py-2 rounded-[9px] text-[12.5px] text-[#64748b] hover:bg-[#f6f8f9] transition`}
          title={collapsed ? "Ajuda" : undefined}
        >
          <LuCircleHelp size={15} />
          {!collapsed && <span>Ajuda</span>}
        </Link>
      </div>
    </aside>
  );
}
