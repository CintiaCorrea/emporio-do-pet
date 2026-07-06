"use client";
// C1: barra o acesso direto (por URL) a telas marcadas "Oculto" para o perfil.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usePermissions } from "@/lib/permissions/context";
import { pathToKey, LOCKED_KEYS, allLeafKeys } from "@/lib/permissions";

export default function PermGuard() {
  const { loaded, nivel } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loaded || !pathname) return;
    const key = pathToKey(pathname);
    if (key && !LOCKED_KEYS.includes(key) && nivel(key) === "OCULTO") {
      // destino seguro = 1ª tela visível (evita loop se a rota-destino também estiver oculta)
      const dest = allLeafKeys().find((k) => nivel(k) !== "OCULTO") || "/dashboard/hoje";
      toast.error("Você não tem acesso a esta tela.");
      router.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, loaded]);

  return null;
}
