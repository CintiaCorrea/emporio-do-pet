import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// Runner de testes do front (lib pura). Blinda os núcleos de venda/exame/recebimento contra regressão.
const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": raiz } },
  test: { environment: "node", include: ["lib/**/*.test.ts", "lib/**/*.spec.ts"] },
});
