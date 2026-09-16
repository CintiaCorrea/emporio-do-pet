import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * PREENCHER A FORMA QUE FALTOU COM O CARTÃO COMPLETO.
 *
 * Cintia, 16/09/2026, na tela Recebimentos sem forma: "nessa tela não consigo colocar
 * parcelamento e nem o aut para a conciliação". A primeira versão tinha só forma e valor — e cartão
 * sem modalidade, parcelas e AUT não casa com o extrato da operadora, que é o motivo de preencher.
 */
const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "recebimentos-sem-forma", "page.tsx"), "utf8");

describe("a tela de recebimentos sem forma", () => {
  it("usa o MESMO painel de pagamento do balcão", () => {
    expect(src).toContain("<PagamentoFormas formas={formas} onChange={setFormas}");
    expect(src).toContain("carregarFormasRecebimento()");
  });

  it("exige do cartão o mesmo que o balcão exige (operadora e AUT)", () => {
    expect(src).toContain("validarPagamentosCartao(validas, formasConfig)");
  });

  it("não voltou a ter só um select de forma e um valor", () => {
    expect(src).not.toContain("— forma —");
  });
});
