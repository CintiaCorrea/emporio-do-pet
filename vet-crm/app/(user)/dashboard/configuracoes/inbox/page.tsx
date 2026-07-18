"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Configurações › Caixa de Entrada (WhatsApp)
   Liga/desliga a criação automática de LEAD de número desconhecido.
   Cliente já cadastrado NUNCA vira lead — isso é sempre garantido.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { LuInbox, LuArrowLeft, LuLoader } from "react-icons/lu";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function ConfigInboxPage() {
  const [autoLead, setAutoLead] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/crm/inbox-settings`);
        const d = await r.json().catch(() => ({}));
        if (typeof d?.autoCreateLeadsFromWhatsApp === "boolean") setAutoLead(d.autoCreateLeadsFromWhatsApp);
      } catch { /* mantém padrão */ }
      setLoading(false);
    })();
  }, []);

  async function salvar(valor: boolean) {
    setSaving(true);
    const anterior = autoLead;
    setAutoLead(valor); // otimista
    try {
      const r = await fetch(`/api/crm/inbox-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCreateLeadsFromWhatsApp: valor }),
      });
      if (!r.ok) throw new Error();
      toast.success(valor ? "Lead automático LIGADO" : "Lead automático DESLIGADO");
    } catch {
      setAutoLead(anterior); // desfaz
      toast.error("Não consegui salvar. Tente de novo.");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <Link href="/dashboard/configuracoes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#009AAC] mb-5">
          <LuArrowLeft size={14} /> Configurações
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-lg p-2.5" style={{ background: "#E0F4F6", color: "#009AAC" }}>
            <LuInbox size={20} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "#0E2244" }}>Caixa de Entrada (WhatsApp)</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-[52px]">Como o sistema trata as mensagens que chegam.</p>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm"><LuLoader className="animate-spin" size={16} /> Carregando…</div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-xl p-4 flex items-start gap-4" style={{ borderColor: "#E8DFC8" }}>
              <div className="flex-1">
                <div className="font-medium text-sm" style={{ color: "#0E2244" }}>Criar lead automático de número novo</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Quando chega mensagem de um número <b>desconhecido</b>, o sistema cria um <b>lead</b> automaticamente na caixa.
                  Desligue se preferir cadastrar os leads manualmente.
                </div>
              </div>
              <button
                role="switch"
                aria-checked={autoLead}
                disabled={saving}
                onClick={() => salvar(!autoLead)}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50"
                style={{ background: autoLead ? "#009AAC" : "#CBD3D6" }}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${autoLead ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="text-xs text-gray-500 border rounded-xl p-4 leading-relaxed" style={{ borderColor: "#E8DFC8", background: "#FAFAF7" }}>
              <b>🔒 Sempre garantido (não depende deste botão):</b><br />
              • Quem já é <b>cliente</b> nunca entra como lead — a conversa é reconhecida pelo telefone e ligada à ficha.<br />
              • Telefone repetido em 2 cadastros (família/duplicado) <b>não é ligado no escuro</b> — vai para revisão manual.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
