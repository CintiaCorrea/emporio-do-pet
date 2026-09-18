import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * BOTÃO QUE CHAMA UMA ROTA QUE NÃO EXISTE.
 *
 * 18/09/2026, varredura da aba Clientes. O botão 📦 Arquivar da lista de Clientes chamava
 * `/api/tutors/:id/arquivar` desde que nasceu. O servidor tinha o endereço; o site, não — e não
 * há reescrita geral de /api para o backend. Dava 404 e a tela dizia "Não foi possível
 * arquivar", como se fosse falha de rede.
 *
 * O efeito colateral era o pior: como ninguém nunca conseguiu arquivar, a visão "📦 Arquivados"
 * ficava sempre vazia — e uma lista vazia parece um recurso que funciona e não tem nada dentro.
 *
 * Esta trava lê as telas da aba Clientes, junta todo `/api/...` que elas chamam, e exige que
 * exista um route.ts para cada um. `${...}` vira segmento dinâmico e casa com `[id]`.
 */
const RAIZ = join(__dirname, "..");
const API = join(RAIZ, "app", "api");

/** As telas da aba Clientes + a lupa do topo, que é a porta de entrada delas. */
const TELAS = [
  "app/(user)/dashboard/erp/tutores/page.tsx",
  "app/(user)/dashboard/erp/tutores/[id]/page.tsx",
  "app/(user)/dashboard/erp/cadastros-recebidos/page.tsx",
  "app/(user)/dashboard/erp/portal-tutores/page.tsx",
  "app/(user)/dashboard/erp/aniversarios/page.tsx",
  "app/(user)/dashboard/erp/vacinacao/page.tsx",
  "app/(user)/dashboard/erp/pesos-suspeitos/page.tsx",
  "components/protected/dashboard/CommandPalette.tsx",
];

/** Tira a query string e troca `${...}` por `*` (um segmento qualquer). */
function normalizar(url: string): string[] {
  return url
    .split("?")[0]
    .replace(/\$\{[^}]*\}/g, "*")
    .split("/")
    .filter(Boolean)
    .slice(1); // fora o "api"
}

/** Anda pela pasta app/api atrás de um route.ts, aceitando [param] no lugar de `*`. */
function temRota(segmentos: string[], dir = API): boolean {
  if (segmentos.length === 0) return existsSync(join(dir, "route.ts"));
  const [atual, ...resto] = segmentos;
  if (!existsSync(dir)) return false;
  const filhos = readdirSync(dir).filter((f) => statSync(join(dir, f)).isDirectory());
  const candidatos = filhos.filter(
    (f) => f === atual || f.startsWith("[") || (atual === "*" && f.startsWith("[")),
  );
  return candidatos.some((f) => temRota(resto, join(dir, f)));
}

function rotasChamadasPor(arquivo: string): string[] {
  const texto = readFileSync(join(RAIZ, arquivo), "utf8");
  const achadas = texto.match(/["'`]\/api\/[^"'`\s]*/g) || [];
  return Array.from(new Set(achadas.map((m) => m.slice(1))));
}

describe("toda rota que a aba Clientes chama existe", () => {
  for (const tela of TELAS) {
    it(`${tela.split("/").slice(-2).join("/")} não chama endereço inexistente`, () => {
      const faltando = rotasChamadasPor(tela).filter((u) => !temRota(normalizar(u)));
      // Se falhar, a lista diz QUAIS — e a correção é criar o route.ts, não uma exceção aqui.
      expect(faltando).toEqual([]);
    });
  }

  it("arquivar e restaurar cliente têm porta (o defeito que originou esta trava)", () => {
    expect(existsSync(join(API, "tutors", "[id]", "arquivar", "route.ts"))).toBe(true);
    expect(existsSync(join(API, "tutors", "[id]", "restaurar", "route.ts"))).toBe(true);
  });
});

/**
 * A EXPLICAÇÃO DO SERVIDOR NÃO PODE SER JOGADA FORA.
 *
 * O Nest responde { statusCode, message, error }. `message` é a explicação ("TEM_HISTORICO:
 * este cliente tem 22 vendas...", "email must be an email"); `error` é só o rótulo seco do
 * código HTTP — quase sempre "Bad Request". As rotas de tutor tinham um proxy próprio que lia
 * `data.error || data.message`, nessa ordem, e entregava "Bad Request" em todo erro.
 *
 * Com isso, duas coisas que já existiam nunca funcionaram: o "quer arquivar agora?" ao tentar
 * excluir cliente com histórico, e o tradutor de erro do cadastro ("E-mail inválido — confira
 * se não sobrou espaço").
 */
describe("as rotas de cliente repassam o que o servidor explicou", () => {
  const ROTAS = ["app/api/tutors/route.ts", "app/api/tutors/[id]/route.ts"];

  /** Só o código: o comentário que EXPLICA o defeito cita a linha errada de propósito. */
  const semComentario = (texto: string) =>
    texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const rota of ROTAS) {
    it(`${rota} não põe 'error' na frente de 'message'`, () => {
      const codigo = semComentario(readFileSync(join(RAIZ, rota), "utf8"));
      expect(codigo).not.toMatch(/data\.error\s*\|\|/);
    });
  }

  it("a rota de lista continua traduzindo limit em take (14 telas dependem)", () => {
    // Padronizar esta rota por atacado quebraria 14 chamadas caladas: o servidor só entende
    // `take`, e sem a tradução `limit=1000` viraria o padrão de 20.
    const texto = readFileSync(join(RAIZ, "app/api/tutors/route.ts"), "utf8");
    expect(texto).toContain("takeFromQuery");
    expect(texto).toMatch(/searchParams\.set\('take'/);
  });
});
