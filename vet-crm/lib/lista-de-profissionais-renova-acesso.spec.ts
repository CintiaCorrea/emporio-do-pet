import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * A LISTA DE PROFISSIONAIS NÃO PODE FALHAR QUANDO O ACESSO VENCE.
 *
 * Cintia, 16/09/2026: a receita do Kiss, feita pelo Dr. Gabriel, saiu sem assinatura. O login dele
 * naquele computador era de 09/09; o acesso vence em 7 dias. Esta rota usava autenticação própria,
 * sem renovar: respondia 401, a ficha ficava sem profissionais e a receita saía sem o bloco de
 * assinatura. É dela que sai a imagem, o nome e o CRMV de toda receita.
 */
const src = readFileSync(join(__dirname, "..", "app", "api", "users", "route.ts"), "utf8");

describe("GET /api/users", () => {
  it("usa o repassador comum, que renova o acesso vencido", () => {
    const get = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST"));
    expect(get).toContain("proxyToBackend(request, '/users'");
    expect(get).not.toContain("authHeader(request)");
  });
});
