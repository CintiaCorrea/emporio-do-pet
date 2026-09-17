// RECIBO DE PAGAMENTO EM PAPEL — no timbrado da clínica (Cintia, 17/09/2026: "Tem como
// emitirmos recibo direto pelo sistema? Com o timbrado?").
//
// O comprovante de venda (venda-print) mostra o que o cliente COMPROU. O recibo é do que ele
// PAGOU: valor recebido, por extenso, a forma com o parcelamento e a data da baixa. Sai UMA via
// (decisão dela) e COM o descritivo dos serviços ("as pessoas vão pedir").
//
// Os dados vêm de `recibo.montarDadosDoRecibo` — os mesmos do PDF do WhatsApp.
import { imprimirDocumento } from "@/lib/print";
import { fraseDoRecibo, montarDadosDoRecibo, type BaixaDoRecibo } from "@/lib/documentos/recibo";

export type { BaixaDoRecibo };

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => new Date(d || Date.now()).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
const dataExtenso = (d: any) =>
  new Date(d || Date.now()).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Fortaleza" });

/** Imprime o recibo das baixas recebidas (uma, ou várias do mesmo pagamento). */
export async function imprimirRecibo(baixas: BaixaDoRecibo[], opts?: { preview?: boolean }) {
  const d = await montarDadosDoRecibo(baixas);
  if (!d) return;

  const blocos = d.vendas.map((v) => {
    const linhas = v.itens.length
      ? v.itens.map((it) => `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid #eee">${esc(it.descricao)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantidade}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right">${BRL(it.valorTotal)}</td></tr>`).join("")
      : `<tr><td colspan="3" style="padding:5px 8px;color:#5C6B70">Serviços e produtos veterinários.</td></tr>`;
    return `<div style="margin-top:10px">
      <div style="font-size:12px;font-weight:600;color:#014D5E">${v.numero != null ? `Venda nº ${v.numero}` : "Venda"}${v.pet ? ` · ${esc(v.pet)}` : ""}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <thead><tr>
          <th style="text-align:left;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Serviço / produto</th>
          <th style="text-align:center;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Qtd</th>
          <th style="text-align:right;padding:4px 8px;background:#F7F4EC;font-size:10.5px;color:#5C6B70">Valor</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
  }).join("");

  const body = `
  <div style="font-size:13px;line-height:1.7;color:#1F2A2E">
    <p style="margin:0 0 10px">${esc(fraseDoRecibo(d))}</p>
    ${d.formasStr ? `<div style="font-size:12.5px"><b>Forma de pagamento:</b> ${esc(d.formasStr)}</div>` : ""}
    ${d.desconto > 0.009 ? `<div style="font-size:12.5px"><b>Desconto concedido:</b> ${BRL(d.desconto)}</div>` : ""}
    <div style="font-size:12.5px"><b>Data do pagamento:</b> ${dataBR(d.data)}</div>
    ${blocos}
    <div style="margin-top:14px;text-align:right;font-size:13px"><b>Total recebido: ${BRL(d.total)}</b></div>
    <p style="margin:26px 0 0;text-align:center;font-size:12.5px">Fortaleza, ${esc(dataExtenso(d.data))}</p>
    <div style="margin:34px auto 0;width:320px;border-top:1px solid #9aa3a7;text-align:center;padding-top:5px;font-size:11.5px;color:#5C6B70">
      Assinatura
    </div>
  </div>`;

  await imprimirDocumento("Recibo", body, undefined, { pet: d.pet, tutor: d.tutor }, { preview: opts?.preview });
}
