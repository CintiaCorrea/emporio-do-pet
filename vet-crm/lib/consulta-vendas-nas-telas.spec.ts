import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ PROTEÇÃO DA CONSULTA DE VENDAS E DO "LOCALIZAR VENDA".
//
// Nasceram da leitura do SimplesVet feita em 07/09/2026, e cada teste aqui guarda uma decisão
// que a Cintia tomou depois dessa leitura:
//   · situação da venda vem do CÁLCULO (quanto entrou × quanto vale), nunca de um texto de
//     status — lá o mesmo rótulo significava coisas diferentes em quadros diferentes;
//   · o corte da lista nunca é mudo: o rodapé diz quantas vendas existem no filtro;
//   · o aviso de saldo ao lado do cliente é a dívida TOTAL dele, não a desta venda.

const raiz = path.resolve(__dirname, "..");
const ler = (p: string) =>
  fs.readFileSync(path.join(raiz, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const CONSULTA = "app/(user)/dashboard/erp/consulta-vendas/page.tsx";
const PDV = "app/(user)/dashboard/erp/ponto-de-venda/page.tsx";

describe("a situação da venda é calculada, não escrita", () => {
  it("a lista usa a situação vinda do backend", () => {
    const src = ler(CONSULTA);
    expect(src).toContain("v.situacao === 'PAGA'");
    expect(src).toContain("v.situacao === 'PARCIAL'");
  });

  it("os três estados têm rótulo próprio", () => {
    const src = ler(CONSULTA);
    for (const rotulo of ["Baixado", "Baixa parcial", "Aberto"]) {
      expect(src).toContain(rotulo);
    }
  });

  it("a baixa parcial diz quanto falta", () => {
    // Badge que só diz "parcial" obriga a abrir a venda pra saber o que cobrar.
    expect(ler(CONSULTA)).toContain("falta ${brl(v.aberto)}");
  });
});

describe("a lista não esconde o tamanho do filtro", () => {
  it("pagina de 30 em 30", () => {
    expect(ler(CONSULTA)).toContain("POR_PAGINA = 30");
  });

  it("o rodapé diz quantas vendas existem no filtro, não só a página", () => {
    expect(ler(CONSULTA)).toContain("no filtro");
  });
});

describe("o saldo do cliente aparece ao lado do nome", () => {
  it("a linha recebe o saldo histórico do cliente", () => {
    const src = ler(CONSULTA);
    expect(src).toContain("saldoCliente");
    expect(src).toContain("em aberto no total");
  });

  it("o saldo sai das contas em aberto de todos os dias", () => {
    expect(ler(CONSULTA)).toContain("/api/caixa/vendas?abertas=true");
  });
});

describe("dá pra achar uma venda sem saber a data", () => {
  it("o ponto de venda tem Localizar venda", () => {
    const src = ler(PDV);
    expect(src).toContain("localizarVenda");
    expect(src).toContain("Localizar venda");
  });

  it("procura por número, por cliente e por período", () => {
    const src = ler(PDV);
    expect(src).toContain("p.set('cod'");
    expect(src).toContain("p.set('busca'");
    expect(src).toContain("p.set('de'");
  });
});
