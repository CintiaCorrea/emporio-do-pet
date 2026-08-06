"use client";
// Rota de menu "Extratos" — abre o Comissionamento já na aba Extratos (sem barra de abas).
import { ComissoesView } from "../page";

export default function ExtratosPage() {
  return <ComissoesView fixedTab="extratos" />;
}
