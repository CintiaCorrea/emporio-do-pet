import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * DESCONTO POR FORMA DE PAGAMENTO — O LADO DAS TELAS.
 *
 * Cintia, 16/09/2026: "adm não tem limite e todos os outros são livres até 5% no PIX e em
 * dinheiro. São essas as regras, qualquer outra coisa não." A conta mora no servidor
 * (caixa/desconto.regras). Aqui se garante que o % é configurado por forma de pagamento, e que
 * nenhuma tela volta a pedir senha de gerente nem a falar em "limite geral".
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("onde se define", () => {
  it("cada forma de recebimento tem o seu desconto permitido", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "formas-recebimento", "page.tsx");
    expect(src).toContain("Desconto permitido (%)");
    expect(src).toContain('descontoMax: String(form.descontoMax ?? "").trim().replace(",", ".")');
  });

  it('o "Limite geral de desconto" saiu da Configuração de vendas', () => {
    const src = ler("app", "(user)", "dashboard", "erp", "configuracoes-vendas", "page.tsx");
    expect(src).not.toContain("Limite geral de desconto");
  });
});

describe("nenhuma tela pede senha de gerente", () => {
  const TELAS: Record<string, string[]> = {
    "Ponto de venda": ["app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"],
    "Caixa": ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
    "Baixar várias": ["components", "caixa", "ReceberEmLoteModal.tsx"],
  };
  for (const [nome, caminho] of Object.entries(TELAS)) {
    it(nome, () => {
      const src = ler(...caminho);
      expect(src).not.toContain("useLiberacaoGerente");
      expect(src).not.toContain("liberacaoSenha");
    });
  }

  it("a peça da liberação não existe mais", () => {
    expect(existsSync(join(RAIZ, "components", "caixa", "LiberacaoGerente.tsx"))).toBe(false);
    expect(existsSync(join(RAIZ, "lib", "liberacaoGerente.ts"))).toBe(false);
  });

  it("a trava de desconto por item do cadastro saiu (Cintia, 16/09/2026: \"Pode tirar\")", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx")).not.toContain("clampDesc");
    expect(ler("app", "(user)", "dashboard", "erp", "catalogo-novo", "page.tsx")).not.toContain("Não permite desconto");
    expect(ler("lib", "catalogoVendavel.ts")).not.toContain("_descontoModo");
  });

  it('e "Conceder desconto" saiu da matriz de permissões', () => {
    expect(ler("lib", "permissions", "index.ts")).not.toContain("acao:venda.conceder_desconto");
  });
});
