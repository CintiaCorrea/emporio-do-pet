// A CATRACA DO VISUAL (19/09/2026) — Bloco 1 da padronização.
//
// Por que existe: o manual da casa diz que combinado que não roda se perde ("em 03/09/2026 a
// regra de commit e deploy já existia no CLAUDE.md e mesmo assim foi violada no dia seguinte").
// Padronizar 135 telas em prosa não dura uma semana. Então os três números da pauta de 18/09
// viram teste: eles podem CAIR, nunca subir.
//
// É a mesma ideia da catraca de tipos (vet-crm/.catraca-tipos): exigir zero hoje travaria todo
// deploy; exigir "não piorar" funciona e vai apertando sozinho.
//
// Consertou um monte? Baixe o teto aqui, no mesmo commit. NUNCA aumente.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function arquivos(dir: string, extensoes: string[]): string[] {
  const achados: string[] = [];
  const caminho = path.join(process.cwd(), dir);
  if (!fs.existsSync(caminho)) return achados;
  for (const entrada of fs.readdirSync(caminho, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
    const cheio = path.join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivos(cheio, extensoes));
    else if (extensoes.some((e) => entrada.name.endsWith(e))) achados.push(cheio);
  }
  return achados;
}

const telas = arquivos("app", [".tsx", ".ts"]);
const pecas = arquivos("components", [".tsx", ".ts"]);
const tudo = [...telas, ...pecas].map((f) => ({ f, texto: fs.readFileSync(path.join(process.cwd(), f), "utf8") }));

describe("as margens", () => {
  // DIRETRIZ 1: a margem da borda da tela é 24px, dada pela MOLDURA do sistema, não por cada
  // tela. Hoje 106 telas escrevem a sua — é a raiz do "cada tela segue um padrão diferente":
  // trocando de tela, o conteúdo pula. O Bloco 2 põe a margem na moldura e este número cai.
  const TETO = 106; // medido em 19/09/2026. Alvo: 0.
  it(`no máximo ${TETO} telas dão a própria margem`, () => {
    const proprias = telas
      .filter((f) => f.endsWith("page.tsx"))
      .filter((f) => /className="(p|px|py|pt)-[0-9]/.test(fs.readFileSync(path.join(process.cwd(), f), "utf8")));
    expect(proprias.length).toBeLessThanOrEqual(TETO);
  });
});

describe("as cores", () => {
  // DIRETRIZ 6: as cores ficam num lugar só. Quem constrói usa o NOME (lib/ui/estilo.ts ou a
  // classe do Tailwind), não o número. Cada cor escrita à mão é uma cor que ninguém consegue
  // mudar depois sem caçar em 290 arquivos.
  const TETO = 10144; // medido em 19/09/2026. Alvo: as poucas cores da casa, todas com nome.
  it(`no máximo ${TETO} cores escritas à mão`, () => {
    let quantas = 0;
    for (const { texto } of tudo) quantas += (texto.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).length;
    expect(quantas).toBeLessThanOrEqual(TETO);
  });
});

describe("os tamanhos de letra", () => {
  // DIRETRIZ 5: cinco degraus — 20 / 15 / 13 / 12 / 10,5. Hoje há 27 tamanhos escritos à mão,
  // incluindo sete com meio pixel de diferença (8,5 · 9,5 · 10,5 · 11,5 · 12,5 · 13,5 · 14,5).
  // Meio pixel ninguém enxerga; só desalinha.
  const TETO = 27; // medido em 19/09/2026. Alvo: 5.
  it(`no máximo ${TETO} tamanhos de letra diferentes`, () => {
    const tamanhos = new Set<string>();
    for (const { texto } of tudo) for (const m of texto.match(/text-\[[0-9.]+px\]/g) || []) tamanhos.add(m);
    expect(tamanhos.size).toBeLessThanOrEqual(TETO);
  });
});

describe("o arquivo de regras existe e é o único", () => {
  it("as cores da casa têm nome em lib/ui/estilo.ts", () => {
    const estilo = fs.readFileSync(path.join(process.cwd(), "lib/ui/estilo.ts"), "utf8");
    for (const nome of ["turquesa", "marinho", "verde", "vermelho", "ambar", "fundo", "cartao", "borda", "texto"]) {
      expect(estilo).toContain(`${nome}:`);
    }
  });

  it("e as mesmas cores viram classe do Tailwind, em styles/globals.css", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "styles/globals.css"), "utf8");
    expect(css).toContain("--color-turquesa: var(--emp-turquesa)");
    expect(css).toContain("--emp-borda: #E8DFC8");
  });

  it("o cartão é um só: branco, borda bege, canto de 13px, sem sombra", () => {
    const cartao = fs.readFileSync(path.join(process.cwd(), "lib/ui/Cartao.tsx"), "utf8");
    expect(cartao).toContain("borderRadius: CANTO.cartao");
    expect(cartao).not.toContain("boxShadow");
  });

  it("o botão tem três tipos, e o vermelho é só do que apaga", () => {
    const botao = fs.readFileSync(path.join(process.cwd(), "lib/ui/Botao.tsx"), "utf8");
    for (const tipo of ["principal", "secundario", "perigo"]) expect(botao).toContain(`${tipo}:`);
    expect(botao).toContain("perigo: { background: CORES.vermelho");
  });
});
