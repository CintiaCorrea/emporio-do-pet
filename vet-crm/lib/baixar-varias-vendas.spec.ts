import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * BAIXAR VÁRIAS VENDAS, ESCOLHENDO QUAIS.
 *
 * Cintia, 15/09/2026, com os prints do SimplesVet: "Você está em uma venda de 10/08/2026 com
 * valor de R$ 150,00, mas este cliente tem outras vendas em aberto. O que você deseja baixar?"
 * → "Selecione as vendas que serão baixadas".
 *
 * O caso real que trouxe isto: Lucas Andrade Mendes, pet Chico — 10 vendas em aberto, uma por
 * dia de 05/09 a 15/09, R$ 3.842,25, nenhuma recebida.
 *
 * O recebimento em lote JÁ EXISTIA, mas com dois buracos que o tornavam inútil na prática:
 *   · só aparecia depois de filtrar a tela até sobrar um cliente — quem estava olhando UMA
 *     venda não tinha como saber que havia outras nove;
 *   · pagava TODAS as comandas, sem poder escolher.
 *
 * Estes testes leem o código porque o risco aqui é de dinheiro: baixar o que não devia, ou
 * receber um valor que não corresponde ao que foi marcado.
 */
const RAIZ = join(__dirname, "..");
const modal = readFileSync(join(RAIZ, "components", "caixa", "ReceberEmLoteModal.tsx"), "utf8");
const tela = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"), "utf8");

describe("escolher quais vendas baixar", () => {
  it("o que vai para o servidor são as MARCADAS, não a lista toda", () => {
    // O erro que isto impede é o mais caro possível: a pessoa marca 3 das 10 vendas do Lucas e
    // o sistema quita as 10.
    expect(modal).toContain("appointmentIds: escolhidas.map((c) => c.id)");
    expect(modal).not.toContain("appointmentIds: comandas.map((c) => c.id)");
  });

  it("o total segue a seleção, e o valor do pagamento acompanha", () => {
    // Marcar 3 de 10 e o campo continuar com o total das 10 é o jeito mais fácil de receber o
    // valor errado — e ninguém confere um número que já veio preenchido.
    expect(modal).toContain("escolhidas.reduce");
    expect(modal).toMatch(/setFormasLote\(\(fs\) =>[\s\S]{0,140}total\.toFixed\(2\)/);
  });

  it("nenhuma marcada não recebe nada", () => {
    expect(modal).toContain("if (!escolhidas.length)");
  });

  it("a confirmação fala do que foi escolhido, não do que está na tela", () => {
    expect(modal).toContain("Receber ${escolhidas.length} venda(s)");
  });
});

describe("o aviso das outras vendas em aberto", () => {
  it("diz QUANTO o cliente deve, não só que existem outras", () => {
    // "Existem outras vendas" e "o cliente deve R$ 3.842,25" são conversas diferentes com quem
    // está no balcão.
    expect(modal).toContain("forasSelecao > 0");
    expect(modal).toContain("money(totalGeral)");
  });

  it("só aparece quando há alguma fora da seleção", () => {
    // Abrir pelo extrato do cliente marca todas: nesse caso não há o que avisar.
    expect(modal).toMatch(/forasSelecao\s*=\s*comandas\.length\s*-\s*escolhidas\.length/);
  });
});

describe("a porta a partir de UMA venda", () => {
  it("cada venda em aberto tem o botão de receber", () => {
    expect(tela).toContain("💰 Receber");
    expect(tela).toContain("(v.aberto ?? 0) > 0.009");   // venda quitada não mostra o botão
  });

  it("abre com a venda clicada MARCADA e as outras à vista", () => {
    expect(tela).toContain("preSelecionadas: [v.id]");
  });

  it("a venda clicada entra na lista mesmo se não estiver no período filtrado", () => {
    // Senão o botão abriria um modal sem a própria venda dentro — o pior tipo de erro: o que
    // parece funcionar.
    expect(tela).toContain("doCliente.some((c) => c.id === v.id)");
  });
});
