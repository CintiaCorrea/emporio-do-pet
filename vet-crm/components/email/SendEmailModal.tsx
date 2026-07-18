"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { LuX, LuSend } from "react-icons/lu";

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultHtml?: string;
  tutorId?: string;
  leadId?: string;
  petId?: string;
  onSent?: () => void; // chamado após envio bem-sucedido (opcional)
}

export function SendEmailModal({
  open, onClose, defaultTo, defaultSubject, defaultHtml,
  tutorId, leadId, petId, onSent,
}: SendEmailModalProps) {
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [html, setHtml] = useState(defaultHtml || "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo || "");
      setSubject(defaultSubject || "");
      setHtml(defaultHtml || "");
    }
  }, [open, defaultTo, defaultSubject, defaultHtml]);

  if (!open) return null;

  async function send() {
    if (!to.trim()) { toast.error("Destinatario obrigatorio"); return; }
    if (!subject.trim()) { toast.error("Assunto obrigatorio"); return; }
    if (!html.trim()) { toast.error("Mensagem obrigatoria"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html, tutorId, leadId, petId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success || data.ok) {
        toast.success("Email enviado!");
        onSent?.();
        onClose();
      } else {
        toast.error(data.error || "Erro ao enviar");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro de rede");
    }
    setSending(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold" style={{ color: "#014D5E" }}>Enviar email</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <LuX size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-gray-600">Para</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@destinatario.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "#E8DFC8" }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Assunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "#E8DFC8" }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Mensagem (HTML)</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={8}
              placeholder="<p>Ola! ...</p>"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              style={{ borderColor: "#E8DFC8" }}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Suporta HTML basico: &lt;p&gt;, &lt;strong&gt;, &lt;a href&gt;, &lt;br&gt;, etc.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-3 py-1.5 text-sm border rounded-lg"
            style={{ borderColor: "#E8DFC8", color: "#475569" }}
          >
            Cancelar
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-4 py-1.5 text-sm rounded-lg text-white font-medium flex items-center gap-1.5"
            style={{ background: sending ? "#94a3b8" : "#009AAC" }}
          >
            <LuSend size={13} /> {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
