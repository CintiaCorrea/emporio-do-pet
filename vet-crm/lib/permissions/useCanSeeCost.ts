"use client";
import { useRolePreview } from "@/lib/ui/RolePreview";

// Preço de CUSTO (o que a clínica PAGA) e seus derivados (markup/margem) só aparecem
// para o perfil ADMINISTRATIVO. Regra da Cintia (04/08): custo não aparece pra nenhum
// perfil além do administrativo. Fonte ÚNICA — usar em toda tela que mostra custo,
// com o MESMO critério do catálogo (`effectiveRole === "ADMIN"`).
export function useCanSeeCost(): boolean {
  const { effectiveRole } = useRolePreview();
  return effectiveRole === "ADMIN";
}
