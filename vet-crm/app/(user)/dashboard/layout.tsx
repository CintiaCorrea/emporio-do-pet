'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Header from '@/components/protected/dashboard/Header';
import HotToaster from '@/components/common/HotToaster';
import { PageHeaderProvider } from '@/lib/ui/PageHeaderContext';
import { RolePreviewProvider } from '@/lib/ui/RolePreview';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const { data: session } = useSession();
  const realRole = session?.user?.role;

  return (
    <RolePreviewProvider realRole={realRole}>
      <PageHeaderProvider>
        <div className="min-h-screen" style={{ background: "#F6F2EA" }}>
          <HotToaster />
          <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
          <Header sidebarOpen={sidebarOpen} />
          <main
            className="dash-main min-h-screen transition-all duration-200 pt-16"
            style={{ marginLeft: sidebarOpen ? 252 : 64 }}
          >
            {children}
          </main>
        </div>
      </PageHeaderProvider>
    </RolePreviewProvider>
  );
}
