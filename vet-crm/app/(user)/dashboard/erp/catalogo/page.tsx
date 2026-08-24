import { redirect } from "next/navigation";

// Catálogo ANTIGO (Product) aposentado — unificado no catálogo novo. Redireciona quem tiver link salvo.
export default function CatalogoAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
