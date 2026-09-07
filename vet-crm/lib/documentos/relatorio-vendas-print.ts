import { imprimirDocumento } from "@/lib/print";
import { agruparPorCliente, LinhaVendaRelatorio } from "@/lib/relatorioVendas";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };

const TD = "padding:5px 8px;border-bottom:1px solid #eee";
const TH = "padding:5px 8px;text-align:left;border-bottom:2px solid #009AAC;font-size:11.5px;color:#014D5E";

/** Uma seção (Vendas ou Orçamentos), já agrupada por cliente, com subtotal em cada um. */
function secao(titulo: string, linhas: LinhaVendaRelatorio[], mostrarPago: boolean): string {
  const r = agruparPorCliente(linhas);
  if (!r.quantidade) return "";

  const blocos = r.grupos.map((g) => {
    const corpo = g.linhas.map((l) => {
      const total = Number(l.valor) || 0;
      const pago = Math.min(Number(l.pago) || 0, total);
      return `<tr>
        <td style="${TD};white-space:nowrap">${l.numero != null && l.numero !== "" ? `#${esc(l.numero)}` : "—"}</td>
        <td style="${TD};white-space:nowrap">${esc(dataBR(l.data))}</td>
        <td style="${TD}">${esc(l.pet || "—")}</td>
        <td style="${TD};text-align:right">${BRL(total)}</td>
        ${mostrarPago ? `<td style="${TD};text-align:right;color:#0F6E56">${pago ? BRL(pago) : "—"}</td>
        <td style="${TD};text-align:right;font-weight:600">${BRL(Math.max(0, total - pago))}</td>` : ""}
      </tr>`;
    }).join("");

    // Um cliente por bloco, com o nome em cima: é o papel que se confere junto com ele.
    return `<div style="margin-bottom:14px;break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:baseline;background:#F3F0E8;padding:5px 8px;border-radius:6px 6px 0 0">
        <b style="color:#014D5E;font-size:13px">${esc(g.tutor)}</b>
        <span style="font-size:11.5px;color:#6B7280">${g.linhas.length} ${g.linhas.length > 1 ? "contas" : "conta"} · ${mostrarPago ? `a receber <b style="color:#014D5E">${BRL(g.aReceber)}</b>` : `<b style="color:#014D5E">${BRL(g.total)}</b>`}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr>
          <th style="${TH}">Nº</th><th style="${TH}">Data</th><th style="${TH}">Pet</th>
          <th style="${TH};text-align:right">Valor</th>
          ${mostrarPago ? `<th style="${TH};text-align:right">Pago</th><th style="${TH};text-align:right">A receber</th>` : ""}
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;
  }).join("");

  const rodape = mostrarPago
    ? `<span>Total ${BRL(r.total)}</span> · <span style="color:#0F6E56">Pago ${BRL(r.pago)}</span> · <b style="color:#014D5E">A receber ${BRL(r.aReceber)}</b>`
    : `<b style="color:#014D5E">Total ${BRL(r.total)}</b>`;

  return `<h3 style="font-size:14px;margin:0 0 8px">${esc(titulo)} <span style="font-weight:400;color:#6B7280;font-size:12px">· ${r.quantidade} ${r.quantidade > 1 ? "registros" : "registro"} · ${r.grupos.length} ${r.grupos.length > 1 ? "clientes" : "cliente"}</span></h3>
    ${blocos}
    <div style="text-align:right;font-size:13px;margin:-4px 0 20px">${rodape}</div>`;
}

/**
 * Imprime o relatório de vendas/orçamentos AGRUPADO POR CLIENTE, no timbrado da clínica.
 *
 * Pedido da Cintia (07/09/2026): "principalmente quando temos muitas vendas abertas". Por isso
 * o relatório sai por cliente, com o quanto falta receber em cada um — e sai INTEIRO, sem o
 * corte de 8 linhas que a tela faz.
 */
export async function imprimirRelatorioVendas(args: {
  titulo?: string;
  subtitulo?: string;
  vendas?: LinhaVendaRelatorio[];
  orcamentos?: LinhaVendaRelatorio[];
  /** Quando o relatório é de UM cliente, sai também o quadro dele no timbrado. */
  tutor?: any;
  pet?: any;
  preview?: boolean;
}): Promise<void> {
  const vendas = Array.isArray(args.vendas) ? args.vendas : [];
  const orcamentos = Array.isArray(args.orcamentos) ? args.orcamentos : [];
  const titulo = args.titulo || "Relatório de vendas";

  const corpoVendas = secao("Vendas", vendas, true);
  const corpoOrcs = secao("Orçamentos", orcamentos, false);
  const vazio = !corpoVendas && !corpoOrcs;

  const body = `
    ${args.subtitulo ? `<div style="font-size:12px;color:#6B7280;margin-bottom:14px">${esc(args.subtitulo)}</div>` : ""}
    ${corpoVendas}
    ${corpoOrcs}
    ${vazio ? `<p style="text-align:center;color:#9aa0a8;font-size:13px;padding:24px 0">Nada a listar neste filtro.</p>` : ""}
    <div style="margin-top:18px;font-size:11px;color:#9aa0a8">Emitido em ${new Date().toLocaleString("pt-BR")}</div>
  `;

  await imprimirDocumento(titulo, body, undefined, { pet: args.pet, tutor: args.tutor }, { preview: args.preview });
}
