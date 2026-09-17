import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * TODA PORTA QUE RECEBE VENDA USA A GAVETA ÚNICA.
 *
 * Cintia, 16/09/2026: "eu tinha trazido vários exemplos do simplesvet para poder baixar várias
 * vendas simultaneamente no próprio ponto de vendas, e essa opção não aparece quando vamos fechar".
 * Na mesma noite a decisão foi além: as cinco portas de receber viram UMA — o "Baixar várias"
 * (components/caixa/ReceberEmLoteModal), que pergunta o caixa, mostra a data dele, tem desconto e
 * observação e mostra as outras vendas em aberto do cliente. Saíram a gaveta própria do Movimento
 * de caixa, a gaveta antiga do ponto de venda, o recebimento da venda nova sem perguntar o caixa, e
 * as Comandas (tela fora do menu).
 *
 * Tela nova que recebe venda entra nesta lista — e se entrar com gaveta própria, o deploy para.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

const PORTAS: Record<string, string[]> = {
  "Movimento de caixa": ["app", "(user)", "dashboard", "erp", "caixa", "page.tsx"],
  "Ponto de venda": ["app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"],
  "Consulta de vendas": ["app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx"],
};

describe("cada porta de receber usa a MESMA gaveta", () => {
  for (const [nome, caminho] of Object.entries(PORTAS)) {
    it(nome, () => {
      const src = ler(...caminho);
      expect(src).toMatch(/import ReceberEmLoteModal/);
      expect(src).toContain("<ReceberEmLoteModal");
      // Nenhuma grava recebimento de venda por conta própria.
      expect(src).not.toMatch(/fetch\(`\/api\/caixa\/\$\{[^}]+\}\/recebimento`/);
    });
  }

  it("as Comandas saíram do ar", () => {
    expect(ler("app", "(user)", "dashboard", "erp", "comandas", "page.tsx")).toContain('redirect("/dashboard/erp/consulta-vendas")');
  });
});

describe("a gaveta única", () => {
  const gaveta = ler("components", "caixa", "ReceberEmLoteModal.tsx");

  it("tem desconto (em R$ ou %) e observação, que só o Movimento de caixa tinha", () => {
    expect(gaveta).toContain('useState<"R$" | "%">("R$")');
    expect(gaveta).toContain("...(desconto > 0.009 ? { desconto } : {})");
    expect(gaveta).toContain("observacao: observacao.trim()");
  });

  it("mostra a data do caixa em que o dinheiro entra, mesmo com um caixa só", () => {
    expect(gaveta).toContain("Entra no caixa nº {c.numero} de");
  });

  it("avisa quanto o cliente deve no total quando há outras vendas em aberto", () => {
    expect(gaveta).toContain("Vendas em aberto {money(totalGeral)}");
  });
});

describe("o Movimento de caixa", () => {
  const caixa = ler(...PORTAS["Movimento de caixa"]);

  it("abre a gaveta única com ESTA venda marcada e as outras do cliente à vista", () => {
    expect(caixa).toContain("pre: [venda.id]");
    expect(caixa).toContain("/api/caixa/vendas?abertas=true&tutorId=");
  });

  it("não tem mais gaveta própria", () => {
    expect(caixa).not.toContain('title="Registrar recebimento"');
    expect(caixa).not.toContain("const registrarRecebimento = async");
  });

  it("o link de outra tela acha venda de outro dia — e, não achando, diz", () => {
    expect(caixa).toContain("/api/appointments/${encodeURIComponent(pedida)}");
    expect(caixa).toContain("Não encontrei essa venda para receber");
  });
});

describe("o Ponto de venda", () => {
  const pdv = ler(...PORTAS["Ponto de venda"]);

  it("a lista 'Deve R$ X' do cliente baixa várias", () => {
    expect(pdv).toContain("💰 Baixar várias");
  });

  it("venda nova: salva e abre a gaveta com ela marcada — o servidor não escolhe o caixa sozinho", () => {
    expect(pdv).toContain("if (!soCaucao) return salvarEBaixarVarias();");
    expect(pdv).toContain("pre: [nova.id]");
  });

  it("venda já salva: recebe ali mesmo, na gaveta, com as outras do cliente", () => {
    expect(pdv).toContain("pre: [detVenda.id]");
    expect(pdv).not.toContain("Levar para o caixa");
  });

  it("a gaveta antiga saiu", () => {
    expect(pdv).not.toContain("confirmarRecVenda");
    expect(pdv).not.toContain("recFormas");
  });

  it("caução nunca vira 'a receber' por esse caminho", () => {
    expect(pdv).toContain("if (!cliente || temCaucao) return;");
  });
});
