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
/** Tira comentários de bloco e de linha — o que vale é o que o código FAZ. */
const semComentarios = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("o título do papel", () => {
  it("é só Venda ou Orçamento — sem número", () => {
    // O papel vai para a mão do cliente e diz o que ele é. O número é controle interno: quem
    // precisa procura no sistema.
    const print = ler("lib", "documentos", "venda-print.ts");
    expect(print).toContain("await imprimirDocumento(rotulo,");
    expect(print).not.toContain("`${rotulo} ${num}`");
  });

  it("e o número não aparece em lugar nenhum do papel", () => {
    // EU TINHA DEIXADO ELE NA LINHA DE DADOS, supondo que a conferência de balcão precisasse.
    // Cintia, ao ser perguntada: "nem da venda nem do orçamento". Quem confere está no sistema
    // com a venda aberta na tela; o papel é do cliente, e para ele o número não diz nada.
    // Olha o CÓDIGO, não os comentários: o cabeçalho do arquivo cita `numeroVenda` só para
    // explicar que formato de objeto a função aceita, e reprovar por causa de uma explicação
    // é o tipo de teste que a gente aprende a ignorar.
    expect(semComentarios(ler("lib", "documentos", "venda-print.ts"))).not.toMatch(/numeroVenda|codigoExterno/);
    // O orçamento nunca teve número no papel — e continua sem.
    expect(semComentarios(ler("lib", "documentos", "orcamento-print.ts"))).not.toMatch(/numero/i);
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

  it("nem venda nem orçamento levam o número para a impressão", () => {
    // Antes o rail mandava o número só quando NÃO era orçamento. Agora a impressão ignora o
    // número de qualquer jeito, então mandar era código morto — e código morto engana quem lê
    // depois: parece que existe uma regra ali, e não existe mais.
    expect(rail).not.toContain("{ numeroVenda }");
  });

  it("mas o número continua NA TELA — ele não sumiu do sistema", () => {
    // O pedido foi tirar do papel do cliente, não deixar de existir. Quem confere no balcão
    // olha a tela, e é lá que o número tem de estar.
    expect(rail).toContain("nº ${numeroVenda}");
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
