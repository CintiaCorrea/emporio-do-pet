'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
// RecadoPopup RELIGADO (06/08) — reescrito com "seen-set": nunca mostra backlog,
// só popa avisos que chegam DEPOIS da tela aberta, e tem "×" de escape (nunca trava).
import RecadoPopup from '@/components/protected/dashboard/RecadoPopup';
import PushSetup from '@/components/protected/dashboard/PushSetup';
// Avisa (e recarrega sozinho ao trocar de tela) quando sai versão nova — para a recepção
// nunca ficar com a tela velha e cobrar o preço antigo. 17/09/2026.
import AvisoDeAtualizacao from '@/components/protected/dashboard/AvisoDeAtualizacao';

// AS TELAS QUE AINDA DAO A PROPRIA MARGEM — a excecao, e o dia em que ela morre.
// Enquanto a reforma das vendas nao terminar, estas quatro telas tem dono: mexer nelas por
// fora desfaz correcao testada, que e o risco que mais custa caro (pauta de 18/09/2026).
// Elas ficam exatamente como estao hoje; a moldura nao encosta.
// QUANDO A REFORMA DAS VENDAS TERMINAR: apagar esta lista inteira e o data-margem abaixo.
// O teste lib/margem-da-moldura.spec.ts guarda isso.
const TELAS_DA_REFORMA_DE_VENDAS = [
  '/dashboard/erp/ponto-de-venda',
  '/dashboard/erp/caixa',
  '/dashboard/erp/consulta-vendas',
  '/dashboard/erp/configuracoes-vendas',
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop: menu expandido/recolhido
  const [mobileOpen, setMobileOpen] = useState(false);  // celular: gaveta aberta/fechada
  const [isMobile, setIsMobile] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const rota = usePathname() || '';
  const daPropriaMargem = TELAS_DA_REFORMA_DE_VENDAS.some((r) => rota === r || rota.startsWith(r + '/'));
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
          <PushSetup />
          <AvisoDeAtualizacao />
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
            /* A MARGEM DA BORDA DA TELA (24px, 16 no celular) vem da moldura desde 19/09/2026,
               em styles/globals.css. Com data-margem="da-tela", a moldura nao encosta — e o
               caso das quatro telas da reforma das vendas, que tem dono ate ela terminar. */
            data-margem={daPropriaMargem ? 'da-tela' : undefined}
          >
            {children}
          </main>
        </div>
       </PermissionsProvider>
      </PageHeaderProvider>
    </RolePreviewProvider>
  );
}
