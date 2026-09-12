import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// Runner de testes do front (lib pura). Blinda os núcleos de venda/exame/recebimento contra regressão.
const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": raiz } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.spec.ts"],
    // 30s, e nao os 5s padrao. Boa parte destas travas LE O CODIGO-FONTE do projeto inteiro
    // (datas em UTC, centavos cortados, modal que fecha ao selecionar, hook depois de return...)
    // e varias rodam em paralelo, disputando CPU. Com 5s elas ficavam vermelhas sob carga sem
    // nada de errado no codigo — as que falhavam mudavam a cada rodada, que e a pior forma:
    // trava a publicacao por sorteio e ensina a equipe a ignorar o vermelho.
    //
    // O limite nao esconde teste lento de verdade: uma varredura dessas leva ~5s, longe de 30.
    testTimeout: 30000,
  },
});
