'use client';

import { useState } from 'react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import HotToaster from '@/components/common/HotToaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)] transition-colors">
      <HotToaster />
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
{/* Main Content - com padding-bottom para a topbar inferior estilo Base44 */}
      <main className={`
        min-h-screen transition-all duration-300
        ${sidebarOpen ? 'ml-56 sm:ml-64' : 'ml-12 sm:ml-16'}
      `}>
        {children}
      </main>
    </div>
  );
}

