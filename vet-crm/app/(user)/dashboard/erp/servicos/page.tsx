import { redirect } from "next/navigation";

// Serviços ANTIGO (Servico) aposentado — unificado no catálogo novo. Redireciona quem tiver link salvo.
export default function ServicosAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
