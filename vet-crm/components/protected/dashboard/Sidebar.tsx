"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {  
  LuLayoutDashboard, 
  LuUsers, 
  LuUser, 
  LuPawPrint, 
  LuBook, 
  LuChartBar,
  LuMail,
  LuSettings,
  LuLogOut,
  LuWorkflow,
  LuCalendar,
  LuPackage,
  LuWrench,
  LuBedDouble,
  LuStethoscope,
  LuWarehouse,
  LuBot,
  LuFileText,
  LuPercent,
  LuDollarSign,
  LuMegaphone,
  LuMessageSquare,
  LuFiles,
  LuZap,
  LuUserPlus,
  LuLightbulb,
  LuDatabase,
  LuChartColumn,
  LuSparkles,
  LuSyringe,
  LuInbox,
  LuUsers } from 'react-icons/lu';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const pathname = usePathname();
  const [aiAgentsOpen, setAiAgentsOpen] = useState(() => pathname.startsWith("/dashboard/ai-agents"));
  const [crmOpen, setCrmOpen] = useState(() => pathname.startsWith("/dashboard/crm"));
  const [erpOpen, setErpOpen] = useState(() => pathname.startsWith("/dashboard/erp"));
  const [campanhasOpen, setCampanhasOpen] = useState(() => pathname.startsWith("/dashboard/campanhas"));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (href: string, { exact = false }: { exact?: boolean } = {}) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const toggleAiAgentsSubmenu = () => {
    setAiAgentsOpen(!aiAgentsOpen);
  };

  const toggleCrmSubmenu = () => {
    setCrmOpen(!crmOpen);
  };

  const toggleCampanhasSubmenu = () => {
    setCampanhasOpen(!campanhasOpen);
  };

  const toggleErpSubmenu = () => {
    setErpOpen(!erpOpen);
  };

  // Versão simplificada usando apenas NextAuth
  const handleLogoutSimple = async () => {
    setIsLoggingOut(true);
    
    try {
      // Limpar localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Fazer logout com NextAuth
      await signOut({ callbackUrl: "/" });
      
    } catch (error) {
      console.error("Erro no logout:", error);
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full bg-[color:var(--sidebar-bg)] backdrop-blur-xl border-r border-[color:var(--sidebar-border)] text-[color:var(--sidebar-text)] transition-all duration-300 z-40 flex flex-col ${
          isOpen ? "w-56 sm:w-64" : "w-12 sm:w-16"
        }`}
      >
        {/* Header com Logo e Botão de Toggle */}
        <div className="h-16 flex items-center justify-between border-b border-[color:var(--sidebar-border)]">
          {isOpen && (
            <div className="flex items-center px-3 sm:px-4">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 mr-2">
                <Image
                  src="/images/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-sm sm:text-base font-semibold truncate">
                Empório do Pet
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`h-full px-3 sm:px-4 hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
              isOpen ? "" : "w-full"
            }`}
            aria-label={isOpen ? "Fechar sidebar" : "Abrir sidebar"}
          >
            {isOpen ? "←" : "→"}
          </button>
        </div>

        {/* Conteúdo da Navegação */}
        <div className="flex-1 overflow-y-auto">
          {isOpen && (
            <nav className="mt-4">
              {/* Menu Dashboard */}
              <Link
                href="/dashboard"
                className={`mx-2 my-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive("/dashboard", { exact: true })
                    ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                    : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                }`}
              >
                <LuLayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>

              {/* Inbox Recepção */}
              <Link
                href="/dashboard/inbox-recepcao"
                className={`mx-2 my-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive("/dashboard/inbox-recepcao")
                    ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                    : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                }`}
              >
                <LuInbox className="w-5 h-5" />
                Inbox Recepção
              </Link>

              {/* Equipe */}
              <Link
                href="/dashboard/usuarios"
                className={`mx-2 my-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive("/dashboard/usuarios")
                    ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                    : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                }`}
              >
                <LuUsers className="w-5 h-5" />
                Equipe
              </Link>

              {/* Menu AI Agents com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleAiAgentsSubmenu}
                  className={`mx-2 my-1 w-[calc(100%-1rem)] flex justify-between items-center px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${
                    isActive("/dashboard/ai-agents")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-text)]"
                      : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  aria-expanded={aiAgentsOpen}
                  aria-controls="ai-agents-submenu"
                >
                  <span className="flex items-center">
                    <LuBot className="mr-3 w-5 h-5" />
                    AI Agents
                  </span>
                  <span
                    className={`transform transition-transform duration-200 ${
                      aiAgentsOpen ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ›
                  </span>
                </button>

                {/* Sub-navegação AI Agents */}
                <div
                  id="ai-agents-submenu"
                  className={`overflow-hidden transition-all duration-200 ${
                    aiAgentsOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <Link
                    href="/dashboard/ai-agents/agents"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/agents")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuBot className="mr-3 w-4 h-4" />
                    Agents
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/conversas"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/conversas")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuMessageSquare className="mr-3 w-4 h-4" />
                    Conversas
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/templates"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/templates")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuFileText className="mr-3 w-4 h-4" />
                    Templates
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/conexoes"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/conexoes")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuSettings className="mr-3 w-4 h-4" />
                    Integrações
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/automacoes"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/automacoes")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuZap className="mr-3 w-4 h-4" />
                    Automações
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/conhecimento"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/ai-agents/conhecimento")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuDatabase className="mr-3 w-4 h-4" />
                    Base de Conhecimento
                  </Link>
                </div>
              </div>

              {/* Menu CRM com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleCrmSubmenu}
                  className={`mx-2 my-1 w-[calc(100%-1rem)] flex justify-between items-center px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${
                    isActive("/dashboard/crm")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-text)]"
                      : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  aria-expanded={crmOpen}
                  aria-controls="crm-submenu"
                >
                  <span className="flex items-center">
                    <LuUsers className="mr-3 w-5 h-5" />
                    CRM
                  </span>
                  <span
                    className={`transform transition-transform duration-200 ${
                      crmOpen ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ›
                  </span>
                </button>

                {/* Sub-navegação CRM */}
                <div
                  id="crm-submenu"
                  className={`overflow-hidden transition-all duration-200 ${
                    crmOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <Link
                    href="/dashboard/crm/leads"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/crm/leads")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuUserPlus className="mr-3 w-4 h-4" />
                    Leads
                  </Link>
                  <Link
                    href="/dashboard/crm/pipelines"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/crm/pipelines")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuWorkflow className="mr-3 w-4 h-4" />
                    Pipelines
                  </Link>
                </div>
              </div>

              {/* Menu ERP com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleErpSubmenu}
                  className={`mx-2 my-1 w-[calc(100%-1rem)] flex justify-between items-center px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${
                    isActive("/dashboard/erp")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-text)]"
                      : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  aria-expanded={erpOpen}
                  aria-controls="erp-submenu"
                >
                  <span className="flex items-center">
                    <LuChartBar className="mr-3 w-5 h-5" />
                    ERP
                  </span>
                  <span
                    className={`transform transition-transform duration-200 ${
                      erpOpen ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ›
                  </span>
                </button>

                {/* Sub-navegação ERP */}
                <div
                  id="erp-submenu"
                  className={`overflow-hidden transition-all duration-200 ${
                    erpOpen ? "max-h-[800px]" : "max-h-0"
                  }`}
                >
                  <Link
                    href="/dashboard/erp/tutores"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/tutores")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuUser className="mr-3 w-4 h-4" /> 
                    Tutores
                  </Link>
                  <Link
                    href="/dashboard/erp/pets"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/pets")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuPawPrint className="mr-3 w-4 h-4" /> 
                    Pets
                  </Link>
                  <Link
                    href="/dashboard/erp/clientes"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/clientes")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuBook className="mr-3 w-4 h-4" /> 
                    Clientes
                  </Link>
                  <Link
                    href="/dashboard/erp/agendamentos"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/agendamentos")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuCalendar className="mr-3 w-4 h-4" /> 
                    Agendamentos
                  </Link>
                  <Link
                    href="/dashboard/erp/consultas"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/consultas")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuStethoscope className="mr-3 w-4 h-4" /> 
                    Consultas
                  </Link>
                  <Link
                    href="/dashboard/erp/tratamentos"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/tratamentos")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuSyringe className="mr-3 w-4 h-4" /> 
                    Tratamentos
                  </Link>
                  <Link
                    href="/dashboard/erp/internacoes"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/internacoes")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuBedDouble className="mr-3 w-4 h-4" /> 
                    Internações
                  </Link>
                  <Link
                    href="/dashboard/erp/servicos"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/servicos")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuWrench className="mr-3 w-4 h-4" /> 
                    Serviços
                  </Link>
                  <Link
                    href="/dashboard/erp/produtos"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/produtos")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuPackage className="mr-3 w-4 h-4" /> 
                    Produtos
                  </Link>
                  <Link
                    href="/dashboard/erp/estoque"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/estoque")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuWarehouse className="mr-3 w-4 h-4" /> 
                    Estoque
                  </Link>
                  <Link
                    href="/dashboard/erp/comissoes"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/comissoes")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuPercent className="mr-3 w-4 h-4" /> 
                    Comissões
                  </Link>
                  <Link
                    href="/dashboard/erp/financeiro"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/erp/financeiro")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuDollarSign className="mr-3 w-4 h-4" /> 
                    Financeiro
                  </Link>
                  <Link
                    href="/dashboard/erp/documentos"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/documentos") || isActive("/dashboard/erp/documentos")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuFiles className="mr-3 w-4 h-4" /> 
                    Documentos
                  </Link>
                </div>
              </div>

              {/* Menu Campanhas com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleCampanhasSubmenu}
                  className={`mx-2 my-1 w-[calc(100%-1rem)] flex justify-between items-center px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${
                    isActive("/dashboard/campanhas")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-text)]"
                      : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  aria-expanded={campanhasOpen}
                  aria-controls="campanhas-submenu"
                >
                  <span className="flex items-center">
                    <LuMegaphone className="mr-3 w-5 h-5" />
                    Campanhas
                  </span>
                  <span
                    className={`transform transition-transform duration-200 ${
                      campanhasOpen ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ›
                  </span>
                </button>

                {/* Sub-navegação Campanhas */}
                <div
                  id="campanhas-submenu"
                  className={`overflow-hidden transition-all duration-200 ${
                    campanhasOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <Link
                    href="/dashboard/campanhas/adsense"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/campanhas/adsense")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuChartColumn className="mr-3 w-4 h-4" />
                    Adsense
                  </Link>
                  <Link
                    href="/dashboard/campanhas/email"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/campanhas/email")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuMail className="mr-3 w-4 h-4" />
                    Email
                  </Link>
                  <Link
                    href="/dashboard/campanhas/whatsapp"
                    className={`mx-2 my-1 flex items-center py-2 pl-10 pr-3 sm:pl-11 sm:pr-4 rounded-xl text-sm sm:text-base border-l-2 transition-all ${
                      isActive("/dashboard/campanhas/whatsapp")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)] border-[color:var(--sidebar-active-border)]"
                        : "text-[color:var(--sidebar-muted)] border-transparent hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)] hover:border-[color:var(--sidebar-active-border)]"
                    }`}
                  >
                    <LuMessageSquare className="mr-3 w-4 h-4" />
                    WhatsApp
                  </Link>
                </div>
              </div>

              {/* Menu Landing Pages */}
              <Link
                href="/dashboard/landing-pages"
                className={`mx-2 my-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive("/dashboard/landing-pages")
                    ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                    : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                }`}
              >
                <LuFileText className="w-5 h-5" />
                Landing Pages
              </Link>

              {/* Menu Global Agent */}
              <Link
                href="/dashboard/global-agent"
                className={`mx-2 my-1 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive("/dashboard/global-agent")
                    ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                    : "text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text)]"
                }`}
              >
                <LuSparkles className="w-5 h-5" />
                Global Agent
              </Link>

            </nav>
          )}

          {/* Versão Collapsed - Apenas Ícones */}
          {!isOpen && (
            <nav className="mt-4">
              <div className="flex flex-col items-center">
                <Link
                  href="/dashboard"
                  className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                  title="Dashboard"
                >
                  <LuLayoutDashboard className="w-5 h-5" />
                </Link>

                <Link
                  href="/dashboard/inbox-recepcao"
                  className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                    isActive("/dashboard/inbox-recepcao")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                      : "hover:bg-[color:var(--sidebar-hover)]"
                  }`}
                  title="Inbox Recepção"
                >
                  <LuInbox className="w-5 h-5" />
                </Link>

                <Link
                  href="/dashboard/usuarios"
                  className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                    isActive("/dashboard/usuarios")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                      : "hover:bg-[color:var(--sidebar-hover)]"
                  }`}
                  title="Equipe"
                >
                  <LuUsers className="w-5 h-5" />
                </Link>
                
                {/* AI Agents - Ícone principal */}
                <button
                  onClick={toggleAiAgentsSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                  title="AI Agents"
                >
                  <LuBot className="w-5 h-5" />
                </button>
                
                {/* Subitens do AI Agents - mostrados apenas quando aiAgentsOpen é true */}
                {aiAgentsOpen && (
                  <>
                    <Link
                      href="/dashboard/ai-agents/agents"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/agents")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Agents"
                    >
                      <LuBot className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/conversas"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/conversas")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Conversas"
                    >
                      <LuMessageSquare className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/templates"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/templates")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Templates"
                    >
                      <LuFileText className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/conexoes"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/conexoes")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Integrações"
                    >
                      <LuSettings className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/automacoes"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/automacoes")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Automações"
                    >
                      <LuZap className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/conhecimento"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/ai-agents/conhecimento")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Base de Conhecimento"
                    >
                      <LuDatabase className="w-4 h-4" />
                    </Link>
                  </>
                )}
                
                {/* CRM - Ícone principal */}
                <button
                  onClick={toggleCrmSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                  title="CRM"
                >
                  <LuUsers className="w-5 h-5" />
                </button>
                
                {/* Subitens do CRM - mostrados apenas quando crmOpen é true */}
                {crmOpen && (
                  <Link
                    href="/dashboard/crm/pipelines"
                    className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                      isActive("/dashboard/crm/pipelines")
                        ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                        : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                    }`}
                    title="Pipelines"
                  >
                    <LuWorkflow className="w-4 h-4" />
                  </Link>
                )}
                
                {/* ERP - Ícone principal */}
                <button
                  onClick={toggleErpSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                  title="ERP"
                >
                  <LuChartBar className="w-5 h-5" />
                </button>
                
                {/* Subitens do ERP - mostrados apenas quando erpOpen é true */}
                {erpOpen && (
                  <>
                    <Link
                      href="/dashboard/erp/tutores"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Tutores"
                    >
                      <LuUser className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/pets"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Pets"
                    >
                      <LuPawPrint className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/clientes"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Clientes"
                    >
                      <LuBook className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/agendamentos"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Agendamentos"
                    >
                      <LuCalendar className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/consultas"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Consultas"
                    >
                      <LuStethoscope className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/tratamentos"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Tratamentos"
                    >
                      <LuSyringe className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/internacoes"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Internações"
                    >
                      <LuBedDouble className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/servicos"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Serviços"
                    >
                      <LuWrench className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/produtos"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Produtos"
                    >
                      <LuPackage className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/estoque"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Estoque"
                    >
                      <LuWarehouse className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/comissoes"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Comissões"
                    >
                      <LuPercent className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/financeiro"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Financeiro"
                    >
                      <LuDollarSign className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/documentos"
                      className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                      title="Documentos"
                    >
                      <LuFiles className="w-4 h-4" />
                    </Link>
                  </>
                )}
                
                {/* Campanhas - Ícone principal */}
                <button
                  onClick={toggleCampanhasSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-[color:var(--sidebar-hover)] flex justify-center transition-colors"
                  title="Campanhas"
                >
                  <LuMegaphone className="w-5 h-5" />
                </button>
                
                {/* Subitens de Campanhas - mostrados apenas quando campanhasOpen é true */}
                {campanhasOpen && (
                  <>
                    <Link
                      href="/dashboard/campanhas/adsense"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/campanhas/adsense")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Adsense"
                    >
                      <LuChartColumn className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/campanhas/email"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/campanhas/email")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="Email"
                    >
                      <LuMail className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/campanhas/whatsapp"
                      className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                        isActive("/dashboard/campanhas/whatsapp")
                          ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                          : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                      }`}
                      title="WhatsApp"
                    >
                      <LuMessageSquare className="w-4 h-4" />
                    </Link>
                  </>
                )}

                {/* Landing Pages */}
                <Link
                  href="/dashboard/landing-pages"
                  className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                    isActive("/dashboard/landing-pages")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                      : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  title="Landing Pages"
                >
                  <LuFileText className="w-5 h-5" />
                </Link>

                {/* Global Agent */}
                <Link
                  href="/dashboard/global-agent"
                  className={`w-full p-3 sm:p-4 flex justify-center transition-colors ${
                    isActive("/dashboard/global-agent")
                      ? "bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-active-text)]"
                      : "hover:bg-[color:var(--sidebar-hover)] text-[color:var(--sidebar-muted)] hover:text-[color:var(--sidebar-text)]"
                  }`}
                  title="Global Agent"
                >
                  <LuSparkles className="w-5 h-5" />
                </Link>

              </div>
            </nav>
          )}
        </div>

        {/* Botão de Logout - Sempre no final */}
        <div className="border-t border-[color:var(--sidebar-border)] mt-auto">
          <button
            onClick={handleLogoutSimple}
            disabled={isLoggingOut}
            className={`w-full flex items-center p-3 sm:p-4 hover:bg-red-600 text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isOpen ? "justify-start" : "justify-center"
            }`}
            title="Sair"
          >
            {isLoggingOut ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                {isOpen && "Saindo..."}
              </div>
            ) : (
              <>
                <LuLogOut className={`w-5 h-5 ${isOpen ? "mr-3" : ""}`} />
                {isOpen && "Sair"}
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;
