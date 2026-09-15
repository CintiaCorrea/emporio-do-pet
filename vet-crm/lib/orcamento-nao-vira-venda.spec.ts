import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * QUEM ENTRA PARA ORÇAR NÃO SAI COM UMA VENDA.
 *
 * Cintia, 15/09/2026: "a tela de orçamento não está funcionando, quando clicamos para fazer
 * orçamento ele entra em vendas. Erro redundante novamente!"
 *
 * E era literal. Na ficha do pet, o botão "➕ Montar novo orçamento" fazia `setSub("VENDA")` e
 * largava a pessoa na Comanda — onde tudo diz VENDA: o título, a observação, e o botão grande,
 * destacado, em azul cheio. O orçamento era um botão pequeno, de contorno, na linha de baixo.
 *
 * O ESTRAGO NÃO É DE ROTA, É DE DINHEIRO: quem queria orçar e clicou no botão óbvio criou uma
 * VENDA — que entra em "A receber" e vira cobrança ao cliente. Um orçamento não cobra ninguém;
 * uma venda cobra. A tela não podia deixar essa diferença por conta da atenção de quem clica no
 * fim de um atendimento.
 *
 * O conserto não foi renomear o botão: foi fazer a INTENÇÃO existir e acompanhar a pessoa.
 */
const RAIZ = join(__dirname, "..");
const rail = readFileSync(join(RAIZ, "components", "pets", "PetComandaRail.tsx"), "utf8");

describe("a intenção acompanha quem entrou para orçar", () => {
  it('"Montar novo orçamento" marca a intenção, não só troca de aba', () => {
    expect(rail).toContain('setIntencao("ORCAMENTO"); setSub("VENDA")');
  });

  it("o botão GRANDE é o da intenção", () => {
    // Era sempre "Salvar a venda". O destaque visual é o que a mão segue quando a cabeça está
    // no cliente que espera na sala.
    expect(rail).toContain("📄 Salvar orçamento");
    expect(rail).toContain("💰 Salvar como venda");   // a venda vira a opção secundária
  });

  it("a tela diz o que vai acontecer ANTES do clique", () => {
    // "não cobra o cliente" × "entra em A receber e vira cobrança" — é a única frase que importa
    // nessa hora, e ela não existia.
    expect(rail).toContain("Montando um ORÇAMENTO");
    expect(rail).toContain("Montando uma VENDA");
    expect(rail).toContain("não cobra o cliente");
    expect(rail).toContain("vira cobrança");
  });

  it("dá para mudar de ideia sem sair da tela", () => {
    expect(rail).toContain("mudar para ");
  });

  it("e a intenção NÃO fica grudada depois de salvar", () => {
    // Sem isto, a próxima comanda abriria em modo orçamento sem ninguém ter pedido — o erro
    // inverso, e igualmente calado.
    const fn = rail.slice(rail.indexOf("async function gerarOrcamento"), rail.indexOf("async function gerarOrcamento") + 900);
    expect(fn).toContain('setIntencao("VENDA")');
  });

  it("o título e a aba mudam junto — a tela inteira fala a mesma língua", () => {
    expect(rail).toContain('{orcando ? "📄 Orçamento" : "🛒 Venda"}');
    expect(rail).toContain('${orcando ? "📄 Montando" : "🛒 Venda"}');
  });
});
