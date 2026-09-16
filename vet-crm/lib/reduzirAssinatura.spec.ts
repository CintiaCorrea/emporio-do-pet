import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { tamanhoReduzido, LARGURA_MAX } from "./reduzirAssinatura";

/** Cintia, 16/09/2026: "deixar o arquivo das assinaturas mais leve". */
describe("tamanho da assinatura", () => {
  it("foto grande de celular cai para a largura máxima, mantendo a proporção", () => {
    expect(tamanhoReduzido(4000, 1000)).toEqual({ largura: LARGURA_MAX, altura: 195 });
  });
  it("imagem pequena não é aumentada", () => {
    expect(tamanhoReduzido(500, 120)).toEqual({ largura: 500, altura: 120 });
  });
  it("continua nítida no papel: 3× os 260 px impressos", () => {
    expect(LARGURA_MAX).toBeGreaterThanOrEqual(260 * 3);
  });
  it("o envio do perfil reduz antes de mandar", () => {
    const src = readFileSync(join(__dirname, "..", "app", "(user)", "dashboard", "perfil", "page.tsx"), "utf8");
    expect(src).toContain("fd.append('file', await reduzirAssinatura(file));");
  });
});
