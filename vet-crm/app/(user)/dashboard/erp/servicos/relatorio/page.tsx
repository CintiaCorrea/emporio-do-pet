import { redirect } from "next/navigation";

// Relatório do Serviços ANTIGO aposentado — unificado no catálogo novo.
export default function ServicosRelatorioAntigoRedirect() {
  redirect("/dashboard/erp/catalogo-novo");
}
