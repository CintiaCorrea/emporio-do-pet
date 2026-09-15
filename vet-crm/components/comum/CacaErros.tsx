"use client";
// Fica montado o tempo todo e escuta os erros do navegador. Não desenha nada.
//
// Existe porque a Cintia não fica sabendo do que quebra na tela dos outros (15/09/2026: "às
// vezes, como não acontecem comigo, não sei nem como nem porque estão acontecendo").

import { useEffect } from "react";
import { ligarCacaErros } from "@/lib/avisarErro";

export default function CacaErros() {
  useEffect(() => ligarCacaErros(), []);
  return null;
}
