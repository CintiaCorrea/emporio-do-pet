'use client';

import { useState } from 'react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import Header from '@/components/protected/dashboard/Header';
import HotToaster from '@/components/common/HotToaster';
import { PageHeaderProvider } from '@/lib/ui/PageHeaderContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <PageHeaderProvider>
      <div className="min-h-screen" style={{ background: "#f6f8f9" }}>
        <HotToaster />
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <Header sidebarOpen={sidebarOpen} />
        <main
          className="min-h-screen transition-all duration-200 pt-16"
          style={{ marginLeft: sidebarOpen ? 252 : 64 }}
        >
          {children}
        </main>
      </div>
    </PageHeaderProvider>
  );
}
