"use client";
// APOSENTADA (06/08): modelos viraram tela ÚNICA com abas em /dashboard/configuracoes/modelos.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModelosDocumentoRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/configuracoes/modelos?tab=documento"); }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#5C6B70" }}>Abrindo os modelos…</div>;
}
