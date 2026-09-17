// RECIBO DE PAGAMENTO — no timbrado da clínica (Cintia, 17/09/2026: "Tem como emitirmos recibo
// direto pelo sistema? Com o timbrado?").
//
// O comprovante de venda (venda-print) mostra o que o cliente COMPROU. O recibo é do que ele
// PAGOU: valor recebido, por extenso, a forma com o parcelamento e a data da baixa. Sai UMA via
// (decisão dela) e COM o descritivo dos serviços ("as pessoas vão pedir").
//
// Um pagamento que quitou várias vendas sai num recibo só, com as vendas citadas.
import { imprimirDocumento } from "@/lib/print";
import { carregarPetTutorParaImpressao } from "@/lib/documentos/petCompleto";
import { valorPorExtenso } from "@/lib/documentos/valorPorExtenso";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type BaixaDoRecibo = {
  /** Recebimento: valor, data, formas e desconto. */
  valorTotal?: number | null;
  data?: string | null;
  formas?: any;
  desconto?: number | null;
  descontoItens?: { valor?: number | null }[] | null;
  /** A venda quitada por esta baixa. */
  appointment?: { id?: string; numeroVenda?: number | null; petId?: string | null; pet?: { name?: string | null } | null; tutor?: { id?: string; name?: string | null } | null } | null;
};

const formasDe = (f: any): any[] => (Array.isArray(f) ? f.flat() : []).filter((x: any) => x && typeof x === "object" && !Array.isArray(x));

const rotuloDaForma = (f: any) => {
  const n = Math.trunc(Number(f?.parcelas) || 0);
  const detalhe = [f?.modalidade, n > 1 ? `${n}x` : null, f?.bandeira].filter(Boolean).join(" · ");
  return `${f?.forma || "Sem forma"}${detalhe ? ` (${detalhe})` : ""}`;
};

const dataPorExtenso = (d: any) => {
  const dt = d ? new Date(d) : new Date();
  const s = dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Fortaleza" });
  return s.replace(" de ", " de ");
};

/**
 * Imprime o recibo das baixas recebidas (uma ou várias do mesmo pagamento).
 * Busca os itens de cada venda para o descritivo; venda sem itens sai só com o número.
 */
export async function imprimirRecibo(baixas: BaixaDoRecibo[], opts?: { preview?: boolean }) {
  const lista = (baixas || []).filter(Boolean);
  if (!lista.length) return;

  const total = lista.reduce((s, b) => s + (Number(b.valorTotal) || 0), 0);
  const desconto = lista.reduce(
    (s, b) => s + (Number(b.desconto) || 0) + (Array.isArray(b.descontoItens) ? b.descontoItens.reduce((x, d) => x + (Number(d?.valor) || 0), 0) : 0),
    0,
  );
  const formas = lista.flatMap((b) => formasDe(b.formas));
  const formasStr = [...new Set(formas.map(rotuloDaForma))].join(" + ");

  const primeira = lista[0];
  const tutorFallback = primeira.appointment?.tutor?.name ? { name: primeira.appointment.tutor.name, id: primeira.appointment.tutor.id } : undefined;
  const petIdV = primeira.appointment?.petId || undefined;
  const { pet: petObj, tutor: tutorObj } = await carregarPetTutorParaImpressao(petIdV, primeira.appointment?.pet || undefined, tutorFallback);

  // O descritivo: os itens de cada venda quitada.
  const blocos: string[] = [];
  for (const b of lista) {
    const id = b.appointment?.id;
    let itens: any[] = [];
    if (id) {
      try {
        const v = await fetch(`/api/appointments/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
        itens = (v?.items || v?.itens || []) as any[];
      } catch { /* sem rede: o recibo sai sem o descritivo desta venda */ }
    }
    const numero = b.appointment?.numeroVenda != null ? `Venda nº ${b.appointment.numeroVenda}` : "Venda";
    const petNome = b.appointment?.pet?.name ? ` · ${esc(b.appointment.pet.name)}` : "";
    const linhas = itens.length
      ? itens.map((it: any) => {
          const q = Number(it.quantidade ?? 1);
          const vt = Number(it.valorTotal ?? Number(it.valorUnitario || 0) * q);
          return `<tr><td style="padding:5px 8px;border-bottom:1px solid #eee">${esc(it.descricao || it.nome || "Item")}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center">${q}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right">${BRL(vt)}</td></tr>`;
        }).join("")
      : `<tr><td colspan="3" style="padding:5px 8px;color:#5C6B70">Serviços e produtos veterinários.</td></tr>`;
    blocos.push(`<div style="margin-top:10px">
      <div style="font-size:12px;font-weight:600;color:#014D5E">${esc(numero)}${petNome}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <thead><tr>
          <th style="text-align:left;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Serviço / produto</th>
          <th style="text-align:center;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Qtd</th>
          <th style="text-align:right;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Valor</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`);
  }

  const cpf = tutorObj?.cpf ? `, CPF ${esc(tutorObj.cpf)}` : "";
  const nomeTutor = esc(tutorObj?.name || primeira.appointment?.tutor?.name || "Cliente");
  const animal = petObj?.name ? ` prestados ao animal ${esc(petObj.name)}` : "";
  const numeros = lista.map((b) => b.appointment?.numeroVenda).filter((n) => n != null);
  const refVendas = numeros.length ? ` (venda${numeros.length > 1 ? "s" : ""} nº ${numeros.join(", ")})` : "";

  const body = `
  <div style="font-size:13px;line-height:1.7;color:#1F2A2E">
    <p style="margin:0 0 10px">Recebi de <b>${nomeTutor}</b>${cpf} a quantia de <b>${BRL(total)}</b>
    (${esc(valorPorExtenso(total))}), referente a serviços e produtos veterinários${animal}${refVendas}.</p>
    ${formasStr ? `<div style="font-size:12.5px"><b>Forma de pagamento:</b> ${esc(formasStr)}</div>` : ""}
    ${desconto > 0.009 ? `<div style="font-size:12.5px"><b>Desconto concedido:</b> ${BRL(desconto)}</div>` : ""}
    <div style="font-size:12.5px"><b>Data do pagamento:</b> ${new Date(primeira.data || Date.now()).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</div>
    ${blocos.join("")}
    <div style="margin-top:14px;text-align:right;font-size:13px"><b>Total recebido: ${BRL(total)}</b></div>
    <p style="margin:26px 0 0;text-align:center;font-size:12.5px">Fortaleza, ${esc(dataPorExtenso(primeira.data))}</p>
    <div style="margin:34px auto 0;width:320px;border-top:1px solid #9aa3a7;text-align:center;padding-top:5px;font-size:11.5px;color:#5C6B70">
      Assinatura
    </div>
  </div>`;

  await imprimirDocumento("Recibo", body, undefined, { pet: petObj, tutor: tutorObj }, { preview: opts?.preview });
}
