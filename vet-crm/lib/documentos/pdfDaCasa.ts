// O PAPEL TIMBRADO EM PDF — o mesmo cabeçalho para todo documento que vira ARQUIVO.
//
// O papel impresso sai por window.print() com o timbrado em HTML (lib/print + documentos/timbrado).
// O anexo do WhatsApp precisa de bytes, e aí é o jsPDF. Este arquivo existe para o recibo e o
// comprovante de venda não terem dois cabeçalhos diferentes da mesma clínica.
//
// Se a logo não carregar, o documento sai com o nome escrito — nunca falha por causa da imagem.

export const NAVY: [number, number, number] = [1, 77, 94];

export async function dadosDaClinica(): Promise<any> {
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

/** Abre um PDF A4 com o timbrado da clínica e o título centralizado. Devolve onde continuar (y). */
export async function novoPdfDaCasa(titulo: string): Promise<{ doc: any; autoTable: any; y: number; clinica: any }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const clinica = await dadosDaClinica();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = 16;
  const logo = await logoComoImagem(clinica?.logoUrl);
  if (logo) {
    const alturaMm = 16;
    const larguraMm = Math.min(70, (logo.w / logo.h) * alturaMm);
    try { doc.addImage(logo.dataUrl, 14, 10, larguraMm, alturaMm); y = 10 + alturaMm + 5; } catch { /* segue sem logo */ }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...NAVY);
  doc.text(String(clinica?.nomeFantasia || clinica?.razaoSocial || "Empório do Pet"), 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  const endereco = [
    clinica?.rua ? `${clinica.rua}${clinica?.numero ? `, ${clinica.numero}` : ""}` : "",
    clinica?.bairro,
    clinica?.cidade ? `${clinica.cidade}${clinica?.uf ? `/${clinica.uf}` : ""}` : "",
  ].filter(Boolean).join(" · ");
  if (endereco) { y += 5; doc.text(endereco, 14, y); }
  const contato = [clinica?.cnpj ? `CNPJ ${clinica.cnpj}` : "", clinica?.telefone, clinica?.whatsapp].filter(Boolean).join(" · ");
  if (contato) { y += 4.5; doc.text(contato, 14, y); }

  y += 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text(titulo, 105, y, { align: "center" });
  return { doc, autoTable, y: y + 9, clinica };
}

/** Nome de arquivo curto e sem acento: "recibo-vanessa-bezerra-1219.pdf". */
export function nomeDeArquivo(prefixo: string, quem?: string | null, sufixo?: string | number | null): string {
  const limpo = String(quem || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
  return `${prefixo}-${limpo}${sufixo ? `-${sufixo}` : ""}.pdf`;
}
