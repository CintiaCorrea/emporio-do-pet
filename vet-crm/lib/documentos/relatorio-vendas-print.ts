import { imprimirDocumento } from "@/lib/print";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };
const hora = (d: any) => { if (!d) return ""; try { return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const diaDe = (d: any) => { try { return new Date(d).toISOString().slice(0, 10); } catch { return ""; } };

const TD = "padding:5px 8px;border-bottom:1px solid #eee";
const TH = "padding:5px 8px;text-align:left;border-bottom:2px solid #009AAC;font-size:11.5px;color:#014D5E";

/** Uma comanda, já com os itens que ela cobrou. */
export type ComandaDoDia = {
  id?: string;
  numero?: number | string | null;
  data?: string;
  tutor?: string;
  pet?: string;
  valor?: number;
  pago?: number;
  observacao?: string | null;
  formaPagamento?: string | null;
  itens?: { descricao?: string; quantidade?: number; valorUnitario?: number; desconto?: number }[];
};

/**
 * O BLOCO DE UMA COMANDA — cabeçalho, itens, observação e total.
 *
 * Existe uma vez só porque a Cintia (07/09/2026) recusou o papel que trazia apenas a linha da
 * conta: "Precisa vir o descritivo de cada dia, não pode ser assim. Já tinha dito isso."
 * Todo papel de venda desta casa mostra O QUE FOI COBRADO — não só quanto.
 */
function blocoDaComanda(c: ComandaDoDia): string {
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const valor = Number(c.valor) || 0;
  const pago = Math.min(Number(c.pago) || 0, valor);
  const falta = Math.max(0, valor - pago);
  const situacao = falta <= 0.009 ? "Paga" : pago > 0 ? `Parcial · falta ${BRL(falta)}` : "Em aberto";
  const corSit = falta <= 0.009 ? "#0F6E56" : pago > 0 ? "#8a6400" : "#b23b39";

  const linhas = itens.map((it) => {
    const q = Number(it.quantidade) || 1;
    const vu = Number(it.valorUnitario) || 0;
    const desc = Number(it.desconto) || 0;
    return `<tr>
      <td style="${TD}">${esc(it.descricao || "Item")}</td>
      <td style="${TD};text-align:center;white-space:nowrap">${q}</td>
      <td style="${TD};text-align:right;white-space:nowrap">${BRL(vu)}</td>
      ${desc ? `<td style="${TD};text-align:right;white-space:nowrap;color:#8a6400">-${BRL(desc)}</td>` : `<td style="${TD};text-align:right;color:#c9c4b8">—</td>`}
      <td style="${TD};text-align:right;white-space:nowrap;font-weight:600">${BRL(Math.max(0, q * vu - desc))}</td>
    </tr>`;
  }).join("");

  // Comanda sem item aparece assim mesmo: sumir da conferência é pior do que aparecer vazia.
  const corpo = linhas || `<tr><td colspan="5" style="${TD};text-align:center;color:#9aa0a8">Sem itens lançados</td></tr>`;

  return `<div style="margin-bottom:13px;break-inside:avoid;page-break-inside:avoid;border:1px solid #E4DCCC;border-radius:6px;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;background:#F3F0E8;padding:5px 9px">
      <b style="color:#014D5E;font-size:12.5px">${c.numero != null && c.numero !== "" ? `#${esc(c.numero)}` : "Comanda"} · ${esc(hora(c.data))} · ${esc(c.tutor || "Cliente")}${c.pet ? ` · ${esc(c.pet)}` : ""}</b>
      <span style="font-size:11.5px;color:${corSit};font-weight:700;white-space:nowrap">${esc(situacao)}${c.formaPagamento ? ` · ${esc(c.formaPagamento)}` : ""}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th style="${TH}">Item</th><th style="${TH};text-align:center">Qtd</th>
        <th style="${TH};text-align:right">Valor</th><th style="${TH};text-align:right">Desc.</th>
        <th style="${TH};text-align:right">Total</th>
      </tr></thead>
      <tbody>${corpo}</tbody>
    </table>
    ${c.observacao ? `<div style="font-size:11.5px;color:#374151;padding:5px 9px;border-top:1px solid #F0EBE0"><b>Obs:</b> ${esc(c.observacao)}</div>` : ""}
    <div style="text-align:right;font-size:12.5px;padding:5px 9px;border-top:1px solid #F0EBE0;background:#FBF9F4">
      Total <b style="color:#014D5E">${BRL(valor)}</b>${pago ? ` · pago <b style="color:#0F6E56">${BRL(pago)}</b>` : ""}
    </div>
  </div>`;
}

const somaDe = (comandas: ComandaDoDia[]) => comandas.reduce((acc, c) => {
  const valor = Number(c.valor) || 0;
  const pago = Math.min(Number(c.pago) || 0, valor);
  return { total: acc.total + valor, recebido: acc.recebido + pago };
}, { total: 0, recebido: 0 });

const rodape = (total: number, recebido: number) =>
  `<div style="display:flex;justify-content:flex-end;gap:14px;font-size:13px;margin-top:4px">
     <span>Total <b style="color:#014D5E">${BRL(total)}</b></span>
     ${recebido ? `<span>Recebido <b style="color:#0F6E56">${BRL(recebido)}</b></span>` : ""}
     <span>A receber <b style="color:#b23b39">${BRL(Math.max(0, total - recebido))}</b></span>
   </div>`;

const emitido = () => `<div style="margin-top:18px;font-size:11px;color:#9aa0a8">Emitido em ${new Date().toLocaleString("pt-BR")}</div>`;

/**
 * AS COMANDAS DO DIA, uma a uma, com os itens de cada — o modelo do SimplesVet.
 *
 * Pedido da Cintia (07/09/2026): "o relatório é para ser impresso as comandas por dia, como no
 * simplesvet". É o papel do fechamento do dia, conferido linha a linha.
 */
export async function imprimirComandasDoDia(args: {
  dia: string;
  /** Fim do período, quando o papel cobre mais de um dia. */
  ate?: string;
  comandas: ComandaDoDia[];
  preview?: boolean;
}): Promise<void> {
  const comandas = (Array.isArray(args.comandas) ? args.comandas : [])
    .slice()
    .sort((a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime());
  const { total, recebido } = somaDe(comandas);

  // Um dia por seção, sempre — com um dia só, é o papel do fechamento; com um período, é o
  // mesmo papel repetido, dia a dia, que é como a conferência acontece.
  const dias = new Map<string, ComandaDoDia[]>();
  for (const c of comandas) dias.set(diaDe(c.data), [...(dias.get(diaDe(c.data)) || []), c]);

  const secoes = [...dias.entries()].map(([d, cs]) => {
    const soma = somaDe(cs);
    return `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #009AAC;padding-bottom:3px;margin-bottom:8px">
        <b style="color:#014D5E;font-size:13.5px">${esc(dataBR(d + "T12:00:00"))}</b>
        <span style="font-size:11.5px;color:#6B7280">${cs.length} ${cs.length === 1 ? "comanda" : "comandas"} · ${BRL(soma.total)}${soma.total - soma.recebido > 0.009 ? ` · a receber <b style="color:#b23b39">${BRL(soma.total - soma.recebido)}</b>` : ""}</span>
      </div>
      ${cs.map(blocoDaComanda).join("")}
    </div>`;
  }).join("");

  const periodo = dias.size > 1
    ? `${dataBR((args.dia || "") + "T12:00:00") || "—"} a ${dataBR((args.ate || args.dia || "") + "T12:00:00")}`
    : dataBR(([...dias.keys()][0] || args.dia || "") + "T12:00:00") || dataBR(new Date());

  const body = `
    <div style="margin-bottom:14px;font-size:12.5px;color:#6B7280">
      ${comandas.length} ${comandas.length === 1 ? "comanda" : "comandas"} · ${esc(periodo)}
    </div>
    ${secoes || `<p style="text-align:center;color:#9aa0a8;font-size:13px;padding:24px 0">Nenhuma comanda no período.</p>`}
    ${comandas.length ? rodape(total, recebido) : ""}
    ${emitido()}
  `;
  await imprimirDocumento(dias.size > 1 ? `Comandas · ${periodo}` : `Comandas do dia ${periodo}`, body, undefined, undefined, { preview: args.preview, compacto: true });
}

/**
 * AS CONTAS EM ABERTO DE UM CLIENTE, agrupadas POR DIA e com o descritivo de cada uma.
 *
 * É o papel que se confere com o cliente que deve de vários dias. A primeira versão saiu só com
 * a linha da conta ("#1081 · 29/08 · Lua · R$ 2.271,06") e foi recusada com razão: sem o
 * descritivo, o cliente não tem como saber pelo que está pagando.
 */
export async function imprimirContasDoCliente(args: {
  tutor: string;
  comandas: ComandaDoDia[];
  preview?: boolean;
}): Promise<void> {
  const comandas = (Array.isArray(args.comandas) ? args.comandas : [])
    .slice()
    .sort((a, b) => new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime());
  const { total, recebido } = somaDe(comandas);

  // Um subtítulo por DIA: é assim que o cliente lê a própria conta ("o que foi feito no dia 29").
  const dias = new Map<string, ComandaDoDia[]>();
  for (const c of comandas) dias.set(diaDe(c.data), [...(dias.get(diaDe(c.data)) || []), c]);

  const secoes = [...dias.entries()].map(([d, cs]) => {
    const soma = somaDe(cs);
    return `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #009AAC;padding-bottom:3px;margin-bottom:8px">
        <b style="color:#014D5E;font-size:13.5px">${esc(dataBR(d + "T12:00:00"))}</b>
        <span style="font-size:11.5px;color:#6B7280">${cs.length} ${cs.length === 1 ? "comanda" : "comandas"} · a receber <b style="color:#b23b39">${BRL(Math.max(0, soma.total - soma.recebido))}</b></span>
      </div>
      ${cs.map(blocoDaComanda).join("")}
    </div>`;
  }).join("");

  const body = `
    <div style="margin-bottom:14px;font-size:13px">
      <b style="color:#014D5E;font-size:15px">${esc(args.tutor || "Cliente")}</b>
      <div style="color:#6B7280;font-size:12px">${comandas.length} ${comandas.length === 1 ? "conta em aberto" : "contas em aberto"} · ${dias.size} ${dias.size === 1 ? "dia" : "dias"}</div>
    </div>
    ${secoes || `<p style="text-align:center;color:#9aa0a8;font-size:13px;padding:24px 0">Nenhuma conta em aberto.</p>`}
    ${comandas.length ? rodape(total, recebido) : ""}
    ${emitido()}
  `;
  await imprimirDocumento(`Contas em aberto · ${args.tutor || "Cliente"}`, body, undefined, undefined, { preview: args.preview, compacto: true });
}
