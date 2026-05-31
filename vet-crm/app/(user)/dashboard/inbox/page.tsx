"use client";

import { useState } from "react";
import Link from "next/link";
import { LuExternalLink, LuRefreshCcw, LuInfo } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import InboxRightPanel from "@/components/inbox/InboxRightPanel";

const BOTCONVERSA_URL = "https://app.botconversa.com.br/";
const META_URL = "https://business.facebook.com/wa/manage/messages/";

type Source = "BC" | "META" | "NATIVE";

export default function InboxPage() {
  usePageTitle("Inbox", "Conversas com contexto do CRM ao lado");
  const [source, setSource] = useState<Source>("BC");
  const [reloadKey, setReloadKey] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const cur = source === "BC" ? { url: BOTCONVERSA_URL, label: "BotConversa" }
            : source === "META" ? { url: META_URL, label: "WhatsApp Meta" }
            : { url: "", label: "Inbox nativo" };

  const canalForPanel = source === "BC" ? "WhatsApp BC" : source === "META" ? "WhatsApp Meta" : "Sistema";

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide" style={{ background: "#fef3c7", color: "#92400e" }}>Provisório</span>
        </div>
        <div className="flex items-center gap-0.5 bg-[#f6f8f9] border rounded-lg p-1" style={{ borderColor: "#E8DFC8" }}>
          {(["BC", "META", "NATIVE"] as Source[]).map(s => {
            const on = source === s;
            const labels: Record<Source, string> = { BC: "BotConversa", META: "WhatsApp Meta", NATIVE: "Nativo" };
            const colors: Record<Source, string> = { BC: "linear-gradient(90deg,#009AAC,#00B4C4)", META: "linear-gradient(90deg,#25D366,#128C7E)", NATIVE: "linear-gradient(90deg,#6366f1,#4f46e5)" };
            return (
              <button key={s} onClick={() => setSource(s)} className="px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition" style={{ background: on ? colors[s] : "transparent", color: on ? "white" : "#64748b" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: on ? "white" : "#94a3b8" }} />
                {labels[s]}
                {s === "NATIVE" && <span className="text-[8.5px] px-1 rounded" style={{ background: on ? "rgba(255,255,255,0.25)" : "#dbeafe", color: on ? "white" : "#1e40af" }}>preview</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setReloadKey(k => k + 1)} className="px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 text-gray-600 hover:text-[#009AAC]" style={{ borderColor: "#E8DFC8" }} title="Recarregar">
            <LuRefreshCcw size={12} />
          </button>
          {cur.url && (
            <a href={cur.url} target="_blank" rel="noopener" className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 text-white" style={{ background: "#009AAC" }} title="Abrir em nova aba">
              <LuExternalLink size={12} /> Nova aba
            </a>
          )}
        </div>
      </div>

      {showInfo && (
        <div className="px-4 py-2 flex items-start gap-2 text-[11.5px] border-b" style={{ background: "#f6fdfd", borderColor: "#E8DFC8", color: "#0c4a6e" }}>
          <LuInfo size={13} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">Veja o telefone no {cur.label}, cole na busca à direita pra puxar contexto do CRM e registrar interação na ficha.</div>
          <button onClick={() => setShowInfo(false)} className="text-xs text-gray-400 hover:text-gray-700">×</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {source === "NATIVE" ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-2">⚡</div>
              <div className="text-sm font-semibold text-[#014D5E] mb-1">Inbox nativo em construção</div>
              <div className="text-xs text-gray-500 mb-3">Vai ler conversas direto do banco (WhatsApp BC + Meta unificados). Por enquanto use o BotConversa.</div>
              <Link href="/dashboard/inbox-nativo" className="px-3 py-2 rounded-lg text-xs border inline-flex items-center gap-1.5" style={{ borderColor: "#E8DFC8", color: "#009AAC" }}>
                Abrir preview nativo →
              </Link>
            </div>
          </div>
        ) : (
          <iframe
            key={`${source}-${reloadKey}`}
            src={cur.url}
            className="flex-1 border-0 min-w-0"
            allow="camera; microphone; clipboard-read; clipboard-write; autoplay"
            title={cur.label}
          />
        )}
        <aside className="w-[340px] border-l flex-shrink-0 overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <InboxRightPanel canal={canalForPanel} />
        </aside>
      </div>
    </div>
  );
}
