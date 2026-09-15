import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { AJUSTE_ATE, dentroDaJanelaDeAjuste } from "./janelaDeAjuste";

/**
 * PACOTE LANÇADO À MÃO, SEM PASSAR PELO FINANCEIRO.
 *
 * Cintia, 15/09/2026: "preciso poder colocar pacotes de fisioterapia em alguns clientes sem ter
 * conexão com o financeiro, pois alguns ainda tinham sessões no outro sistema... no início
 * tínhamos essa condição, depois fechamos, podemos reabri-la e deixar aberta até dia 19?"
 *
 * O QUE ESTAVA FECHADO, e não era o que parecia: o botão "＋ pacote" nunca foi removido. Ele
 * vivia DENTRO do bloco "Pacotes e doses", que só renderizava quando o pet já tinha um pacote ou
 * uma dose. Para o pet que não tem nenhum — exatamente o caso de quem está migrando sessões do
 * sistema antigo — o bloco não aparecia, e com ele sumia a única porta para criar o primeiro.
 *
 * Uma função que existe e não tem entrada é uma função que não existe. É a mesma lição das telas
 * que ficaram fora do menu, no mesmo dia.
 */
const RAIZ = join(__dirname, "..");
const ficha = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx"), "utf8");

describe("a janela de ajuste, uma data só", () => {
  it("vai até 19/09, como ela pediu", () => {
    expect(AJUSTE_ATE).toBe("2026-09-19T23:59:59-03:00");
  });

  it("fecha sozinha — ninguém precisa lembrar de fechar", () => {
    expect(dentroDaJanelaDeAjuste("2026-09-19T23:59:00-03:00")).toBe(true);
    expect(dentroDaJanelaDeAjuste("2026-09-20T00:00:01-03:00")).toBe(false);
  });

  it("data ilegível não abre a porta", () => {
    expect(dentroDaJanelaDeAjuste("qualquer coisa")).toBe(false);
  });

  it("a internação parou de guardar a própria cópia da data", () => {
    // Esta cópia já fez uma prorrogação passar batida numa tela enquanto valia na outra.
    const inter = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "internacoes", "[id]", "page.tsx"), "utf8");
    expect(inter).not.toMatch(/AJUSTE_ATE = "20\d\d-/);
    expect(inter).toContain('from "@/lib/janelaDeAjuste"');
  });
});

describe("a porta do pacote manual", () => {
  it("o bloco aparece mesmo com o pet sem pacote nenhum, durante a janela", () => {
    // Era isto o "fechamos": sem pacote, sem bloco; sem bloco, sem botão.
    expect(ficha).toContain("|| dentroDaJanelaDeAjuste()) && (");
  });

  it("e a tela diz até quando", () => {
    // A trava volta sozinha. Quem está migrando sessões precisa saber o prazo, senão um dia o
    // botão some sem explicação.
    expect(ficha).toContain("AJUSTE_ATE_CURTO");
    expect(ficha).toContain("nao passa pelo financeiro");
  });
});

describe("o pacote lançado à mão não vira receita", () => {
  it("nasce marcado como MANUAL e sem financeiro", () => {
    // Sem a marca, o painel de "Pacotes vendidos" e a conferência do financeiro contariam como
    // receita uma sessão que o cliente pagou no sistema antigo.
    expect(ficha).toContain("origem: 'MANUAL', semFinanceiro: true");
  });

  it("o pacote vindo de VENDA continua marcado como venda", () => {
    // A distinção só serve se os dois lados forem explícitos.
    const caixa = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "caixa", "caixa.service.ts"), "utf8");
    expect(caixa).toContain("origem: 'venda'");
  });
});
