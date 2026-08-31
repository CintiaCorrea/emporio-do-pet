import { imprimirDocumento } from "@/lib/print";
import { carregarPetTutorParaImpressao } from "@/lib/documentos/petCompleto";
import { carregarComposicaoPacotes, itensDoPacote } from "@/lib/documentos/pacotes";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

/**
 * Imprime o comprovante de uma venda com o TIMBRADO OFICIAL da clínica (o MESMO das receitas
 * e documentos — logo + endereço + título + quadro do animal). Padrão único pedido pela Cintia (16/08).
 * `v` aceita o formato da Consulta de vendas (itens, valor, cliente, pet, numeroVenda) ou um objeto
 * montado na comanda/PDV ({ itens, valor, petNome/pet, tutorNome/tutor, observacao }).
 */
export async function imprimirVenda(v: any, opts?: { rotulo?: string; preview?: boolean }) {
  // Título correto conforme o tipo: "Venda" ou "Orçamento" (não mais "Comprovante de venda").
  const rotulo = opts?.rotulo || (/or[çc]amento/i.test(String(v?.type || v?.tipo || "")) ? "Orçamento" : "Venda");
  const itens: any[] = Array.isArray(v?.itens) ? v.itens : [];
  const pacMap = await carregarComposicaoPacotes();
  const linhas = itens.map((it) => {
    const nome = it.descricao || it.nome || it.product?.name || "Item";
    const qtd = Number(it.quantidade ?? 1);
    const vu = Number(it.valorUnitario ?? it.valor ?? 0);
    const tot = Number(it.valorTotal ?? Math.max(0, qtd * vu));
    // Pacote: mostra o TOTAL e, embaixo, a lista "Inclui" (itens que compõem) SEM preço.
    const comp = itensDoPacote(pacMap, nome);
    const linhaInclui = comp ? `<tr>
      <td colspan="4" style="padding:0 8px 8px 8px;border-bottom:1px solid #eee">
        <div style="border-left:2px solid #BEE3E8;padding:3px 0 1px 9px;margin-top:1px">
          <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#0E5560;margin-bottom:2px">Inclui</div>
          <div style="font-size:11.5px;color:#5C6B70">${comp.map((c) => `${c.quantidade > 1 ? c.quantidade + "× " : ""}${esc(c.nome)}`).join(" · ")}</div>
        </div>
      </td>
    </tr>` : "";
    return `<tr>
      <td style="padding:6px 8px;${comp ? "" : "border-bottom:1px solid #eee;"}font-weight:${comp ? 700 : 400}">${esc(nome)}</td>
      <td style="padding:6px 8px;${comp ? "" : "border-bottom:1px solid #eee;"}text-align:center">${qtd}</td>
      <td style="padding:6px 8px;${comp ? "" : "border-bottom:1px solid #eee;"}text-align:right">${BRL(vu)}</td>
      <td style="padding:6px 8px;${comp ? "" : "border-bottom:1px solid #eee;"}text-align:right;font-weight:600">${BRL(tot)}</td>
    </tr>${linhaInclui}`;
  }).join("");

  const total = Number(v?.valor ?? v?.value ?? v?.valorTotal ?? itens.reduce((s, it) => s + Number(it.valorTotal ?? 0), 0));
  // #3 (Cintia): o título leva SÓ o rótulo (Venda/Orçamento/Comanda), sem o número.
  // pet/tutor: busca o pet COMPLETO pelo id (cabeçalho cheio, padrão receita); senão usa o que veio.
  const petIdV = v?.petId || (v?.pet && typeof v.pet === "object" ? v.pet.id : undefined);
  const petFallback = v?.pet && typeof v.pet === "object" ? v.pet : (v?.petNome || (typeof v?.pet === "string" ? v.pet : "") ? { name: v.petNome || v.pet } : undefined);
  const tutorFallback = v?.tutor && typeof v.tutor === "object" ? v.tutor : (v?.tutorNome || v?.cliente ? { name: v.tutorNome || v.cliente } : undefined);
  const { pet: petObj, tutor: tutorObj } = await carregarPetTutorParaImpressao(petIdV, petFallback, tutorFallback);

  // Forma de recebimento (quando a venda foi paga): "Infinity PIX", "Dinheiro", "Cartão 3x"…
  const formasArr = Array.isArray(v?.formas) ? (v.formas as any[]).flat().filter((f: any) => f && typeof f === "object" && !Array.isArray(f)) : [];
  const formasStr = formasArr.length
    ? formasArr.map((f: any) => `${f.forma || "—"}${Number(f.parcelas) > 1 ? ` ${f.parcelas}x` : ""}`).filter(Boolean).join(" + ")
    : (v?.paymentMethod ? String(v.paymentMethod) : "");
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
    ${formasStr ? `<div style="text-align:right;margin-top:5px;font-size:12.5px;color:#374151">Forma de recebimento: <b>${esc(formasStr)}</b></div>` : ""}
    ${v?.observacao ? `<div style="margin-top:16px;font-size:12.5px;color:#374151;white-space:pre-wrap"><b>Observação:</b> ${esc(v.observacao)}</div>` : ""}
    <div style="margin-top:22px;font-size:12px;color:#6B7280">Obrigado pela preferência! 🐾</div>
  `;

  await imprimirDocumento(rotulo, body, undefined, { pet: petObj, tutor: tutorObj }, { preview: opts?.preview });
}
