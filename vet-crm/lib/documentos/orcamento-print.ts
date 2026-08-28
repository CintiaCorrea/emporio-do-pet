import { imprimirDocumento } from "@/lib/print";
import { carregarPetTutorParaImpressao } from "@/lib/documentos/petCompleto";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

const ST_LABEL: Record<string, string> = { RASCUNHO: "Rascunho", APROVADO: "Aprovado", RECUSADO: "Recusado", EXPIRADO: "Expirado" };

/**
 * Imprime um orçamento com o TIMBRADO OFICIAL da clínica (o MESMO das receitas/documentos/vendas).
 * O `orc` deve trazer itens + pet + tutor (o backend já inclui via ORC_INCLUDE).
 */
export async function imprimirOrcamento(orc: any) {
  const itens: any[] = Array.isArray(orc?.itens) ? orc.itens : [];
  const linhas = itens.map((it) => {
    const nome = it.descricao || it.servico?.nome || it.product?.name || "Item";
    const qtd = Number(it.quantidade ?? 1);
    const vu = Number(it.valorUnitario ?? 0);
    const desc = Number(it.desconto ?? 0);
    const tot = Number(it.valorTotal ?? Math.max(0, qtd * vu - desc));
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(nome)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${qtd}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${BRL(vu)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${desc ? BRL(desc) : "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${BRL(tot)}</td>
    </tr>`;
  }).join("");

  const total = Number(orc?.valorTotal ?? itens.reduce((s, it) => s + Number(it.valorTotal ?? 0), 0));
  const statusLbl = ST_LABEL[String(orc?.status || "")] || orc?.status || "";
  const meta = [`Emitido em ${dataBR(orc?.createdAt || new Date())}`, orc?.validade ? `Válido até ${dataBR(orc.validade)}` : "", statusLbl ? esc(statusLbl) : ""].filter(Boolean).join(" · ");

  const body = `
    <div style="font-size:12px;color:#6B7280;margin-bottom:12px">${meta}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#F3F0E8">
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #009AAC">Item</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #009AAC">Qtd</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #009AAC">Valor</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #009AAC">Desconto</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #009AAC">Total</th>
        </tr>
      </thead>
      <tbody>${linhas || `<tr><td colspan="5" style="padding:10px;text-align:center;color:#9aa0a8">Sem itens</td></tr>`}</tbody>
    </table>
    <div style="text-align:right;margin-top:12px;font-size:15px;font-weight:700;color:#014D5E">Total: ${BRL(total)}</div>
    ${orc?.observacao ? `<div style="margin-top:16px;font-size:12.5px;color:#374151;white-space:pre-wrap"><b>Observação:</b> ${esc(orc.observacao)}</div>` : ""}
  `;

  // Cabeçalho COMPLETO (padrão receita): busca o pet inteiro pelo id quando houver.
  const { pet, tutor } = await carregarPetTutorParaImpressao(orc?.pet?.id || orc?.petId, orc?.pet, orc?.tutor);
  await imprimirDocumento("Orçamento", body, undefined, { pet, tutor });
}
