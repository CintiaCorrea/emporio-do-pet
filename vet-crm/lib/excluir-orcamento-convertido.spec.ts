import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * O ORÇAMENTO QUE VIROU VENDA PODE SER EXCLUÍDO ONDE ELE APARECE — ATÉ 19/09.
 *
 * Cintia, 16/09/2026: "preciso poder deletar orçamentos que viraram vendas e ainda constam". Eles
 * aparecem nas fichas do PET e do CLIENTE com "VIROU VENDA", e ali não havia botão nenhum. O único
 * excluir morava na Consulta de vendas, que por padrão esconde os convertidos.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("excluir orçamento convertido nas fichas", () => {
  for (const [nome, caminho] of [
    ["ficha do pet", ["app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx"]],
    ["ficha do cliente", ["app", "(user)", "dashboard", "erp", "tutores", "[id]", "page.tsx"]],
  ] as [string, string[]][]) {
    it(nome, () => {
      const src = ler(...caminho);
      expect(src).toContain("{convertido && dentroDaJanelaDeAjuste() && (");
      expect(src).toContain("fetch(`/api/orcamentos/${o.id}`, { method: \"DELETE\" })");
      // A confirmação diz que a venda continua — é o medo de quem vai apagar.
      expect(src).toContain("a VENDA continua exatamente como está");
    });
  }
});
