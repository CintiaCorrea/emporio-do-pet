import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ A PÁGINA NÃO ROLA PRA LADO.
//
// A Cintia, em 07/09/2026, com o print da conta da internação cortada na direita: "já tinha
// pedido para caber tudo na página sem precisar rolar a barra de rolagem, mas não é o que está
// acontecendo."
//
// A causa é uma armadilha do CSS grid: a coluna `1fr` NÃO encolhe abaixo do conteúdo dela.
// Basta uma tabela larga dentro da coluna para ela empurrar a página inteira e criar barra
// horizontal — e ninguém percebe escrevendo o código, porque só aparece com conteúdo real.
// `minmax(0, 1fr)` deixa a coluna encolher; o conteúdo largo passa a rolar DENTRO do próprio
// quadro, que é o comportamento certo.

const raiz = path.resolve(__dirname, "..");

/** Todos os .tsx de tela, sem node_modules. */
function telas(dir: string, achadas: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) telas(p, achadas);
    else if (e.name.endsWith(".tsx")) achadas.push(p);
  }
  return achadas;
}

describe("nenhuma coluna de grid empurra a página", () => {
  it("toda coluna fracionária pode encolher (minmax(0,…))", () => {
    const arquivos = [...telas(path.join(raiz, "app")), ...telas(path.join(raiz, "components"))];
    const culpados: string[] = [];
    for (const f of arquivos) {
      const src = fs.readFileSync(f, "utf8");
      // grid-cols-[…1fr] sem minmax: a coluna não encolhe.
      for (const m of src.match(/grid-cols-\[[^\]]*\]/g) || []) {
        if (/(?<!minmax\(0,\s*)[\d.]*fr/.test(m) && !m.includes("minmax(0")) {
          culpados.push(`${path.relative(raiz, f)} → ${m}`);
        }
      }
    }
    expect(culpados).toEqual([]);
  });
});
