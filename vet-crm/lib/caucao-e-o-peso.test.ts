import { describe, it, expect } from "vitest";
import { lancarDoCadastro } from "@/lib/catalogoVendavel";
import { readFileSync } from "fs";
import { join } from "path";

// Cintia, 17/09/2026: "o combinado é que já leia o peso no sistema em todos os serviços que
// tiverem precificação por peso" — a caução com faixa entra na mesma regra. A caução SEM faixa
// continua sendo valor livre: não tem preço de cadastro e não pede peso.
const CAUCAO: any = {
  id: "cat-caucao", nome: "Caução", valorPadrao: 0, _novo: true, _ehCaucao: true,
  _precosPorte: JSON.stringify([{ ate: 10, rotulo: "0 a 10 kg", preco: 600 }, { ate: null, rotulo: "acima de 10 kg", preco: 900 }]),
};

const CAUCAO_LIVRE: any = { id: "cat-caucao-livre", nome: "Caução", valorPadrao: 500, _novo: true, _ehCaucao: true };

describe("caução e o peso", () => {
  it("caução COM faixa de peso pede o peso, como qualquer item cobrado por peso", () => {
    const r = lancarDoCadastro(CAUCAO, null, "Reginaldo");
    expect(r.ok).toBe(false);
    expect((r as any).motivo).toBe("sem_peso");
  });

  it("com o peso registrado, sai o preço da faixa", () => {
    const r = lancarDoCadastro(CAUCAO, 8, "Reginaldo");
    expect(r.ok).toBe(true);
    expect((r as any).linha.valorUnitario).toBe(600);
    expect((r as any).linha._ehCaucao).toBe(true);
  });

  it("caução SEM faixa continua valor livre, sem peso e sem preço no cadastro", () => {
    const r = lancarDoCadastro(CAUCAO_LIVRE, null, "Reginaldo");
    expect(r.ok).toBe(true);
  });

  it("a tela leva a marca de caução para a linha", () => {
    const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"), "utf8");
    expect(src).toContain("_ehCaucao: l._ehCaucao");
  });
});
