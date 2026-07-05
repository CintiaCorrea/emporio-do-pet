"use client";
// [EMP-COWORK] label do menu Tutores -> Clientes (Cintia 06/06). Rota /tutores inalterada.
// [EMP-COWORK] grupos recolhíveis Financeiro + Marketing (Cintia 07/06).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuPawPrint, LuChevronLeft, LuChevronRight, LuChevronDown, LuEye,
} from "react-icons/lu";
import { roleLabel, roleShort, AppRole } from "@/lib/ui/role";
import { LOCKED_KEYS } from "@/lib/permissions";
import { usePermissions } from "@/lib/permissions/context";
import { useRolePreview } from "@/lib/ui/RolePreview";
import { useSession } from "next-auth/react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

type Section = "DIA" | "GESTAO" | "CRESCIMENTO" | "SISTEMA";
const ALL: AppRole[] = ["ADMIN", "VETERINARIAN", "RECEPTIONIST"];

type Item = {
  href: string;
  label: string;
  emoji: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  roles: AppRole[];
  badge?: number;
  tag?: { admin?: string; vet?: string; recep?: string };
  exact?: boolean;
  section?: Section;
};

type Group = {
  group: true;
  key: string;
  label: string;
  emoji: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  roles: AppRole[];
  children: Item[];
  section?: Section;
};

type Entry = Item | Group;
const isGroup = (e: Entry): e is Group => (e as Group).group === true;

