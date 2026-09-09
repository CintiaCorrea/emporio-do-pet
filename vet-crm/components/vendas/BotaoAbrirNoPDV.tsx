"use client";
// ABRIR ESTA VENDA NO PONTO DE VENDA — um botão só, igual em toda tela.
//
// A Cintia, em 09/09/2026, sobre como as telas de venda deveriam conversar:
//
//   "preciso que todas as vendas se interliguem e apareçam no ponto de venda (...) e em todas
//    elas eu devo poder executar as mesmas funções que executo no ponto de venda, afinal em
//    muitos momentos preciso editar a venda. (...) a comanda/tela de venda era para ser um
//    'mini' ponto de venda locado em várias telas para facilitar o lançamento enquanto você
//    está atendendo ou executando outra tarefa."
//
// A decisão, dela e minha, em uma linha: **lançar item pode ser em qualquer tela; receber
// dinheiro acontece em uma só.** Receber carrega desconto com trava por perfil, formas de
// pagamento, troco, o caixa individual de quem recebeu, o comprovante e a devolução — espalhar
// isso por quatro telas é como voltamos a ter quatro versões da mesma coisa, e dinheiro é onde
// divergir custa caro.
//
// Este botão é a ponte: de onde você estiver, leva a venda ABERTA para o ponto de venda. O PDV
// já sabia receber `?venda=<id>` e abrir o detalhe; faltava o caminho de ida.

import Link from "next/link";

type Props = {
  /** O id do atendimento/venda. Sem ele o botão não aparece. */
  vendaId?: string | null;
  /** "discreto" para dentro de listas; "forte" quando é a ação principal do bloco. */
  tom?: "discreto" | "forte";
  rotulo?: string;
};

const TEAL = "#009AAC";
const NAVY = "#014D5E";
const LINE = "#E8E2D6";

export default function BotaoAbrirNoPDV({ vendaId, tom = "discreto", rotulo }: Props) {
  if (!vendaId) return null;
  const forte = tom === "forte";
  return (
    <Link
      href={`/dashboard/erp/ponto-de-venda?venda=${vendaId}`}
      title="Abre esta venda no ponto de venda — para receber, dar desconto ou devolver"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        textDecoration: "none", borderRadius: 8, padding: "6px 12px",
        fontSize: 12, fontWeight: 600,
        background: forte ? TEAL : "#fff",
        color: forte ? "#fff" : NAVY,
        border: `1px solid ${forte ? TEAL : LINE}`,
      }}
    >
      🛒 {rotulo || "Abrir no ponto de venda"}
    </Link>
  );
}
