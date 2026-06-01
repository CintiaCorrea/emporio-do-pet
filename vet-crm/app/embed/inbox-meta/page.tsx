"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Re-renderiza a página do Inbox nativo dentro do layout embed (sem sidebar/header)
const InboxNativoPage = dynamic(() => import("@/app/(user)/dashboard/inbox-nativo/page"), { ssr: false });

export default function EmbedInboxMeta() {
  return (
    <div className="min-h-screen">
      <div className="px-4 py-2 text-[11px] text-gray-500 border-b flex items-center justify-between" style={{ borderColor: "#E8DFC8", background: "white" }}>
        <span>WhatsApp Meta (via API) · embedado</span>
        <Link href="/dashboard/inbox-nativo" target="_top" className="text-[#009AAC] hover:underline">abrir em tela cheia ↗</Link>
      </div>
      <InboxNativoPage />
    </div>
  );
}
