import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// A VARREDURA DO PONTO DE VENDA (Cintia, 17/09/2026). Cada item abaixo foi um defeito encontrado
// lendo a tela inteira; o teste existe para eles não voltarem.
const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "erp", "ponto-de-venda", "page.tsx"), "utf8");

describe("a tela do ponto de venda depois da varredura", () => {
  it("salvar a edição destrava o botão", () => {
    expect(src).toContain("finally { setSalvando(false); setSavingEdit(false); }");
  });

  it("orçamento salvo aparece na lista sem precisar atualizar", () => {
    expect(src).toContain("reset(); loadVendas(); loadOrcamentos();");
  });

  it("a etiqueta do caixa combina cor e texto (o MEU caixa)", () => {
    expect(src).toContain("background: meuCaixa ? OKB : WARNB, color: meuCaixa ? OK : WARN");
  });

  it("a busca do carrinho mostra o preço deste animal", () => {
    expect(src).toContain("const p = precoDoItemNaBusca(s);");
  });

  it("some a frase falsa de corte e o corte mudo de 'a cobrar em breve'", () => {
    expect(src).not.toContain("vendas não couberam na lista"); // a de orçamentos é verdadeira (corta em 8)
    expect(src).not.toContain("vendasFuturas.slice(0, 6)");
  });

  it("o campo 'Tipo de venda' e a segunda etiqueta de dívida saíram", () => {
    expect(src).not.toContain("<label style={lbl}>Tipo de venda</label>");
    expect(src).not.toContain("<SaldoDevedorTag");
  });

  it("o botão diz que salva antes de receber", () => {
    expect(src).toContain("💰 Salvar e receber");
  });

  it("o motivo de não poder excluir aparece inteiro", () => {
    expect(src).not.toContain("textOverflow: 'ellipsis', maxWidth: 260 }}>🔒");
  });

  it("a busca de cliente antiga (código morto) saiu", () => {
    expect(src).not.toContain("const [cliBusca");
    expect(src).not.toContain("const selCliente = (t: Tutor)");
  });
});
