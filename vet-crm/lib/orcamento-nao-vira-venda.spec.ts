import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * QUEM ENTRA PARA ORÇAR NÃO SAI COM UMA VENDA.
 *
 * Cintia, 15/09/2026: "quando clicamos para fazer orçamento ele entra em vendas". E em 16/09: "Quero
 * que possa lançar os itens e salvar, seja como orçamento ou como venda (no SimplesVet ele separa
 * isso por abas) e as ações nesse caso são salvar e imprimir. Tem que separar orçamento e venda, só
 * transformar quando solicitado."
 *
 * O ESTRAGO ERA DE DINHEIRO: o carrinho da ficha gravava sozinho, 800 ms depois de cada item, uma
 * VENDA de verdade — inclusive enquanto se montava um orçamento, que virava venda e orçamento ao
 * mesmo tempo, com número de venda e "A receber".
 */
const RAIZ = join(__dirname, "..");
const rail = readFileSync(join(RAIZ, "components", "pets", "PetComandaRail.tsx"), "utf8");

describe("venda e orçamento em abas separadas", () => {
  it("duas abas, cada uma com o seu rascunho", () => {
    expect(rail).toContain('type Aba = "VENDA" | "ORCAMENTO"');
    expect(rail).toContain("itensPorAba");
  });

  it("nada vai ao servidor sem clicar em Salvar — acabou a gravação automática", () => {
    expect(rail).not.toContain("agendarSync");
    expect(rail).not.toContain("setTimeout(sincronizar");
    expect(rail).not.toMatch(/fetch\(`\/api\/appointments\/\$\{[^}]+\}`, \{ method: "PATCH"/);
  });

  it("cada aba tem Salvar e Imprimir", () => {
    expect(rail).toContain("📄 Salvar orçamento");
    expect(rail).toContain("💰 Salvar venda");
    expect(rail).toContain("imprimirComanda");
  });

  it("a tela diz o que vai acontecer ANTES do clique", () => {
    expect(rail).toContain("Orçamento não cobra o cliente");
    expect(rail).toContain("a venda entra em “A receber”");
  });

  it("orçamento vira venda só quando alguém pede — e some", () => {
    // O botão passou a se chamar "Virar venda" em 18/09/2026, o mesmo nome nos três lugares
    // onde a recepção converte. A regra que este teste guarda é a mesma: só vira venda no clique.
    expect(rail).toContain("Virar venda");
    expect(rail).toContain("O orçamento sai da lista.");
  });

  it("sair da página com coisa montada e não salva pergunta antes", () => {
    expect(rail).toContain('addEventListener("beforeunload"');
  });

  it("o rascunho da comanda antiga não reaparece para ser salvo de novo", () => {
    expect(rail).toContain("localStorage.removeItem(`comanda_appt_${petId}`)");
  });
});
