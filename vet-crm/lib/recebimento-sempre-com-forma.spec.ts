import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// A TELA "RECEBIMENTOS SEM FORMA" SAIU (Cintia, 17/09/2026: "podemos deletar recebimentos sem
// forma"). Ela existiu para preencher a forma que um defeito apagou em 16/09; os 34 recebimentos
// foram preenchidos e hoje não há nenhum sem forma. O que guarda isso daqui pra frente é a gaveta
// única, que exige a forma na hora de receber.
const RAIZ = join(__dirname, "..");

describe("recebimento nasce com forma de pagamento", () => {
  it("a tela de arrumação não existe mais", () => {
    expect(existsSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "recebimentos-sem-forma"))).toBe(false);
    expect(existsSync(join(RAIZ, "app", "api", "caixa", "recebimentos-sem-forma"))).toBe(false);
  });

  it("nem no menu", () => {
    const menu = readFileSync(join(RAIZ, "lib", "permissions", "index.ts"), "utf8");
    expect(menu).not.toContain("recebimentos-sem-forma");
  });

  it("a gaveta única continua exigindo como o cliente pagou", () => {
    const gaveta = readFileSync(join(RAIZ, "components", "caixa", "ReceberEmLoteModal.tsx"), "utf8");
    expect(gaveta).toContain("validarPagamentosCartao");
    expect(gaveta).toContain("Como o cliente pagou");
  });
});
