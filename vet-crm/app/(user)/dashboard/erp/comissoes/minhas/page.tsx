"use client";
// Rota de menu "Minhas comissões" — abre o Comissionamento já na aba Minhas.
// Escopada ao usuário logado no backend (GET /api/commissions/minhas usa o userId da sessão),
// então cada profissional vê só a própria comissão.
import { ComissoesView } from "../page";

export default function MinhasComissoesPage() {
  return <ComissoesView fixedTab="minhas" />;
}
