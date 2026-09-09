import { describe, it, expect } from "vitest";
import { situacaoDoOrcamento, permaneceOrcamento, prazoDoOrcamento, SITUACOES } from "@/lib/situacaoDoOrcamento";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

const HOJE = new Date("2026-09-09T10:00:00-03:00");

describe("a escada: em aberto → venda → recebido", () => {
  it("orçamento novo está em aberto", () => {
    expect(situacaoDoOrcamento({ status: "RASCUNHO" }, HOJE)).toBe("ABERTO");
  });

  it("aprovado é o cliente tendo dito sim, antes de virar venda", () => {
    expect(situacaoDoOrcamento({ status: "APROVADO" }, HOJE)).toBe("APROVADO");
  });

  it("vencido é a validade que passou sem virar venda", () => {
    expect(situacaoDoOrcamento({ validade: "2026-09-01" }, HOJE)).toBe("VENCIDO");
    expect(situacaoDoOrcamento({ validade: "2026-09-20" }, HOJE)).toBe("ABERTO");
    // Vence HOJE ainda vale hoje — quem venceu hoje ainda pode ser vendido hoje.
    expect(situacaoDoOrcamento({ validade: "2026-09-09" }, HOJE)).toBe("ABERTO");
  });

  it("virou venda, mas ainda não pago", () => {
    const s = situacaoDoOrcamento({ appointmentId: "ap1", appointment: { value: 300, recebimentos: [] } }, HOJE);
    expect(s).toBe("VENDA");
  });

  it("recebido é o que ela chama de fechado: foi ao caixa E foi pago", () => {
    const s = situacaoDoOrcamento({ appointmentId: "ap1", appointment: { value: 300, recebimentos: [{ valorTotal: 300 }] } }, HOJE);
    expect(s).toBe("RECEBIDO");
  });

  it("pago pela metade ainda é VENDA — a recepção continua tendo o que cobrar", () => {
    const s = situacaoDoOrcamento({ appointmentId: "ap1", appointment: { value: 300, recebimentos: [{ valorTotal: 150 }] } }, HOJE);
    expect(s).toBe("VENDA");
  });

  it("sem a venda carregada, na dúvida é VENDA — nunca 'recebido'", () => {
    // Chutar "recebido" faria a recepção parar de cobrar uma venda que ninguém pagou.
    expect(situacaoDoOrcamento({ appointmentId: "ap1" }, HOJE)).toBe("VENDA");
  });

  it("o que aconteceu depois manda: vencido que virou venda é VENDA", () => {
    const s = situacaoDoOrcamento({ validade: "2026-09-01", appointmentId: "ap1", appointment: { value: 100, recebimentos: [] } }, HOJE);
    expect(s).toBe("VENDA");
  });
});

describe("o que continua sendo orçamento", () => {
  it("aberto, aprovado e vencido continuam; venda e recebido saem", () => {
    expect(permaneceOrcamento({ status: "RASCUNHO" }, HOJE)).toBe(true);
    expect(permaneceOrcamento({ status: "APROVADO" }, HOJE)).toBe(true);
    expect(permaneceOrcamento({ validade: "2026-09-01" }, HOJE)).toBe(true);
    expect(permaneceOrcamento({ appointmentId: "ap1" }, HOJE)).toBe(false);
  });
});

describe("o prazo escrito em português", () => {
  it("conta os dias nos dois sentidos", () => {
    expect(prazoDoOrcamento("2026-09-12", HOJE)).toBe("vence em 3 dias");
    expect(prazoDoOrcamento("2026-09-10", HOJE)).toBe("vence em 1 dia");
    expect(prazoDoOrcamento("2026-09-09", HOJE)).toBe("vence hoje");
    expect(prazoDoOrcamento("2026-09-04", HOJE)).toBe("venceu há 5 dias");
    expect(prazoDoOrcamento(null, HOJE)).toBe("sem validade");
    expect(prazoDoOrcamento("banana", HOJE)).toBe("sem validade");
  });
});

