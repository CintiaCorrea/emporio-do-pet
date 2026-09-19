// O CARTÃO — um só (diretriz 3, 18/09/2026).
//
// Branco, borda bege, canto de 13px, recheio de 14px, SEM SOMBRA. Em 18/09 o sistema tinha
// 17 cantos e 5 beges diferentes para esta mesma caixa branca. A sombra fica reservada para
// o que flutua: janela, gaveta, aviso.
"use client";
import { ReactNode } from "react";
import { CORES, CANTO, LETRA, ESPACO } from "@/lib/ui/estilo";

export function Cartao({ titulo, acao, children, semRecheio, className = "" }: {
  /** Título do cartão (15px, marinho). Sem emoji: o cartão já tem borda e título. */
  titulo?: string;
  /** Canto direito do cabeçalho — um botão, uma contagem, um filtro. */
  acao?: ReactNode;
  children?: ReactNode;
  /** Para quem coloca tabela ou iframe encostado na borda. */
  semRecheio?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ background: CORES.cartao, border: `1px solid ${CORES.borda}`, borderRadius: CANTO.cartao }}
    >
      {(titulo || acao) && (
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ padding: `10px ${ESPACO.recheioCartao}px`, borderBottom: `1px solid ${CORES.linha}` }}
        >
          {titulo && <span style={{ fontSize: LETRA.cartao, fontWeight: 700, color: CORES.marinho }}>{titulo}</span>}
          {acao && <span className="ml-auto">{acao}</span>}
        </div>
      )}
      <div style={semRecheio ? undefined : { padding: ESPACO.recheioCartao }}>{children}</div>
    </div>
  );
}

export default Cartao;
