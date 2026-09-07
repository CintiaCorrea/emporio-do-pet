import { describe, it, expect } from "vitest";
import { lerModelos, casarNoCatalogo, juntarObservacao } from "@/lib/modelosVenda";

const linha = (id: string, obj: any) => ({ id, valor: JSON.stringify(obj) });

describe("lerModelos: a lista crua de /api/listas vira modelo", () => {
  it("lê nome, observação e itens", () => {
    const [m] = lerModelos([linha("1", { nome: "Castração fêmea", observacao: "Jejum de 8h", itens: [{ descricao: "Castração", servicoId: "s1", quantidade: 1, valorUnitario: 450 }] })]);
    expect(m.nome).toBe("Castração fêmea");
    expect(m.observacao).toBe("Jejum de 8h");
    expect(m.itens).toEqual([{ descricao: "Castração", servicoId: "s1", quantidade: 1, valorUnitario: 450 }]);
  });

  it("esconde o modelo inativo", () => {
    expect(lerModelos([linha("1", { nome: "Antigo", ativo: false, itens: [] })])).toHaveLength(0);
  });

  it("uma linha quebrada não derruba as outras", () => {
    // JSON inválido no banco já aconteceu (a tela de listas guarda texto livre). Se uma linha
    // ruim zerasse a lista, a recepção abriria o ponto de venda sem NENHUM modelo e sem aviso.
    const ms = lerModelos([{ id: "1", valor: "{isso não é json" }, linha("2", { nome: "Vacina", itens: [] })]);
    expect(ms.map((m) => m.nome)).toEqual(["Vacina"]);
  });

  it("aceita o envelope {itens:[...]} e o array cru", () => {
    const dentro = lerModelos({ itens: [linha("1", { nome: "A", itens: [] })] });
    expect(dentro).toHaveLength(1);
    expect(lerModelos(null)).toEqual([]);
  });

  it("ordena por nome e normaliza quantidade e valor", () => {
    const ms = lerModelos([
      linha("1", { nome: "Zoo", itens: [{ descricao: "X", quantidade: "", valorUnitario: "" }] }),
      linha("2", { nome: "Amox", itens: [] }),
    ]);
    expect(ms.map((m) => m.nome)).toEqual(["Amox", "Zoo"]);
    expect(ms[1].itens[0]).toMatchObject({ quantidade: 1, valorUnitario: 0 });
  });

  it("descarta a linha de item sem nome e sem id", () => {
    const [m] = lerModelos([linha("1", { nome: "M", itens: [{ descricao: "", servicoId: "", quantidade: 2 }, { descricao: "Vale", quantidade: 1 }] })]);
    expect(m.itens).toHaveLength(1);
  });
});

describe("casarNoCatalogo: o item do modelo é o item do catálogo", () => {
  const catalogo = [
    { id: "s1", nome: "Vacina Antirrábica" },
    { id: "e9", nome: "🔬 Hemograma completo" },
    { id: "s3", nome: "Consulta" },
  ];

  it("casa pelo id gravado no modelo", () => {
    expect(casarNoCatalogo({ servicoId: "s3", descricao: "nome que mudou depois" }, catalogo)?.id).toBe("s3");
  });

  it("casa pelo nome sem acento quando o id não existe mais", () => {
    // O item pode ter sido recadastrado (id novo, mesmo nome). Sem isso o modelo viraria
    // linha de texto livre e perderia a identidade do item na venda.
    expect(casarNoCatalogo({ servicoId: "sumiu", descricao: "vacina antirrabica" }, catalogo)?.id).toBe("s1");
  });

  it("casa o exame ignorando o marcador 🔬", () => {
    expect(casarNoCatalogo({ descricao: "Hemograma completo" }, catalogo)?.id).toBe("e9");
  });

  it("devolve null quando não existe — a linha vira texto livre, não item errado", () => {
    expect(casarNoCatalogo({ descricao: "Coisa que não existe" }, catalogo)).toBeNull();
    expect(casarNoCatalogo({ descricao: "Consulta" }, [])).toBeNull();
  });
});

describe("juntarObservacao: o modelo escreve sem apagar quem digitou", () => {
  it("preenche a observação vazia", () => {
    expect(juntarObservacao("", "Jejum de 8h")).toBe("Jejum de 8h");
  });

  it("mantém o que a recepção escreveu e acrescenta embaixo", () => {
    expect(juntarObservacao("Tutor pediu retorno", "Jejum de 8h")).toBe("Tutor pediu retorno\nJejum de 8h");
  });

  it("aplicar o mesmo modelo duas vezes não repete o texto", () => {
    const uma = juntarObservacao("", "Jejum de 8h");
    expect(juntarObservacao(uma, "Jejum de 8h")).toBe("Jejum de 8h");
  });

  it("modelo sem observação não mexe no campo", () => {
    expect(juntarObservacao("Tutor pediu retorno", "")).toBe("Tutor pediu retorno");
  });
});
