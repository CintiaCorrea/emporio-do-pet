import { redirect } from "next/navigation";

// Tela antiga (lia o catálogo Product, aposentado em ago/2026) — redireciona pro catálogo novo unificado.
export default function Page() {
  redirect("/dashboard/erp/catalogo-novo");
}
