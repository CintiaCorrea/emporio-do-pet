"use client";
// APOSENTADA (06/08): o catálogo de Serviços e Produtos virou tela ÚNICA em
// /dashboard/erp/catalogo (com "🏷️ Categorias" lá dentro). Esta rota agora só
// redireciona pra lá — mantém favoritos/atalhos antigos funcionando.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicosRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/erp/catalogo-novo"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#5C6B70" }}>
      Levando você para o catálogo de Produtos e Serviços…
    </div>
  );
}
