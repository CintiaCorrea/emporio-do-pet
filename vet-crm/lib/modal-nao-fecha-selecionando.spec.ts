import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

// 🛡️ Cintia, 09/09/2026: "quando clico para alterar algum item da comanda, marco a palavra
// toda e ela simplesmente fecha".
//
// Ao arrastar para selecionar texto, o mouse desce DENTRO do campo e sobe FORA. O navegador
// dispara o `click` no ancestral comum — o fundo do modal — e o fundo fechava. Nem o
// stopPropagation() do miolo nem o `if (e.target === e.currentTarget)` protegem: nos dois
// casos o alvo do clique já É o fundo. Só resolve exigindo que o clique tenha COMEÇADO nele.

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
    h.onMouseDown(evt(campo, fundo));   // apertou dentro do campo
    h.onClick(evt(fundo, fundo));       // soltou fora → o click cai no fundo
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

  it("nenhum fundo de modal fecha por onClick próprio", () => {
    // Duas escritas do mesmo fundo: a classe do Tailwind e o estilo inline. A primeira
    // varredura pegou só a classe — e os modais do Ponto de venda, que usam estilo inline,
    // continuaram quebrados justamente onde a Cintia relatou. Aqui as duas contam.
    const ehFundo = (l: string) =>
      l.includes("fixed inset-0") || /position: ['"]fixed['"], inset: 0/.test(l);
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") varrer(p); }
        else if (e.name.endsWith(".tsx")) {
          for (const l of fs.readFileSync(p, "utf8").split("\n")) {
            if (ehFundo(l) && l.includes("onClick=") && !l.includes("fundoDeModal")) {
              achados.push(p + " :: " + l.trim().slice(0, 90));
              break;
            }
          }
        }
      }
    };
    for (const d of ["app", "components"]) if (fs.existsSync(d)) varrer(d);
    expect(achados).toEqual([]);
  });
});
