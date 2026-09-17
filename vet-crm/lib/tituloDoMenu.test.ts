import { describe, it, expect } from "vitest";
import { tituloDoMenu } from "@/lib/ui/tituloDoMenu";

// Cintia, 17/09/2026: "colocar em todas as páginas o nome delas… o nome direto ou o nome da aba
// principal e da sub aba, com os nomes que estão no menu". Antes, Aniversários mostrava "ERP".
describe("o nome da página sai do menu", () => {
  it("tela dentro de um grupo mostra o caminho", () => {
    expect(tituloDoMenu("/dashboard/erp/recebimentos")).toEqual({ titulo: "Recebimentos", caminho: "Vendas › Recebimentos" });
    expect(tituloDoMenu("/dashboard/erp/consulta-vendas")).toEqual({ titulo: "Vendas", caminho: "Vendas › Vendas" });
  });

  it("a tela aberta por dentro (um id na rota) mantém o nome da tela", () => {
    expect(tituloDoMenu("/dashboard/erp/internacoes/abc123")?.titulo).toBe("Internação");
  });

  it("rota que não está no menu não inventa nome — cai no mapa antigo", () => {
    expect(tituloDoMenu("/dashboard/erp/uma-tela-que-nao-existe")).toBeNull();
  });
});
