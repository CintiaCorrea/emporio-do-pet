import { imprimirDocumento } from "@/lib/print";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

const ORIGEM_LBL: Record<string, string> = { ATENDIMENTO: "Atendimento", VENDA: "Venda", INTERNACAO: "Internação" };

export interface VendaAberta {
  id: string;
  numeroVenda?: number | null;
  codigoExterno?: string | null;
  date: string;
  tutor?: string;
  pet?: string;
  vet?: string | null;
  origem?: string;
  valor: number;
  pago: number;
  aberto: number;
  futura?: boolean;
}

/**
 * Relatório de cobrança: TODAS as vendas em aberto de um cliente, com o timbrado da clínica.
 * Sai com valores sempre visíveis — o 👁️ da tela esconde valor pra quem passa atrás do balcão,
 * mas um relatório de cobrança sem valor não serve pra nada.
 */
export async function imprimirVendasAbertas(cliente: string, vendas: VendaAberta[]) {
  // Mais antiga primeiro: é a ordem em que a cobrança é conversada com o cliente.
  const linhas = [...vendas].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const total = linhas.reduce((s, v) => s + Number(v.aberto || v.valor || 0), 0);
  const totalPago = linhas.reduce((s, v) => s + Number(v.pago || 0), 0);
  const temParcial = totalPago > 0.001;

  const corpo = linhas.map((v) => {
    const num = v.numeroVenda != null ? `#${v.numeroVenda}` : (v.codigoExterno ? `SV ${v.codigoExterno}` : "—");
    const aberto = Number(v.aberto || v.valor || 0);
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap">${esc(dataBR(v.date))}${v.futura ? ` <span style="color:#8a6400;font-size:11px">(a cobrar)</span>` : ""}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap">${esc(num)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v.pet || "—")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(ORIGEM_LBL[v.origem || ""] || "Venda")}${v.vet ? ` · ${esc(v.vet)}` : ""}</td>
      ${temParcial ? `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#0f6e56">${BRL(v.pago)}</td>` : ""}
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${BRL(aberto)}</td>
    </tr>`;
  }).join("");

  const colunas = ["Data", "Venda", "Pet", "Origem", ...(temParcial ? ["Já pago"] : []), "Em aberto"];
  const cabecalho = colunas.map((c, i) =>
    `<th style="padding:6px 8px;text-align:${i >= colunas.length - (temParcial ? 2 : 1) ? "right" : "left"};border-bottom:2px solid #009AAC">${c}</th>`,
  ).join("");

  const body = `
    <div style="font-size:13px;color:#374151;margin-bottom:4px">Cliente: <b style="color:#014D5E">${esc(cliente || "—")}</b></div>
    <div style="font-size:12px;color:#6B7280;margin-bottom:12px">Emitido em ${esc(new Date().toLocaleString("pt-BR"))} · ${linhas.length} venda(s) em aberto</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#F3F0E8">${cabecalho}</tr></thead>
      <tbody>${corpo || `<tr><td colspan="${colunas.length}" style="padding:10px;text-align:center;color:#9aa0a8">Nenhuma venda em aberto.</td></tr>`}</tbody>
    </table>
    <div style="text-align:right;margin-top:12px;font-size:15px;font-weight:700;color:#014D5E">Total em aberto: ${BRL(total)}</div>
    ${temParcial ? `<div style="text-align:right;margin-top:4px;font-size:12.5px;color:#374151">Já recebido nestas vendas: <b>${BRL(totalPago)}</b></div>` : ""}
  `;

  await imprimirDocumento(`Vendas em aberto — ${cliente || "Cliente"}`, body);
}
