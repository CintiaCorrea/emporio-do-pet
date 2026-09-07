import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// 🛡️ PROTEÇÃO DO MODELO NAS TELAS DE VENDA.
//
// A Cintia, em 06/09/2026:
//   "TODOS os pontos de venda, com exceção da internação, devem permitir escolher o modelo a
//    ser utilizado, dessa forma informações básicas já podem ficar registradas na observação,
//    assim como em caso de orçamentos de procedimentos."
//
// O modelo já existia cadastrado (ERP › Modelo de orçamento) e só o Orçamento rápido sabia
// usar — o próprio arquivo da tela de cadastro dizia "o «usar modelo» no orçamento/PDV é
// ligado depois". Ligar em uma tela só e esquecer a outra é exatamente o tipo de coisa que
// ninguém percebe: a tela funciona, só não tem o campo.
//
// A exceção é a internação, POR DECISÃO — não por esquecimento. Por isso ela também está
// testada: se alguém "completar" a internação um dia, o teste conta a história antes.

const raiz = path.resolve(__dirname, "..");
const bruto = (p: string) => fs.readFileSync(path.join(raiz, p), "utf8");
const ler = (p: string) =>
  bruto(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Onde a recepção monta uma venda/orçamento do zero — e portanto pode partir de um modelo. */
const TELAS_COM_MODELO = [
  "app/(user)/dashboard/erp/ponto-de-venda/page.tsx",
  "components/pets/PetComandaRail.tsx",
  "components/vendas/OrcamentoRapidoModal.tsx",
];

describe("o modelo está em todo ponto de venda", () => {
  it.each(TELAS_COM_MODELO)("%s oferece o seletor de modelo", (tela) => {
    const src = ler(tela);
    expect(src).toContain("SeletorModeloVenda");
  });

  it.each(TELAS_COM_MODELO)("%s escreve a observação do modelo", (tela) => {
    // Metade do pedido era a observação: "informações básicas já podem ficar registradas".
    // Lançar só os itens é entregar meio recurso — e ninguém repara.
    expect(ler(tela)).toContain("juntarObservacao");
  });

  it.each(TELAS_COM_MODELO)("%s casa o item do modelo com o catálogo", (tela) => {
    // Sem casar, o item entra como texto solto: perde a identidade (exame, fornecedor, item
    // do catálogo novo) e congela o preço do dia em que o modelo foi criado.
    expect(ler(tela)).toContain("casarNoCatalogo");
  });

  it("ninguém volta a ler a lista de modelos à mão", () => {
    // Cada tela buscando /api/listas e dando JSON.parse por conta própria é como a busca
    // ficou quebrada em três telas diferentes. Quem lê o modelo é lib/modelosVenda.
    for (const tela of TELAS_COM_MODELO) {
      expect(ler(tela)).not.toContain("lista=orcamentomodelo");
    }
  });
});

describe("a internação fica de fora — de propósito", () => {
  it.each([
    "app/(user)/dashboard/erp/internacoes/page.tsx",
    "app/(user)/dashboard/erp/internacoes/[id]/page.tsx",
  ])("%s não tem seletor de modelo", (tela) => {
    // "com exceção da internação" (Cintia, 06/09/2026). A conta da internação se monta pelo
    // que foi executado no dia, não por um pacote escolhido na hora de abrir.
    expect(ler(tela)).not.toContain("SeletorModeloVenda");
  });
});
