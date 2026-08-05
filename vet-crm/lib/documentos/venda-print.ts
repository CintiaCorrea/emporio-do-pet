import { imprimirDocumento } from "@/lib/print";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

/**
 * Imprime o COMPROVANTE de uma venda com o timbrado padrão da clínica.
 * `v` aceita o formato da Consulta de vendas (itens, valor, cliente, pet, numeroVenda)
 * ou um objeto montado na comanda ({ itens, valor, petNome, tutorNome }).
 */
export async function imprimirVenda(v: any) {
  const itens: any[] = Array.isArray(v?.itens) ? v.itens : [];
  const linhas = itens.map((it) => {
    const nome = it.descricao || it.nome || it.product?.name || "Item";
    const qtd = Number(it.quantidade ?? 1);
    const vu = Number(it.valorUnitario ?? it.valor ?? 0);
    const tot = Number(it.valorTotal ?? Math.max(0, qtd * vu));
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(nome)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${qtd}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${BRL(vu)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${BRL(tot)}</td>
    </tr>`;
  }).join("");

  const total = Number(v?.valor ?? v?.value ?? v?.valorTotal ?? itens.reduce((s, it) => s + Number(it.valorTotal ?? 0), 0));
  const num = v?.numeroVenda != null ? `#${v.numeroVenda}` : (v?.codigoExterno ? `SV ${v.codigoExterno}` : "");
  const petNome = v?.petNome || v?.pet?.name || v?.pet || "";
  const tutorNome = v?.tutorNome || v?.tutor?.name || v?.cliente || "";

  const body = `
    <h2 style="color:#014D5E;margin:0 0 4px">Comprovante de venda ${esc(num)}</h2>
    <div style="font-size:12px;color:#6B7280;margin-bottom:14px">
      ${dataBR(v?.date || v?.createdAt || new Date())}${v?.paymentMethod ? ` · ${esc(v.paymentMethod)}` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#F3F0E8">
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #009AAC">Item</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #009AAC">Qtd</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #009AAC">Valor</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #009AAC">Total</th>
        </tr>
      </thead>
      <tbody>${linhas || `<tr><td colspan="4" style="padding:10px;text-align:center;color:#9aa0a8">Sem itens</td></tr>`}</tbody>
    </table>
    <div style="text-align:right;margin-top:12px;font-size:15px;font-weight:700;color:#014D5E">Total: ${BRL(total)}</div>
    <div style="margin-top:22px;font-size:12px;color:#6B7280">Obrigado pela preferência! 🐾</div>
  `;

  await imprimirDocumento(`Comprovante de venda ${num}`, body, undefined, { pet: petNome ? { name: petNome } : undefined, tutor: tutorNome ? { name: tutorNome } : undefined });
}
