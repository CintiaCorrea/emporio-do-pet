import { redirect } from "next/navigation";

// Relatório do Produtos ANTIGO aposentado — unificado no catálogo novo.
export default function ProdutosRelatorioAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
