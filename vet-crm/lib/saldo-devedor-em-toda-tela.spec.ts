import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * O QUE O CLIENTE DEVE APARECE ONDE O CLIENTE APARECE.
 *
 * Cintia, 15/09/2026, com o print da ficha do Lucas Andrade Mendes: "no nome do cliente não tem
 * tag com o valor devedor, que deve acompanhar em todas as telas do sistema".
 *
 * E havia coisa pior que a falta: a ficha dele mostrava o selo verde "Em dia" enquanto ele devia
 * R$ 3.842,25 em 10 vendas. O selo fala de FREQUÊNCIA de visita, não de dinheiro — mas ninguém
 * lê assim ao lado do nome. Sem a etiqueta do saldo, a tela afirmava que estava tudo certo.
 *
 * É UM componente, e não uma conta repetida em cada tela: saldo que aparece em quatro lugares
 * com quatro contas diferentes é pior do que saldo que não aparece — a equipe deixa de confiar
 * no número e passa a conferir tudo à mão.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");
const tag = ler("components", "comum", "SaldoDevedorTag.tsx");

describe("a etiqueta do saldo devedor", () => {
  it("existe como componente único", () => {
    expect(existsSync(join(RAIZ, "components", "comum", "SaldoDevedorTag.tsx"))).toBe(true);
  });

  it("some quando não há dívida", () => {
    // "Deve R$ 0,00" em toda ficha em dia é ruído, e ruído faz a etiqueta virar paisagem —
    // justamente na hora em que ela precisa ser notada.
    expect(tag).toContain("saldo <= 0.009");
  });

  it("não pisca um zero enquanto carrega", () => {
    // Mostrar "R$ 0,00" e depois trocar por "Deve R$ 3.842,25" é pior do que demorar: quem
    // olhou no primeiro instante sai com a informação errada.
    expect(tag).toContain("saldo == null");
    expect(tag).toMatch(/useState<number \| null>\(null\)/);
  });

  it("pede o saldo de UM cliente, não a lista inteira da casa", () => {
    expect(tag).toContain("tutorId=${encodeURIComponent(tutorId)}");
    expect(tag).toContain("abertas=true");
  });

  it("leva para as vendas do cliente — ver a dívida e não poder agir é meio caminho", () => {
    // Pelo ID do cliente, não pelo nome: "?busca=Lucas" trazia todo cliente chamado Lucas. E a
    // Consulta de vendas precisa LER o endereço — até 16/09/2026 ela o ignorava, e o clique na
    // etiqueta abria a lista do mês inteira.
    expect(tag).toContain("/dashboard/erp/consulta-vendas?cliente=");
    const consulta = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");
    expect(consulta).toContain("const cliente = (u.get('cliente') || '').trim();");
    expect(consulta).toContain("if (soCliente?.id) p.set('tutorId', soCliente.id);");
  });

  it("não deixa o clique escapar para a linha atrás dela", () => {
    // Em lista, a etiqueta vive dentro de uma linha clicável; sem isto, clicar nela abriria
    // duas coisas ao mesmo tempo.
    expect(tag).toContain("e.stopPropagation()");
  });
});

describe("as telas que a carregam", () => {
  it("a ficha do CLIENTE, ao lado do nome", () => {
    const ficha = ler("app", "(user)", "dashboard", "erp", "tutores", "[id]", "page.tsx");
    expect(ficha).toContain("SaldoDevedorTag");
    expect(ficha).toContain('from "@/components/comum/SaldoDevedorTag"');
  });

  it("a ficha do PET, onde a equipe passa o dia", () => {
    const pet = ler("app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx");
    expect(pet).toContain("SaldoDevedorTag");
  });

  it("o PONTO DE VENDA, onde se decide cobrar", () => {
    // E a mais importante das quatro: e' a unica tela em que da' pra fazer alguma coisa com a
    // divida no mesmo instante em que ela aparece.
    const pdv = ler("app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx");
    expect(pdv).toContain("SaldoDevedorTag");
    expect(pdv).toMatch(/from ['"]@\/components\/comum\/SaldoDevedorTag['"]/);
  });

  it("a INTERNACAO, que e' onde a conta cresce sem ninguem olhar", () => {
    const int = ler("app", "(user)", "dashboard", "erp", "internacoes", "[id]", "page.tsx");
    expect(int).toContain("SaldoDevedorTag");
    expect(int).toMatch(/from ['"]@\/components\/comum\/SaldoDevedorTag['"]/);
  });
});

describe("o servidor sabe filtrar por cliente", () => {
  it("senão cada ficha aberta carregaria as vendas abertas da casa inteira", () => {
    const svc = readFileSync(join(RAIZ, "..", "backend", "src", "modules", "caixa", "caixa.service.ts"), "utf8");
    expect(svc).toContain("if (tutorId) where.tutorId = tutorId;");
  });
});
