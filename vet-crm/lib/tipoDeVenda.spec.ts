import { describe, it, expect } from "vitest";
import { ehTipoDeVenda, ehTipoDeOrcamento, ehCompra } from "@/lib/tipoDeVenda";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

describe("o que conta como venda", () => {
  it("aceita as duas grafias que existem no banco", () => {
    // O importador do SimplesVet grava 'VENDA'; o nosso ponto de venda e a internação, 'Venda'.
    for (const t of ["VENDA", "Venda", "venda", " Venda "]) expect(ehTipoDeVenda(t)).toBe(true);
  });

  it("orçamento não é venda, em nenhuma grafia", () => {
    for (const t of ["Orçamento", "ORCAMENTO", "orcamento"]) {
      expect(ehTipoDeVenda(t)).toBe(false);
      expect(ehTipoDeOrcamento(t)).toBe(true);
    }
  });

  it("atendimento clínico e internação não são venda", () => {
    // A INTERNAÇÃO é gravada SEM tipo e com valor (a diária). Era ela que aparecia no
    // "Histórico de compras" com o texto do diagnóstico no lugar do produto.
    for (const t of ["Consulta", "Retorno", "HOSPITALIZATION", "", null, undefined]) {
      expect(ehTipoDeVenda(t as any)).toBe(false);
    }
  });
});

describe("o que entra no histórico de compras", () => {
  it("a internação NÃO entra, mesmo tendo valor", () => {
    // O filtro era por valor. "Anemia + trombocitopenia (transfusão)" R$ 1.200,00 passava.
    expect(ehCompra({ type: null, value: 1200 })).toBe(false);
    expect(ehCompra({ type: "Consulta", value: 300 })).toBe(false);
  });

  it("a venda entra, das duas grafias", () => {
    expect(ehCompra({ type: "Venda", value: 150 })).toBe(true);
    expect(ehCompra({ type: "VENDA", value: 150 })).toBe(true);
  });

  it("venda de R$ 0,00 não é compra — não ocupa linha no histórico", () => {
    expect(ehCompra({ type: "Venda", value: 0 })).toBe(false);
    expect(ehCompra({ type: "Venda", value: null })).toBe(false);
  });

  it("nada não quebra", () => {
    expect(ehCompra(null)).toBe(false);
    expect(ehCompra(undefined)).toBe(false);
  });
});

describe("as duas fichas usam a regra, e o servidor manda os itens", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";

  it("ficha do pet e ficha do cliente filtram por tipo, não por valor", () => {
    for (const rel of [
      "app/(user)/dashboard/erp/pets/[id]/page.tsx",
      "app/(user)/dashboard/erp/tutores/[id]/page.tsx",
    ]) {
      expect(fonte(rel)).toContain("ehCompra");
    }
  });

  it("a regra do front e a do servidor concordam nas grafias", () => {
    // Gêmeas de propósito: se uma grafia nova nascer, tem de entrar nas duas. Enquanto
    // discordarem, uma tela mostra o que a outra esconde.
    const api = require("fs").readFileSync(
      require("path").resolve(__dirname, "../..", "backend/src/modules/crm/consulta-vendas.regras.ts"), "utf8");
    for (const g of ["VENDA", "Venda", "venda"]) expect(api).toContain(`'${g}'`);
  });
});

describe("a ponte para o ponto de venda existe em toda tela de venda", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";

  it("o botão é UM só", () => {
    // "Lançar item pode ser em qualquer tela; receber dinheiro acontece em uma só" — a decisão
    // de 09/09/2026. Este botão é a ponte entre as duas coisas.
    expect(fonte("components/vendas/BotaoAbrirNoPDV.tsx")).toContain("ponto-de-venda?venda=");
  });

  it("ficha do cliente, ficha do pet, comanda e internação levam para o PDV", () => {
    // AS QUATRO telas de lançamento levam para o mesmo lugar de receber.
    for (const rel of [
      "app/(user)/dashboard/erp/tutores/[id]/page.tsx",
      "app/(user)/dashboard/erp/pets/[id]/page.tsx",
      "components/pets/PetComandaRail.tsx",
      "app/(user)/dashboard/erp/internacoes/[id]/page.tsx",
    ]) {
      expect(fonte(rel)).toContain("BotaoAbrirNoPDV");
    }
  });

  it("o ponto de venda continua sabendo abrir a venda que vem pelo link", () => {
    // Sem isto a ponte leva a lugar nenhum: o PDV abriria a lista, não a venda.
    const pdv = fonte("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
    expect(pdv).toContain("get('venda')");
    expect(pdv).toContain("abrirDetVenda(v)");
  });
});

describe("as vendas do cliente abrem como no SimplesVet", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";
  const src = () => fonte("app/(user)/dashboard/erp/tutores/[id]/page.tsx");

  it("cada venda é uma linha que abre, com código e situação", () => {
    // "Podemos deixar as vendas na aba do cliente organizadas como no simplesvet?" (Cintia).
    expect(src()).toContain("abrirCompra");
    expect(src()).toContain("Cód.");
  });

  it("os itens vêm do caminho que já existia, e só quando alguém abre", () => {
    // Quem só passa os olhos na lista não paga a busca dos itens.
    const s = src();
    expect(s).toContain("/api/tutors/${id}/vendas");
    expect(s).toContain("Produto / Serviço");
  });

  it("o botão Fechar saiu do detalhe da venda — o X já fecha", () => {
    // "Não precisamos do botão fechar, já que ao clicar no X a venda fecha" (Cintia).
    const pdv = fonte("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
    expect(pdv).not.toContain(">Fechar</button>");
  });
});
