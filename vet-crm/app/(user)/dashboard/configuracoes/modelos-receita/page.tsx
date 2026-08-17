"use client";
// APOSENTADA (06/08): os modelos viraram uma tela ÚNICA com abas em
// /dashboard/configuracoes/modelos. Esta rota só redireciona (mantém atalhos antigos).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModelosReceitaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/configuracoes/modelos?tab=receita"); }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#5C6B70" }}>Abrindo os modelos…</div>;
}
