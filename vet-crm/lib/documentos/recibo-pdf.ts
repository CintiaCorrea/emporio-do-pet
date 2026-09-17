// O RECIBO COMO ARQUIVO PDF — para mandar no WhatsApp (Cintia, 17/09/2026: "Podemos enviar o
// recibo direto pelo whatsapp também? em PDF de preferência").
//
// Mesmo conteúdo do papel (lib/documentos/recibo monta os dados dos dois). O papel sai por
// window.print(); anexo precisa de bytes, e aí é o jsPDF, como o extrato de vendas já faz.
// O cabeçalho traz a logo e os dados da clínica (Configurações › Dados da clínica). Se a logo
// não carregar, o recibo sai com o nome escrito — nunca falha por causa da imagem.
import { fraseDoRecibo, montarDadosDoRecibo, type BaixaDoRecibo } from "@/lib/documentos/recibo";
import { subirArquivo } from "@/lib/documentos/enviarPdfWhats";

const BRL = (n: unknown) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NAVY: [number, number, number] = [1, 77, 94];

async function dadosDaClinica(): Promise<any> {
  try {
    const r = await fetch("/api/listas?lista=dadosclinica", { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
    return arr[0]?.valor ? JSON.parse(arr[0].valor) : {};
  } catch { return {}; }
}

async function logoComoImagem(url?: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    const blob = await fetch(url, { cache: "force-cache" }).then((r) => (r.ok ? r.blob() : null));
    if (!blob) return null;
    const dataUrl: string = await new Promise((ok, erro) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result));
      fr.onerror = erro;
      fr.readAsDataURL(blob);
    });
    const tam = await new Promise<{ w: number; h: number }>((ok) => {
      const img = new Image();
      img.onload = () => ok({ w: img.width, h: img.height });
      img.onerror = () => ok({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    if (!tam.w || !tam.h) return null;
    return { dataUrl, w: tam.w, h: tam.h };
  } catch { return null; }
}

/** Monta o recibo em PDF e devolve o arquivo pronto para subir ou baixar. */
export async function gerarPdfDoRecibo(baixas: BaixaDoRecibo[]): Promise<{ blob: Blob; nome: string } | null> {
  const d = await montarDadosDoRecibo(baixas);
  if (!d) return null;
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const clinica = await dadosDaClinica();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ── timbrado: logo (quando carrega) + dados da clínica ──
  let y = 16;
  const logo = await logoComoImagem(clinica?.logoUrl);
  if (logo) {
    const alturaMm = 16;
    const larguraMm = Math.min(70, (logo.w / logo.h) * alturaMm);
    try { doc.addImage(logo.dataUrl, 14, 10, larguraMm, alturaMm); y = 10 + alturaMm + 5; } catch { /* segue sem logo */ }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...NAVY);
  doc.text(String(clinica?.nomeFantasia || clinica?.razaoSocial || "Empório do Pet"), logo ? 14 : 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  const endereco = [clinica?.rua ? `${clinica.rua}${clinica?.numero ? `, ${clinica.numero}` : ""}` : "", clinica?.bairro, clinica?.cidade ? `${clinica.cidade}${clinica?.uf ? `/${clinica.uf}` : ""}` : ""].filter(Boolean).join(" · ");
  if (endereco) { y += 5; doc.text(endereco, 14, y); }
  const contato = [clinica?.cnpj ? `CNPJ ${clinica.cnpj}` : "", clinica?.telefone, clinica?.whatsapp].filter(Boolean).join(" · ");
  if (contato) { y += 4.5; doc.text(contato, 14, y); }

  y += 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text("RECIBO", 105, y, { align: "center" });

  y += 9;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(35, 35, 35);
  const frase = doc.splitTextToSize(fraseDoRecibo(d), 182);
  doc.text(frase, 14, y);
  y += frase.length * 5.4 + 3;

  doc.setFontSize(10);
  if (d.formasStr) { doc.text(`Forma de pagamento: ${d.formasStr}`, 14, y); y += 5; }
  if (d.desconto > 0.009) { doc.text(`Desconto concedido: ${BRL(d.desconto)}`, 14, y); y += 5; }
  doc.text(`Data do pagamento: ${new Date(d.data).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}`, 14, y);
  y += 6;

  // ── o descritivo: os itens de cada venda quitada ──
  for (const v of d.vendas) {
    const cab = `${v.numero != null ? `Venda nº ${v.numero}` : "Venda"}${v.pet ? `  ·  ${v.pet}` : ""}`;
    const linhas = v.itens.length
      ? v.itens.map((it) => [it.descricao, String(it.quantidade), BRL(it.valorTotal)])
      : [["Serviços e produtos veterinários", "", ""]];
    autoTable(doc, {
      startY: y,
      head: [[cab, "Qtd", "Valor"]],
      body: linhas,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 1.8, textColor: [40, 40, 40] },
      headStyles: { fillColor: [247, 244, 236], textColor: NAVY, fontSize: 9 },
      columnStyles: { 1: { halign: "center", cellWidth: 16 }, 2: { halign: "right", cellWidth: 30 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(`Total recebido: ${BRL(d.total)}`, 196, y + 2, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
  const cidade = clinica?.cidade || "Fortaleza";
  doc.text(`${cidade}, ${new Date(d.data).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Fortaleza" })}`, 105, y, { align: "center" });
  y += 20;
  doc.setDrawColor(150, 160, 165);
  doc.line(55, y, 155, y);
  doc.setFontSize(9); doc.setTextColor(110, 110, 110);
  doc.text("Assinatura", 105, y + 5, { align: "center" });

  const numeros = d.vendas.map((v) => v.numero).filter(Boolean).join("-");
  const nome = `recibo-${(d.tutorNome || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28)}${numeros ? `-${numeros}` : ""}.pdf`;
  return { blob: doc.output("blob") as Blob, nome };
}

/** Gera o PDF e manda no WhatsApp do cliente. */
export async function enviarReciboNoWhats(baixas: BaixaDoRecibo[], opts?: { texto?: string }): Promise<{ ok: boolean; erro?: string }> {
  try {
    const d = await montarDadosDoRecibo(baixas);
    if (!d) return { ok: false, erro: "Sem baixa para o recibo." };
    if (!d.tutorId) return { ok: false, erro: "Este pagamento não tem cliente ligado — não sei para quem enviar." };
    const arquivo = await gerarPdfDoRecibo(baixas);
    if (!arquivo) return { ok: false, erro: "Não consegui gerar o recibo." };
    const url = await subirArquivo(arquivo.blob, arquivo.nome);
    const texto = opts?.texto || `Olá! Segue o recibo do pagamento de ${BRL(d.total)}. Obrigada pela confiança! 🐾`;
    const r = await fetch("/api/whatsapp/enviar-documentos", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tutorId: d.tutorId, texto, anexos: [{ url, tipo: "document", nome: arquivo.nome }], petNome: d.petNome || undefined }),
    });
    const resp = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, erro: resp?.message || "Erro ao enviar." };
    if (resp?.status === "erro") return { ok: false, erro: resp?.error || "Erro ao enviar." };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao enviar." };
  }
}

/** Baixa o recibo em PDF, sem passar pelo WhatsApp. */
export async function baixarReciboPdf(baixas: BaixaDoRecibo[]): Promise<boolean> {
  const arquivo = await gerarPdfDoRecibo(baixas);
  if (!arquivo) return false;
  const url = URL.createObjectURL(arquivo.blob);
  const a = document.createElement("a");
  a.href = url; a.download = arquivo.nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
