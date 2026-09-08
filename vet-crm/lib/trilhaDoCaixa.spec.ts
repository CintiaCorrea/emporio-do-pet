import { describe, it, expect } from "vitest";
import { descreverEvento, trilhaDoCaixa } from "@/lib/trilhaDoCaixa";

const ev = (method: string, path: string, extra: any = {}) =>
  ({ id: `${method}-${path}`, createdAt: "2026-09-08T12:00:00", userName: "Gabriela", method, path, statusCode: 201, ...extra });

describe("a linha crua do log vira frase", () => {
  it("reconhece os eventos do caixa com a trilha certa", () => {
    const casos: [string, string, string, string][] = [
      ["POST", "/api/caixa", "Vendas › Caixa › Abertura", "Caixa aberto"],
      ["POST", "/api/caixa/abc/recebimento", "Vendas › Caixa › Recebimento", "Recebimento registrado"],
      ["POST", "/api/caixa/abc/movimento", "Vendas › Caixa › Movimentação", "Movimentação lançada (suprimento, sangria, despesa ou transferência)"],
      ["PATCH", "/api/caixa/abc/fechar", "Vendas › Caixa › Fechamento", "Caixa fechado"],
    ];
    for (const [m, p, trilha, texto] of casos) {
      const e = descreverEvento(ev(m, p))!;
      expect(e.trilha).toBe(trilha);
      expect(e.texto).toBe(texto);
      expect(e.desfeito).toBe(false);
    }
  });

  it("o mesmo caminho com DELETE é outro evento — e fica marcado como desfeito", () => {
    // Excluir um recebimento reverte a baixa da venda. Numa conferência, isso não pode ler
    // igual a "recebimento registrado".
    const e = descreverEvento(ev("DELETE", "/api/caixa/abc/recebimento"))!;
    expect(e.texto).toMatch(/excluído/i);
    expect(e.desfeito).toBe(true);
  });

  it("reabrir caixa conta como desfazer", () => {
    expect(descreverEvento(ev("PATCH", "/api/caixa/abc/reabrir"))!.desfeito).toBe(true);
  });

  it("evento desconhecido aparece cru em vez de sumir", () => {
    // Sumir com um registro de auditoria porque não soubemos nomeá-lo é pior que mostrá-lo feio.
    const e = descreverEvento(ev("POST", "/api/caixa/abc/coisa-nova"))!;
    expect(e.texto).toContain("/api/caixa/abc/coisa-nova");
    expect(e.trilha).toBe("Vendas › Caixa");
  });

  it("tentativa que falhou continua na trilha, marcada", () => {
    // O log guarda a tentativa. Numa conferência, saber que alguém TENTOU lançar e foi
    // recusado explica a diferença que a pessoa está procurando.
    expect(descreverEvento(ev("POST", "/api/caixa/abc/recebimento", { statusCode: 400 }))!.falhou).toBe(true);
  });

  it("sem usuário, diz que não tem — não inventa nome", () => {
    expect(descreverEvento(ev("POST", "/api/caixa", { userName: null }))!.quem).toBe("sem usuário");
  });

  it("evento nulo não quebra", () => {
    expect(descreverEvento(null)).toBeNull();
    expect(trilhaDoCaixa(null)).toEqual([]);
  });
});

describe("a trilha se lê na ordem do dia", () => {
  it("do mais antigo para o mais novo", () => {
    const t = trilhaDoCaixa([
      ev("PATCH", "/api/caixa/a/fechar", { createdAt: "2026-09-08T18:00:00", id: "3" }),
      ev("POST", "/api/caixa", { createdAt: "2026-09-08T09:00:00", id: "1" }),
      ev("POST", "/api/caixa/a/recebimento", { createdAt: "2026-09-08T10:00:00", id: "2" }),
    ]);
    expect(t.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });
});

// 🛡️ A TELA MOSTRA A TRILHA — e o servidor sabe filtrar por caixa.
describe("a trilha chega à tela do caixa", () => {
  const ler = (rel: string, base = "..") => require("fs").readFileSync(
    require("path").resolve(__dirname, base, rel), "utf8");

  it("a tela pede a trilha daquele caixa, não a da casa inteira", () => {
    const src = ler("app/(user)/dashboard/erp/caixa/page.tsx");
    expect(src).toContain("/api/audit-logs?entityId=");
    expect(src).toContain("trilhaDoCaixa");
  });

  it("o backend filtra por entityId", () => {
    const svc = ler("backend/src/modules/audit/audit-logs.service.ts", "../..");
    expect(svc).toContain("if (entityId) where.entityId = entityId;");
    expect(ler("backend/src/modules/audit/audit-logs.controller.ts", "../..")).toContain("@Query('entityId')");
  });

  it("a abertura entra na trilha mesmo sem entityId no log", () => {
    // POST /caixa não tem :id, então a abertura faltaria justo no começo da trilha. Ela vem do
    // próprio caixa — é verdade registrada, não invenção.
    expect(ler("app/(user)/dashboard/erp/caixa/page.tsx")).toContain("abertura-${detail.id}");
  });
});