describe("as duas telas de orçamento falam a MESMA língua", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";

  it("nenhuma delas inventa o próprio vocabulário", () => {
    // "Qual a diferença entre vendido e fechado?" (Cintia). Nenhuma: eram duas palavras nossas
    // para a mesma coisa. Agora o nome sai de um lugar só.
    for (const rel of [
      "app/(user)/dashboard/erp/orcamentos/page.tsx",
      "components/vendas/OrcamentosBusca.tsx",
    ]) {
      expect(fonte(rel)).toContain("situacaoDoOrcamento");
    }
  });

  it('a palavra "Vendido" não volta — o nome é "Virou venda"', () => {
    expect(fonte("components/vendas/OrcamentosBusca.tsx")).not.toContain('"Vendido"');
    expect(SITUACOES.VENDA.rotulo).toBe("Virou venda");
    expect(SITUACOES.RECEBIDO.rotulo).toBe("Recebido");
  });

  it("a busca de orçamentos mostra por padrão só o que continua orçamento", () => {
    expect(fonte("components/vendas/OrcamentosBusca.tsx")).toContain("permaneceOrcamento");
  });
});

describe("o menu e a permissão de editar venda", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";
  const menu = () => fonte("components/protected/dashboard/Sidebar.tsx");

  it("Consulta de vendas mora em Vendas, não em Inteligência", () => {
    // Ela foi procurá-la em Vendas e não achou: estava em Gestão › Inteligência, junto de
    // Ranking e RFM. Não é estudo — é trabalho de balcão e de fechamento.
    const src = menu();
    const iPdv = src.indexOf('"/dashboard/erp/ponto-de-venda"');
    const iConsulta = src.indexOf('"/dashboard/erp/consulta-vendas"');
    const iInteligencia = src.indexOf('key: "inteligencia"');
    expect(iConsulta).toBeGreaterThan(iPdv);
    expect(iConsulta).toBeLessThan(iInteligencia);
  });

  it("existe UMA entrada de caixa, chamada Movimento de caixa", () => {
    const src = menu();
    expect(src).toContain('label: "Movimento de caixa"');
    expect(src).not.toContain('label: "Movimentos de caixa"');
    expect(src).not.toContain('label: "Caixa"');
  });

  it("o endereço da tela absorvida redireciona, não some", () => {
    // Quem tiver a página salva no navegador continua chegando onde precisa.
    expect(fonte("app/(user)/dashboard/erp/movimentos-caixa/page.tsx")).toContain('redirect("/dashboard/erp/caixa")');
  });

  it("só o administrativo edita venda em Todas as vendas", () => {
    // "Todas as vendas não é para ser editada por todos, somente pelo adm" (Cintia).
    const src = fonte("app/(user)/dashboard/erp/vendas/page.tsx");
    expect(src).toContain("isAdmin ? (");
    expect(src).toContain("Só o administrativo edita venda");
  });
});

describe("o orçamento enviado no WhatsApp fica registrado", () => {
  const fonte = (rel: string) => codigoDoProjeto().find((a) => a.caminho === rel)?.src || "";

  it("a comanda salva antes de enviar", () => {
    // "Hoje você escreve, ele já envia, mas não fica registrado no sistema que já passamos."
    const src = fonte("components/pets/PetComandaRail.tsx");
    const iSalvar = src.indexOf("const salvou = await fetch(`/api/orcamentos`");
    const iEnviar = src.indexOf("enviar-documentos");
    expect(iSalvar).toBeGreaterThan(-1);
    expect(iSalvar).toBeLessThan(iEnviar);
  });

  it("e diz quando enviou sem conseguir registrar", () => {
    // Enviado e não gravado precisa aparecer: é o caso em que a pessoa acha que ficou na pasta.
    expect(fonte("components/pets/PetComandaRail.tsx")).toContain("NÃO consegui registrar");
  });
});
