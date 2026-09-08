import { imprimirDocumento } from "@/lib/print";
import { montarResumoDoCaixa, avisoDoUsoDeCredito, avisoDoAdiantamento } from "@/lib/resumoDoCaixa";
import { agruparRecebimentos, rotuloDaVenda } from "@/lib/recebimentosDoCaixa";
import { seloDoFechamento } from "@/lib/fechamentoDoCaixa";

// O PAPEL DO CAIXA — detalhado (um caixa) e resumo (vários).
//
// Até aqui o botão "Imprimir relatório" do caixa chamava `window.print()`: saía a TELA, com
// menu, abas e botões, cortada onde a página acabasse. Não é documento, é captura.
//
// A Cintia leu o papel do SimplesVet em 08/09/2026 e marcou o que falta nele. Este arquivo
// nasce corrigindo cada uma dessas coisas — não copiando:
//
//   · "A tela mostra a condição de parcelamento e o papel não." Aqui mostra: sem o "Parcelado
//     3x" não dá pra conferir maquininha.
//   · "Não sai no papel: o bloco Comentários de revisão e o bloco Créditos utilizados." O
//     crédito utilizado é justamente a pegadinha que ela apontou (um caixa pode parecer sem
//     movimento e ter mil reais de serviço prestado). Sai no papel, fora do total.
//   · "No PDF a coluna Venda vem preenchida com a data da venda, não com o número — os rótulos
//     estão trocados em relação ao conteúdo." Aqui cada coluna tem o que o nome diz.
//   · "Sem linha de total geral" no resumo deles. Aqui tem.
//   · "A mesma forma de pagamento tem dois nomes: na tela Dinheiro, no PDF Espécie." Um nome só,
//     o mesmo da tela.
//
// O motor é o mesmo das comandas (lib/print → timbrado da clínica), de propósito: dois motores
// de impressão viram dois papéis diferentes para a mesma casa.

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dataBR = (d: any) => { if (!d) return "—"; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "—"; } };
const hora = (d: any) => { if (!d) return ""; try { return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const dataHora = (d: any) => (d ? `${dataBR(d)} ${hora(d)}` : "—");

const TD = "padding:5px 8px;border-bottom:1px solid #eee";
const TH = "padding:5px 8px;text-align:left;border-bottom:2px solid #009AAC;font-size:11.5px;color:#014D5E";
const NUM = "text-align:right;white-space:nowrap";

const ROTULO_STATUS: Record<string, string> = {
  ABERTO: "Aberto", FECHADO: "Fechado", ENCERRADO: "Encerrado", EM_REVISAO: "Em revisão",
};

export type CaixaParaPapel = {
  numero?: number | null;
  status?: string | null;
  abertura?: string | null;
  fechamento?: string | null;
  suprimento?: number | null;
  observacao?: string | null;
  obsFechamento?: string | null;
  valorEsperado?: number | null;
  valorContado?: number | null;
  diferenca?: number | null;
  user?: { name?: string | null } | null;
  recebimentos?: any[] | null;
  movimentos?: { data?: string; tipo?: string | null; descricao?: string | null; conta?: string | null; forma?: string | null; valor?: number | null }[] | null;
  creditosUtilizados?: { data?: string; valor?: number | null; descricao?: string | null; tutor?: { name?: string | null } | null }[] | null;
  creditosGerados?: { data?: string; valor?: number | null; descricao?: string | null; tutor?: { name?: string | null } | null }[] | null;
};

function cabecalhoDoCaixa(c: CaixaParaPapel): string {
  const sel = seloDoFechamento(c as any);
  const campo = (rot: string, val: string) =>
    `<div style="min-width:150px"><div style="font-size:10.5px;color:#6b7a80;text-transform:uppercase;letter-spacing:.4px">${rot}</div><div style="font-size:13px">${val}</div></div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;border:1px solid #e6e1d6;border-radius:8px;padding:10px 12px;margin:0 0 14px">
    ${campo("Caixa", `nº ${esc(c.numero ?? "—")}`)}
    ${campo("Operador", esc(c.user?.name || "—"))}
    ${campo("Abertura", dataHora(c.abertura))}
    ${campo("Fechamento", dataHora(c.fechamento))}
    ${campo("Situação", esc(ROTULO_STATUS[String(c.status || "").toUpperCase()] || c.status || "—"))}
    ${sel ? campo("Conferência", esc(sel.texto)) : ""}
  </div>`;
}

/** O quadro de formas de recebimento — as mesmas colunas fixas da tela. */
function quadroDoResumo(c: CaixaParaPapel): string {
  const r = montarResumoDoCaixa(c as any);
  const cols = ["Vendas", "Suprimentos", "Sangrias", "Despesas", "Transferências", "Total"] as const;
  const chaves = ["vendas", "suprimentos", "sangrias", "despesas", "transferencias", "total"] as const;
  const saida = new Set(["sangrias", "despesas", "transferencias"]);

  const linha = (l: any, forte = false) => `<tr${forte ? ' style="font-weight:700"' : ""}>
    <td style="${TD}">${esc(l.forma)}</td>
    ${chaves.map((k) => {
      const v = Number(l[k] || 0);
      const txt = saida.has(k) && v ? `− ${BRL(v)}` : BRL(v);
      return `<td style="${TD};${NUM}">${txt}</td>`;
    }).join("")}
  </tr>`;

  const avisos = [avisoDoUsoDeCredito(r.usoDeCredito), avisoDoAdiantamento(r.adiantamentos)].filter(Boolean);
  const foraDoTotal = (r.usoDeCredito > 0.005 || r.adiantamentos > 0.005)
    ? `<div style="border:1px solid #e6e1d6;border-radius:8px;padding:9px 11px;margin-top:8px">
        <div style="font-size:10.5px;color:#6b7a80;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Fora do total do caixa</div>
        ${r.usoDeCredito > 0.005 ? `<div style="display:flex;justify-content:space-between"><span>Serviço pago com crédito do cliente</span><b>${BRL(r.usoDeCredito)}</b></div>` : ""}
        ${r.adiantamentos > 0.005 ? `<div style="display:flex;justify-content:space-between"><span>Crédito comprado pelo cliente</span><b>${BRL(r.adiantamentos)}</b></div>` : ""}
        ${avisos.map((a) => `<div style="font-size:10.5px;color:#6b7a80;margin-top:3px">${esc(a)}</div>`).join("")}
      </div>` : "";

  const desconhecidos = r.tiposDesconhecidos.length
    ? `<div style="font-size:11px;color:#8a6400;margin-top:6px">Há movimento de tipo ${esc(r.tiposDesconhecidos.join(", "))} descontado do total, sem coluna própria.</div>`
    : "";

  return `<h3 style="font-size:13.5px;margin:0 0 6px">Valores recebidos no caixa</h3>
    <table><thead><tr><th style="${TH}">Forma de recebimento</th>${cols.map((h) => `<th style="${TH};${NUM}">${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${r.linhas.length ? r.linhas.map((l) => linha(l)).join("") : `<tr><td colspan="7" style="${TD};text-align:center;color:#8a9499">Caixa sem movimento.</td></tr>`}
      ${r.linhas.length ? linha({ ...r.total, forma: "Total" }, true) : ""}
    </tbody></table>${desconhecidos}${foraDoTotal}`;
}

function quadroDeMovimentos(c: CaixaParaPapel): string {
  const linhas = [
    ...(Number(c.suprimento) > 0
      ? [{ data: c.abertura, tipo: "Suprimento", descricao: `Abertura de caixa${c.observacao ? " — " + c.observacao : ""}`, conta: "Caixa", forma: "Dinheiro", valor: Number(c.suprimento) }]
      : []),
    ...(c.movimentos || []).map((m) => ({ ...m, tipo: String(m.tipo || "") })),
  ].sort((a: any, b: any) => +new Date(a.data || 0) - +new Date(b.data || 0));
  if (!linhas.length) return "";
  return `<h3 style="font-size:13.5px;margin:16px 0 6px">Movimentações</h3>
    <table><thead><tr>
      <th style="${TH}">Data</th><th style="${TH}">Hora</th><th style="${TH}">Tipo</th>
      <th style="${TH}">Descrição</th><th style="${TH}">Conta</th><th style="${TH}">Forma</th>
      <th style="${TH};${NUM}">Valor</th>
    </tr></thead><tbody>
      ${linhas.map((m: any) => `<tr>
        <td style="${TD};white-space:nowrap">${dataBR(m.data)}</td>
        <td style="${TD};white-space:nowrap">${hora(m.data)}</td>
        <td style="${TD}">${esc(m.tipo)}</td>
        <td style="${TD}">${esc(m.descricao || "—")}</td>
        <td style="${TD}">${esc(m.conta || "Caixa")}</td>
        <td style="${TD}">${esc(m.forma || "Dinheiro")}</td>
        <td style="${TD};${NUM}">${BRL(m.valor)}</td>
      </tr>`).join("")}
    </tbody></table>`;
}

function quadroDeCreditos(titulo: string, itens: CaixaParaPapel["creditosUtilizados"]): string {
  const lista = itens || [];
  if (!lista.length) return "";
  const total = lista.reduce((s, c) => s + Number(c.valor || 0), 0);
  return `<h3 style="font-size:13.5px;margin:16px 0 6px">${esc(titulo)}</h3>
    <table><thead><tr><th style="${TH}">Data</th><th style="${TH}">Cliente</th><th style="${TH}">Descrição</th><th style="${TH};${NUM}">Valor</th></tr></thead>
    <tbody>
      ${lista.map((c) => `<tr>
        <td style="${TD};white-space:nowrap">${dataHora(c.data)}</td>
        <td style="${TD}">${esc(c.tutor?.name || "Cliente")}</td>
        <td style="${TD}">${esc(c.descricao || "—")}</td>
        <td style="${TD};${NUM}">${BRL(c.valor)}</td>
      </tr>`).join("")}
      <tr style="font-weight:700"><td style="${TD}" colspan="3">Total</td><td style="${TD};${NUM}">${BRL(total)}</td></tr>
    </tbody></table>`;
}

function quadroDeRecebimentos(c: CaixaParaPapel): string {
  const { grupos, total } = agruparRecebimentos((c.recebimentos || []) as any);
  if (!grupos.length) return "";
  return `<h3 style="font-size:13.5px;margin:16px 0 6px">Recebimentos</h3>
    <table><thead><tr>
      <th style="${TH}">Hora</th><th style="${TH}">Venda</th><th style="${TH}">Cliente</th>
      <th style="${TH}">Forma</th><th style="${TH}">Condição</th><th style="${TH};${NUM}">Valor</th>
    </tr></thead><tbody>
      ${grupos.map((g) => g.linhas.map((l, i) => `<tr>
        <td style="${TD};white-space:nowrap">${hora(l.data)}</td>
        <td style="${TD};white-space:nowrap">${i === 0 ? esc(rotuloDaVenda(g)) : ""}</td>
        <td style="${TD}">${i === 0 ? esc(g.tutorNome) + (g.petNome ? ` · ${esc(g.petNome)}` : "") : ""}</td>
        <td style="${TD}">${esc(l.forma)}</td>
        <td style="${TD}">${esc(l.condicao)}</td>
        <td style="${TD};${NUM}">${BRL(l.valor)}</td>
      </tr>`).join("")).join("")}
      <tr style="font-weight:700"><td style="${TD}" colspan="5">Total recebido</td><td style="${TD};${NUM}">${BRL(total)}</td></tr>
    </tbody></table>`;
}

function quadroDaConferencia(c: CaixaParaPapel): string {
  const sel = seloDoFechamento(c as any);
  if (!sel) return "";
  const linha = (rot: string, val: string) => `<div style="display:flex;justify-content:space-between"><span>${rot}</span><b>${val}</b></div>`;
  return `<div style="border:1px solid #e6e1d6;border-radius:8px;padding:10px 12px;margin-top:16px">
    <div style="font-size:10.5px;color:#6b7a80;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">Conferência da gaveta</div>
    ${c.valorEsperado != null ? linha("Esperado em dinheiro", BRL(c.valorEsperado)) : ""}
    ${c.valorContado != null ? linha("Contado", BRL(c.valorContado)) : ""}
    ${c.diferenca != null ? linha(c.diferenca < 0 ? "Falta" : "Sobra", BRL(Math.abs(c.diferenca))) : ""}
    <div style="font-size:11px;color:#6b7a80;margin-top:4px">${esc(sel.detalhe)}</div>
    ${c.obsFechamento ? `<div style="font-size:11px;color:#6b7a80;margin-top:3px">Observação: ${esc(c.obsFechamento)}</div>` : ""}
  </div>`;
}

/** O papel de UM caixa, inteiro. */
export async function imprimirCaixaDetalhado(caixa: CaixaParaPapel): Promise<void> {
  const corpo = `
    ${cabecalhoDoCaixa(caixa)}
    ${quadroDoResumo(caixa)}
    ${quadroDeRecebimentos(caixa)}
    ${quadroDeMovimentos(caixa)}
    ${quadroDeCreditos("Créditos gerados neste caixa", caixa.creditosGerados)}
    ${quadroDeCreditos("Créditos utilizados neste caixa", caixa.creditosUtilizados)}
    ${quadroDaConferencia(caixa)}
  `;
  await imprimirDocumento(`Movimento de caixa nº ${caixa.numero ?? ""}`.trim(), corpo);
}

export type LinhaDaGrade = {
  numero?: number | null;
  status?: string | null;
  abertura?: string | null;
  fechamento?: string | null;
  user?: { name?: string | null } | null;
  recebido?: number | null;
  suprimentos?: number | null;
  sangrias?: number | null;
  despesas?: number | null;
  diferenca?: number | null;
  valorContado?: number | null;
  obsFechamento?: string | null;
};

/** O papel de VÁRIOS caixas — uma linha por caixa, com total geral (que o deles não tem). */
export async function imprimirResumoDeCaixas(linhas: LinhaDaGrade[], periodo?: string): Promise<void> {
  const soma = (f: (l: LinhaDaGrade) => number) => linhas.reduce((s, l) => s + Number(f(l) || 0), 0);
  const corpo = `
    ${periodo ? `<div style="font-size:12px;color:#6b7a80;margin:0 0 10px">Período: ${esc(periodo)}</div>` : ""}
    <table><thead><tr>
      <th style="${TH}">Nº</th><th style="${TH}">Abertura</th><th style="${TH}">Operador</th>
      <th style="${TH};${NUM}">Recebimentos</th><th style="${TH};${NUM}">Suprimentos</th>
      <th style="${TH};${NUM}">Sangrias</th><th style="${TH};${NUM}">Despesas</th>
      <th style="${TH}">Situação</th><th style="${TH}">Conferência</th><th style="${TH};${NUM}">Diferença</th>
    </tr></thead><tbody>
      ${linhas.length ? linhas.map((l) => {
        const sel = seloDoFechamento(l as any);
        return `<tr>
          <td style="${TD};white-space:nowrap">nº ${esc(l.numero ?? "—")}</td>
          <td style="${TD};white-space:nowrap">${dataHora(l.abertura)}</td>
          <td style="${TD}">${esc(l.user?.name || "—")}</td>
          <td style="${TD};${NUM}">${BRL(l.recebido)}</td>
          <td style="${TD};${NUM}">${BRL(l.suprimentos)}</td>
          <td style="${TD};${NUM}">${Number(l.sangrias || 0) ? `− ${BRL(l.sangrias)}` : BRL(0)}</td>
          <td style="${TD};${NUM}">${Number(l.despesas || 0) ? `− ${BRL(l.despesas)}` : BRL(0)}</td>
          <td style="${TD}">${esc(ROTULO_STATUS[String(l.status || "").toUpperCase()] || l.status || "—")}</td>
          <td style="${TD}">${sel ? esc(sel.texto) : "—"}</td>
          <td style="${TD};${NUM}">${l.diferenca != null ? BRL(l.diferenca) : "—"}</td>
        </tr>`;
      }).join("") : `<tr><td colspan="10" style="${TD};text-align:center;color:#8a9499">Nenhum caixa no período.</td></tr>`}
      ${linhas.length ? `<tr style="font-weight:700">
        <td style="${TD}" colspan="3">Total de ${linhas.length} caixa(s)</td>
        <td style="${TD};${NUM}">${BRL(soma((l) => Number(l.recebido)))}</td>
        <td style="${TD};${NUM}">${BRL(soma((l) => Number(l.suprimentos)))}</td>
        <td style="${TD};${NUM}">${BRL(soma((l) => Number(l.sangrias)))}</td>
        <td style="${TD};${NUM}">${BRL(soma((l) => Number(l.despesas)))}</td>
        <td style="${TD}" colspan="2"></td>
        <td style="${TD};${NUM}">${BRL(soma((l) => Number(l.diferenca)))}</td>
      </tr>` : ""}
    </tbody></table>`;
  await imprimirDocumento("Movimento de caixa — resumo", corpo);
}
