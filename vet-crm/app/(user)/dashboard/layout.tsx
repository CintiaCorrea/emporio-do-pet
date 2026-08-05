'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Header from '@/components/protected/dashboard/Header';
import HotToaster from '@/components/common/HotToaster';
import { PageHeaderProvider } from '@/lib/ui/PageHeaderContext';
import { RolePreviewProvider } from '@/lib/ui/RolePreview';
import { PermissionsProvider } from '@/lib/permissions/context';
import PermGuard from '@/components/protected/dashboard/PermGuard';
import SessaoGuard from '@/components/protected/dashboard/SessaoGuard';
import LembreteFimTurno from '@/components/protected/dashboard/LembreteFimTurno';
import AlertasInternacao from '@/components/internacao/AlertasInternacao';
import RecadoPopup from '@/components/protected/dashboard/RecadoPopup';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop: menu expandido/recolhido
  const [mobileOpen, setMobileOpen] = useState(false);  // celular: gaveta aberta/fechada
  const [isMobile, setIsMobile] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const { data: session } = useSession();
  const realRole = session?.user?.role;

  // Detecta celular (≤767px) e reage a rotação/redimensionamento
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Trava o scroll do fundo enquanto a gaveta está aberta no celular
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile, mobileOpen]);

  return (
    <RolePreviewProvider realRole={realRole}>
      <PageHeaderProvider>
       <PermissionsProvider>
        <div className="min-h-screen" style={{ background: "#F6F2EA" }}>
          <HotToaster />
          <PermGuard />
          <SessaoGuard />
          <LembreteFimTurno />
          <AlertasInternacao />
          <RecadoPopup />
          <Sidebar
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            closeMobile={() => setMobileOpen(false)}
          />
          {/* Fundo escurecido da gaveta — só no celular, fecha ao tocar */}
          {isMobile && mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[55] bg-black/40"
              aria-hidden
            />
          )}
          <Header
            sidebarOpen={sidebarOpen}
            isMobile={isMobile}
            onMenu={() => setMobileOpen(true)}
          />
          <main
            className="dash-main min-h-screen transition-all duration-200 pt-16"
            style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 252 : 64) }}
          >
            {children}
          </main>
        </div>
       </PermissionsProvider>
      </PageHeaderProvider>
    </RolePreviewProvider>
  );
}
