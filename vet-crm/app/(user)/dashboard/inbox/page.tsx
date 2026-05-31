"use client";

import { useState } from "react";
import Link from "next/link";
import { LuExternalLink, LuRefreshCcw, LuInfo } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const BOTCONVERSA_URL = "https://app.botconversa.com.br/";

export default function InboxPage() {
  usePageTitle("Inbox Recepção", "BotConversa embarcado (provisório)");
  const [reloadKey, setReloadKey] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      {/* Mini toolbar discreta */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide" style={{ background: "#fef3c7", color: "#92400e" }}>
            Provisório
          </span>
          <span className="text-gray-500">Painel do BotConversa embarcado · sessão e dados ficam lá</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/inbox-nativo"
            className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-gray-600 hover:text-[#009AAC]"
            style={{ borderColor: "#E8DFC8" }}
            title="Ver versão nativa em construção"
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
            title="Abrir em nova aba"
          >
            <LuExternalLink size={12} /> Nova aba
          </a>
        </div>
      </div>

      {/* Aviso dispensável de cookie */}
      {showInfo && (
        <div className="px-4 py-2 flex items-start gap-2 text-[11.5px] border-b" style={{ background: "#f6fdfd", borderColor: "#E8DFC8", color: "#0c4a6e" }}>
          <LuInfo size={13} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            Se a sessão do BotConversa expirar dentro do embed, clique em <strong>Nova aba</strong> pra logar de novo — a tela aqui vai voltar automaticamente.
          </div>
          <button onClick={() => setShowInfo(false)} className="text-xs text-gray-400 hover:text-gray-700">×</button>
        </div>
      )}

      {/* Iframe BotConversa */}
      <iframe
        key={reloadKey}
        src={BOTCONVERSA_URL}
        className="flex-1 w-full border-0"
        allow="camera; microphone; clipboard-read; clipboard-write; autoplay"
        title="BotConversa"
      />
    </div>
  );
}
