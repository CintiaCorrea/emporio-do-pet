import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * A ASSINATURA DAS MENSAGENS NÃO MORA MAIS NA TELA.
 *
 * Cintia, 16/09/2026: "A — para os veterinários. A recepção não precisa assinar." O botão ✍️ era
 * por aba e desligava sem ninguém ver; quase metade das mensagens da recepção e da gerência saía
 * sem nome. Quem decide agora é o servidor (backend whatsapp/assinatura.regras), pelo cadastro.
 */
const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "inbox-nativo", "page.tsx"), "utf8");

describe("a Inbox", () => {
  it("não tem mais o botão de ligar e desligar a assinatura", () => {
    expect(src).not.toContain("setAssinar");
  });
  it("não põe o nome na mensagem pelo navegador — senão a recepção voltaria a assinar", () => {
    expect(src).not.toMatch(/text = `\*\$\{/);
  });
});
