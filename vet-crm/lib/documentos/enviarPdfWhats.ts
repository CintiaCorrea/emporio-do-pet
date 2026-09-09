// O CAMINHO DO PDF ATÉ O WHATSAPP DO CLIENTE.
//
// Três passos, e os dois últimos já existiam no sistema:
//   1. gerar o arquivo no navegador (jsPDF, carregado só na hora)
//   2. subir para o bucket   → /api/media/upload  (a mesma porta do anexo de exame)
//   3. mandar como anexo     → /api/whatsapp/enviar-documentos
//
// O passo 3 é quem resolve a janela de 24 horas da Meta: conversa aberta entrega na hora;
// fechada, dispara o modelo que ABRE a conversa e enfileira o anexo para quando o tutor
// responder. Por isso a tela oferece escolher esse modelo.

import { gerarPdfDoExtrato, type VendaDoPdf } from "@/lib/documentos/relatorio-vendas-pdf";

export type ResultadoEnvio = { ok: boolean; erro?: string; status?: string };

/** Sobe um arquivo e devolve a URL pública. */
export async function subirArquivo(blob: Blob, nome: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], nome, { type: "application/pdf" }));
  const r = await fetch("/api/media/upload?pasta=documentos&origem=relatorio-vendas", {
    method: "POST", body: fd, credentials: "include",
  });
  if (!r.ok) throw new Error("Não foi possível subir o arquivo.");
  const d = await r.json().catch(() => ({}));
  if (!d?.url) throw new Error("O servidor não devolveu o endereço do arquivo.");
  return d.url as string;
}

/**
 * Gera o extrato em PDF, sobe e manda pro tutor com a mensagem escrita.
 * `template` é o modelo que abre a conversa quando ela está fechada.
 */
export async function enviarExtratoPdfNoWhats(opts: {
  tutorId: string;
  cliente: string;
  codigo?: number | string | null;
  vendas: VendaDoPdf[];
  apenasEmAberto?: boolean;
  texto: string;
  petNome?: string | null;
  template?: string;
  templateParams?: string[];
}): Promise<ResultadoEnvio> {
  try {
    const { blob, nome } = await gerarPdfDoExtrato({
      cliente: opts.cliente, codigo: opts.codigo, vendas: opts.vendas, apenasEmAberto: opts.apenasEmAberto,
    });
    const url = await subirArquivo(blob, nome);
    const r = await fetch("/api/whatsapp/enviar-documentos", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        tutorId: opts.tutorId,
        texto: opts.texto,
        anexos: [{ url, tipo: "document", nome }],
        petNome: opts.petNome || undefined,
        template: opts.template || undefined,
        templateParams: opts.template ? opts.templateParams : undefined,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, erro: d?.message || "Erro ao enviar." };
    if (d?.status === "erro") return { ok: false, erro: d?.error || "Erro ao enviar." };
    return { ok: true, status: d?.status };
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao enviar." };
  }
}

/** Baixa o PDF direto, sem passar pelo WhatsApp — útil para anexar em e-mail ou guardar. */
export async function baixarExtratoPdf(opts: {
  cliente: string; codigo?: number | string | null; vendas: VendaDoPdf[]; apenasEmAberto?: boolean;
}): Promise<void> {
  const { blob, nome } = await gerarPdfDoExtrato(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
