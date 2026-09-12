"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";
import { subirArquivo } from "@/lib/documentos/enviarPdfWhats";

// UM SÓ BOTÃO DE ENVIAR, PARA TODAS AS TELAS.
//
// Cintia, 12/09/2026: "a opção de pdf tem que existir em todos os locais". Antes o envio em
// PDF morava só na ficha do pet, porque foi onde eu construí — e o resto do sistema ficou com
// texto ou com nada. Uma cópia por tela significaria formatos diferentes saindo da mesma
// clínica, que é exatamente o que o textoDoOrcamento existe para impedir.
//
// Aqui quem chama entrega o TEXTO pronto e, se houver, a função que gera o PDF. O resto —
// prévia, escolha de texto ou anexo, subida do arquivo, janela de 24h — é igual em todo lugar.

export type GerarPdf = () => Promise<{ blob: Blob; nome: string }>;

export default function EnviarPorWhatsApp({
  tutorId, texto, petNome, gerarPdf, rotulo = "💬 Enviar", titulo = "Enviar pelo WhatsApp", onEnviado,
}: {
  tutorId?: string | null;
  /** Mensagem já montada — é ela que o cliente lê. */
  texto: string;
  petNome?: string | null;
  /** Sem isto, a tela oferece só texto. */
  gerarPdf?: GerarPdf;
  rotulo?: string;
  titulo?: string;
  onEnviado?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState<"texto" | "pdf" | null>(null);

  const abrir = () => {
    if (!tutorId) { toast.error("Este registro não tem cliente vinculado."); return; }
    setMsg(texto);
    setAberto(true);
  };

  const enviar = async (comPdf: boolean) => {
    if (!tutorId) return;
    setEnviando(comPdf ? "pdf" : "texto");
    try {
      let anexos: { url: string; tipo: "document"; nome: string }[] = [];
      if (comPdf && gerarPdf) {
        const { blob, nome } = await gerarPdf();
        const url = await subirArquivo(blob, nome);
        anexos = [{ url, tipo: "document", nome }];
      }
      const r = await fetch("/api/whatsapp/enviar-documentos", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ tutorId, texto: msg, anexos, petNome: petNome || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.status === "erro") { toast.error(d?.message || d?.error || "Não foi possível enviar."); return; }
      // Conversa fechada não é erro: a Meta só deixa abrir com modelo, e o sistema enfileira.
      toast.success(d?.status === "na_fila"
        ? "Na fila — sai assim que o cliente responder."
        : comPdf ? "PDF enviado no WhatsApp." : "Mensagem enviada no WhatsApp.");
      setAberto(false);
      onEnviado?.();
    } catch { toast.error("Não foi possível enviar."); }
    finally { setEnviando(null); }
  };

  const baixar = async () => {
    if (!gerarPdf) return;
    try {
      const { blob, nome } = await gerarPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { toast.error("Não foi possível gerar o PDF."); }
  };

  return (
    <>
      <button
        onClick={abrir}
        title="Manda pelo WhatsApp do cliente — dá para revisar antes, e escolher texto ou PDF"
        className="text-[11.5px] font-medium px-2.5 py-1 rounded-lg text-white whitespace-nowrap"
        style={{ background: "#1c7a47" }}
      >{rotulo}</button>

      {aberto && (
        <div {...fundoDeModal(() => setAberto(false))} className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-[70]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E2D6] flex items-center justify-between">
              <div className="text-[15px] font-medium text-[#014D5E]">{titulo}</div>
              <button onClick={() => setAberto(false)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-[11px] text-[#374151] mb-1.5 uppercase tracking-wide">
                Revise antes de enviar — dá para editar
              </div>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={14}
                className="w-full text-[12.5px] border rounded-lg p-2.5 font-mono"
                style={{ borderColor: "#E8E2D6", color: "#1F2A2E" }}
              />
            </div>

            <div className="px-5 py-3 border-t border-[#E8E2D6] flex gap-2 justify-end flex-wrap">
              {gerarPdf && (
                <button onClick={baixar} className="px-3.5 py-2 text-[12.5px] rounded-lg border border-[#E8E2D6] text-[#014D5E]">
                  📄 Baixar PDF
                </button>
              )}
              {gerarPdf && (
                <button
                  onClick={() => enviar(true)}
                  disabled={!!enviando}
                  className="px-3.5 py-2 text-[12.5px] font-medium rounded-lg text-white disabled:opacity-60"
                  style={{ background: "#0F6E56" }}
                >{enviando === "pdf" ? "Enviando…" : "📎 Enviar PDF"}</button>
              )}
              <button
                onClick={() => enviar(false)}
                disabled={!!enviando || !msg.trim()}
                className="px-3.5 py-2 text-[12.5px] font-medium rounded-lg text-white disabled:opacity-60"
                style={{ background: "#1c7a47" }}
              >{enviando === "texto" ? "Enviando…" : "💬 Enviar texto"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
