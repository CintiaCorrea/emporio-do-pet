import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * O QUE TIRA A PESSOA DA TELA ABRE EM OUTRA ABA.
 *
 * Cintia, 15/09/2026: "quando clicar e for encaminhar para uma nova tela, pode abrir essa nova
 * tela em uma nova janela ou em pop up, pois sempre sai da tela em que estamos e acaba criando
 * retrabalho". E, no mesmo dia: "preciso de um sistema ágil".
 *
 * A ORDEM IMPORTOU AQUI. Isto só pôde ser feito DEPOIS de consertar a sessão: até hoje o sistema
 * guardava uma sessão por pessoa, e abrir uma segunda aba matava a primeira em silêncio. Mandar
 * a equipe abrir abas antes disso seria entregar uma armadilha com cara de atalho.
 *
 * A seta ↗ no rótulo não é enfeite: quem clica precisa saber que vai abrir em outro lugar ANTES
 * de clicar, senão procura o botão "voltar" que não existe mais.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("links que levam para longe", () => {
  it("✏️ Editar venda abre o Ponto de venda em outra aba", () => {
    // Era o caso mais caro: quem estava conferindo uma lista de vendas perdia a lista inteira
    // (filtro, período, página) para corrigir um item.
    const tela = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    const trecho = tela.slice(tela.indexOf("ponto-de-venda?editar="), tela.indexOf("ponto-de-venda?editar=") + 400);
    expect(trecho).toContain('target="_blank"');
    expect(trecho).toContain('rel="noopener"');
    expect(tela).toContain("✏️ Editar ↗");
  });

  it("Abrir ficha, no quadro de exames, também", () => {
    // Quem está trabalhando a fila de exames não pode perder o quadro para consultar uma ficha.
    const kanban = ler("app", "(user)", "dashboard", "erp", "exames-kanban", "page.tsx");
    const trecho = kanban.slice(kanban.indexOf("Abrir ficha") - 400, kanban.indexOf("Abrir ficha") + 60);
    expect(trecho).toContain('target="_blank"');
    expect(kanban).toContain("Abrir ficha ↗");
  });

  it("a etiqueta de saldo devedor leva às vendas em outra aba", () => {
    const tag = ler("components", "comum", "SaldoDevedorTag.tsx");
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener"');
  });

  it("todo alvo _blank vem com rel noopener", () => {
    // Sem `noopener`, a página aberta consegue mexer na que a abriu. É detalhe de segurança que
    // não custa nada e some da memória se não for vigiado.
    for (const arq of [
      ["app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"],
      ["app", "(user)", "dashboard", "erp", "exames-kanban", "page.tsx"],
      ["components", "comum", "SaldoDevedorTag.tsx"],
    ]) {
      const src = ler(...arq);
      const blanks = (src.match(/target="_blank"/g) || []).length;
      const noopeners = (src.match(/rel="noopener/g) || []).length;
      expect(noopeners).toBeGreaterThanOrEqual(blanks);
    }
  });
});

describe("receber continua sendo popup, e não outra aba", () => {
  it("o recebimento é modal na própria tela", () => {
    // Ela pediu "pop-up ou outra aba". Para receber, o popup é melhor: a lista de vendas fica
    // atrás, e ao terminar a pessoa já vê a linha mudar de estado sem trocar de contexto.
    const tela = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(tela).toContain("ReceberEmLoteModal");
    expect(tela).toContain("onRecebido=");
  });
});
