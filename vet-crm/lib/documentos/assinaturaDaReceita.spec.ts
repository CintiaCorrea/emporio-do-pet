import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { blocoDeAssinatura, receitaAssinada, semRodapeDoModelo, srcDaAssinatura, veterinarioDoUsuario } from "./assinaturaDaReceita";

/**
 * TODA RECEITA IMPRESSA SAI ASSINADA — POR QUALQUER BOTÃO.
 *
 * Cintia, 16/09/2026: "você não está conseguindo consertar a porra da assinatura em um documento,
 * uma coisa que já estava pronta e funcionando". A assinatura existia só no Imprimir de dentro da
 * receita; a do Kiss saiu pelo ícone da LINHA DO TEMPO, que nunca assinou.
 */
const gabriel = veterinarioDoUsuario({ id: "g", name: "Dr. Gabriel Soares", signatureUrl: "https://fly.storage.tigris.dev/emporiopet-arquivos/documentos/g/a.png", profissional: { crmv: "5981" } })!;

describe("o bloco de assinatura", () => {
  it("tem local e data, a imagem, o nome e o CRMV", () => {
    const b = blocoDeAssinatura(gabriel, "Fortaleza", "CE", new Date(2026, 8, 16));
    expect(b).toContain("Fortaleza, CE, 16/09/2026");
    expect(b).toContain("<img src=\"/api/media/ver?u=");
    expect(b).toContain("<b>Dr. Gabriel Soares</b>");
    expect(b).toContain("5981");
  });
  it("a imagem vem pelo proxy — o link direto do armazenamento dá 403", () => {
    expect(srcDaAssinatura(gabriel.signatureUrl)).toMatch(/^\/api\/media\/ver\?u=/);
  });
  it("sem imagem no perfil, sai a linha com nome e CRMV", () => {
    const b = blocoDeAssinatura({ ...gabriel, signatureUrl: "" }, "Fortaleza", "CE");
    expect(b).not.toContain("<img");
    expect(b).toContain("<b>Dr. Gabriel Soares</b>");
  });
});

describe("a receita do Kiss", () => {
  const corpo = "<div>1. Petsporin 75mg — 3 cx</div><div>Fortaleza, CE, 16/09/2026 Dr. Gabriel Soares 5981</div>";
  it("perde o rodapé do modelo — sem assinatura em dobro", () => {
    expect(semRodapeDoModelo(corpo, "Fortaleza", "CE")).not.toContain("Fortaleza, CE, 16/09/2026 Dr. Gabriel");
  });
  it("e ganha o bloco de assinatura", () => {
    const r = receitaAssinada(corpo, gabriel, "Fortaleza", "CE");
    expect(r).toContain("Petsporin");
    expect(r).toContain("/api/media/ver?u=");
  });
});

describe("os quatro lugares que imprimem receita usam o MESMO bloco", () => {
  const RAIZ = join(__dirname, "..", "..");
  const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");
  for (const [nome, arq] of [
    ["ficha do pet — Imprimir de dentro da receita", "app/(user)/dashboard/erp/pets/[id]/page.tsx"],
    ["LINHA DO TEMPO — o botão da receita do Kiss", "components/pets/FeedTimeline.tsx"],
    ["visualizador de documentos clínicos", "components/protected/dashboard/clinical-documents/DocumentViewer.tsx"],
    ["novo atendimento", "app/(user)/dashboard/erp/pets/[id]/atendimentos/novo/page.tsx"],
  ]) {
    it(nome, () => {
      const src = ler(arq);
      expect(src).toContain("receitaAssinada(");
      // Ninguém mais monta o próprio <img> de assinatura, nem com o link direto.
      expect(src).not.toMatch(/alt="assinatura"/);
    });
  }
  it("a linha do tempo assina com o veterinário DA RECEITA, não com quem está logado", () => {
    expect(ler("components/pets/FeedTimeline.tsx")).toContain("it?.raw?.userId || it?.raw?.user?.id");
  });
});
