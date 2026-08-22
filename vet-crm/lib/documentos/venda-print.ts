import { imprimirDocumento } from "@/lib/print";
import { carregarPetTutorParaImpressao } from "@/lib/documentos/petCompleto";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

/**
 * Imprime o comprovante de uma venda com o TIMBRADO OFICIAL da clínica (o MESMO das receitas
 * e documentos — logo + endereço + título + quadro do animal). Padrão único pedido pela Cintia (16/08).
 * `v` aceita o formato da Consulta de vendas (itens, valor, cliente, pet, numeroVenda) ou um objeto
 * montado na comanda/PDV ({ itens, valor, petNome/pet, tutorNome/tutor, observacao }).
 */
export async function imprimirVenda(v: any, opts?: { rotulo?: string }) {
  const rotulo = opts?.rotulo || "Comprovante de venda";
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
  // pet/tutor: busca o pet COMPLETO pelo id (cabeçalho cheio, padrão receita); senão usa o que veio.
  const petIdV = v?.petId || (v?.pet && typeof v.pet === "object" ? v.pet.id : undefined);
  const petFallback = v?.pet && typeof v.pet === "object" ? v.pet : (v?.petNome || (typeof v?.pet === "string" ? v.pet : "") ? { name: v.petNome || v.pet } : undefined);
  const tutorFallback = v?.tutor && typeof v.tutor === "object" ? v.tutor : (v?.tutorNome || v?.cliente ? { name: v.tutorNome || v.cliente } : undefined);
  const { pet: petObj, tutor: tutorObj } = await carregarPetTutorParaImpressao(petIdV, petFallback, tutorFallback);

  const meta = [dataBR(v?.date || v?.createdAt || new Date()), v?.paymentMethod ? esc(v.paymentMethod) : ""].filter(Boolean).join(" · ");
  const body = `
    <div style="font-size:12px;color:#6B7280;margin-bottom:12px">${meta}</div>
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
    ${v?.observacao ? `<div style="margin-top:16px;font-size:12.5px;color:#374151"><b>Observação:</b> ${esc(v.observacao)}</div>` : ""}
    <div style="margin-top:22px;font-size:12px;color:#6B7280">Obrigado pela preferência! 🐾</div>
  `;

  await imprimirDocumento(`${rotulo} ${num}`.trim(), body, undefined, { pet: petObj, tutor: tutorObj });
}
