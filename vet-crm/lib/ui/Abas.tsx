// ABA SUBLINHADA — o jeito de trocar de seção DENTRO da janela (diretriz 2, 18/09/2026).
//
// Cintia: "não ter esses menus em formato de pílulas, e sim em abas dentro da própria janela
// ou no menu lateral". Em 18/09 o sistema tinha 13 telas com pílula e 13 com aba, e nenhuma
// pílula do mesmo tamanho da outra.
//
// A REGRA DO QUANTO: até 4 seções, esta aba. De 5 para cima, menu lateral. Lista suspensa só
// acima de 10 opções que caibam numa palavra.
//
// Nasceu dentro da Academia, a primeira tela do padrão novo; em 19/09 saiu de lá para poder
// ser usada pelas outras, sem mudar um pixel (CLAUDE.md IV.4: núcleo único, não duplicar).
"use client";
import { CORES, LETRA } from "@/lib/ui/estilo";

export function Abas<T extends string>({ opcoes, valor, aoTrocar }: { opcoes: [T, string][]; valor: T; aoTrocar: (v: T) => void }) {
  return (
    <div className="flex flex-wrap -mb-[13px]">
      {opcoes.map(([k, lbl]) => {
        const on = valor === k;
        return (
          <button
            key={k}
            onClick={() => aoTrocar(k)}
            className="text-[13px] px-3.5 py-2.5 transition"
            style={{ color: on ? CORES.marinho : CORES.textoSuave, fontWeight: on ? 700 : 500, borderBottom: `2px solid ${on ? CORES.turquesa : "transparent"}`, fontSize: LETRA.corpo }}
          >{lbl}</button>
        );
      })}
    </div>
  );
}

export default Abas;
