import * as fs from "fs";
import * as path from "path";

// A VARREDURA DO PROJETO — uma vez só, para todas as travas que leem o código-fonte.
//
// Em 09/09/2026 duas travas nasceram no mesmo dia, em abas diferentes, e as duas varriam a
// árvore inteira do projeto lendo cada arquivo:
//
//   · lib/datas.test.ts          — "nenhuma tela calcula 'hoje' em UTC"
//   · lib/dinheiro-com-centavos  — "nenhuma tela corta os centavos"
//
// Separadas, cada uma leva ~2s. Juntas, disputam o disco e uma estoura o tempo limite da
// outra — o teste ficava vermelho sem nada de errado no código, que é o pior jeito de uma
// trava falhar: ela deixa de ser confiável e alguém acaba desligando.
//
// A leitura acontece uma vez e fica em memória. Cada trava nova que precisar ler o fonte deve
// usar isto em vez de escrever a sua própria varredura.

export type ArquivoDoProjeto = { caminho: string; src: string };

const IGNORAR = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);
const PASTAS = ["app", "components", "lib"];

let cache: ArquivoDoProjeto[] | null = null;

function varrer(dir: string, raiz: string, achados: ArquivoDoProjeto[]): void {
  let entradas: fs.Dirent[];
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entradas) {
    if (e.name.startsWith(".") || IGNORAR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p, raiz, achados);
    else if (/\.tsx?$/.test(e.name)) {
      achados.push({ caminho: path.relative(raiz, p).split(path.sep).join("/"), src: fs.readFileSync(p, "utf8") });
    }
  }
}

/** Todos os .ts/.tsx de app, components e lib — incluindo os testes. */
export function arquivosDoProjeto(): ArquivoDoProjeto[] {
  if (cache) return cache;
  const raiz = path.resolve(__dirname, "..", "..");
  const achados: ArquivoDoProjeto[] = [];
  for (const p of PASTAS) varrer(path.join(raiz, p), raiz, achados);
  cache = achados;
  return cache;
}

/** O código do projeto sem os arquivos de teste — o que as travas costumam querer. */
export function codigoDoProjeto(excecoes: string[] = []): ArquivoDoProjeto[] {
  return arquivosDoProjeto().filter(
    (a) => !/\.(spec|test)\.tsx?$/.test(a.caminho) && !excecoes.some((e) => a.caminho.includes(e)),
  );
}
