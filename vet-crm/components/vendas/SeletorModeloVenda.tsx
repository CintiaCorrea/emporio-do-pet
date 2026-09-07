"use client";
// O seletor de MODELO da venda — um só, usado por toda tela que vende (menos a internação,
// que ficou de fora por decisão da Cintia em 06/09/2026).
//
// Escolher um modelo LANÇA os itens dele na venda e escreve a observação. Não apaga o que já
// está lançado nem o que a recepção já digitou: o modelo acrescenta. Depois de aplicar, o
// campo volta pro texto de convite — dá pra aplicar um segundo modelo em cima.
import { useEffect, useState, CSSProperties } from "react";
import { carregarModelosVenda, ModeloVenda } from "@/lib/modelosVenda";

type Props = {
  /** Recebe o modelo escolhido. Quem sabe montar a linha da venda é a tela. */
  onAplicar: (modelo: ModeloVenda) => void;
  rotulo?: string;
  className?: string;
  style?: CSSProperties;
  /** Sem o rótulo em cima nem a dica embaixo — pra caber numa barra de filtros. */
  compacto?: boolean;
};

export default function SeletorModeloVenda({ onAplicar, rotulo = "Modelo", className, style, compacto }: Props) {
  const [modelos, setModelos] = useState<ModeloVenda[]>([]);

  useEffect(() => { let vivo = true; carregarModelosVenda().then((ms) => { if (vivo) setModelos(ms); }); return () => { vivo = false; }; }, []);

  // A lista é um <select> do sistema operacional de propósito: ele abre POR CIMA do modal e
  // rola sozinho. Foi lista cortada dentro de modal que quebrou a busca em 06/09 — item que
  // dá pra achar e não dá pra ver é item não encontrado.
  const escolher = (id: string) => {
    const m = modelos.find((x) => x.id === id);
    if (m) onAplicar(m);
  };

  if (compacto) {
    return (
      <select
        value=""
        onChange={(e) => escolher(e.target.value)}
        disabled={modelos.length === 0}
        title={modelos.length === 0 ? "Nenhum modelo salvo — crie em ERP › Modelo de orçamento" : "Lança os itens do modelo e escreve a observação"}
        className={className}
        style={style}
      >
        <option value="">📄 {modelos.length === 0 ? "Sem modelo salvo" : "Usar um modelo…"}</option>
        {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
      </select>
    );
  }

  return (
    <div>
      <label className="text-[10px] text-[#8A857A] uppercase tracking-wide">{rotulo}</label>
      <select
        value=""
        onChange={(e) => escolher(e.target.value)}
        className={className ?? "w-full mt-0.5"}
        style={style}
        title="Lança os itens do modelo e escreve a observação"
      >
        <option value="">Usar um modelo…</option>
        {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
      </select>
      {modelos.length === 0 && (
        <p className="text-[10px] text-[#9aa0a8] mt-1">Nenhum modelo salvo ainda. Crie em <b>ERP › Modelo de orçamento</b> (com itens e observação).</p>
      )}
    </div>
  );
}
