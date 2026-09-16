import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { precisaDeLiberacao } from "./liberacaoGerente";

/**
 * DESCONTO POR FORMA DE PAGAMENTO — O LADO DAS TELAS.
 *
 * Cintia, 16/09/2026: "o caixa tem autorização de dar 5% de desconto nas vendas à vista e no PIX,
 * temos algum lugar onde isso é definido, mas não estou localizando". Não tinha: havia um limite
 * geral, igual para cartão, e só o ponto de venda o conferia. A conta mora no servidor
 * (caixa/desconto.regras); aqui se garante que dá para CONFIGURAR e que toda tela que recebe
 * sabe PEDIR o gerente quando o servidor recusa.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("onde se define", () => {
  it("cada forma de recebimento tem o seu desconto permitido", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "formas-recebimento", "page.tsx");
    expect(src).toContain("Desconto permitido (%)");
    expect(src).toContain('descontoMax: String(form.descontoMax ?? "").trim().replace(",", ".")');
  });

  it("o limite da Configuração de vendas diz que é o GERAL, para quem não tem o próprio", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "configuracoes-vendas", "page.tsx");
    expect(src).toContain("Limite geral de desconto");
  });
});

describe("toda tela que recebe pede o gerente com a MESMA peça", () => {
  const TELAS: Record<string, string[]> = {
    "Ponto de venda": ["app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"],
    "Caixa": ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
    "Baixar várias": ["components", "caixa", "ReceberEmLoteModal.tsx"],
  };
  for (const [nome, caminho] of Object.entries(TELAS)) {
    it(nome, () => {
      const src = ler(...caminho);
      expect(src).toContain("useLiberacaoGerente()");
      expect(src).toContain("precisaDeLiberacao(");
      expect(src).toContain("{modalLiberacao}");
      expect(src).toContain("liberacaoEmail: lib.email, liberacaoSenha: lib.senha");
    });
  }

  it("o ponto de venda não guarda mais uma cópia própria do pedido de senha", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx");
    expect(src).not.toContain("fecharLiberacao");
    expect(src).not.toContain("setLibOpen");
  });
});

describe("a frase que dispara o pedido", () => {
  it("reconhece a mensagem nova do servidor e a antiga", () => {
    expect(precisaDeLiberacao("Desconto de 5% passa do permitido para InfinityPay (0%). Precisa de liberação de um gerente.")).toBe(true);
    expect(precisaDeLiberacao("Desconto de 8.0% passa do limite (5%). Precisa de liberação de um gerente (e-mail e senha de um admin).")).toBe(true);
  });
  it("não confunde com outros erros", () => {
    expect(precisaDeLiberacao("Credito insuficiente do cliente")).toBe(false);
    expect(precisaDeLiberacao(undefined)).toBe(false);
  });
});
