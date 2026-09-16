import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * A RECEITA SAI ASSINADA — OU AVISA POR QUE NÃO.
 *
 * Cintia, 16/09/2026, receita do Kiss (Dr. Gabriel) sem assinatura: "uma coisa que já estava pronta
 * e funcionando". Duas fragilidades, as duas silenciosas:
 *   1. o veterinário vinha de uma lista carregada na abertura da ficha; lista vazia = sem assinatura;
 *   2. a impressão disparava 0,6 s depois de montar a página, antes da imagem carregar.
 */
const RAIZ = join(__dirname, "..");
const ficha = readFileSync(join(RAIZ, "app", "(user)", "dashboard", "erp", "pets", "[id]", "page.tsx"), "utf8");
const print = readFileSync(join(RAIZ, "lib", "print.ts"), "utf8");

describe("a receita", () => {
  it("busca o veterinário de novo na hora de imprimir, se ele não está na lista", () => {
    expect(ficha).toContain("if (vetId && assinar && !vet) {");
  });
  it("e avisa quando não consegue, em vez de sair sem assinatura calada", () => {
    expect(ficha).toContain("a receita vai sair SEM assinatura");
  });
  it("avisa quando o veterinário não tem imagem de assinatura no perfil", () => {
    expect(ficha).toContain("não tem imagem de assinatura no perfil");
  });
});

describe("a impressão", () => {
  it("espera as imagens carregarem (com teto), em vez de um tempo fixo", () => {
    expect(print).toContain('i.addEventListener("load", uma)');
    expect(print).not.toContain("}, 600);");
  });
});
