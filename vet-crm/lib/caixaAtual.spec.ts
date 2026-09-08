import { describe, it, expect } from "vitest";
import { caixaParaReceber, rotuloCaixa } from "@/lib/caixaAtual";

const cx = (id: string, nome: string) => ({ id, numero: 1, abertura: "2026-09-08T09:00:00", operadorId: id + "-u", operadorNome: nome });

describe("o caixa é individual — ninguém lança no caixa de outra pessoa", () => {
  it("com o meu caixa aberto, é nele que se lança", () => {
    const meu = cx("a", "Gabriela");
    expect(caixaParaReceber({ meu, deOutros: [] }).caixa).toBe(meu);
  });

  it("o caixa da outra pessoa NÃO serve, mesmo sendo o único aberto", () => {
    // Era assim até 08/09/2026: conveniente e errado. O dinheiro entrava na gaveta de quem não
    // recebeu, e a diferença aparecia no fechamento — para a pessoa errada.
    const r = caixaParaReceber({ meu: null, deOutros: [cx("b", "Victoria")] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Victoria");
    expect(r.erro).toContain("abra o seu".replace("a", "a"));
  });

  it("com vários caixas de outras pessoas, também não lança", () => {
    const r = caixaParaReceber({ meu: null, deOutros: [cx("b", "Victoria"), cx("c", "Cintia")] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Victoria");
  });

  it("sem caixa nenhum, manda abrir o seu", () => {
    const r = caixaParaReceber({ meu: null, deOutros: [] });
    expect(r.caixa).toBeNull();
    expect(r.erro).toContain("Nenhum caixa aberto");
  });

  it("o rótulo mostra de quem é o caixa", () => {
    expect(rotuloCaixa(cx("a", "Gabriela"))).toContain("Gabriela");
  });
});

describe("a caixinha do caixa está no ponto de venda", () => {
  const ler = () => require("fs").readFileSync(
    require("path").resolve(__dirname, "..", "app/(user)/dashboard/erp/ponto-de-venda/page.tsx"), "utf8");

  it("dá para ABRIR o caixa de dentro do ponto de venda", () => {
    // Em 07/09 eu tirei o bloco "Outros caixas" e depois trouxe o painel de operações só para
    // quem já tinha caixa — ou seja, ele sumia justamente na hora de abrir um.
    expect(ler()).toContain("Abrir o meu caixa");
  });

  it("mostra os outros caixas abertos", () => {
    const src = ler();
    expect(src).toContain("Outros caixas abertos");
    expect(src).toContain("caixasDeOutros.map");
  });

  it("e o atalho para os meus caixas", () => {
    expect(ler()).toContain("Meus caixas");
  });
});

// 🛡️ SÓ RECEBE QUEM TEM O PRÓPRIO CAIXA ABERTO — e abrir custa um clique.
//
// A Cintia, em 08/09/2026, decidindo o caso do administrativo: "adm abre o caixa dela também".
// Uma regra só para recepção (Gabriela, Victoria) e adm.
//
// A regra só é justa se abrir o caixa não custar a venda. Antes a tela mandava a pessoa para
// /dashboard/erp/caixa no meio do recebimento: ela perdia a venda de vista e recomeçava. Com o
// cliente no balcão, ninguém faz isso — faz-se o contrário, que é receber na gaveta de quem
// estiver aberta. Era exatamente o que a decisão dela proíbe.
const lerArq = (rel: string) => require("fs").readFileSync(
  require("path").resolve(__dirname, "..", rel), "utf8");

describe("quem não tem caixa abre o dela sem sair da venda", () => {
  it("o modal existe e é um só", () => {
    const src = lerArq("components/caixa/AbrirMeuCaixaModal.tsx");
    expect(src).toContain("export default function AbrirMeuCaixaModal");
    // O backend devolve o caixa que a pessoa já tinha em vez de criar um segundo.
    expect(src).toContain("jaEstavaAberto");
  });

  it("o ponto de venda abre o caixa ali mesmo, sem mandar pra outra tela", () => {
    const src = lerArq("app/(user)/dashboard/erp/ponto-de-venda/page.tsx");
    expect(src).toContain("AbrirMeuCaixaModal");
    expect(src).toContain("setAbrirCaixaMotivo");
  });

  it("as comandas também", () => {
    const src = lerArq("app/(user)/dashboard/erp/comandas/page.tsx");
    expect(src).toContain("AbrirMeuCaixaModal");
    expect(src).toContain("setAbrirCaixaMotivo");
  });
});

describe("a tela do caixa não engole a explicação do servidor", () => {
  const src = () => lerArq("app/(user)/dashboard/erp/caixa/page.tsx");

  it("abrir, encerrar e reabrir mostram a mensagem que veio do servidor", () => {
    // "Erro ao abrir caixa" escondia "só a recepção e o administrativo abrem caixa" — que era a
    // única coisa que a pessoa precisava ler.
    expect(src()).toContain("erroDoServidor");
    expect(src()).not.toContain("throw new Error('Erro ao abrir caixa')");
    expect(src()).not.toContain("throw new Error('Erro ao encerrar caixa')");
  });

  it("avisa quando a pessoa já tinha caixa aberto, em vez de fingir que abriu outro", () => {
    expect(src()).toContain("jaEstavaAberto");
  });
});

describe("o encerramento da meia-noite não é mais um interruptor", () => {
  it("a configuração de vendas conta a regra em vez de oferecer o toggle", () => {
    // "Os caixas DEVEM ser encerrados às 00:00 TODOS OS DIAS" (Cintia, 08/09/2026). O toggle
    // existia e estava desligado — a tela dizia que era opcional, e era mentira.
    const src = lerArq("app/(user)/dashboard/erp/configuracoes-vendas/page.tsx");
    expect(src).not.toContain('Toggle k="fecharCaixaMeiaNoite"');
    expect(src).toContain("encerra todo dia à meia-noite");
  });
});