const NAV: Entry[] = [
  // ───────── DIA A DIA ─────────
  { href: "/dashboard/hoje", label: "Hoje", emoji: "✨", roles: ALL, section: "DIA" },
  { href: "/dashboard", label: "Painel", emoji: "📊", roles: ALL, exact: true, section: "DIA" },
  { href: "/dashboard/inbox", label: "Inbox BC", emoji: "💬", roles: ALL, section: "DIA" },
  { href: "/dashboard/inbox-nativo", label: "Inbox Meta", emoji: "📲", roles: ALL, section: "DIA" },
  { href: "/dashboard/comercial", label: "Comercial", emoji: "🎯", roles: ["ADMIN", "RECEPTIONIST"], section: "DIA" },
  { href: "/dashboard/erp/tutores", label: "Clientes", emoji: "👥", roles: ALL, section: "DIA" },
  // LIXEIRA-PETS-MENU (Cintia 22/06): aba "Pets" removida do menu. Edicao do pet centralizada na ficha de Cliente; ficha clinica acessivel pelo nome do pet na lista de Clientes. Restaurar = descomentar a linha abaixo.
  // { href: "/dashboard/erp/pets", label: "Pets", emoji: "🐾", roles: ALL },
  { href: "/dashboard/erp/agendamentos/agenda", label: "Agenda", emoji: "📅", roles: ALL, section: "DIA" },
  { href: "/dashboard/erp/vacinacao", label: "Vacinação", emoji: "💉", roles: ALL, section: "DIA" },
  { href: "/dashboard/erp/aniversarios", label: "Aniversários", emoji: "🎂", roles: ALL, section: "DIA" },
  {
    group: true, key: "clinico", label: "Atendimento clínico", emoji: "🩺", roles: ALL, section: "DIA",
    children: [
      { href: "/dashboard/erp/consultas", label: "Consultas", emoji: "🩺", roles: ALL },
      { href: "/dashboard/erp/documentos", label: "Documentos", emoji: "📄", roles: ALL },
      { href: "/dashboard/erp/tratamentos", label: "Tratamentos", emoji: "💉", roles: ALL },
    ],
  },
  { href: "/dashboard/erp/internacoes", label: "Internação", emoji: "🏥", roles: ALL, section: "DIA" },

  // ───────── GESTÃO ─────────
  {
    group: true, key: "vendas", label: "Vendas", emoji: "💰", roles: ALL, section: "GESTAO",
    children: [
      { href: "/dashboard/erp/comandas", label: "Em atendimento", emoji: "🛎️", roles: ALL },
      { href: "/dashboard/erp/ponto-de-venda", label: "Ponto de venda", emoji: "🛒", roles: ALL },
      { href: "/dashboard/erp/caixa", label: "Caixa", emoji: "💵", roles: ALL },
      { href: "/dashboard/erp/pacotes", label: "Pacotes", emoji: "📦", roles: ALL },
      { href: "/dashboard/erp/recebimentos", label: "Recebimentos", emoji: "🧾", roles: ALL },
      { href: "/dashboard/erp/movimentos-caixa", label: "Movimentos de caixa", emoji: "🔄", roles: ALL },
      { href: "/dashboard/erp/saldo-clientes", label: "Saldo dos clientes", emoji: "👛", roles: ALL },
      { href: "/dashboard/erp/formas-recebimento", label: "Formas de recebimento", emoji: "💳", roles: ["ADMIN"] },
      { href: "/dashboard/erp/configuracoes-vendas", label: "Configuração de vendas", emoji: "⚙️", roles: ["ADMIN"] },
      { href: "/dashboard/erp/modelos-orcamento", label: "Modelo de orçamento", emoji: "📄", roles: ALL },
      { href: "/dashboard/erp/modelo-demonstrativo", label: "Modelo de demonstrativo", emoji: "🧾", roles: ["ADMIN"] },
      { href: "/dashboard/erp/importar-vendas", label: "Importar vendas", emoji: "📥", roles: ["ADMIN"] },
    ],
  },
  { href: "/dashboard/erp/comissoes", label: "Comissionamento", emoji: "🧾", roles: ["ADMIN"], section: "GESTAO" },
  {
    group: true, key: "inteligencia", label: "Inteligência", emoji: "💡", roles: ALL, section: "GESTAO",
    children: [
      { href: "/dashboard/erp/minhas-vendas", label: "Produtividade", emoji: "📈", roles: ALL },
      { href: "/dashboard/erp/consulta-vendas", label: "Consulta de vendas", emoji: "🧾", roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/erp/ranking-clientes", label: "Ranking de clientes", emoji: "🏆", roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/erp/vendas-graficos", label: "Vendas — gráficos", emoji: "📊", roles: ["ADMIN", "RECEPTIONIST"] },
    ],
  },
  {
    group: true, key: "estoque", label: "Estoque e serviços", emoji: "📦", roles: ALL, section: "GESTAO",
    children: [
      { href: "/dashboard/erp/produtos", label: "Produtos", emoji: "📦", roles: ALL },
      { href: "/dashboard/erp/servicos", label: "Serviços", emoji: "🏷️", roles: ALL },
      { href: "/dashboard/erp/estoque", label: "Estoque", emoji: "📊", roles: ALL },
      { href: "/dashboard/erp/lista-precos", label: "Lista de preços", emoji: "💲", roles: ALL },
    ],
  },
  {
    group: true, key: "financeiro", label: "Financeiro", emoji: "💵", roles: ["ADMIN"], section: "GESTAO",
    children: [
      { href: "/dashboard/erp/financeiro", label: "Financeiro", emoji: "💵", roles: ["ADMIN"] },
      { href: "/dashboard/erp/financeiro-terceiros", label: "Fin. Terceiros", emoji: "💸", roles: ["ADMIN"] },
    ],
  },

  // ───────── CRESCIMENTO ─────────
  {
    group: true, key: "marketing", label: "Marketing", emoji: "📣", roles: ["ADMIN"], section: "CRESCIMENTO",
    children: [
      { href: "/dashboard/marketing/funil-semana", label: "Funil Semana", emoji: "📊", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/google-ads", label: "Google Ads", emoji: "🔍", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/meta-ads", label: "Meta Ads", emoji: "📣", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/nps", label: "NPS", emoji: "⭐", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/avaliacoes-google", label: "Aval. Google", emoji: "🌟", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/campanhas", label: "Campanhas", emoji: "🎯", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/midia", label: "Mídia", emoji: "🎬", roles: ["ADMIN"] },
      { href: "/dashboard/marketing/emails", label: "Emails", emoji: "✉️", roles: ["ADMIN"] },
    ],
  },
  {
    group: true, key: "ia", label: "IA / Atendimento", emoji: "🤖", roles: ["ADMIN"], section: "CRESCIMENTO",
    children: [
      { href: "/dashboard/ai-agents/agents", label: "Agentes", emoji: "🤖", roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/conhecimento", label: "Conhecimento", emoji: "📚", roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/automacoes", label: "Automações", emoji: "⚡", roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/conexoes", label: "Conexões", emoji: "🔌", roles: ["ADMIN"] },
      { href: "/dashboard/ai-agents/templates", label: "Templates", emoji: "📋", roles: ["ADMIN"] },
    ],
  },

  // ───────── SISTEMA ─────────
  {
    group: true, key: "cadastros", label: "Cadastros", emoji: "📁", roles: ["ADMIN", "RECEPTIONIST"], section: "SISTEMA",
    children: [
      { href: "/dashboard/erp/contatos", label: "Contatos", emoji: "📇", roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/erp/duplicados", label: "Duplicados", emoji: "🔀", roles: ["ADMIN"] },
      { href: "/dashboard/configuracoes/listas", label: "Listas (pelagem, marca…)", emoji: "🎨", roles: ["ADMIN"] },
      { href: "/dashboard/configuracoes/racas", label: "Raças", emoji: "🐾", roles: ["ADMIN"] },
      { href: "/dashboard/configuracoes/exames", label: "Exames", emoji: "🔬", roles: ["ADMIN"] },
      { href: "/dashboard/configuracoes/modelos-receita", label: "Modelo de receita", emoji: "💊", roles: ["ADMIN"] },
      { href: "/dashboard/configuracoes/modelos-documento", label: "Modelo de documento", emoji: "📄", roles: ["ADMIN"] },
    ],
  },
  { href: "/dashboard/erp/logs", label: "Log de auditoria", emoji: "🔎", roles: ["ADMIN"], section: "SISTEMA" },
  { href: "/dashboard/erp/dados-clinica", label: "Dados da clínica", emoji: "🏢", roles: ["ADMIN"], section: "SISTEMA" },
  { href: "/dashboard/configuracoes", label: "Configuração", emoji: "⚙️", roles: ["ADMIN"], section: "SISTEMA" },
];

const FUTURE = [
  { label: "RH", emoji: "🧑‍💼", soon: "depois" },
  { label: "Academia", emoji: "🎓", soon: "depois" },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const collapsed = !isOpen;
  const pathname = usePathname();
  const { realRole, effectiveRole, isPreviewing, setPreview } = useRolePreview();
  const { data: __session } = useSession();
  const meId = (__session as any)?.user?.id as string | undefined;
  const role = effectiveRole;
  const userName = (__session?.user?.name as string | undefined) || "";
  const userInitials = userName
    ? userName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")
    : "";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [internasUnread, setInternasUnread] = useState(0);
  const [encfilaUnread, setEncfilaUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/internal-notes", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.notes || d.data || []);
        if (alive) setInternasUnread(arr.filter((x: any) => x.toUserId === meId && !x.readAt).length);
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    const onChanged = () => load();
    window.addEventListener("internas:changed", onChanged);
    return () => { alive = false; clearInterval(id); window.removeEventListener("internas:changed", onChanged); };
  }, [pathname, meId]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/listas?lista=encfila", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        const n = arr.map((it: any) => { try { return JSON.parse(it.valor); } catch { return null; } })
          .filter((x: any) => x && x.toUserId === meId && x.status === "PENDENTE").length;
        if (alive) setEncfilaUnread(n);
      } catch {}
    };
    load();
    const id = setInterval(load, 15000);
    const onCh = () => load();
    window.addEventListener("encfila:changed", onCh);
    return () => { alive = false; clearInterval(id); window.removeEventListener("encfila:changed", onCh); };
  }, [pathname, meId]);

  // Fase B/C: nível de cada tela p/ o perfil atual (via contexto compartilhado)
  const { nivel: permNivel } = usePermissions();

  const isActive = (it: Item) => {
    if (it.exact) return pathname === it.href;
    return pathname === it.href || pathname.startsWith(it.href + "/");
  };
  const permHidden = (href: string) => !LOCKED_KEYS.includes(href) && permNivel(href) === "OCULTO";
  const visible = (it: Item) => it.roles.includes(role) && !permHidden(it.href);
  const tagFor = (it: Item) => {
    if (!it.tag) return null;
    return role === "ADMIN" ? it.tag.admin : role === "VETERINARIAN" ? it.tag.vet : it.tag.recep;
  };

  const renderLink = (it: Item, indented = false) => {
    const active = isActive(it);
    const tag = tagFor(it);
    const badge = it.href === "/dashboard/inbox-nativo" ? internasUnread : it.href === "/dashboard/hoje" ? encfilaUnread : (it.badge ?? 0);
    return (
      <Link
        key={it.href}
        href={it.href}
        title={collapsed ? it.label : undefined}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-[9px] rounded-[9px] ${indented ? "text-[12.5px]" : "text-[13.5px]"} transition relative`}
        style={
          active
            ? { background: "#E0F4F6", color: "#014D5E", fontWeight: 500 }
            : { color: "#5C6B70" }
        }
      >
        <span className={`${indented ? "text-[14px]" : "text-[16px]"} leading-none flex-shrink-0 w-[18px] text-center`}>{it.emoji}</span>
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
                    ? { background: "rgba(1,77,94,.12)", color: "#014D5E" }
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

  const renderEntry = (entry: Entry) => {
    if (!isGroup(entry)) return visible(entry) ? renderLink(entry) : null;

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
          style={{ color: childActive ? "#014D5E" : "#5C6B70", fontWeight: childActive ? 600 : 500 }}
        >
          <span className="text-[16px] leading-none flex-shrink-0 w-[18px] text-center">{entry.emoji}</span>
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
  };

  const SECTIONS: { key: Section; label: string }[] = [
    { key: "DIA", label: "Dia a dia" },
    { key: "GESTAO", label: "Gestão" },
    { key: "CRESCIMENTO", label: "Crescimento" },
    { key: "SISTEMA", label: "Sistema" },
  ];
  const sectionLabelCls = "text-[9.5px] font-bold tracking-wide text-[#8A989D] uppercase px-3 py-1.5";

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
          {SECTIONS.map((sec, i) => {
            const entries = NAV.filter((e) => e.section === sec.key);
            return (
              <div key={sec.key} className="flex flex-col gap-[2px]">
                {!collapsed && <div className={`${sectionLabelCls}${i > 0 ? " mt-2" : ""}`}>{sec.label}</div>}
                {entries.map((entry) => renderEntry(entry))}
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
                <span className="text-[16px] leading-none flex-shrink-0 w-[18px] text-center">{f.emoji}</span>
                <span className="flex-1">{f.label}</span>
                <span className="text-[8.5px] font-bold tracking-wide bg-[#f1f5f7] text-[#94a3b8] px-1.5 py-[2px] rounded-[6px] uppercase">{f.soon}</span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Rodapé: usuário logado + Ajuda */}
      <div className={`border-t ${collapsed ? "px-2 py-3" : "px-3 py-3"}`} style={{ borderColor: "#e8edf0" }}>
        {!collapsed && userName && (
          <div className="flex items-center gap-2.5 px-2 pb-2 mb-1.5" style={{ borderBottom: "1px dashed #e8edf0" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-white"
              style={{ background: "#014D5E" }}
            >
              {userInitials}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[12px] font-medium text-[#014D5E] truncate">{userName}</span>
              <span className="text-[9px] text-[#8A989D]">{roleShort(realRole)}</span>
            </div>
          </div>
        )}
        <Link
          href="/dashboard/ajuda"
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} px-3 py-2 rounded-[9px] text-[12.5px] text-[#64748b] hover:bg-[#f6f8f9] transition`}
          title={collapsed ? "Ajuda" : undefined}
        >
          <span className="text-[15px] leading-none flex-shrink-0 w-[18px] text-center">❓</span>
          {!collapsed && <span>Ajuda</span>}
        </Link>
      </div>
    </aside>
  );
}
