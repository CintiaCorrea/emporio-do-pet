import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { precisaRenovar, segundosParaVencer } from "./acessoDoToken";

/**
 * O ACESSO VENCIDO É RENOVADO ANTES DE CHAMAR O SERVIDOR — EM TODA ROTA.
 *
 * Cintia, 16/09/2026: a assinatura das receitas "do nada parou". A lista de profissionais usava o
 * acesso sem renovar e, 7 dias depois do login, voltava vazia. Havia outras 11 rotas iguais (lista
 * de clientes, Hoje, pets do cliente, leads, gravação de consulta...). "Corrija tudo."
 */
const jwt = (exp: number) => `x.${Buffer.from(JSON.stringify({ sub: "u", exp })).toString("base64url")}.y`;

describe("quanto falta para vencer", () => {
  it("lê o exp do token", () => {
    expect(segundosParaVencer(jwt(1_000_100), 1_000_000_000)).toBe(100);
  });
  it("vencido dá negativo", () => {
    expect(segundosParaVencer(jwt(999_000), 1_000_000_000)).toBeLessThan(0);
  });
  it("token que não se lê não trava a rota", () => {
    expect(segundosParaVencer("lixo")).toBeNull();
    expect(precisaRenovar(null)).toBe(false);
  });
  it("renova com um minuto de folga", () => {
    expect(precisaRenovar(60)).toBe(true);
    expect(precisaRenovar(61)).toBe(false);
  });
});

describe("as rotas que tinham autenticação própria", () => {
  const RAIZ = join(__dirname, "..");
  const ROTAS = [
    "app/api/users/route.ts",
    "app/api/auth/change-password/route.ts",
    "app/api/hoje/route.ts",
    "app/api/inbox/recepcao/route.ts",
    "app/api/leads/[id]/pipeline-stage/route.ts",
    "app/api/leads/[id]/qualification/route.ts",
    "app/api/tutors/route.ts",
    "app/api/tutors/[id]/route.ts",
    "app/api/tutors/[id]/pets/route.ts",
    "app/api/whatsapp-templates/upload-media/route.ts",
    "app/api/consultation-recordings/upload-and-transcribe/route.ts",
    "app/api/consultation-recordings/[id]/upload-and-transcribe/route.ts",
  ];
  for (const r of ROTAS) {
    it(r, () => {
      const src = readFileSync(join(RAIZ, r), "utf8");
      expect(src).toMatch(/cabecalhoComAcessoValido|proxyToBackend/);
      // O jeito antigo — pegar o accessToken e mandar sem olhar se venceu — não volta.
      expect(src).not.toMatch(/Bearer \$\{(t|token)\.accessToken\}/);
    });
  }
});
