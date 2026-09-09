import { describe, it, expect } from "vitest";
import { textoDoOrcamento, somaDosItens } from "@/lib/textoDoOrcamento";

const base = {
  petNome: "Lua",
  tutorNome: "Ana",
  data: "2026-09-08T10:00:00",
  itens: [
    { descricao: "Consulta", quantidade: 1, valorUnitario: 300 },
    { descricao: "Hemograma", quantidade: 2, valorUnitario: 75 },
  ],
};

describe("o texto que o cliente lê", () => {
  it("traz pet, tutor, data e os itens", () => {
    const t = textoDoOrcamento(base);
    expect(t).toContain("Orçamento — Lua");
    expect(t).toContain("Tutor(a): Ana");
    expect(t).toContain("08/09/2026");
    expect(t).toContain("Consulta");
  });

  it("quantidade 1 não vira '1×'", () => {
    // "1× Consulta" soa a máquina falando. O cliente lê isto.
    const t = textoDoOrcamento(base);
    expect(t).toContain("• Consulta —");
    expect(t).toContain("• 2× Hemograma —");
  });

  it("o total sai do orçamento quando ele tem um, e da soma quando não tem", () => {
    // O total cobrado pode ser menor que a soma dos itens (desconto na venda inteira).
    // O BRL do pt-BR separa "R$" do numero com espaco NAO-QUEBRAVEL — comparar com espaco
    // comum falha sem ninguem entender por que. Por isso a regex tolerante.
    expect(textoDoOrcamento({ ...base, total: 400 })).toMatch(/Total: R\$\s*400,00/);
    expect(textoDoOrcamento(base)).toMatch(/Total: R\$\s*450,00/);
    expect(somaDosItens(base.itens)).toBe(450);
  });

  it("a observação só aparece quando existe", () => {
    expect(textoDoOrcamento({ ...base, observacao: "Retorno em 15 dias" })).toContain("*Observação:* Retorno em 15 dias");
    expect(textoDoOrcamento({ ...base, observacao: "   " })).not.toContain("Observação");
  });

  it("orçamento sem item diz isso, em vez de um cabeçalho vazio", () => {
    // Rascunho aberto e não preenchido existe. "Itens do orçamento:" seguido de nada é pior
    // do que dizer que não há item.
    const t = textoDoOrcamento({ petNome: "Thor", itens: [] });
    expect(t).toContain("Sem itens lançados");
    expect(t).not.toContain("*Itens do orçamento:*");
  });

  it("sem tutor, a linha do tutor não aparece vazia", () => {
    expect(textoDoOrcamento({ ...base, tutorNome: null })).not.toContain("Tutor(a):");
  });

  it("sem pet, fala 'seu pet' em vez de deixar buraco", () => {
    expect(textoDoOrcamento({ itens: [] })).toContain("Orçamento — seu pet");
  });

  it("data inválida não quebra a mensagem", () => {
    expect(textoDoOrcamento({ ...base, data: "banana" })).toContain("Empório do Pet");
  });
});

describe("as duas telas que enviam orçamento usam o mesmo texto", () => {
  const ler = (rel: string) => require("fs").readFileSync(require("path").resolve(__dirname, "..", rel), "utf8");

  it("a ficha do pet e a aba de orçamentos", () => {
    // Dois textos parecidos significariam dois orçamentos diferentes saindo da mesma clínica,
    // para o mesmo cliente, dependendo de qual tela a pessoa abriu.
    expect(ler("components/pets/PetComandaRail.tsx")).toContain("textoDoOrcamento");
    expect(ler("components/vendas/OrcamentosBusca.tsx")).toContain("textoDoOrcamento");
  });
});
