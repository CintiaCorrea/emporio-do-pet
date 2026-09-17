import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * TODO "APAGAR" PELO MESMO CAMINHO — E VENDA NÃO SE APAGA FORA DE VENDAS.
 *
 * Cintia, 17/09/2026: a agenda apaga agendamento; a tela do atendimento "era somente para abrir o
 * atendimento para o veterinário mais rápido, não era para ter ligação com a venda"; apagar
 * documento ou card de exame apaga só o documento. Havia três caminhos próprios, que apagavam
 * direto e engoliam a recusa do servidor ("Erro ao excluir", ou nada) — e vendas antigas guardadas
 * como "CONSULTA" (19) e "Resultado de exames" (a #1130 da Cueia, paga) podiam ser apagadas por ali.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

const TELAS: Record<string, string[]> = {
  "Agenda (agendamento)": ["components", "agendamentos", "NovoAgendamentoModal.tsx"],
  "Tela do atendimento": ["app", "(user)", "dashboard", "erp", "atendimentos", "[id]", "page.tsx"],
  "Ficha do pet (linha do tempo e card de exame)": ["app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx"],
};

describe("apagam pelo caminho único, sem levar venda", () => {
  for (const [nome, caminho] of Object.entries(TELAS)) {
    it(nome, () => {
      const src = ler(...caminho);
      expect(src).toContain("apagarAtendimento(");
      expect(src).toContain("naoApagarVenda: true");
      // O DELETE cru no atendimento era o caminho próprio.
      expect(src).not.toMatch(/fetch\(`\/api\/appointments\/\$\{[^}]+\}`, \{ method: "DELETE"/);
    });
  }

  it("a ponte repassa o pedido ao servidor", () => {
    expect(ler("app", "api", "appointments", "[id]", "route.ts")).toContain("q.set('naoApagarVenda', 'true')");
  });

  it("o caminho único manda o pedido", () => {
    expect(ler("lib", "vendas", "excluirVenda.ts")).toContain('if (opts.naoApagarVenda) params.set("naoApagarVenda", "true");');
  });
});
