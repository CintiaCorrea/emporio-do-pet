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
    // Três abas, com cada regra junto do seu assunto (17/09/2026): pouca regra não merece aba própria.
    for (const aba of ["Venda e recebimento", "📄 Orçamento", "Demonstrativo"]) {
      expect(cfg).toContain(aba);
    }
    expect(cfg).toContain("<FormasDeRecebimento />");
    expect(cfg).toContain("<ModelosDeOrcamento />");
  });
});

// A ABA "REGRAS DA VENDA" (Cintia, 17/09/2026: "veja se ela ainda é útil; o sistema tem que evitar
// redundância"). Sete interruptores não eram lidos por nenhum código — saíram. O que ficou, o
// sistema obedece.
describe("as regras da venda que sobraram são de verdade", () => {
  const cfg = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "configuracoes-vendas", "page.tsx"), "utf8");

  it("só ficaram as três regras que o servidor lê", () => {
    expect(cfg).toContain("obrigarProfissionalItem");
    expect(cfg).toContain("obrigarNsu");
    expect(cfg).toContain("orcamentoValidade");
    for (const morto of ["venderSemEstoque", "unificarVendasDia", "orcamentoObrigarCliente", "termoOrcamento", "devolucaoPrazo", "limiteDesconto"]) {
      expect(cfg, `${morto} voltou para a tela sem ninguém ler`).not.toContain(morto);
    }
  });

  it("o desconto explica que é por forma, com a lista logo abaixo", () => {
    expect(cfg).toContain("por forma de pagamento</b> (a lista abaixo)");
  });
});
