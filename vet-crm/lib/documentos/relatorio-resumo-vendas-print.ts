import { imprimirDocumento } from "@/lib/print";
import type { Resumo } from "@/lib/resumoDeVendas";

// O PAPEL DO RESUMO DE VENDAS — o relatório do período, não a captura da tela.
//
// A Cintia, em 08/09/2026, mandando o desenho da Consulta de vendas: "vamos construir esse,
// lembre-se dos relatórios, impressão e seletor de data".
//
// O botão "🖨️ Imprimir" desta tela chamava `window.print()`, o mesmo defeito que o Caixa tinha:
// saía a TELA — abas, filtros, botões — cortada onde a página acabasse. Aqui sai um documento,
// no mesmo motor das comandas e do movimento de caixa (lib/print → timbrado da clínica), para a
// casa não ter três papéis com três caras diferentes.
//
// A ordem dos quadros é a da tela, de propósito: quem imprime está conferindo o que acabou de
// ler, e trocar a ordem no papel obriga a pessoa a procurar duas vezes.

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PCT = (n: any) => `${Number(n || 0).toFixed(1).replace(".", ",")}%`;
const diaBR = (d: any) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");

const TD = "padding:5px 8px;border-bottom:1px solid #eee";
const TH = "padding:5px 8px;text-align:left;border-bottom:2px solid #009AAC;font-size:11.5px;color:#014D5E";
const NUM = "text-align:right;white-space:nowrap";

