// A VENDA (E O ORÇAMENTO) COMO ARQUIVO PDF, para mandar no WhatsApp.
//
// Cintia, 17/09/2026: "Sim, segue o relatório da sua compra, pois depois de vendido (pago) seria
// o recibo." Ou seja: ANTES de pagar vai o relatório da compra; DEPOIS, o recibo (recibo-pdf).
//
// Mesmo timbrado do recibo (pdfDaCasa) — o cabeçalho da casa é um só.
import { novoPdfDaCasa, nomeDeArquivo, NAVY } from "@/lib/documentos/pdfDaCasa";
import { subirArquivo } from "@/lib/documentos/enviarPdfWhats";

const BRL = (n: unknown) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: any) => new Date(d || Date.now()).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });

export type VendaParaPdf = {
  id?: string;
  numeroVenda?: number | null;
  date?: string | null;
  cliente?: string | null;
  clienteId?: string | null;
  pet?: string | null;
  petId?: string | null;
  valor?: number | null;
  pago?: number | null;
  itens?: { descricao?: string | null; quantidade?: number | null; valorUnitario?: number | null; valorTotal?: number | null }[] | null;
};

/** Busca os itens no servidor quando quem chamou não os tem. */
async function itensDaVenda(v: VendaParaPdf) {
  if (Array.isArray(v.itens) && v.itens.length) return v.itens;
  if (!v.id) return [];
  try {
    const d = await fetch(`/api/appointments/${v.id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
    return (d?.items || d?.itens || []) as any[];
  } catch { return []; }
}

/** Monta o comprovante da venda em PDF. */
export async function gerarPdfDaVenda(v: VendaParaPdf, opts?: { rotulo?: string }): Promise<{ blob: Blob; nome: string } | null> {
  if (!v) return null;
  const rotulo = opts?.rotulo || "Venda";
  const itens = await itensDaVenda(v);
  const { doc, autoTable, y: yTitulo } = await novoPdfDaCasa(rotulo === "Orçamento" ? "ORÇAMENTO" : "COMPROVANTE DE VENDA");
  let y = yTitulo;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(35, 35, 35);
  doc.text(`Cliente: ${v.cliente || "Cliente"}${v.pet ? `   ·   Animal: ${v.pet}` : ""}`, 14, y);
  y += 5.5;
  doc.text(`Data: ${dataBR(v.date)}${v.numeroVenda != null ? `   ·   ${rotulo} nº ${v.numeroVenda}` : ""}`, 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Serviço / produto", "Qtd", "Unitário", "Valor"]],
    body: (itens.length ? itens : [{ descricao: "Serviços e produtos veterinários" }]).map((it: any) => {
      const q = Number(it?.quantidade ?? 1) || 1;
      const vu = Number(it?.valorUnitario || 0);
      const vt = Number(it?.valorTotal ?? vu * q);
      return [String(it?.descricao || "Item"), it?.descricao ? String(q) : "", it?.valorUnitario != null ? BRL(vu) : "", it?.valorTotal != null || it?.valorUnitario != null ? BRL(vt) : ""];
    }),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [40, 40, 40] },
    headStyles: { fillColor: [247, 244, 236], textColor: NAVY, fontSize: 9 },
    columnStyles: { 1: { halign: "center", cellWidth: 14 }, 2: { halign: "right", cellWidth: 26 }, 3: { halign: "right", cellWidth: 28 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  const total = Number(v.valor || itens.reduce((s: number, it: any) => s + Number(it?.valorTotal || 0), 0));
  const pago = Number(v.pago || 0);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(`Total: ${BRL(total)}`, 196, y, { align: "right" });
  if (pago > 0.009) {
    y += 5.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
    doc.text(`Pago: ${BRL(pago)}`, 196, y, { align: "right" });
    const aberto = Math.max(0, total - pago);
    if (aberto > 0.009) { y += 5; doc.text(`Em aberto: ${BRL(aberto)}`, 196, y, { align: "right" }); }
  }

  y += 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 110);
  doc.text("Documento emitido pelo sistema — não é recibo de pagamento.", 14, y);

  return { blob: doc.output("blob") as Blob, nome: nomeDeArquivo(rotulo === "Orçamento" ? "orcamento" : "venda", v.cliente, v.numeroVenda ?? null) };
}

/** Gera o PDF e manda no WhatsApp do cliente. */
export async function enviarVendaNoWhats(v: VendaParaPdf, opts?: { rotulo?: string; texto?: string }): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!v?.clienteId) return { ok: false, erro: "Esta venda não tem cliente ligado — não sei para quem enviar." };
    const arquivo = await gerarPdfDaVenda(v, { rotulo: opts?.rotulo });
    if (!arquivo) return { ok: false, erro: "Não consegui gerar o documento." };
    const url = await subirArquivo(arquivo.blob, arquivo.nome);
    const texto = opts?.texto || (opts?.rotulo === "Orçamento"
      ? "Olá! Segue o orçamento do atendimento. Qualquer dúvida, é só chamar. 🐾"
      : "Olá! Segue o relatório da sua compra. Obrigada pela confiança! 🐾");
    const r = await fetch("/api/whatsapp/enviar-documentos", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tutorId: v.clienteId, texto, anexos: [{ url, tipo: "document", nome: arquivo.nome }], petNome: v.pet || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, erro: d?.message || "Erro ao enviar." };
    if (d?.status === "erro") return { ok: false, erro: d?.error || "Erro ao enviar." };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao enviar." };
  }
}
