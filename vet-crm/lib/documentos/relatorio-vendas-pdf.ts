// O EXTRATO DE VENDAS COMO ARQUIVO PDF — para anexar no WhatsApp.
//
// Pedido da Cintia (09/09/2026), depois da versão em texto: "podemos de qualquer forma
// construir o caminho para enviar o PDF quando e caso necessário?".
//
// POR QUE UM GERADOR SEPARADO. O papel impresso sai por window.print() (HTML), que o navegador
// não sabe transformar em arquivo por conta própria. Para virar anexo é preciso gerar bytes —
// aqui, com jsPDF, carregado só quando alguém pede o PDF (import dinâmico), para não pesar em
// quem nunca usa.
//
// A FONTE DA VERDADE CONTINUA SENDO UMA. Este arquivo recebe exatamente a mesma lista de
// vendas que o papel e o texto do WhatsApp — e o teste guarda que os três mostram os mesmos
// campos. Formato diferente pode; conteúdo diferente, não.

export type VendaDoPdf = {
  numero?: number | string | null;
  data?: string;
  pet?: string | null;
  valor?: number;
  pago?: number;
  itens?: { descricao?: string | null; quantidade?: number | null; valorUnitario?: number | null; valorTotal?: number | null }[] | null;
};

const BRL = (n: unknown) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (d?: string) => {
  try { return new Date(d || Date.now()).toLocaleDateString("pt-BR"); } catch { return ""; }
};
const abertoDe = (v: VendaDoPdf) => Math.max(0, Number(v.valor || 0) - Number(v.pago || 0));

function situacaoDa(v: VendaDoPdf): string {
  const aberto = abertoDe(v);
  if (aberto <= 0.009 && Number(v.valor || 0) > 0) return "PAGA";
  if (Number(v.pago || 0) > 0.009) return "PARCIAL";
  return "EM ABERTO";
}

/** Monta o PDF e devolve o arquivo pronto para subir ou baixar. */
export async function gerarPdfDoExtrato(opts: {
  cliente: string;
  codigo?: number | string | null;
  vendas: VendaDoPdf[];
  apenasEmAberto?: boolean;
}): Promise<{ blob: Blob; nome: string }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const todas = [...(opts.vendas || [])].sort(
    (a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime(),
  );
  const lista = opts.apenasEmAberto ? todas.filter((v) => abertoDe(v) > 0.009) : todas;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const NAVY: [number, number, number] = [1, 77, 94];
  const TEAL: [number, number, number] = [0, 154, 172];
  const VERM: [number, number, number] = [178, 59, 57];

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text(opts.apenasEmAberto ? "Contas em aberto" : "Extrato de compras", 14, 18);

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
  doc.text("Empório do Pet", 14, 24);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 196, 18, { align: "right" });

  doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(`Cliente: ${opts.cliente || "Cliente"}${opts.codigo ? `  ·  cadastro ${opts.codigo}` : ""}`, 14, 32);

  // Uma tabela por venda: cabeçalho com data/nº/pet/situação, e os ITENS embaixo — é o
  // descritivo que a Cintia exigiu em 07/09 ("não pode ser só a linha da conta").
  let y = 38;
  for (const v of lista) {
    const num = v.numero != null ? `#${v.numero}` : "Venda";
    const cab = `${dia(v.data)}  ·  ${num}${v.pet ? `  ·  ${v.pet}` : ""}  —  ${situacaoDa(v)}`;
    const linhas = (v.itens || []).map((it) => {
      const q = Number(it.quantidade) || 1;
      const total = it.valorTotal != null ? Number(it.valorTotal) : q * (Number(it.valorUnitario) || 0);
      return [it.descricao || "Item", String(q), BRL(total)];
    });
    autoTable(doc, {
      startY: y,
      head: [[{ content: cab, colSpan: 3, styles: { halign: "left", fillColor: TEAL, textColor: 255, fontStyle: "bold" } }]],
      body: linhas.length ? linhas : [["Sem itens lançados", "", ""]],
      foot: [[
        { content: Number(v.pago || 0) > 0.009 ? `Pago ${BRL(v.pago)} · falta ${BRL(abertoDe(v))}` : "Subtotal", colSpan: 2, styles: { halign: "right" } },
        { content: BRL(v.valor), styles: { halign: "right", fontStyle: "bold" } },
      ]],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: { 1: { halign: "center", cellWidth: 14 }, 2: { halign: "right", cellWidth: 30 } },
      footStyles: { fillColor: [246, 242, 234], textColor: 60, fontStyle: "normal" },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  const total = lista.reduce((s, v) => s + Number(v.valor || 0), 0);
  const recebido = lista.reduce((s, v) => s + Number(v.pago || 0), 0);
  const emAberto = Math.max(0, total - recebido);

  if (lista.length === 0) {
    doc.setFontSize(11); doc.setTextColor(120, 120, 120);
    doc.text(opts.apenasEmAberto ? "Não há contas em aberto." : "Nenhuma venda registrada.", 14, y + 4);
    y += 10;
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...NAVY);
  doc.text(`Total: ${BRL(total)}`, 196, y + 4, { align: "right" });
  if (recebido > 0.009) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(15, 110, 86);
    doc.text(`Já recebido: ${BRL(recebido)}`, 196, y + 10, { align: "right" });
  }
  if (emAberto > 0.009) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...VERM);
    doc.text(`Saldo devedor: ${BRL(emAberto)}`, 196, y + (recebido > 0.009 ? 16 : 10), { align: "right" });
  }

  const limpo = (opts.cliente || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const nome = `${opts.apenasEmAberto ? "contas-em-aberto" : "extrato"}-${limpo}.pdf`;
  return { blob: doc.output("blob"), nome };
}
