import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// 🛡️ SIMPLESVET É SÓ CONSULTA (Cintia, 16/09/2026). O importador criava uma VENDA de verdade para
// cada linha do sistema antigo: entrava no caixa, no faturamento e na conta do cliente, misturada
// com as vendas de hoje — foi assim que dívidas antigas viraram cobrança viva.
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

describe("o importador do SimplesVet não grava venda", () => {
  it("a tela diz o que a importação faz", () => {
    const src = ler("app", "(user)", "dashboard", "erp", "importar-vendas", "page.tsx");
    expect(src).toContain("Importar cadastro do SimplesVet");
    expect(src).toContain("A VENDA ANTIGA NÃO É GRAVADA");
  });
});
