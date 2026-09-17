import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// 🛡️ LISTA CORTADA É FUNÇÃO QUEBRADA. Cintia, 17/09/2026, sobre o orçamento do Inbox: "não
// conseguimos nem ler o que estamos selecionando". O campo é estreito, a lista tinha a largura
// dele e o nome virava reticências — dá para escolher, mas não dá para ler o que se escolhe.
const src = readFileSync(join(__dirname, "..", "components", "vendas", "BuscaItemCatalogo.tsx"), "utf8");

describe("a lista do catálogo pode ser lida antes da escolha", () => {
  it("tem largura própria, no mínimo 360px, sem passar da borda da tela", () => {
    expect(src).toContain("const larguraMinima = 360;");
    expect(src).toContain("window.innerWidth - c.left - 12");
    expect(src).not.toContain("width: c.width,");
  });

  it("o nome do item quebra em vez de virar reticências", () => {
    expect(src).not.toContain('textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1F2A2E"');
    expect(src).toContain('whiteSpace: "normal", overflowWrap: "anywhere"');
  });
});
