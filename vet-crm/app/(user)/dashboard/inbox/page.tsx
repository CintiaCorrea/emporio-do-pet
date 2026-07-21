"use client";

import { useState } from "react";
import { LuExternalLink, LuRefreshCcw } from "react-icons/lu";
import { usePageTitle, usePageRightSlot } from "@/lib/ui/PageHeaderContext";
import InboxRightPanel from "@/components/inbox/InboxRightPanel";

const BOTCONVERSA_URL = "https://app.botconversa.com.br/";

function InboxStats() {
  // Placeholder enquanto endpoint nao existe. Quando tiver API, substitui pelos valores reais.
  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col items-end leading-tight">
        <div className="text-[13px] font-medium" style={{ color: "#014D5E" }}>+1h</div>
        <div className="text-[9.5px] uppercase font-medium text-[#374151] tracking-wide">⏱ esperando</div>
      </div>
      <div className="flex flex-col items-end leading-tight">
        <div className="text-[13px] font-medium" style={{ color: "#014D5E" }}>—</div>
        <div className="text-[9.5px] uppercase font-medium text-[#374151] tracking-wide">⌛ tempo méd.</div>
      </div>
      <div className="flex flex-col items-end leading-tight">
        <div className="text-[13px] font-medium" style={{ color: "#014D5E" }}>—</div>
        <div className="text-[9.5px] uppercase font-medium text-[#374151] tracking-wide">🏆 streak</div>
      </div>
    </div>
  );
}

export default function InboxBcPage() {
  usePageTitle("Inbox BC", "Conversas BotConversa com contexto do CRM");
  usePageRightSlot(<InboxStats />);

  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      {/* Banner Provisório — só no Inbox BC */}
      <div
        className="border-b px-4 py-2 flex items-center gap-3 flex-shrink-0"
        style={{ background: "#FBF3E3", borderColor: "#F0DCB0" }}
      >
        <span
          className="px-2 py-0.5 rounded-full font-medium uppercase tracking-wide text-[10px] flex-shrink-0"
          style={{ background: "#FBEFD6", color: "#8A5A0B" }}
        >
          Provisório
        </span>
        <span className="text-[11.5px] flex-1 min-w-0" style={{ color: "#8a6400" }}>
          Veja o telefone no BotConversa, cole na busca à direita pra puxar contexto do CRM e registrar interação na ficha.
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-[#5C6B70] hover:text-[#009AAC] bg-white"
            style={{ borderColor: "#E8E2D6" }}
            title="Recarregar"
          >
            <LuRefreshCcw size={12} /> Atualizar
          </button>
          <a
            href={BOTCONVERSA_URL}
            target="_blank"
            rel="noopener"
            className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 text-white"
            style={{ background: "#009AAC" }}
            title="Abrir em nova aba"
          >
            <LuExternalLink size={12} /> Nova aba
          </a>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <iframe
          key={`bc-${reloadKey}`}
          src={BOTCONVERSA_URL}
          className="flex-1 border-0 min-w-0"
          allow="camera; microphone; clipboard-read; clipboard-write; autoplay"
          title="BotConversa"
        />
        <aside
          className="w-[372px] border-l flex-shrink-0 overflow-hidden"
          style={{ borderColor: "#E8E2D6" }}
        >
          <InboxRightPanel canal="WhatsApp BC" />
        </aside>
      </div>
    </div>
  );
}
