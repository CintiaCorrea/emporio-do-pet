import { redirect } from "next/navigation";

// Produtos ANTIGO (Product) aposentado — unificado no catálogo novo. Redireciona quem tiver link salvo.
export default function ProdutosAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
