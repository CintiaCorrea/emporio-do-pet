"use client";
// Outras saídas de estoque — saídas manuais (perda, quebra, uso interno).
import MovimentosView from "@/components/estoque/MovimentosView";

export default function OutrasSaidasPage() {
  return <MovimentosView tipo="OUT" />;
}
