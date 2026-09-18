// A ACADEMIA É O MODELO DO PADRÃO NOVO (18/09/2026). Cintia: "não ter esses menus em formato de
// pílulas, e sim em abas dentro da própria janela ou no menu lateral" e "as margens poderiam
// SEMPRE ser obedecidas e ser as mesmas".
//
// Esta tela passou a seguir as diretrizes antes das outras, para servir de exemplo à padronização:
// menu lateral com os grupos do menu de trabalho, abas sublinhadas dentro da janela, margem p-6 e
// título vindo do menu.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const pag = fs.readFileSync(path.join(process.cwd(), "app/(user)/dashboard/academia/page.tsx"), "utf8");

describe("o menu da Academia", () => {
  it("é lateral, com os grupos do menu de trabalho", () => {
    expect(pag).toContain("<aside");
    for (const grupo of ["Dia a dia", "Gestão", "A empresa"]) expect(pag).toContain(grupo);
  });

  it("não usa mais pílulas para navegar", () => {
    // pílula = botão de navegação com fundo cheio e borda arredondada
    expect(pag).not.toContain('rounded-full border" style={{ background: "#0F6E56"');
    expect(pag).not.toMatch(/px-3\.5 py-2 rounded-lg border transition/);
  });
});

describe("dentro da janela, aba sublinhada", () => {
  it("existe um componente único de aba", () => {
    expect(pag).toContain("function Abas<T extends string>");
    expect(pag).toContain("borderBottom: `2px solid ${on ? \"#009AAC\" : \"transparent\"}`");
  });

  it("as três seções com mais de um conteúdo usam ele", () => {
    expect((pag.match(/<Abas opcoes=/g) || []).length).toBe(3);
  });
});

describe("margem e título", () => {
  it("a margem é a p-6 das outras telas", () => {
    expect(pag).toContain('className="p-6 min-h-screen"');
  });

  it("o título vem do menu, e a tela não desenha o seu", () => {
    expect(pag).toContain('usePageTitle("Academia"');
    expect(pag).not.toContain("<h1");
  });
});
