"use client";
// APOSENTADA (06/08): acesso por horário + plantão viraram abas da tela ÚNICA de
// Escala em /dashboard/erp/agendamentos/escala (Agenda › Escala). Esta rota só
// redireciona pra lá — mantém favoritos/atalhos antigos funcionando.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AcessoHorarioRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/erp/agendamentos/escala"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#5C6B70" }}>
      Levando você para a Escala da equipe…
    </div>
  );
}