/** Um quadro: título, colunas e linhas já formatadas. Vazio não vira quadro vazio — some. */
function quadro(titulo: string, cols: string[], linhas: string[], nota?: string): string {
  if (!linhas.length) return "";
  return `<h3 style="font-size:13px;margin:15px 0 5px">${esc(titulo)}</h3>
    <table><thead><tr>${cols.map((c, i) => `<th style="${TH}${i ? ";" + NUM : ""}">${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${linhas.join("")}</tbody></table>
    ${nota ? `<div style="font-size:10.5px;color:#6b7a80;margin-top:3px">${esc(nota)}</div>` : ""}`;
}

const cel = (v: string, opts: { num?: boolean; forte?: boolean; recuo?: boolean; cor?: string } = {}) =>
  `<td style="${TD}${opts.num ? ";" + NUM : ""}${opts.forte ? ";font-weight:700" : ""}${opts.recuo ? ";padding-left:22px;color:#6b7a80" : ""}${opts.cor ? ";color:" + opts.cor : ""}">${v}</td>`;

const linha = (celulas: string[], forte = false) =>
  `<tr${forte ? ' style="border-top:2px solid #014D5E"' : ""}>${celulas.join("")}</tr>`;

export type PacoteDoResumo = {
  nome?: string | null; vendidos?: number; sessoes?: number; usadas?: number;
  reconhecido?: number; aReconhecer?: number;
};

export type ResumoParaPapel = {
  resumo: Resumo;
  pacotes?: PacoteDoResumo[] | null;
  periodo: string;
  /** Filtros ativos, para o papel dizer de onde veio o número. */
  filtros?: string;
};

export async function imprimirResumoDeVendas({ resumo, pacotes, periodo, filtros }: ResumoParaPapel): Promise<void> {
  const c = resumo.cards;

  // ── OS CARTOES, como faixa de cabecalho ────────────────────────────────────────────────
  const cartao = (rot: string, val: string, cor?: string) =>
    `<div style="flex:1;min-width:118px;border:1px solid #e6e1d6;border-radius:8px;padding:8px 10px">
      <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:#6b7a80">${esc(rot)}</div>
      <div style="font-size:14px;font-weight:700${cor ? ";color:" + cor : ""}">${val}</div>
    </div>`;

  const cabecalho = `
    <div style="font-size:12px;color:#6b7a80;margin:0 0 10px">Período ${esc(periodo)}${filtros ? ` · ${esc(filtros)}` : ""}</div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin:0 0 6px">
      ${cartao("Venda bruta", BRL(c.bruto), "#0F6E56")}
      ${cartao(`Descontos · ${PCT(c.percentualDesconto)}`, BRL(c.desconto), "#8a6400")}
      ${cartao("Venda líquida", BRL(c.liquido), "#014D5E")}
      ${cartao("Recebido", BRL(c.recebido), "#0F6E56")}
      ${cartao("A receber", BRL(c.aberto), "#b23b39")}
      ${cartao("Nº vendas", String(c.qtd))}
    </div>
    {NOTA_CREDITO}`;

  // A MESMA FRASE QUE ESTA NA TELA. Sem ela, a primeira comparacao entre os dois relatorios
  // vira desconfianca do sistema — o credito de cliente era "produto" no SimplesVet e aqui nao e.
  const notaCredito = `<div style="font-size:10.5px;color:#6b7a80;margin:0 0 4px">
    Crédito de cliente não conta como venda: ele aparece em <b>Uso de crédito</b> nas formas de
    recebimento e vira receita no serviço em que for gasto.</div>`;

  const corpo = [
    cabecalho.replace("{NOTA_CREDITO}", notaCredito),

    quadro("Situação das vendas", ["Situação", "Qtd", "Valor", "Recebido", "A receber"],
      [
        ...resumo.porSituacao.map((l) => linha([
          cel(esc(l.rotulo)), cel(String(l.qtd), { num: true }), cel(BRL(l.valor), { num: true }),
          cel(BRL(l.recebido), { num: true, cor: "#0F6E56" }),
          cel(l.aberto > 0.005 ? BRL(l.aberto) : "—", { num: true, cor: l.aberto > 0.005 ? "#b23b39" : undefined }),
        ])),
        linha([
          cel("Total", { forte: true }), cel(String(c.qtd), { num: true, forte: true }), cel(BRL(c.liquido), { num: true, forte: true }),
          cel(BRL(c.recebido), { num: true, forte: true }), cel(BRL(c.aberto), { num: true, forte: true }),
        ], true),
      ],
      "As três colunas somam o total — é a conferência que diz se o quadro fecha."),

    quadro("Formas de recebimento", ["Forma", "Valor pago"],
      [
        ...resumo.porForma.flatMap((f) => [
          linha([cel(`<b>${esc(f.forma)}</b>`), cel(`<b>${BRL(f.valor)}</b>`, { num: true })]),
          // A CONDICAO DE PAGAMENTO (a vista, parcelado 3x) sai no papel. O do SimplesVet
          // mostra na tela e perde no papel — sem ela nao da pra conferir maquininha.
          ...f.parcelas.map((p) => linha([cel(esc(p.rotulo), { recuo: true }), cel(BRL(p.valor), { num: true, cor: "#6b7a80" })])),
        ]),
        linha([cel("Total", { forte: true }), cel(BRL(c.recebido), { num: true, forte: true })], true),
      ]),

    quadro("Data da baixa", ["Dia", "Recebido"],
      [
        ...resumo.porDataDeBaixa.map((d) => linha([cel(diaBR(d.dia)), cel(BRL(d.valor), { num: true, cor: "#0F6E56" })])),
        linha([cel("Total", { forte: true }), cel(BRL(c.recebido), { num: true, forte: true })], true),
      ],
      "O único quadro em regime de caixa: quando o dinheiro entrou, não quando a venda foi feita."),

    quadro("Por grupo de produto", ["Grupo", "%", "Bruto", "Desc.", "Líquido"],
      [
        ...resumo.porGrupo.map((g) => linha([
          cel(g.pai ? esc(g.nome) : `<b>${esc(g.nome)}</b>`, { recuo: !!g.pai }),
          cel(PCT(g.percentual), { num: true }), cel(BRL(g.bruto), { num: true }),
          cel(g.desconto ? BRL(g.desconto) : "—", { num: true }), cel(BRL(g.liquido), { num: true }),
        ])),
        linha([
          cel("Total", { forte: true }), cel("100%", { num: true, forte: true }), cel(BRL(c.bruto), { num: true, forte: true }),
          cel(BRL(c.desconto), { num: true, forte: true }), cel(BRL(c.liquido), { num: true, forte: true }),
        ], true),
      ],
      "A árvore do nosso catálogo: grupo e subgrupo."),

    quadro("Produto × serviço", ["Tipo", "Itens", "Bruto", "Desc.", "Líquido"],
      resumo.porTipo.map((t) => linha([
        cel(esc(t.nome)), cel(String(t.qtd), { num: true }), cel(BRL(t.bruto), { num: true }),
        cel(t.desconto ? BRL(t.desconto) : "—", { num: true }), cel(BRL(t.liquido), { num: true }),
      ]))),

    quadro("Pacotes", ["Pacote", "Vend.", "Sessões", "Usadas", "Reconhecido", "A reconhecer"],
      (pacotes || []).map((p) => linha([
        cel(esc(p.nome || "Pacote")), cel(String(p.vendidos ?? 0), { num: true }), cel(String(p.sessoes ?? 0), { num: true }),
        cel(String(p.usadas ?? 0), { num: true }), cel(BRL(p.reconhecido), { num: true, cor: "#0F6E56" }),
        cel(Number(p.aReconhecer || 0) > 0.005 ? BRL(p.aReconhecer) : "—", { num: true, cor: "#8a6400" }),
      ])),
      "Cada sessão usada reconhece a sua parte da receita — o pacote não vira receita inteira no dia da venda."),

    quadro("Convênios", ["Convênio", "Itens", "A faturar"],
      resumo.porConvenio.map((v) => linha([
        cel(esc(v.nome)), cel(String(v.itens), { num: true }), cel(BRL(v.valor), { num: true, cor: "#8a6400" }),
      ])),
      "Item pago pelo convênio sai do total do tutor e vira a-receber mensal."),

    quadro("Por funcionário", ["Nome", "Qtd", "Bruto", "Desc.", "Líquido"],
      resumo.porFuncionario.map((f) => linha([
        cel(esc(f.nome)), cel(String(f.qtd), { num: true }), cel(BRL(f.bruto), { num: true }),
        cel(f.desconto ? BRL(f.desconto) : "—", { num: true }), cel(BRL(f.liquido), { num: true }),
      ]))),

    quadro("Vendas por dia", ["Dia", "Qtd", "Bruto", "Desc.", "Líquido", "Recebido", "A receber"],
      [
        ...resumo.porDia.map((d) => linha([
          cel(diaBR(d.dia)), cel(String(d.qtd), { num: true }), cel(BRL(d.bruto), { num: true }),
          cel(d.desconto ? BRL(d.desconto) : "—", { num: true }), cel(BRL(d.liquido), { num: true }),
          cel(BRL(d.recebido), { num: true, cor: "#0F6E56" }),
          cel(d.aberto > 0.005 ? BRL(d.aberto) : "—", { num: true, cor: d.aberto > 0.005 ? "#b23b39" : undefined }),
        ])),
        linha([
          cel("Total", { forte: true }), cel(String(c.qtd), { num: true, forte: true }), cel(BRL(c.bruto), { num: true, forte: true }),
          cel(BRL(c.desconto), { num: true, forte: true }), cel(BRL(c.liquido), { num: true, forte: true }),
          cel(BRL(c.recebido), { num: true, forte: true }), cel(BRL(c.aberto), { num: true, forte: true }),
        ], true),
      ]),
  ].filter(Boolean).join("");

  await imprimirDocumento("Resumo de vendas", corpo);
}
