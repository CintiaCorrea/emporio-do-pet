import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cintia, 12/09/2026, sobre o relatorio de comandas da Kate: "pode melhorar a apresentacao do
 * relatorio, para os blocos de dia nao quebrarem na folha".
 *
 * No PDF que ela mandou, o titulo "06/09/2026" ficou sozinho no pe da pagina 3 e a comanda
 * daquele dia abriu a pagina 4. Quem le procura a conta na folha errada.
 *
 * A correcao nao e' so `break-after:avoid` no titulo — o navegador ignora essa regra quando o
 * que vem depois e alto. O titulo tem que viajar GRUDADO na primeira comanda, dentro de um
 * bloco indivisivel. Da segunda comanda em diante cada uma quebra sozinha: se o dia inteiro
 * fosse indivisivel, um dia com dez comandas deixaria meia folha em branco.
 */
const src = readFileSync(join(__dirname, "documentos", "relatorio-vendas-print.ts"), "utf8");

describe("relatorio de comandas: o dia nao quebra na folha", () => {
  it("o titulo do dia viaja grudado na primeira comanda", () => {
    expect(src).toMatch(/const \[primeira, \.\.\.resto\] = cs/);
    const bloco = src.slice(src.indexOf("const [primeira, ...resto] = cs"));
    const ate = bloco.slice(0, bloco.indexOf("}).join(\"\")"));
    // o container que envolve titulo + primeira comanda nao pode ser cortado
    expect(ate).toMatch(/break-inside:avoid;page-break-inside:avoid[\s\S]*\$\{titulo\}[\s\S]*\$\{primeira/);
  });

  it("o titulo tambem pede pra nao ser o ultimo da folha", () => {
    expect(src).toMatch(/break-after:avoid;page-break-after:avoid/);
  });

  it("da segunda comanda em diante cada uma quebra sozinha", () => {
    // senao um dia longo empurra tudo pra folha seguinte e deixa a anterior vazia
    expect(src).toMatch(/\$\{resto\.map\(comanda\)\.join\(""\)\}/);
  });

  it("cada comanda continua indivisivel", () => {
    // regra que ja existia e nao pode ter se perdido no caminho
    expect(src).toMatch(/break-inside:avoid;page-break-inside:avoid;border:1px solid #E4DCCC/);
  });
});
