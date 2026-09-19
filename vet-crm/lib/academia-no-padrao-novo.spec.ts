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

const pag = fs.readFileSync(path.join(process.cwd(), "components/academia/Academia.tsx"), "utf8");
const sidebar = fs.readFileSync(path.join(process.cwd(), "components/protected/dashboard/Sidebar.tsx"), "utf8");
const abas = fs.readFileSync(path.join(process.cwd(), "lib/ui/Abas.tsx"), "utf8");

describe("o menu da Academia", () => {
  // O MENU SAIU DE DENTRO DA TELA (18/09/2026): quem lista as partes agora é a barra lateral do
  // sistema, onde a Academia já morava. A tela ficou com a largura inteira, que é o que a maquete
  // precisa para mostrar o desenho e a explicação lado a lado.
  it("mora na barra lateral do sistema, com as partes como filhas", () => {
    expect(sidebar).toContain('key: "academia"');
    for (const parte of ["/dashboard/academia/vendas", "/dashboard/academia/agenda", "/dashboard/academia/exames"]) {
      expect(sidebar).toContain(parte);
    }
  });

  it("a tela não desenha um segundo menu dentro dela", () => {
    expect(pag).not.toContain("<aside");
  });

  it("não usa mais pílulas para navegar", () => {
    // pílula = botão de navegação com fundo cheio e borda arredondada
    expect(pag).not.toContain('rounded-full border" style={{ background: "#0F6E56"');
    expect(pag).not.toMatch(/px-3\.5 py-2 rounded-lg border transition/);
  });
});

describe("dentro da janela, aba sublinhada", () => {
  // A ABA SAIU DE DENTRO DA ACADEMIA (19/09/2026, Bloco 1 da padronização). Era escrita aqui
  // dentro; virou peça do sistema em lib/ui/Abas.tsx, sem mudar um pixel, para as outras telas
  // de pílula usarem a MESMA (CLAUDE.md IV.4: núcleo único, não duplicar). A intenção do teste
  // continua a mesma: existe UM componente de aba, e a Academia usa ele.
  it("existe um componente único de aba, e ele mora em lib/ui", () => {
    expect(abas).toContain("export function Abas<T extends string>");
    expect(abas).toContain("borderBottom: `2px solid ${on ? CORES.turquesa : \"transparent\"}`");
  });

  it("a Academia usa ele, em vez de ter a sua cópia", () => {
    expect(pag).toContain('import { Abas } from "@/lib/ui/Abas"');
    expect(pag).not.toContain("function Abas<T extends string>");
  });

  it("as três seções com mais de um conteúdo usam ele", () => {
    expect((pag.match(/<Abas opcoes=/g) || []).length).toBe(3);
  });
});

describe("margem e título", () => {
  it("a margem é a p-6 das outras telas", () => {
    expect(pag).toContain('className="p-6 min-h-screen"');
  });

  it("o conteúdo usa a largura inteira", () => {
    expect(pag).toContain('className="w-full min-w-0"');
  });

  it("o título vem do menu, e a tela não desenha o seu", () => {
    expect(pag).toContain('usePageTitle("Academia"');
    expect(pag).not.toContain("<h1");
  });
});
