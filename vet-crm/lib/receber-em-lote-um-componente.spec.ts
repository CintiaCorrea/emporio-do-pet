import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bloco B, 12/09/2026. A Cintia quer uma porta so no menu ("quero que fique somente a opcao de
 * consulta de vendas"), e para a aba "Vendas em aberto" poder sair de la, a Consulta precisou
 * aprender a RECEBER — inclusive varias vendas num pagamento so.
 *
 * O jeito errado seria copiar o modal. Recebimento e dinheiro: em 10-11/09/2026 o caixa passou
 * mais de 24 horas sem registrar nenhuma baixa por causa de UM `return` silencioso, e duas
 * copias significam corrigir uma e esquecer a outra. Por isso a peca e um componente so, e
 * esta varredura falha se alguem voltar a duplicar a chamada de recebimento.
 */
const raiz = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(raiz, ...p), "utf8");

const componente = ler("components", "caixa", "ReceberEmLoteModal.tsx");
const comandas = ler("app", "(user)", "dashboard", "erp", "comandas", "page.tsx");
const consulta = ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx");

describe("receber em lote: um componente, duas telas", () => {
  it("so o componente chama o recebimento em lote", () => {
    expect(componente).toContain("recebimento-lote");
    expect(comandas).not.toContain("recebimento-lote");
    expect(consulta).not.toContain("recebimento-lote");
  });

  it("as duas telas montam o MESMO componente", () => {
    for (const [nome, tela] of [["comandas", comandas], ["consulta de vendas", consulta]] as const) {
      expect(tela, nome).toMatch(/from "@\/components\/caixa\/ReceberEmLoteModal"|from '@\/components\/caixa\/ReceberEmLoteModal'/);
      expect(tela, nome).toMatch(/<ReceberEmLoteModal/);
    }
  });

  it("cartao continua exigindo operadora, NSU e AUT", () => {
    // e' o que casa a venda com a linha do extrato da operadora
    expect(componente).toContain("validarPagamentosCartao");
  });

  it("a escolha do caixa fica FORA do `caixaAberto ?`", () => {
    // quem nao tem caixa de hoje mas tem um de outro dia reaberto so destrava por essa faixa
    const antes = componente.slice(0, componente.indexOf("{caixaAberto ? ("));
    expect(antes).toContain("<EscolhaDoCaixa");
  });

  it("sem caixa aberto a peca ABRE o caixa, em vez de mandar a pessoa pra outra tela", () => {
    expect(componente).toContain("<AbrirMeuCaixaModal");
    expect(componente).toMatch(/setAbrirCaixaMotivo\(`Para receber as vendas de/);
  });

  it("trava no primeiro clique: dinheiro nao se lanca duas vezes", () => {
    const receber = componente.slice(componente.indexOf("const receber = async"));
    expect(receber.slice(0, 200)).toMatch(/if \(baixando\) return/);
  });

  it("o componente nao calcula dinheiro — quem distribui e o servidor", () => {
    // a conta mora em backend recebimento-lote.regras, com teste proprio
    expect(componente).not.toMatch(/distribuirPagamento|repartirFormas/);
  });
});

describe("consulta de vendas: as acoes que vieram das outras abas", () => {
  it("recebe, cobra e exclui — as tres que faltavam pra fechar o menu", () => {
    expect(consulta).toMatch(/\U0001F4B0 Receber|💰 Receber/);
    expect(consulta).toMatch(/rotulo="💬 Cobrar"/);
    expect(consulta).toContain("excluirVenda");
  });

  it("cobrar manda so o que esta em aberto", () => {
    expect(consulta).toMatch(/apenasEmAberto: true/);
  });

  it("receber e cobrar usam as abertas de TODOS os dias, nao as do periodo", () => {
    // filtrar setembro e cobrar "o a receber de setembro" deixa divida antiga pra tras
    expect(consulta).toContain("abertasPorCliente");
    expect(consulta).toContain("/api/caixa/vendas?abertas=true");
  });

  it("os botoes de cobranca so aparecem quando ha o que cobrar", () => {
    expect(consulta).toMatch(/\(abertasPorCliente\[clienteUnico\.id\]\?\.length \|\| 0\) > 0 &&/);
  });

  it("depois de receber, a tela recarrega as abertas e a lista", () => {
    expect(consulta).toMatch(/onRecebido=\{\(\) => \{ setRecarregarAbertas\(\(n\) => n \+ 1\); load\(\); \}\}/);
  });

  it("a exclusao passa pela regra compartilhada, nao por fetch solto na tela", () => {
    expect(consulta).not.toMatch(/\/api\/appointments\/\$\{[^}]+\}`, \{ method: 'DELETE'/);
    expect(consulta).toMatch(/excluirVenda\(/);
  });
});
