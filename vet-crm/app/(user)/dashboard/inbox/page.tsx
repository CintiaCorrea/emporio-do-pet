"use client";

import { useState } from "react";
import Link from "next/link";
import { LuExternalLink, LuRefreshCcw, LuInfo } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import InboxRightPanel from "@/components/inbox/InboxRightPanel";

const BOTCONVERSA_URL = "https://app.botconversa.com.br/";

export default function InboxPage() {
  usePageTitle("Inbox", "Conversas com contexto do CRM ao lado");
  const [reloadKey, setReloadKey] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      {/* Mini toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide" style={{ background: "#fef3c7", color: "#92400e" }}>
            Provisório
          </span>
          <span className="text-gray-500">BotConversa à esquerda · contexto Cliente/Pet à direita</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/inbox-nativo"
            className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-gray-600 hover:text-[#009AAC]"
            style={{ borderColor: "#E8DFC8" }}
            title="Versão nativa em construção"
          >
            Inbox nativo (preview)
          </Link>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-gray-600 hover:text-[#009AAC]"
            style={{ borderColor: "#E8DFC8" }}
            title="Recarregar BotConversa"
          >
            <LuRefreshCcw size={12} /> Recarregar
          </button>
          <a
            href={BOTCONVERSA_URL}
            target="_blank"
            rel="noopener"
            className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 text-white"
            style={{ background: "#009AAC" }}
            title="Abrir BotConversa em nova aba"
          >
            <LuExternalLink size={12} /> Nova aba
          </a>
        </div>
      </div>

      {/* Aviso dispensável */}
      {showInfo && (
        <div className="px-4 py-2 flex items-start gap-2 text-[11.5px] border-b" style={{ background: "#f6fdfd", borderColor: "#E8DFC8", color: "#0c4a6e" }}>
          <LuInfo size={13} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            Veja o telefone do contato no BotConversa, copie e cole na busca à direita — o tutor, pet e últimos atendimentos aparecem na hora.
          </div>
          <button onClick={() => setShowInfo(false)} className="text-xs text-gray-400 hover:text-gray-700">×</button>
        </div>
      )}

      {/* Conteúdo: iframe + painel */}
      <div className="flex-1 flex min-h-0">
        <iframe
          key={reloadKey}
          src={BOTCONVERSA_URL}
          className="flex-1 border-0 min-w-0"
          allow="camera; microphone; clipboard-read; clipboard-write; autoplay"
          title="BotConversa"
        />
        <aside className="w-[340px] border-l flex-shrink-0 overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <InboxRightPanel />
        </aside>
      </div>
    </div>
  );
}
