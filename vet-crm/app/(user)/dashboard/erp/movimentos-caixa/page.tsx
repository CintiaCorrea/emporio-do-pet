"use client";
// Tela "Movimentos de caixa" APOSENTADA (25/08): eram as MESMAS informações da aba
// Movimentações dentro do Caixa. Unificado no Caixa (um lugar só). Redireciona pra lá.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MovimentosCaixaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/erp/caixa"); }, [router]);
  return (
    <div className="p-8 text-[14px] text-[#5C6B70]">
      Os movimentos agora ficam dentro do <b>Caixa → aba Movimentações</b>. Redirecionando…
    </div>
  );
}
