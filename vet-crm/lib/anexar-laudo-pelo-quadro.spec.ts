import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { anexoDeveSerPeloQuadro, TRAVA_ANEXO_NA_FICHA_ATE, AVISO_ANEXE_PELO_QUADRO } from "./exameFases";

/**
 * O LAUDO ENTRA PELO QUADRO.
 *
 * Cintia, 12/09/2026: "Ao anexar o exame pelo kanban ele salva na ficha do pet (a princípio
 * vamos travar o salvamento do exame na ficha do pet, por 30 dias dessa forma, depois
 * revisaremos — para que a equipe aprenda a utilizar o kanban)". E em 13/09, escolhendo o
 * alcance: "travar só quem tem box".
 *
 * O QUE ESTA TRAVA É E O QUE ELA NÃO É: é um empurrão de hábito, não uma trava de segurança. O
 * anexo grava pelo endpoint genérico de listas, que muitas telas usam, e conferir a regra ali
 * arriscaria o resto. Quem chamar a API direto continua anexando — e tudo bem, porque o que ela
 * precisa fazer é levar a equipe ao quadro.
 *
 * O QUE ELA NÃO PODE FAZER é fechar a única porta de um exame que não tem card, nem virar
 * permanente por esquecimento. Os dois riscos estão testados aqui.
 */
const RAIZ = join(__dirname, "..");
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

const DENTRO = "2026-09-20T10:00:00-03:00";
const DEPOIS = "2026-10-15T00:00:01-03:00";

describe("anexar o laudo pelo quadro", () => {
  describe("o prazo dela", () => {
    it("vale enquanto o exame está no quadro, dentro dos 30 dias", () => {
      expect(anexoDeveSerPeloQuadro({ status: "Retirado" }, DENTRO)).toBe(true);
    });

    it("VENCE SOZINHA — 'depois revisaremos' não pode virar trava esquecida", () => {
      // Sem isto, alguém teria de lembrar de tirar a trava. Ninguém lembra, e daqui a um ano a
      // ficha continuaria bloqueada sem ninguém saber por quê.
      expect(anexoDeveSerPeloQuadro({ status: "Retirado" }, DEPOIS)).toBe(false);
      expect(TRAVA_ANEXO_NA_FICHA_ATE).toBe("2026-10-14T23:59:59-03:00");
    });

    it("a virada é no fim do dia 14/10", () => {
      expect(anexoDeveSerPeloQuadro({ status: "Retirado" }, "2026-10-14T23:59:00-03:00")).toBe(true);
      expect(anexoDeveSerPeloQuadro({ status: "Retirado" }, "2026-10-15T00:00:01-03:00")).toBe(false);
    });
  });

  describe("só trava quem tem card no quadro", () => {
    it("exame ARQUIVADO não é travado — não há card para arrastar", () => {
      expect(anexoDeveSerPeloQuadro({ status: "Retirado", arquivadoEm: "2026-09-15" }, DENTRO)).toBe(false);
    });

    it("exame ENTREGUE não é travado", () => {
      expect(anexoDeveSerPeloQuadro({ status: "Retirado", entregueAt: "2026-09-16" }, DENTRO)).toBe(false);
      expect(anexoDeveSerPeloQuadro({ status: "Entregue" }, DENTRO)).toBe(false);
    });

    it("nada e lixo não travam ninguém", () => {
      // Na dúvida, a porta fica ABERTA. Uma trava que dispara por engano faz a equipe perder o
      // laudo na mão, sem caminho nenhum.
      expect(anexoDeveSerPeloQuadro(null, DENTRO)).toBe(false);
      expect(anexoDeveSerPeloQuadro(undefined, DENTRO)).toBe(false);
      expect(anexoDeveSerPeloQuadro({ status: "Retirado" }, "data ruim")).toBe(false);
    });
  });

  describe("as telas dizem a mesma coisa", () => {
    it("ficha do pet e inbox usam a regra compartilhada, não uma cópia", () => {
      const ficha = ler("app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx");
      const inbox = ler("components", "inbox", "InboxRightPanel.tsx");
      for (const src of [ficha, inbox]) {
        expect(src).toContain("anexoDeveSerPeloQuadro");
        expect(src).toContain("AVISO_ANEXE_PELO_QUADRO");
      }
    });

    it("a inbox confere no HANDLER, não só no visual do botão", () => {
      // Botão desabilitado ainda dispara por teclado. Um caminho que parece fechado e grava
      // assim mesmo é pior do que não travar nada: ninguém confia mais no aviso.
      const inbox = ler("components", "inbox", "InboxRightPanel.tsx");
      const fn = inbox.slice(inbox.indexOf("function pickAnexoExame"), inbox.indexOf("function pickAnexoExame") + 400);
      expect(fn).toContain("anexoDeveSerPeloQuadro");
      expect(fn).toContain("return");
    });

    it("o recado é um só, e manda para o lugar certo", () => {
      expect(AVISO_ANEXE_PELO_QUADRO).toMatch(/quadro de exames/i);
      expect(AVISO_ANEXE_PELO_QUADRO).toContain("14/10");
    });
  });

  describe("o caminho novo existe inteiro", () => {
    it("o quadro tem o botão de anexar", () => {
      const kanban = ler("app", "(user)", "dashboard", "erp", "exames-kanban", "page.tsx");
      expect(kanban).toContain("Anexar laudo");
      expect(kanban).toContain("/resultado");
    });

    it("a rota do site existe E repassa o corpo", () => {
      // `proxyToBackend` não carrega o body sozinho. Esquecer isso em `exames/iniciar` fez o
      // backend receber `{}` e responder "ok" criando zero exames — falha silenciosa.
      const p = join(RAIZ, "app", "api", "exames", "[itemId]", "resultado", "route.ts");
      expect(existsSync(p)).toBe(true);
      const src = readFileSync(p, "utf8");
      expect(src).toContain("request.text()");
      expect(src).toContain("body:");
    });
  });
});
