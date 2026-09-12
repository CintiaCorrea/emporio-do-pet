import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { codigoDoProjeto } from "@/lib/testes/varreduraDoProjeto";

/**
 * 🛡️ HOOK NÃO FICA DEPOIS DE `return`.
 *
 * Cintia, 12/09/2026, com a ficha do cliente em branco: "quando vou abrir as vendas dentro da
 * tela de vendas depois de selecionar o pet aparece essa imagem... essa mensagem tem aparecido
 * em vários momentos."
 *
 * A imagem era "Application error: a client-side exception has occurred". A causa estava em
 * app/(user)/dashboard/erp/tutores/[id]/page.tsx: cinco hooks declarados DEPOIS do
 * `if (loading) return <Carregando/>`. No primeiro render `loading` é true, o componente para
 * ali e chama N hooks; quando o cliente chega, `loading` vira false, o render segue e chama
 * N+5. React não admite que a contagem mude entre renders — ele lança "Rendered more hooks
 * than during the previous render" e a tela inteira cai.
 *
 * É o mesmo sintoma de 10/09 ("está dando mensagem e tela vazia") que pareceu se resolver
 * sozinho. Não se resolveu: só dependia de o render bater na ordem certa.
 *
 * A volta atrás é fácil e silenciosa — basta alguém acrescentar um `useState` no meio do
 * componente, onde o código que ele está escrevendo mora. Por isso esta varredura.
 */
const RAIZ = join(__dirname, "..");

/**
 * Tira do texto o que NÃO é código: comentários e o conteúdo de strings.
 *
 * Sem isto o contador de chaves erra feio. Em configuracoes/listas/page.tsx existe a linha
 * `if (!s.startsWith("{")) return s;` — aquela chave mora dentro de uma string, mas era contada
 * como abertura de bloco, e o corpo da função seguia por mais 10 linhas, engolindo os hooks do
 * componente seguinte. A varredura acusava um problema que não existe, e um teste que acusa
 * errado é pior do que teste nenhum: ele trava a publicação e ensina a ignorá-lo.
 */
function soCodigo(linha: string): string {
  return linha
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/** Delimita o corpo de uma função contando chaves, só as que são código de verdade. */
function corpoDaFuncao(linhas: string[], inicio: number): string[] {
  let prof = 0;
  let comecou = false;
  for (let j = inicio; j < linhas.length; j++) {
    const l = soCodigo(linhas[j]);
    for (const ch of l) {
      if (ch === "{") { prof++; comecou = true; }
      else if (ch === "}") prof--;
    }
    if (comecou && prof <= 0) return linhas.slice(inicio, j + 1);
  }
  return linhas.slice(inicio);
}

const ABRE = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+\w+|^(?:export\s+)?const\s+\w+\s*[:=].*=>\s*\{?\s*$/;
const HOOK = /^\s{2}(?:const\s+.*=\s*)?(useState|useEffect|useMemo|useCallback|useReducer|useLayoutEffect)\s*[<(]/;
/** Saída antecipada: `return x`, `if (...) return x`. O `return (` que abre o JSX final não é. */
const SAIDA = /^\s{2}(?:if\s*\(.*\)\s*return\b|return\b(?!\s*\(\s*$))/;

describe("hook não fica depois de return antecipado", () => {
  it("nenhum componente do projeto declara hook abaixo de uma saída antecipada", () => {
    const problemas: string[] = [];

    for (const arq of codigoDoProjeto()) {
      if (!arq.caminho.endsWith(".tsx")) continue;
      // PENEIRA BARATA ANTES DA CARA. Contar chaves função a função no projeto inteiro custa
      // segundos de CPU, e isso estourava o tempo das varreduras vizinhas que rodam em paralelo
      // — três testes ficavam vermelhos sem nada de errado no código. Dois regex descartam a
      // grande maioria dos arquivos antes de qualquer trabalho pesado.
      if (!/\b(useState|useEffect|useMemo|useCallback|useReducer|useLayoutEffect)\s*[<(]/.test(arq.src)) continue;
      if (!/^\s{2}(?:if\s*\(.*\)\s*return\b|return\b)/m.test(arq.src)) continue;
      const linhas = arq.src.split("\n");

      for (let i = 0; i < linhas.length; i++) {
        if (!ABRE.test(linhas[i])) continue;
        const corpo = corpoDaFuncao(linhas, i);
        // só interessa função que usa hook: componente ou hook customizado
        if (!corpo.some((l) => HOOK.test(l))) { i += corpo.length - 1; continue; }

        let saida = -1;
        for (let k = 1; k < corpo.length; k++) {
          const l = soCodigo(corpo[k]);
          if (saida < 0 && SAIDA.test(l)) { saida = k; continue; }
          if (saida >= 0 && HOOK.test(l)) {
            problemas.push(
              `${arq.caminho}: saída antecipada na linha ${i + saida + 1}, hook na ${i + k + 1} — ${corpo[k].trim().slice(0, 60)}`,
            );
            break;
          }
        }
        i += corpo.length - 1;
      }
    }

    expect(problemas).toEqual([]);
  });
  // Varredura pesada: le o projeto inteiro e conta chaves funcao a funcao. Com o limite padrao
  // de 5s ela estourava sob carga e derrubava a vizinha junto (lib/tipoDeVenda), que nao tinha
  // nada de errado. Teste que fica vermelho sem motivo deixa de ser confiavel e alguem desliga.
  // Mesma convencao de lib/baixa-pergunta-o-caixa.test.ts.
}, 30000);

describe("uma tela que quebra tem o que dizer", () => {
  it("existe error boundary de rota E de raiz", () => {
    // Sem eles o Next mostra "Application error: a client-side exception has occurred" —
    // fundo branco, inglês, e nenhuma pista do que aconteceu, nem pra quem usa nem pra mim.
    expect(existsSync(join(RAIZ, "app", "error.tsx")), "app/error.tsx sumiu").toBe(true);
    expect(existsSync(join(RAIZ, "app", "global-error.tsx")), "app/global-error.tsx sumiu").toBe(true);
  });

  it("o boundary de rota se recupera sozinho de pedaço de código velho, UMA vez", () => {
    const src = readFileSync(join(RAIZ, "app", "error.tsx"), "utf8");
    expect(src).toMatch(/ChunkLoadError/);
    expect(src).toMatch(/window\.location\.reload\(\)/);
    // a marca na sessão é o que impede o laço infinito de recarregamento
    expect(src).toMatch(/sessionStorage\.getItem\(MARCA\)/);
    expect(src).toMatch(/sessionStorage\.setItem\(MARCA/);
  });

  it("os dois mostram o detalhe técnico — é ele que permite consertar", () => {
    for (const nome of ["error.tsx", "global-error.tsx"]) {
      const src = readFileSync(join(RAIZ, "app", nome), "utf8");
      expect(src, nome).toMatch(/error\?\.message/);
      expect(src, nome).toMatch(/digest/);
    }
  });

  it("o boundary de raiz não depende do layout que quebrou", () => {
    const src = readFileSync(join(RAIZ, "app", "global-error.tsx"), "utf8");
    expect(src).toMatch(/<html/);
    expect(src).toMatch(/<body/);
    // nenhum import do projeto: se o layout caiu, o que vem com ele pode cair junto
    expect(src).not.toMatch(/from ["']@\//);
  });
});
