import { redirect } from "next/navigation";

// Catálogo ANTIGO (lia /api/products = tabela Product) aposentado — unificamos no catálogo novo (cat_itens).
// Rota mantida só pra redirecionar quem tiver link salvo. (Ago/2026)
export default function CatalogoAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
