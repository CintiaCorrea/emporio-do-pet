import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * O PAPEL DIZ O QUE ELE É.
 *
 * Cintia, 15/09/2026: "quando vou fazer um orçamento, mesmo tendo a opção de modelos eu
 * seleciono, mas na hora de imprimir ele não traz as informações e não está vindo com o nome de
 * orçamento e sim vendas e o número. É para utilizar somente vendas ou orçamento, não precisa do
 * número, ele já fica registrado no sistema."
 *
 * ERAM TRÊS DEFEITOS NO MESMO CLIQUE, e todos com a mesma raiz: o botão Imprimir da comanda
 * chamava `imprimirVenda` com rótulo "Venda" fixo.
 *   1. o nome errado — saía "Venda" para quem estava montando um orçamento;
 *   2. o número no título, que ela não quer no papel do cliente;
 *   3. a observação não era passada — e é ali que o MODELO escolhido escreve o texto. Por isso
 *      "não traz as informações": o modelo entrava no rascunho e o papel ignorava.
 *
 * A RAIZ COMUM DE TUDO ISSO, e da qual ela cobrou entendimento: venda e orçamento são o mesmo
 * caminho com uma marca, e a marca se perdia em cada ponta. Hoje já se perdeu no botão que abria
 * a comanda, no card de exame duplicado e aqui, no papel.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("o título do papel", () => {
  it("é só Venda ou Orçamento — sem número", () => {
    // O papel vai para a mão do cliente e diz o que ele é. O número é controle interno: quem
    // precisa procura no sistema.
    const print = ler("lib", "documentos", "venda-print.ts");
    expect(print).toContain("await imprimirDocumento(rotulo,");
    expect(print).not.toContain("`${rotulo} ${num}`");
  });

  it("mas o número continua no papel, na linha de dados", () => {
    // Tirar do título não é apagar: a conferência de balcão usa o número, e ele fica junto da
    // data, onde não compete com o nome do documento.
    const print = ler("lib", "documentos", "venda-print.ts");
    // A assercao e um trecho literal, e nao um recorte com regex: a primeira versao usava
    // [^)]* e parava no ")" de `new Date()`, reprovando um codigo que estava certo. Teste
    // que falha por si mesmo custa a confianca de todos os outros.
    expect(print).toContain("new Date()), num,");
  });

  it("o orçamento já se chamava orçamento", () => {
    expect(ler("lib", "documentos", "orcamento-print.ts")).toContain('imprimirDocumento("Orçamento"');
  });
});

describe("imprimir segue o que está sendo montado", () => {
  const rail = ler("components", "pets", "PetComandaRail.tsx");

  it("o rótulo vem da intenção, não fixo", () => {
    expect(rail).toContain('rotulo: orcando ? "Orçamento" : "Venda"');
  });

  it("orçamento sai SEM número de venda", () => {
    // Orçamento não é venda: carregar um número de venda no papel confunde quem recebe e quem
    // confere depois.
    expect(rail).toContain("...(orcando ? {} : { numeroVenda })");
  });

  it("a OBSERVAÇÃO vai junto — é onde o modelo escreve", () => {
    // Era isto o "não traz as informações": o modelo preenchia o rascunho e o papel não recebia.
    expect(rail).toContain("observacao: obs || undefined");
  });

  it("o ponto de venda também manda a observação nos dois caminhos", () => {
    const pdv = ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx");
    const fn = pdv.slice(pdv.indexOf("const imprimirAtual"), pdv.indexOf("const imprimirAtual") + 800);
    expect((fn.match(/observacao: obs \|\| undefined/g) || []).length).toBe(2);
  });
});
