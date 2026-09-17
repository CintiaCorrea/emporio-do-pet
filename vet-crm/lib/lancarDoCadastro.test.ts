import { describe, it, expect } from "vitest";
import { lancarDoCadastro } from "@/lib/catalogoVendavel";

// Cintia, 16/09/2026: "sem preço à mão, peso tem que estar registrado". Cadastros de produção
// daquele dia: Diária de internação (150/175/200/225/250 na escada padrão), Tartarectomia (até 5 kg
// R$ 520, até 10 kg R$ 620, acima de 10 kg sem preço) e Limpeza de ferida (R$ 35, preço único).
const DIARIA = {
  id: "cat-diaria", nome: "Diária de internação", valorPadrao: 150, _novo: true,
  _precosPorte: JSON.stringify([
    { ate: 10, rotulo: "0 a 10 kg", preco: 150 }, { ate: 20, rotulo: "11 a 20 kg", preco: 175 },
    { ate: 30, rotulo: "21 a 30 kg", preco: 200 }, { ate: 40, rotulo: "31 a 40 kg", preco: 225 },
    { ate: null, rotulo: "41 a 50+ kg", preco: 250 },
  ]),
};
const TARTARECTOMIA = {
  id: "cat-tart", nome: "Tartarectomia", valorPadrao: 520, _novo: true,
  _precosPorte: JSON.stringify([{ ate: 5, rotulo: "0 a 5 kg", preco: 520 }, { ate: 10, rotulo: "5 a 10 kg", preco: 620 }, { ate: null, rotulo: "acima de 10 kg", preco: null }]),
};

describe("lançar item do cadastro", () => {
  it("o peso escolhe a faixa exata: Chico, 13,1 kg → R$ 175", () => {
    const r = lancarDoCadastro(DIARIA as any, 13.1, "Chico");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.linha.valorUnitario).toBe(175); expect(r.linha.catalogoItemId).toBe("cat-diaria"); }
  });

  it("item cobrado por peso e pet sem peso: não entra, e a mensagem pede o peso", () => {
    const r = lancarDoCadastro(DIARIA as any, null, "Batata");
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.motivo).toBe("sem_peso"); expect(r.mensagem).toContain("Registre o peso de Batata"); }
  });

  it("faixa sem preço: não entra — a Tartarectomia acima de 10 kg", () => {
    const r = lancarDoCadastro(TARTARECTOMIA as any, 12);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("sem_preco");
  });

  it("item de preço único não pede peso", () => {
    const r = lancarDoCadastro({ id: "cat-limp", nome: "Limpeza de ferida", valorPadrao: 35, _novo: true } as any, null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.linha.valorUnitario).toBe(35);
  });

  it("item do cadastro sem preço nenhum não entra", () => {
    const r = lancarDoCadastro({ id: "x", nome: "Sem preço", valorPadrao: 0, _novo: true } as any, 10);
    expect(r.ok).toBe(false);
  });

  it("caução entra sem peso e com o valor dela", () => {
    const r = lancarDoCadastro({ id: "cat-caucao", nome: "Caução", valorPadrao: 600, _novo: true, _ehCaucao: true } as any, null);
    expect(r.ok).toBe(true);
  });
});
