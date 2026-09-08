import { describe, it, expect } from "vitest";
import { agruparRecebimentos, rotuloDaCondicao, rotuloDaVenda } from "@/lib/recebimentosDoCaixa";

const venda = (numeroVenda: number, tutor: string, value: number) => ({
  id: `ap-${numeroVenda}`, value, numeroVenda, codigoExterno: null,
  pet: { id: "p1", name: "Lua" }, tutor: { id: `t-${tutor}`, name: tutor },
});
const baixa = (id: string, hora: string, ap: any, formas: any[], valorTotal?: number) => ({
  id, data: `2026-09-08T${hora}:00`, appointmentId: ap?.id ?? null, appointment: ap,
  formas, valorTotal: valorTotal ?? formas.reduce((s, f) => s + (f?.valor || 0), 0),
});

describe("a conferência do caixa é cronológica", () => {
  it("as vendas vêm na ordem em que o dinheiro entrou, não na ordem do número da venda", () => {
    // A Cintia sobre o SimplesVet: "a ordenação é por venda, não por horário da baixa. Para
    // conferência de caixa (que é cronológica por natureza) isso atrapalha."
    const r = agruparRecebimentos([
      baixa("r1", "18:01", venda(25518, "Ana", 300), [{ forma: "Pix", valor: 300 }]),
      baixa("r2", "10:30", venda(25513, "Bia", 100), [{ forma: "Dinheiro", valor: 100 }]),
      baixa("r3", "16:09", venda(25516, "Cida", 200), [{ forma: "Dinheiro", valor: 200 }]),
    ]);
    expect(r.grupos.map((g) => g.numeroVenda)).toEqual([25513, 25516, 25518]);
  });

  it("duas baixas da mesma venda ficam no mesmo grupo, na hora da primeira", () => {
    const ap = venda(900, "Ana", 500);
    const r = agruparRecebimentos([
      baixa("r2", "17:00", ap, [{ forma: "Pix", valor: 200 }]),
      baixa("r1", "09:00", ap, [{ forma: "Dinheiro", valor: 300 }]),
      baixa("r3", "12:00", venda(901, "Bia", 50), [{ forma: "Pix", valor: 50 }]),
    ]);
    expect(r.grupos).toHaveLength(2);
    expect(r.grupos[0].numeroVenda).toBe(900);       // primeira baixa às 09:00
    expect(r.grupos[0].recebido).toBe(500);
    expect(r.grupos[0].linhas.map((l) => l.valor)).toEqual([300, 200]); // dentro, cronológico
  });
});

describe("o total da aba existe — a lacuna que ela apontou", () => {
  it("soma tudo o que foi recebido no caixa", () => {
    // "Não há total da aba — para conferir o caixa a pessoa precisa ir na aba Resumo."
    const r = agruparRecebimentos([
      baixa("r1", "09:00", venda(1, "Ana", 100), [{ forma: "Pix", valor: 100 }]),
      baixa("r2", "10:00", venda(2, "Bia", 250), [{ forma: "Dinheiro", valor: 250 }]),
    ]);
    expect(r.total).toBe(350);
  });
});

describe("a condição de pagamento aparece", () => {
  it("parcelado sai com o número de parcelas; o resto é à vista", () => {
    expect(rotuloDaCondicao(3)).toBe("Parcelado 3x");
    expect(rotuloDaCondicao(1)).toBe("À vista");
    expect(rotuloDaCondicao(null)).toBe("À vista");
    expect(rotuloDaCondicao(undefined)).toBe("À vista");
  });

  it("cada forma da baixa vira uma linha com a sua condição", () => {
    const r = agruparRecebimentos([
      baixa("r1", "09:00", venda(1, "Ana", 300), [
        { forma: "InfinitePay Crédito", valor: 200, parcelas: 2 },
        { forma: "Dinheiro", valor: 100 },
      ]),
    ]);
    expect(r.grupos[0].linhas).toHaveLength(2);
    expect(r.grupos[0].linhas[0]).toMatchObject({ forma: "InfinitePay Crédito", condicao: "Parcelado 2x", primeiraDaBaixa: true });
    expect(r.grupos[0].linhas[1]).toMatchObject({ forma: "Dinheiro", condicao: "À vista", primeiraDaBaixa: false });
  });
});

describe("nada some da conferência", () => {
  it("baixa sem forma nenhuma vira uma linha 'Sem forma' com o valor cheio", () => {
    // Recebimento antigo com formas [[]]: se sumisse, o total da aba não bateria com o resumo.
    const r = agruparRecebimentos([{ id: "r1", data: "2026-09-08T09:00:00", appointmentId: "ap-1", appointment: venda(1, "Ana", 240), formas: [[]] as any, valorTotal: 240 }]);
    expect(r.grupos[0].linhas).toEqual([expect.objectContaining({ forma: "Sem forma", valor: 240 })]);
    expect(r.total).toBe(240);
  });

  it("forma que explica só parte da baixa: o resto vira linha própria", () => {
    const r = agruparRecebimentos([baixa("r1", "09:00", venda(1, "Ana", 100), [{ forma: "Pix", valor: 40 }], 100)]);
    expect(r.grupos[0].linhas.map((l) => l.valor)).toEqual([40, 60]);
  });

  it("baixa avulsa (sem venda ligada) não desaparece", () => {
    const r = agruparRecebimentos([{ id: "r9", data: "2026-09-08T09:00:00", appointmentId: null, appointment: null, formas: [{ forma: "Dinheiro", valor: 70 }], valorTotal: 70 }]);
    expect(r.grupos).toHaveLength(1);
    expect(r.grupos[0].tutorNome).toBe("Cliente");
    expect(r.total).toBe(70);
  });

  it("caixa sem recebimento não quebra", () => {
    expect(agruparRecebimentos(null)).toEqual({ grupos: [], total: 0 });
  });
});

describe("o rótulo da venda", () => {
  it("usa o número, depois o código importado, e nunca fica vazio", () => {
    expect(rotuloDaVenda({ numeroVenda: 1081, codigoExterno: null })).toBe("#1081");
    expect(rotuloDaVenda({ numeroVenda: null, codigoExterno: "SV-22015" })).toBe("SV-22015");
    expect(rotuloDaVenda({ numeroVenda: null, codigoExterno: null })).toBe("sem número");
  });
});

// 🛡️ A ABA DE RECEBIMENTOS DO CAIXA USA ESTE NÚCLEO.
describe("a aba de recebimentos não volta a ser uma lista plana sem total", () => {
  const ler = () => require("fs").readFileSync(
    require("path").resolve(__dirname, "..", "app/(user)/dashboard/erp/caixa/page.tsx"), "utf8");

  it("agrupa por venda pelo núcleo", () => {
    expect(ler()).toContain("agruparRecebimentos");
  });

  it("mostra o total da aba", () => {
    expect(ler()).toContain("Total recebido neste caixa");
  });

  it("cliente e venda são clicáveis", () => {
    // "O código do cliente e o número da venda são texto puro... desperdício óbvio de UX."
    const src = ler();
    expect(src).toContain("/dashboard/erp/tutores/${g.tutorId}");
    expect(src).toContain("consulta-vendas?venda=${g.numeroVenda}");
  });

  it("a condição de pagamento aparece na linha", () => {
    expect(ler()).toContain("l.condicao");
  });

  it("o backend manda o id do cliente — sem ele o link não existe", () => {
    const api = require("fs").readFileSync(
      require("path").resolve(__dirname, "../..", "backend/src/modules/caixa/caixa.service.ts"), "utf8");
    expect(api).toContain("tutor: { select: { id: true, name: true } }");
  });
});
