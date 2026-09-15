"use client";
// O CAMPO DE DINHEIRO DA CASA — um só, para todas as telas.
//
// Cintia, 15/09/2026: "não está permitindo lançar os centavos nas baixas do caixa". E, no mesmo
// dia: "já pedi que todos os campos com valor tenham dois dígitos após a vírgula".
//
// O DEFEITO, e ele era pior do que travar os centavos: o campo era ligado ao NÚMERO. Ao teclar
// "12," o componente convertia para 12 e reescrevia o campo — a vírgula sumia. Quem digitava
// "12,50" terminava com 125. Um item de doze e cinquenta virava cento e vinte e cinco, e nada na
// tela mostrava o instante em que mudou.
//
// A correção é guardar o TEXTO enquanto a pessoa digita, e o número só do lado de fora. Está num
// componente porque o mesmo defeito estava em quatro campos de três telas — e porque o próximo
// campo de dinheiro que alguém criar deve nascer certo sem precisar saber desta história.

import React, { useState } from "react";
import { valorDigitado, valorParaCampo } from "@/lib/valorDigitado";

export default function CampoValor({
  valor,
  onValor,
  style,
  className,
  placeholder = "0,00",
  disabled,
  title,
  autoFocus,
}: {
  valor: number | null | undefined;
  onValor: (v: number) => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  autoFocus?: boolean;
}) {
  // Enquanto o campo está em foco, quem manda é o rascunho: o número continua sendo atualizado a
  // cada tecla (totais batem ao vivo), mas não volta para dentro do campo apagando o que a pessoa
  // acabou de digitar.
  const [rascunho, setRascunho] = useState<string | null>(null);
  const emEdicao = rascunho !== null;

  return (
    <input
      inputMode="decimal"
      value={emEdicao ? rascunho : valorParaCampo(Number(valor) || 0)}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      autoFocus={autoFocus}
      className={className}
      style={style}
      onFocus={() => setRascunho(valorParaCampo(Number(valor) || 0))}
      onBlur={() => setRascunho(null)}   // ao sair, volta a mostrar com duas casas
      onChange={(e) => { setRascunho(e.target.value); onValor(valorDigitado(e.target.value)); }}
    />
  );
}
