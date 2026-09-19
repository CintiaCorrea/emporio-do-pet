// O BOTÃO — três tipos, e só (diretriz 4, 18/09/2026).
//
// Em 18/09 o "botão principal" aparecia 335 vezes com SEIS cantos, DEZ espaçamentos e OITO
// tamanhos de letra. Aqui ele tem um de cada: turquesa, canto de 9px, letra de 13px.
//
//   principal  — o que a tela quer que você faça. Um por tela, de preferência.
//   secundario — cancelar, voltar, filtrar.
//   perigo     — o que APAGA. Vermelho é só disso.
//
// ATENÇÃO (trava de 18/09): os botões de dinheiro das vendas — "💰 Salvar e receber",
// "💾 Salvar", "💰 Virar venda", "📄 Virar orçamento" — têm teste conferindo o NOME e a
// maquete da Academia mostrando esse nome. Trocar o emoji deles por ícone é mudança de outro
// bloco, no mesmo dia em que o material e os testes mudam, e depois da reforma das vendas.
"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { CORES, CANTO, LETRA } from "@/lib/ui/estilo";

type Tipo = "principal" | "secundario" | "perigo";

const PELE: Record<Tipo, { background: string; color: string; borderColor: string }> = {
  principal: { background: CORES.turquesa, color: "#fff", borderColor: CORES.turquesa },
  secundario: { background: CORES.cartao, color: CORES.texto, borderColor: CORES.borda },
  perigo: { background: CORES.vermelho, color: "#fff", borderColor: CORES.vermelho },
};

export function Botao({ tipo = "principal", children, className = "", style, disabled, ...resto }: {
  tipo?: Tipo;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...resto}
      disabled={disabled}
      className={`px-3.5 py-2 border font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ ...PELE[tipo], borderRadius: CANTO.botao, fontSize: LETRA.corpo, borderWidth: 1, borderStyle: "solid", ...style }}
    >
      {children}
    </button>
  );
}

export default Botao;
