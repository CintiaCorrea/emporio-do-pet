import { describe, it, expect } from "vitest";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

// 🛡️ A PONTE PARA O BACKEND NÃO PODE PERDER O CORPO DA REQUISIÇÃO.
//
// A Cintia, 11/09/2026: "a veterinária não está conseguindo inserir o peso na ficha do animal,
// erro que acarreta uma série de dificuldades, pois os serviços utilizam essa informação para
// precificar."
//
// A causa não estava na tela nem na regra: estava na ponte. `proxyToBackend` monta a requisição
// a partir do `init` que recebe — ele NÃO copia o corpo do pedido original. Duas rotas nasceram
// em 05/09/2026 sem ler o corpo:
//
//   POST /api/pets/[id]/peso   -> backend recebia {} -> "Peso inválido." em toda tentativa
//   POST /api/exames/iniciar   -> criava ZERO exames e respondia ok — falha silenciosa
//
// Seis dias assim. No banco, 3.054 pontos de peso, todos da importação do SimplesVet e nenhum
// criado pelo sistema desde o lançamento.
//
// Esta trava não proíbe rota sem corpo — DELETE e ações que carregam tudo na URL (/close,
// /start) estão certas assim. Ela cruza as duas pontas: se ALGUMA tela chama a rota mandando
// corpo, a rota tem que repassar corpo. É a pergunta que ninguém fez em 05/09.

type Rota = { url: string; metodos: Set<string> };

const CHAMADA_PROXY = /(?:proxyToBackend|backendProxy)\s*\(([\s\S]{0,400}?)\)\s*;/g;
const METODO_MUTANTE = /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/;
const FETCH = /fetch\(([\s\S]{0,600}?)\)\s*[;,.]/g;

/** `/api/pets/[id]/peso` casa com `/api/pets/${petId}/peso` */
function regexDaRota(url: string): RegExp {
  const partes = url
    .replace(/^\//, "")
    .split("/")
    // Segmento de rota em app/api e identificador simples (letras, digitos, hifen),
    // entao nao precisa de escape; so o [id] vira coringa.
    .map((s) => (s.startsWith("[") ? "[^/'\"`]+" : s));
  return new RegExp("/" + partes.join("/") + "(?=[`'\"?])");
}

describe("nenhuma rota de API perde o corpo que a tela manda", () => {
  const arquivos = codigoDoProjeto();

  // 1. rotas mutantes que NÃO repassam corpo
  const semCorpo: Rota[] = [];
  for (const a of arquivos) {
    if (!a.caminho.startsWith("app/api/") || !a.caminho.endsWith("/route.ts")) continue;
    const metodos = new Set<string>();
    for (const m of a.src.matchAll(CHAMADA_PROXY)) {
      const trecho = m[1];
      const met = trecho.match(METODO_MUTANTE);
      if (met && !trecho.includes("body")) metodos.add(met[1]);
    }
    if (metodos.size) {
      semCorpo.push({ url: "/" + a.caminho.slice("app/".length, -"/route.ts".length), metodos });
    }
  }

  it("a varredura encontrou as rotas (se der zero, o scanner quebrou, não o código)", () => {
    expect(semCorpo.length).toBeGreaterThan(10);
  });

  it("nenhuma delas é chamada com corpo por alguma tela", () => {
    const quebradas: string[] = [];
    for (const a of arquivos) {
      if (a.caminho.startsWith("app/api/")) continue; // rota não chama rota
      for (const m of a.src.matchAll(FETCH)) {
        const ch = m[1];
        if (!ch.includes("body")) continue;
        const met = ch.match(METODO_MUTANTE);
        if (!met) continue;
        for (const r of semCorpo) {
          if (!r.metodos.has(met[1])) continue;
          if (!regexDaRota(r.url).test(ch)) continue;
          const linha = a.src.slice(0, m.index ?? 0).split("\n").length;
          quebradas.push(`${met[1]} ${r.url} — a rota não repassa corpo, mas ${a.caminho}:${linha} manda um`);
        }
      }
    }
    expect(quebradas.sort()).toEqual([]);
  });
}, 30000);
