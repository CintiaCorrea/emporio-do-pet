"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  LuMegaphone
} from "react-icons/lu";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const [aiAgentsOpen, setAiAgentsOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [erpOpen, setErpOpen] = useState(false);
  const [campanhasOpen, setCampanhasOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      console.log("🚀 Iniciando logout com NextAuth...");
      
      // 1. Chamar API de logout para limpar cookies do servidor
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log("✅ API logout chamada com sucesso");
      } catch (apiError) {
        console.log("⚠️ API logout não disponível, continuando...");
      }

      // 2. Limpar dados do localStorage (se estiver usando)
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("rememberMe");
      sessionStorage.clear();

      // 3. Fazer logout pelo NextAuth (IMPORTANTE!)
      await signOut({ 
        redirect: false,
        callbackUrl: "/"
      });

      // 4. Pequeno delay para garantir o processamento
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("🔀 Redirecionando para login...");
      
      // 5. Redirecionar para a página inicial
      router.push("/");
      
      // 6. Forçar reload para limpar completamente o estado
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
      
    } catch (error) {
      console.error("❌ Erro durante logout:", error);
      
      // Fallback: tentar redirecionar mesmo com erro
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
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
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 z-40 flex flex-col ${
          isOpen ? "w-56 sm:w-64" : "w-12 sm:w-16"
        }`}
      >
        {/* Header com Logo e Botão de Toggle */}
        <div className="flex items-center justify-between border-b border-gray-700">
          {isOpen && (
            <div className="flex items-center p-3 sm:p-4">
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
            className={`p-3 sm:p-4 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className="flex items-center p-3 sm:p-4 hover:bg-gray-700 text-sm sm:text-base transition-colors"
              >
                <LuLayoutDashboard className="mr-3 w-5 h-5" /> 
                Dashboard
              </Link>

              {/* Menu AI Agents com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleAiAgentsSubmenu}
                  className="w-full flex justify-between items-center p-3 sm:p-4 hover:bg-gray-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuBot className="mr-3 w-4 h-4" />
                    Agents
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/templates"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuFileText className="mr-3 w-4 h-4" />
                    Templates
                  </Link>
                  <Link
                    href="/dashboard/ai-agents/conexoes"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuSettings className="mr-3 w-4 h-4" />
                    Integrações
                  </Link>
                </div>
              </div>

              {/* Menu CRM com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleCrmSubmenu}
                  className="w-full flex justify-between items-center p-3 sm:p-4 hover:bg-gray-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                    href="/dashboard/crm/pipelines"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
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
                  className="w-full flex justify-between items-center p-3 sm:p-4 hover:bg-gray-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuUser className="mr-3 w-4 h-4" /> 
                    Tutores
                  </Link>
                  <Link
                    href="/dashboard/erp/pets"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuPawPrint className="mr-3 w-4 h-4" /> 
                    Pets
                  </Link>
                  <Link
                    href="/dashboard/erp/clientes"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuBook className="mr-3 w-4 h-4" /> 
                    Clientes
                  </Link>
                  <Link
                    href="/dashboard/erp/agendamentos"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuCalendar className="mr-3 w-4 h-4" /> 
                    Agendamentos
                  </Link>
                  <Link
                    href="/dashboard/erp/consultas"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuStethoscope className="mr-3 w-4 h-4" /> 
                    Consultas
                  </Link>
                  <Link
                    href="/dashboard/erp/internacoes"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuBedDouble className="mr-3 w-4 h-4" /> 
                    Internações
                  </Link>
                  <Link
                    href="/dashboard/erp/servicos"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuWrench className="mr-3 w-4 h-4" /> 
                    Serviços
                  </Link>
                  <Link
                    href="/dashboard/erp/produtos"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuPackage className="mr-3 w-4 h-4" /> 
                    Produtos
                  </Link>
                  <Link
                    href="/dashboard/erp/estoque"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuWarehouse className="mr-3 w-4 h-4" /> 
                    Estoque
                  </Link>
                  <Link
                    href="/dashboard/erp/comissoes"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuPercent className="mr-3 w-4 h-4" /> 
                    Comissões
                  </Link>
                  <Link
                    href="/dashboard/erp/financeiro"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuDollarSign className="mr-3 w-4 h-4" /> 
                    Financeiro
                  </Link>
                </div>
              </div>

              {/* Menu Campanhas com sub-navegação */}
              <div className="mb-2">
                <button
                  onClick={toggleCampanhasSubmenu}
                  className="w-full flex justify-between items-center p-3 sm:p-4 hover:bg-gray-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                    href="/dashboard/campanhas/newsletter"
                    className="flex items-center py-2 pl-11 pr-3 sm:pl-12 sm:pr-4 hover:bg-gray-700 text-sm sm:text-base text-gray-300 border-l-2 border-transparent hover:border-blue-500 transition-all"
                  >
                    <LuMail className="mr-3 w-4 h-4" />
                    Newsletter
                  </Link>
                </div>
              </div>
            </nav>
          )}

          {/* Versão Collapsed - Apenas Ícones */}
          {!isOpen && (
            <nav className="mt-4">
              <div className="flex flex-col items-center">
                <Link
                  href="/dashboard"
                  className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                  title="Dashboard"
                >
                  <LuLayoutDashboard className="w-5 h-5" />
                </Link>
                
                {/* AI Agents - Ícone principal */}
                <button
                  onClick={toggleAiAgentsSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                  title="AI Agents"
                >
                  <LuBot className="w-5 h-5" />
                </button>
                
                {/* Subitens do AI Agents - mostrados apenas quando aiAgentsOpen é true */}
                {aiAgentsOpen && (
                  <>
                    <Link
                      href="/dashboard/ai-agents/agents"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Agents"
                    >
                      <LuBot className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/ai-agents/templates"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Templates"
                    >
                      <LuFileText className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/integracoes"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Integrações"
                    >
                      <LuSettings className="w-4 h-4" />
                    </Link>
                  </>
                )}
                
                {/* CRM - Ícone principal */}
                <button
                  onClick={toggleCrmSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                  title="CRM"
                >
                  <LuUsers className="w-5 h-5" />
                </button>
                
                {/* Subitens do CRM - mostrados apenas quando crmOpen é true */}
                {crmOpen && (
                  <Link
                    href="/dashboard/crm/pipelines"
                    className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                    title="Pipelines"
                  >
                    <LuWorkflow className="w-4 h-4" />
                  </Link>
                )}
                
                {/* ERP - Ícone principal */}
                <button
                  onClick={toggleErpSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                  title="ERP"
                >
                  <LuChartBar className="w-5 h-5" />
                </button>
                
                {/* Subitens do ERP - mostrados apenas quando erpOpen é true */}
                {erpOpen && (
                  <>
                    <Link
                      href="/dashboard/erp/tutores"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Tutores"
                    >
                      <LuUser className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/pets"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Pets"
                    >
                      <LuPawPrint className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/clientes"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Clientes"
                    >
                      <LuBook className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/agendamentos"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Agendamentos"
                    >
                      <LuCalendar className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/consultas"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Consultas"
                    >
                      <LuStethoscope className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/internacoes"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Internações"
                    >
                      <LuBedDouble className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/servicos"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Serviços"
                    >
                      <LuWrench className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/produtos"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Produtos"
                    >
                      <LuPackage className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/estoque"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Estoque"
                    >
                      <LuWarehouse className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/comissoes"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Comissões"
                    >
                      <LuPercent className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/dashboard/erp/financeiro"
                      className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                      title="Financeiro"
                    >
                      <LuDollarSign className="w-4 h-4" />
                    </Link>
                  </>
                )}
                
                {/* Campanhas - Ícone principal */}
                <button
                  onClick={toggleCampanhasSubmenu}
                  className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                  title="Campanhas"
                >
                  <LuMegaphone className="w-5 h-5" />
                </button>
                
                {/* Subitens de Campanhas - mostrados apenas quando campanhasOpen é true */}
                {campanhasOpen && (
                  <Link
                    href="/dashboard/campanhas/newsletter"
                    className="w-full p-3 sm:p-4 hover:bg-gray-700 flex justify-center transition-colors"
                    title="Newsletter"
                  >
                    <LuMail className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>

        {/* Botão de Logout - Sempre no final */}
        <div className="border-t border-gray-700 mt-auto">
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
