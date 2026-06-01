'use client';

import HotToaster from '@/components/common/HotToaster';

// Layout dedicado pra embeds (iframes internos) — sem sidebar/header do dashboard
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f6f8f9" }}>
      <HotToaster />
      {children}
    </div>
  );
}
