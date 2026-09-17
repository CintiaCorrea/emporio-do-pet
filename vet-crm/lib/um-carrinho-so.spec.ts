import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// 🛡️ UM CARRINHO SÓ (Cintia, 17/09/2026: "editar as vendas, orçamentos é muito complicado" e
// "as telas venda/orçamento não podiam ser parecidas para ficar fácil"). Montar e EDITAR venda ou
// orçamento acontece na mesma tela: o carrinho da ficha, com as abas Venda e Orçamento. O Inbox
// abre esse mesmo carrinho — a janela estreita de orçamento rápido saiu.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");
const existe = (...p: string[]) => require("fs").existsSync(join(RAIZ, ...p));

describe("um carrinho só para venda e orçamento", () => {
  const rail = ler("components", "pets", "PetComandaRail.tsx");

  it("a janela de orçamento rápido não existe mais", () => {
    expect(existe("components", "vendas", "OrcamentoRapidoModal.tsx")).toBe(false);
  });

  it("o Inbox abre o mesmo carrinho, na aba Orçamento", () => {
    const inbox = ler("components", "inbox", "InboxRightPanel.tsx");
    expect(inbox).toContain("PetComandaRail");
    expect(inbox).toContain('abaInicial="ORCAMENTO"');
  });

  it("editar orçamento acontece dentro do carrinho, gravando por cima", () => {
    expect(rail).toContain("editarOrcamentoAqui");
    expect(rail).toContain('method: editandoOrc ? "PATCH" : "POST"');
    expect(ler("app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx")).toContain("comanda:editar-orcamento");
  });

  it("editar venda também, mandando de volta o id de cada linha", () => {
    expect(rail).toContain("carregarVendaParaEditar");
    expect(rail).toContain("...(it.id ? { id: it.id } : {})");
    // a Consulta de vendas manda para o carrinho, não para a gaveta do ponto de venda
    expect(ler("app", "(user)", "dashboard", "erp", "consulta-vendas", "page.tsx")).toContain("?carrinho=venda&editarVenda=");
  });
});
