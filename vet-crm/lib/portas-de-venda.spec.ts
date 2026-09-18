import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

/**
 * 🛡️ QUANTAS PORTAS CRIAM VENDA — a trava de cima (Cintia, 17/09/2026: "tem como blindarmos o que
 * construímos para que as outras coisas que vamos arrumar não esbarrem e quebrem o que fizemos?").
 *
 * Em 16/09/2026 havia SETE jeitos de criar venda, cada um com a sua regra, e foi isso que produziu
 * venda sem cadastro, cobrança em dobro e preço fora da tabela. Hoje são quatro caminhos, todos
 * conhecidos e testados:
 *
 *   1. o carrinho da ficha (venda e orçamento, e é onde se edita);
 *   2. o ponto de venda (venda nova, pelo caixa);
 *   3. a internação (a venda de cada dia, pela conta);
 *   4. transformar orçamento em venda.
 *
 * Este teste falha quando aparece uma quinta porta. Falhar aqui não quer dizer "está errado":
 * quer dizer "isto precisa ser conversado antes de ir ao ar".
 */
const TELAS_QUE_CRIAM_VENDA = ["components/pets/PetComandaRail.tsx"];

// As telas que mandam a venda pelo caixa (ponto de venda) — caminho próprio, com recebimento junto.
const TELAS_QUE_VENDEM_PELO_CAIXA = ["app/(user)/dashboard/erp/ponto-de-venda/page.tsx"];

describe("as portas que criam venda", () => {
  const arquivos = codigoDoProjeto();

  it("só o carrinho da ficha monta venda direto pelo atendimento", () => {
    const achados = arquivos
      .filter((a) => !a.caminho.includes(".spec.") && !a.caminho.includes(".test."))
      .filter((a) => /type:\s*["']Venda["']/.test(a.src))
      .map((a) => a.caminho)
      .sort();
    expect(achados).toEqual(TELAS_QUE_CRIAM_VENDA);
  });

  it("só o ponto de venda vende pelo caixa", () => {
    const achados = arquivos
      .filter((a) => !a.caminho.includes(".spec.") && !a.caminho.includes(".test."))
      .filter((a) => a.src.includes("/api/caixa/pdv"))
      .map((a) => a.caminho)
      .sort();
    expect(achados).toEqual(TELAS_QUE_VENDEM_PELO_CAIXA);
  });

  it("receber dinheiro continua passando pela gaveta única", () => {
    const achados = arquivos
      .filter((a) => !a.caminho.includes(".spec.") && !a.caminho.includes(".test."))
      .filter((a) => a.src.includes("/recebimento-lote"))
      .map((a) => a.caminho)
      .sort();
    // A rota de API é só o cano até o servidor; a peça que recebe é uma só.
    expect(achados).toEqual(["app/api/caixa/[id]/recebimento-lote/route.ts", "components/caixa/ReceberEmLoteModal.tsx"]);
  });
});
