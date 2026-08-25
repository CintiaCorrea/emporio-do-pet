"use client";
// Tela "Grupos de Produtos" ELIMINADA (25/08): mexia numa tabela antiga (serviceCategory)
// que NÃO alimentava o dropdown do cadastro. Os grupos do catálogo agora vivem em catGrupo e
// se gerenciam em Produtos e Serviços → botão "🌳 Grupos". Redireciona pra lá.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GruposRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/erp/catalogo-novo?grupos=1"); }, [router]);
  return (
    <div className="p-8 text-[14px] text-[#5C6B70]">
      Os grupos agora ficam em <b>Produtos e Serviços → botão “🌳 Grupos”</b>. Redirecionando…
    </div>
  );
}
