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

  it("nem no menu — nos DOIS lugares que desenham o menu", () => {
    // A matriz de permissões e a barra lateral são listas diferentes: tirar de uma só deixa o item
    // clicável apontando para uma tela que não existe (Cintia viu isso em 17/09/2026).
    expect(readFileSync(join(RAIZ, "lib", "permissions", "index.ts"), "utf8")).not.toContain("recebimentos-sem-forma");
    const sidebar = readFileSync(join(RAIZ, "components", "protected", "dashboard", "Sidebar.tsx"), "utf8");
    expect(sidebar).not.toContain('"/dashboard/erp/recebimentos-sem-forma"');
    expect(sidebar).not.toContain('"/dashboard/erp/orcamentos"');
  });

  it("a gaveta única continua exigindo como o cliente pagou", () => {
    const gaveta = readFileSync(join(RAIZ, "components", "caixa", "ReceberEmLoteModal.tsx"), "utf8");
    expect(gaveta).toContain("validarPagamentosCartao");
    expect(gaveta).toContain("Como o cliente pagou");
  });
});
