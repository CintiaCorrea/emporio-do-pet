import { describe, it, expect, vi } from "vitest";

const capturado: { titulo: string; corpo: string }[] = [];
vi.mock("@/lib/print", () => ({
  imprimirDocumento: async (titulo: string, corpo: string) => { capturado.push({ titulo, corpo }); },
}));

import { imprimirResumoDeVendas } from "@/lib/documentos/relatorio-resumo-vendas-print";
import { resumoDeVendas } from "@/lib/resumoDeVendas";

// Duas vendas reais o bastante para o papel ter o que mostrar: uma paga em cartão parcelado,
// outra em aberto.
const vendas = [
  {
    id: "v1", date: "2026-08-21T10:00:00", valor: 300, pago: 300, situacao: "PAGA" as const,
    funcionario: "Gabriela",
    itens: [{ descricao: "Consulta", quantidade: 1, valorUnitario: 300, desconto: 0, grupoNome: "Clínica Geral", tipo: "SERVICO" }],
    recebimentos: [{ data: "2026-08-21T18:00:00", formas: [{ forma: "InfinitePay Crédito", valor: 300, parcelas: 2 }] }],
  },
  {
    id: "v2", date: "2026-08-22T10:00:00", valor: 150, pago: 0, situacao: "ABERTA" as const,
    funcionario: "Victoria",
    itens: [{ descricao: "Hemograma", quantidade: 1, valorUnitario: 150, desconto: 0, grupoNome: "Exames", tipo: "EXAME" }],
    recebimentos: [],
  },
];

const papel = async (extra: any = {}) => {
  capturado.length = 0;
  await imprimirResumoDeVendas({
    resumo: resumoDeVendas(vendas as any),
    periodo: "01/08/2026 a 31/08/2026",
    ...extra,
  });
  return capturado[0];
};

describe("o relatório do período é documento, não captura de tela", () => {
  it("traz o período e os cartões do topo", async () => {
    const p = await papel();
    expect(p.titulo).toBe("Resumo de vendas");
    expect(p.corpo).toContain("01/08/2026 a 31/08/2026");
    expect(p.corpo).toContain("Venda bruta");
    expect(p.corpo).toContain("A receber");
  });

  it("diz por que o total difere do SimplesVet — a mesma frase da tela", async () => {
    // "Escrever na tela por que o total difere" foi decisão dela em 07/09/2026: sem isso, a
    // primeira comparação entre os dois relatórios vira desconfiança do sistema.
    const p = await papel();
    expect(p.corpo).toContain("Crédito de cliente não conta como venda");
    expect(p.corpo).toContain("Uso de crédito");
  });

  it("a situação das vendas fecha: recebido + a receber = total", async () => {
    // O quadro do SimplesVet fechava R$ 70,26 fora de tudo. O nosso soma.
    const p = await papel();
    expect(p.corpo).toContain("Situação das vendas");
    expect(p.corpo).toMatch(/R\$\s*450,00/);   // 300 + 150 de venda líquida
    expect(p.corpo).toMatch(/R\$\s*300,00/);   // recebido
    expect(p.corpo).toMatch(/R\$\s*150,00/);   // a receber
  });

  it("a condição de parcelamento sai no papel", async () => {
    // O papel deles mostra a forma e perde o "Parcelado 2x" — sem ele não se confere maquininha.
    const p = await papel();
    expect(p.corpo).toContain("InfinitePay Crédito");
    expect(p.corpo).toMatch(/Parcelado 2x/);
  });

  it("data da baixa é o único quadro em regime de caixa, e o papel diz isso", async () => {
    const p = await papel();
    expect(p.corpo).toContain("Data da baixa");
    expect(p.corpo).toMatch(/quando o dinheiro entrou/i);
  });

  it("o grupo vem da árvore do catálogo", async () => {
    const p = await papel();
    expect(p.corpo).toContain("Clínica Geral");
    expect(p.corpo).toContain("Exames");
  });

  it("quadro sem dado não vira quadro vazio — some", async () => {
    // Convênio e pacote não existem nestas vendas. Um quadro com só a linha "Total: R$ 0,00"
    // ocupa página e não informa nada.
    const p = await papel();
    expect(p.corpo).not.toContain("Convênios");
    expect(p.corpo).not.toContain("Pacotes");
  });

  it("com pacote, o quadro aparece e explica a receita diferida", async () => {
    const p = await papel({ pacotes: [{ nome: "10 - PL Fisio", vendidos: 4, sessoes: 40, usadas: 23, reconhecido: 4140, aReconhecer: 3060 }] });
    expect(p.corpo).toContain("10 - PL Fisio");
    expect(p.corpo).toMatch(/Cada sessão usada reconhece/);
  });

  it("os filtros ativos saem escritos — o papel diz de onde veio o número", async () => {
    const p = await papel({ filtros: "funcionário Gabriela" });
    expect(p.corpo).toContain("funcionário Gabriela");
  });

  it("período sem venda nenhuma não quebra", async () => {
    capturado.length = 0;
    await imprimirResumoDeVendas({ resumo: resumoDeVendas([]), periodo: "01/09/2026 a 02/09/2026" });
    expect(capturado[0].corpo).toContain("01/09/2026");
  });
});

describe("as telas usam o seletor de período único e o relatório de verdade", () => {
  const ler = (rel: string) => require("fs").readFileSync(require("path").resolve(__dirname, "../..", rel), "utf8");
  // Sem comentarios: o texto que EXPLICA o window.print() que morreu nao pode reprovar o arquivo.
  const codigo = (rel: string) => ler(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("existe UM seletor de período, e as duas telas usam ele", () => {
    // "Lembre-se de seguir o mesmo padrão de estética" (Cintia, 08/09/2026). Dois seletores
    // parecidos viram duas respostas para a mesma pergunta na mesma casa.
    expect(ler("components/comum/SeletorDePeriodo.tsx")).toContain("export default function SeletorDePeriodo");
    expect(ler("app/(user)/dashboard/erp/caixa/page.tsx")).toContain("SeletorDePeriodo");
    expect(ler("app/(user)/dashboard/erp/consulta-vendas/page.tsx")).toContain("SeletorDePeriodo");
  });

  it("a consulta de vendas não imprime mais a tela", () => {
    const src = codigo("app/(user)/dashboard/erp/consulta-vendas/page.tsx");
    expect(src).toContain("imprimirResumoDeVendas");
    expect(src).not.toContain("window.print()");
  });

  it("o papel das comandas continua onde estava", () => {
    // Ganhar um relatório não pode custar o outro: as comandas do dia são o papel do fechamento.
    expect(ler("app/(user)/dashboard/erp/consulta-vendas/page.tsx")).toContain("imprimirComandasDoDia");
  });
});
