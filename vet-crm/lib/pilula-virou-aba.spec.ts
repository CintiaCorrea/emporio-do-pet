// PÍLULA VIROU ABA (19/09/2026 — Bloco 3 da padronização).
//
// Cintia, 18/09: "não ter esses menus em formato de pílulas, e sim em abas dentro da própria
// janela ou no menu lateral".
//
// A PAUTA DIZIA 13 TELAS COM PÍLULA. Olhando uma a uma, eram 3. As outras 10 já eram aba
// sublinhada (ficha do cliente, painel do Inbox), ou não são navegação de seção: são cartões
// com número e ícone que filtram a lista (calendário clínico, conexões de IA), seletor de
// período (financeiro de terceiros), seletor de visão dia/semana/mês (agenda), ou botão de
// pré-visualização que o levantamento confundiu com aba (internações, modelos de e-mail).
// Contar pelo formato do botão exagera; o que vale é o que o botão FAZ.
//
// Faltam 2, que têm dono até a reforma das vendas terminar: configuracoes-vendas e
// components/vendas/config/ModelosDeOrcamento.tsx.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ler = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

const CONVERTIDAS: [string, string][] = [
  ["a ficha do pet, dentro do Prontuário", "app/(user)/dashboard/erp/pets/[id]/page.tsx"],
  ["a Escala", "app/(user)/dashboard/erp/agendamentos/escala/page.tsx"],
  ["os Modelos", "app/(user)/dashboard/configuracoes/modelos/page.tsx"],
];

describe("as telas que trocaram pílula por aba", () => {
  for (const [nome, arquivo] of CONVERTIDAS) {
    it(`${nome} usa a peça do sistema, não uma aba própria`, () => {
      const t = ler(arquivo);
      expect(t).toContain('import { Abas } from "@/lib/ui/Abas"');
      expect(t).toContain("<Abas");
      expect(t).not.toContain("function Abas<T extends string>");
    });

    it(`${nome} não tem mais o botão de pílula que trocava de seção`, () => {
      const t = ler(arquivo);
      // pílula = botão com fundo turquesa cheio quando ativo
      expect(t).not.toMatch(/rounded-lg text-\[13px\] font-medium transition"\s*\n?\s*style=\{\w+ === \w+\.v \?/);
      expect(t).not.toContain('px-3 py-1 rounded-full transition');
    });
  }
});

describe("a ficha do pet mantém as 8 abas de cima", () => {
  // A diretriz manda menu lateral de 5 seções em diante. Aqui NÃO: são 8, já são abas
  // sublinhadas, funcionam, e é a tela que a recepção mais abre. Trocar por menu lateral
  // remexeria o mapa mental de quem usa isso o dia inteiro, para ganhar pouco. A regra do
  // menu lateral nasceu para resolver pílula demais (os 11 assuntos da Academia), e aqui
  // esse problema não existe.
  it("continuam sendo abas, e são 8", () => {
    const t = ler("app/(user)/dashboard/erp/pets/[id]/page.tsx");
    const m = t.match(/const \[mainTab, setMainTab\] = useState<([^>]+)>/);
    expect(m).not.toBeNull();
    expect((m![1].match(/"/g) || []).length / 2).toBe(8);
    expect(t).toContain('className="px-4 py-2 text-sm font-medium border-b-2 transition -mb-px"');
  });
});

describe("o que NÃO é pílula e por isso não muda", () => {
  it("o calendário clínico usa cartão com número, não aba", () => {
    const t = ler("app/(user)/dashboard/erp/agendamentos/clinico/page.tsx");
    expect(t).toContain('className="rounded-2xl p-4 text-center transition hover:brightness-[0.98]"');
  });

  it("a agenda escolhe a VISÃO (dia/semana/mês), que não é seção", () => {
    const t = ler("app/(user)/dashboard/erp/agendamentos/agenda/page.tsx");
    expect(t).toMatch(/"dia"\s*\|\s*"semana"\s*\|\s*"mes"/);
  });

  it("o painel do Inbox e a ficha do cliente já eram aba sublinhada", () => {
    expect(ler("components/inbox/InboxRightPanel.tsx")).toContain('borderBottom: activeTab === "inbox" ? "2px solid #009AAC"');
    expect(ler("app/(user)/dashboard/erp/tutores/[id]/page.tsx")).toContain('className="px-4 py-2 text-sm font-medium border-b-2 transition -mb-px"');
  });
});
