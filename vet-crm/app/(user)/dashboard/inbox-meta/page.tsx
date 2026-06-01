"use client";

import { useState } from "react";
import { LuRefreshCcw, LuInfo } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import InboxRightPanel from "@/components/inbox/InboxRightPanel";

export default function InboxMetaPage() {
  usePageTitle("Inbox Meta", "Conversas WhatsApp Meta API · contexto do CRM ao lado");
  const [reloadKey, setReloadKey] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide text-xs" style={{ background: "#dcfce7", color: "#15803d" }}>WhatsApp Meta (via API)</span>
        </div>
        <button onClick={() => setReloadKey(k => k + 1)} className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-gray-600 hover:text-[#25D366]" style={{ borderColor: "#E8DFC8" }} title="Recarregar"><LuRefreshCcw size={12} /></button>
      </div>

      {showInfo && (
        <div className="px-4 py-2 flex items-start gap-2 text-[11.5px] border-b" style={{ background: "#f0fdf4", borderColor: "#E8DFC8", color: "#15803d" }}>
          <LuInfo size={13} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">Conversas lidas direto da API do WhatsApp Meta Business. Contexto e ações do CRM ao lado direito.</div>
          <button onClick={() => setShowInfo(false)} className="text-xs text-gray-400 hover:text-gray-700">×</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <iframe
          key={`meta-${reloadKey}`}
          src="/embed/inbox-meta"
          className="flex-1 border-0 min-w-0"
          title="WhatsApp Meta API"
        />
        <aside className="w-[300px] border-l flex-shrink-0 overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <InboxRightPanel canal="WhatsApp Meta" />
        </aside>
      </div>
    </div>
  );
}
