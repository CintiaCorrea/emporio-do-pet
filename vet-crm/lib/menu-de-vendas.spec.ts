import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// O MENU DE VENDAS (Cintia, 17/09/2026). Ele tem duas listas — a barra lateral e a matriz de
// permissões — e é fácil mexer numa e esquecer a outra: foi o que deixou "Recebimentos sem forma"
// clicável apontando para uma tela que já não existia.
const RAIZ = join(__dirname, "..");
const sidebar = readFileSync(join(RAIZ, "components", "protected", "dashboard", "Sidebar.tsx"), "utf8");
const matriz = readFileSync(join(RAIZ, "lib", "permissions", "index.ts"), "utf8");

describe("o menu de Vendas", () => {
  it("não tem telas que viraram aba ou que saíram", () => {
    for (const rota of [
      "/dashboard/erp/recebimentos-sem-forma",
      "/dashboard/erp/orcamentos",
      "/dashboard/erp/modelos-orcamento",
      "/dashboard/erp/modelo-demonstrativo",
      "/dashboard/erp/formas-recebimento",
    ]) {
      expect(sidebar, `${rota} ainda está na barra lateral`).not.toContain(`"${rota}"`);
      expect(matriz, `${rota} ainda está na matriz`).not.toContain(`"${rota}"`);
    }
  });

  it("os gráficos de vendas saíram do grupo Vendas e nascem só para o administrativo", () => {
    const i = sidebar.indexOf('"/dashboard/erp/vendas-graficos"');
    expect(i).toBeGreaterThan(-1);
    expect(sidebar.slice(i, i + 160)).toContain('roles: ["ADMIN"]');
    // fica depois de Inteligência, não dentro de Vendas
    expect(i).toBeGreaterThan(sidebar.indexOf('key: "inteligencia"'));
  });

  it("configuração de vendas é a casa das quatro abas", () => {
    const cfg = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "configuracoes-vendas", "page.tsx"), "utf8");
    for (const aba of ["Regras da venda", "Formas de recebimento", "Modelo de orçamento", "Modelo de demonstrativo"]) {
      expect(cfg).toContain(aba);
    }
  });
});
