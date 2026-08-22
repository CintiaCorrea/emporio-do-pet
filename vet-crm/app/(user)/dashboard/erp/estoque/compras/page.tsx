"use client";
// Compras — entradas de estoque (com custo e fornecedor).
import MovimentosView from "@/components/estoque/MovimentosView";

export default function ComprasPage() {
  return <MovimentosView tipo="IN" />;
}
