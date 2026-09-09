import { describe, it, expect } from "vitest";
import { seloDoFechamento, coresDoSelo } from "@/lib/fechamentoDoCaixa";

describe("conferido é quem contou a gaveta", () => {
  it("caixa com dinheiro contado e que bateu", () => {
    const s = seloDoFechamento({ status: "FECHADO", valorContado: 500, diferenca: 0 });
    expect(s).toMatchObject({ chave: "conferido", texto: "Conferido" });
    expect(s!.detalhe).toMatch(/bateu/);
  });

  it("contado com sobra e com falta dizem qual é qual", () => {
    expect(seloDoFechamento({ status: "FECHADO", valorContado: 510, diferenca: 10 })!.detalhe).toMatch(/sobrou/);
    expect(seloDoFechamento({ status: "FECHADO", valorContado: 490, diferenca: -10 })!.detalhe).toMatch(/faltou/);
  });

  it("contar zero ainda é ter contado", () => {
    // valorContado = 0 é um caixa que fechou vazio e foi conferido. `0` é falsy em JS e essa
    // distração transformaria uma conferência real em "sem conferência".
    expect(seloDoFechamento({ status: "FECHADO", valorContado: 0, diferenca: 0 })?.chave).toBe("conferido");
  });
});

describe("o encerramento da meia-noite não se disfarça de conferência", () => {
  it("caixa encerrado sozinho tem selo próprio", () => {
    // A distinção que a Cintia pediu. Adivinhar pela hora (23:59) quebraria no dia em que o
    // cron atrasasse um minuto; o sinal honesto é não ter contado o dinheiro.
    const s = seloDoFechamento({ status: "FECHADO", valorContado: null, obsFechamento: "Encerrado automaticamente à meia-noite (sem conferência de gaveta)." });
    expect(s).toMatchObject({ chave: "automatico", texto: "Encerrado à meia-noite" });
    expect(s!.detalhe).toMatch(/Ninguém contou/);
  });

  it("fechado à mão sem contar não vira 'automático' nem 'conferido'", () => {
    expect(seloDoFechamento({ status: "FECHADO", valorContado: null, obsFechamento: "fim do dia" })?.chave).toBe("sem-conferencia");
  });
});

describe("caixa aberto não tem selo", () => {
  it("não há o que conferir num caixa que ainda está rodando", () => {
    expect(seloDoFechamento({ status: "ABERTO", valorContado: null })).toBeNull();
    expect(seloDoFechamento(null)).toBeNull();
    expect(seloDoFechamento({})).toBeNull();
  });
});

describe("as cores", () => {
  it("verde é só de quem contou", () => {
    expect(coresDoSelo("conferido").fg).toBe("#0F5132");
    expect(coresDoSelo("automatico").fg).not.toBe("#0F5132");
    expect(coresDoSelo("sem-conferencia").fg).not.toBe("#0F5132");
  });
});

// 🛡️ A TELA MOSTRA O SELO — E OS FILTROS DA GRADE CHEGAM AO SERVIDOR.
describe("a grade de caixas filtra de verdade", () => {
  const ler = (rel: string) => require("fs").readFileSync(require("path").resolve(__dirname, "..", rel), "utf8");
  const PAGE = "app/(user)/dashboard/erp/caixa/page.tsx";

  it("existe rota própria para a grade, que repassa a query", () => {
    // Sem ela, /api/caixa/grade caía no proxy genérico de /api/caixa/[id], que monta a URL do
    // backend só com o caminho e JOGA A QUERY FORA: período, status, operador e número eram
    // ignorados em silêncio e a tela mostrava os últimos 300 caixas como se fosse o filtro.
    const rota = ler("app/api/caixa/grade/route.ts");
    expect(rota).toContain("/caixa/grade${url.search}");
  });

  it("a grade filtra por operador e por número", () => {
    const src = ler(PAGE);
    expect(src).toContain("p.set('userId', gradeUser)");
    expect(src).toContain("p.set('numero', gradeNumero.trim())");
  });

  it("o número busca em qualquer data, e a tela avisa em vez de mudar o filtro sozinha", () => {
    // "Digitar em Cód. Caixa muda o filtro de data sozinho para Qualquer data" (Cintia, sobre o
    // SimplesVet). O comportamento é bom; o silêncio é que não.
    expect(ler(PAGE)).toContain("qualquer data");
    const api = require("fs").readFileSync(
      require("path").resolve(__dirname, "../..", "backend/src/modules/caixa/caixa.service.ts"), "utf8");
    expect(api).toContain("where.numero = Math.trunc(num)");
  });

  it("a lista começa em HOJE, mas nunca num beco sem saída", () => {
    // Historia desta trava, que vale mais que a regra:
    //   08/09, de manha — a Cintia criticou o SimplesVet: "o padrao da tela e 'hoje', e hoje
    //     quase nunca tem resultado... o usuario cai em 'Nenhum resultado foi encontrado' com
    //     frequencia". A trava nasceu exigindo padrao = ultimos 7 dias.
    //   08/09, a noite — ela pediu a tela no formato deles, que abre em HOJE. E hoje passou a
    //     ter caixa quase sempre, porque agora todo caixa encerra a meia-noite e reabre.
    // O que a trava guarda agora nao e o periodo: e que a lista vazia OFERECA a saida, que era
    // o defeito real que ela apontou.
    const src = ler(PAGE);
    expect(src).toContain("faixaDoPreset('HOJE')");
    expect(src).toContain("Ver os últimos 7 dias");
    expect(src).toContain("Ver este mês");
  });

  it("o período tem os atalhos que ela listou", () => {
    // Os atalhos saíram da página e viraram componente único quando a Consulta de vendas
    // precisou do mesmo controle ("lembre-se de seguir o mesmo padrão de estética", 08/09).
    // A trava seguiu junto: o que ela guarda é que os atalhos existam e que a tela os use.
    const sel = ler("components/comum/SeletorDePeriodo.tsx");
    expect(sel).toContain("PRESETS");
    expect(sel).toContain("Escolher período");
    expect(ler(PAGE)).toContain("<SeletorDePeriodo");
  });

  it("o navegador de dia some quando o filtro é um período", () => {
    // "Some quando o filtro e um periodo" (Cintia, descrevendo a tela deles).
    expect(ler(PAGE)).toContain("ehDiaUnico(faixa)");
  });

  it("a lista vem primeiro, e o detalhe abre ao clicar na linha", () => {
    const src = ler(PAGE);
    expect(src).toContain("useState<'lista' | 'detalhe'>('lista')");
    expect(src).toContain("abrirDetalhe");
    expect(src).toContain("Voltar para a lista");
  });

  it("dá para imprimir nos dois lugares: o resumo do período e o movimento do caixa", () => {
    // "Não esqueça da parte de imprimir o relatório" (Cintia, 08/09/2026).
    const src = ler(PAGE);
    expect(src).toContain("imprimirResumoDeCaixas");
    expect(src).toContain("imprimirCaixaDetalhado");
  });

  it("o selo de conferência aparece na grade e no caixa aberto", () => {
    const src = ler(PAGE);
    expect(src).toContain("seloDoFechamento");
    expect(src).toContain("Conferência");
  });
});
