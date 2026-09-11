import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

// 🛡️ DUAS COISAS DIFERENTES QUE PARECEM IGUAIS NO CÓDIGO.
//
// 1. FUNDO QUE ENVOLVE O MODAL — o conteúdo fica DENTRO dele.
//    Cintia, 09/09/2026: "marco a palavra toda e ela simplesmente fecha". Ao arrastar para
//    selecionar, o mouse desce dentro do campo e sobe fora; o clique cai no ancestral comum,
//    que é o fundo. Precisa de fundoDeModal, que exige o clique ter COMEÇADO no fundo.
//
// 2. CAMADA DE DROPDOWN — um `<div ... />` que se fecha sozinho, invisível, só para captar o
//    clique fora e fechar uma listinha. O conteúdo é IRMÃO dela, então o clique nunca cai nela
//    e o bug acima nem existe.
//    Cintia, 11/09/2026: "está travando o boletim nessa tela". Eu tinha aplicado fundoDeModal
//    aqui também — e como a camada cobre a TELA INTEIRA, quando ela não fechava nada mais
//    respondia. Aqui o certo é o onClick simples: qualquer clique fecha.

const evt = (target: unknown, currentTarget: unknown) => ({ target, currentTarget }) as never;

describe("fundo do modal: fecha no clique, não na seleção de texto", () => {
  it("clique que começa E termina no fundo: fecha", () => {
    let fechou = false;
    const fundo = {};
    const h = fundoDeModal(() => { fechou = true; });
    h.onMouseDown(evt(fundo, fundo));
    h.onClick(evt(fundo, fundo));
    expect(fechou).toBe(true);
  });

  it("seleção que começa DENTRO e solta no fundo: NÃO fecha", () => {
    let fechou = false;
    const fundo = {}, campo = {};
    const h = fundoDeModal(() => { fechou = true; });
    h.onMouseDown(evt(campo, fundo));
    h.onClick(evt(fundo, fundo));
    expect(fechou).toBe(false);
  });

  it("clique no miolo do modal: NÃO fecha", () => {
    let fechou = false;
    const fundo = {}, miolo = {};
    const h = fundoDeModal(() => { fechou = true; });
    h.onMouseDown(evt(miolo, fundo));
    h.onClick(evt(miolo, fundo));
    expect(fechou).toBe(false);
  });

  it("cada tipo de fundo usa o tratamento certo", () => {
    const ehFundo = (l: string) =>
      l.includes("fixed inset-0") || /position: ['"]fixed['"], inset: 0/.test(l);
    const erros: string[] = [];
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") varrer(p); }
        else if (e.name.endsWith(".tsx")) {
          for (const l of fs.readFileSync(p, "utf8").split("\n")) {
            if (!ehFundo(l) || !l.includes("onClick")) continue;
            const camadaSolta = l.trimEnd().endsWith("/>");
            if (camadaSolta && l.includes("fundoDeModal")) {
              erros.push(`${p} :: camada de dropdown não pode usar fundoDeModal — trava a tela`);
            }
            if (!camadaSolta && !l.includes("fundoDeModal")) {
              erros.push(`${p} :: fundo que envolve o modal precisa de fundoDeModal`);
            }
          }
        }
      }
    };
    for (const d of ["app", "components"]) if (fs.existsSync(d)) varrer(d);
    expect(erros).toEqual([]);
  });
});
