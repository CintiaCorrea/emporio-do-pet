import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * TODA PORTA QUE RECEBE VENDA OFERECE BAIXAR VÁRIAS.
 *
 * Cintia, 16/09/2026: "ontem trabalhamos o ponto de venda e eu tinha trazido vários exemplos do
 * simplesvet para poder baixar várias vendas simultaneamente no próprio ponto de vendas, e essa
 * opção não aparece quando vamos fechar. Só conseguimos ver se formos pela aba de consulta de
 * vendas. Pode verificar por que não foi feito como pedido?"
 *
 * O QUE ACONTECEU: a promessa de 15/09 foi "em qualquer venda, Registrar recebimento verifica se
 * o cliente tem outras em aberto". A entrega foi um botão na lista da Consulta de vendas. O
 * caminho real de fechar — Ponto de venda → Levar para o caixa → Registrar recebimento — ficou
 * recebendo uma venda só. A peça existia; só não estava onde o dinheiro entra.
 *
 * E havia um segundo defeito escondido atrás do primeiro: o Caixa procurava a venda do link SÓ
 * entre as do dia na tela. Venda de outro dia não abria nada, sem aviso.
 *
 * Este teste lista as portas. Tela nova que recebe venda entra nesta lista — e se entrar sem a
 * baixa de várias, o deploy para.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

const PORTAS: Record<string, string[]> = {
  "Caixa (onde o ponto de venda manda receber)": ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
  "Ponto de venda": ["app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"],
  "Consulta de vendas": ["app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"],
  "Comandas": ["app", "(user)", "dashboard", "erp", "comandas", "page.tsx"],
};

describe("cada porta de receber usa a MESMA peça de baixar várias", () => {
  for (const [nome, caminho] of Object.entries(PORTAS)) {
    it(nome, () => {
      const src = ler(...caminho);
      // Importa e monta o componente único — não uma cópia parecida.
      expect(src).toMatch(/import ReceberEmLoteModal/);
      expect(src).toContain("<ReceberEmLoteModal");
    });
  }
});

describe("o Caixa, que é onde o ponto de venda fecha", () => {
  const caixa = ler(...PORTAS["Caixa (onde o ponto de venda manda receber)"]);

  it("avisa com o texto que ela pediu e oferece Baixar várias no próprio recebimento", () => {
    expect(caixa).toContain("Vendas em aberto {brl(total)}");
    expect(caixa).toContain("Baixar várias");
  });

  it("abre com ESTA venda marcada e as outras desmarcadas", () => {
    // Quem veio de uma venda não pode baixar as outras nove sem querer.
    expect(caixa).toContain("pre: [vendaSel.id]");
  });

  it("busca as abertas do cliente de QUALQUER dia, na mesma fonte das outras telas", () => {
    expect(caixa).toContain("/api/caixa/vendas?abertas=true&tutorId=");
  });

  it("o link do ponto de venda acha venda de outro dia — e, não achando, diz", () => {
    expect(caixa).toContain("/api/appointments/${encodeURIComponent(pedida)}");
    expect(caixa).toContain("Não encontrei essa venda para receber");
  });

  it("o saldo da venda considera o que já foi pago em outros caixas", () => {
    expect(caixa).toContain("linhaDaVendaSel ? Number(linhaDaVendaSel.aberto || 0)");
  });

  it("o desconto aceita centavos", () => {
    // "Já pedi que todos os campos com valor tenham dois dígitos após a vírgula."
    expect(caixa).toContain("<CampoValor valor={desconto} onValor={setDesconto}");
  });
});

describe("o Ponto de venda, nas duas portas dele", () => {
  const pdv = ler(...PORTAS["Ponto de venda"]);

  it("a lista 'Deve R$ X' do cliente baixa várias, e não só uma por vez", () => {
    expect(pdv).toContain("💰 Baixar várias");
  });

  it("a venda nova paga na hora avisa das outras e grava antes de escolher", () => {
    // Gravar antes é o que permite escolher: o servidor só baixa venda que existe.
    expect(pdv).toContain("Vendas em aberto {brl(saldoDoCliente + total)}");
    expect(pdv).toContain("const salvarEBaixarVarias = async");
    expect(pdv).toContain("pre: [nova.id]");
  });

  it("caução nunca vira 'a receber' por esse caminho", () => {
    expect(pdv).toContain("if (!cliente || temCaucao) return;");
  });
});
