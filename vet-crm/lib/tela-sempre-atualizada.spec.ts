// A TELA DA RECEPÇÃO NUNCA FICA VELHA (17/09/2026).
// Cintia: "preciso que as atualizações das telas de vendas sejam rápidas para que a recepção não
// cobre os valores errados." Este teste guarda a regra: avisar quando a versão muda, recarregar
// sozinho só na troca de tela, e nunca entrar em laço.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { telaEstaVelha, podeRecarregarSozinho } from "./versao/atualizacao.regras";

describe("a tela está velha?", () => {
  it("sim, quando o servidor está com outro carimbo", () => {
    expect(telaEstaVelha("100", "200")).toBe(true);
  });
  it("não, quando é o mesmo carimbo", () => {
    expect(telaEstaVelha("100", "100")).toBe(false);
  });
  it("não incomoda quem está rodando local (carimbo 'dev')", () => {
    expect(telaEstaVelha("dev", "200")).toBe(false);
    expect(telaEstaVelha("100", "dev")).toBe(false);
  });
  it("não inventa aviso quando o servidor não respondeu", () => {
    expect(telaEstaVelha("100", null)).toBe(false);
    expect(telaEstaVelha("100", undefined)).toBe(false);
    expect(telaEstaVelha("100", "")).toBe(false);
  });
});

describe("recarregar sozinho", () => {
  const base = { velha: true, trocouDeTela: true, versaoJaTentada: null, versaoDoServidor: "200" };
  it("acontece quando a pessoa troca de tela", () => {
    expect(podeRecarregarSozinho(base)).toBe(true);
  });
  it("NUNCA acontece no meio de um lançamento (sem trocar de tela)", () => {
    expect(podeRecarregarSozinho({ ...base, trocouDeTela: false })).toBe(false);
  });
  it("não acontece se a tela já está na versão do ar", () => {
    expect(podeRecarregarSozinho({ ...base, velha: false })).toBe(false);
  });
  it("não entra em laço: só uma vez por versão", () => {
    expect(podeRecarregarSozinho({ ...base, versaoJaTentada: "200" })).toBe(false);
    expect(podeRecarregarSozinho({ ...base, versaoJaTentada: "199" })).toBe(true);
  });
});

describe("as peças estão ligadas", () => {
  const ler = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("o servidor sabe dizer qual versão está no ar", () => {
    const rota = ler("app/api/versao/route.ts");
    expect(rota).toContain("VERSAO_PUBLICADA");
    expect(rota).toContain("no-store"); // nunca pode vir de cache
  });

  it("a publicação carimba a versão", () => {
    expect(ler("Dockerfile")).toContain("VERSAO_PUBLICADA");
  });

  it("o aviso aparece em todas as telas do sistema", () => {
    expect(ler("app/(user)/dashboard/layout.tsx")).toContain("<AvisoDeAtualizacao />");
  });

  it("o aviso pergunta de novo quando a pessoa volta para a aba", () => {
    const c = ler("components/protected/dashboard/AvisoDeAtualizacao.tsx");
    expect(c).toContain("visibilitychange");
    expect(c).toContain("Atualizar agora");
  });
});
