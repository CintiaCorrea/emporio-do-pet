"use client";
// Contexto de permissões: carrega as matrizes (por perfil) + o mapa
// usuário→perfil (de /api/listas) e resolve o NÍVEL de cada tela para o
// usuário logado (considerando preview de cargo e perfil atribuído).
// Usado pelo menu (Sidebar), pelo guarda de URL (PermGuard) e pelas telas (C2).

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRolePreview } from "@/lib/ui/RolePreview";
import { Nivel, LISTA_PERM, LISTA_PERFIL_USUARIO, resolvePerfil, pathToKey } from "@/lib/permissions";

interface PermCtx {
  loaded: boolean;
  perfilAtual: string;
  nivel: (key: string) => Nivel;
  reload: () => void;
}

const Ctx = createContext<PermCtx>({ loaded: false, perfilAtual: "Admin", nivel: () => "EDITA", reload: () => {} });
export const usePermissions = () => useContext(Ctx);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const meId = (session as any)?.user?.id as string | undefined;
  const { realRole, effectiveRole, isPreviewing } = useRolePreview();

  const [matrices, setMatrices] = useState<Record<string, Record<string, Nivel>>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/listas?includeInactive=true", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const mz: Record<string, Record<string, Nivel>> = {};
      let umap: Record<string, string> = {};
      for (const it of arr) {
        if (it.lista === LISTA_PERM) {
          try { const o = JSON.parse(it.valor); if (o.perfil) mz[o.perfil] = o.matriz || {}; } catch {}
        } else if (it.lista === LISTA_PERFIL_USUARIO) {
          try { const o = JSON.parse(it.valor); umap = o.map || {}; } catch {}
        }
      }
      setMatrices(mz); setUserMap(umap); setLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("perms:changed", h);
    return () => window.removeEventListener("perms:changed", h);
  }, [load]);

  const perfilAtual = resolvePerfil({ meId, realRole, previewRole: effectiveRole, isPreviewing, userMap });
  const matriz = matrices[perfilAtual] || {};
  const nivel = (key: string): Nivel => (matriz[key] as Nivel) || "EDITA";

  return <Ctx.Provider value={{ loaded, perfilAtual, nivel, reload: load }}>{children}</Ctx.Provider>;
}

/** C2: nível da TELA atual (pela rota). Default EDITA quando fora da matriz. */
export function useTelaNivel(): Nivel {
  const { nivel } = usePermissions();
  const pathname = usePathname();
  const key = pathToKey(pathname || "");
  return key ? nivel(key) : "EDITA";
}

/** C2: true se o perfil pode EDITAR a tela atual (senão é só Visualiza). */
export function usePodeEditar(): boolean {
  return useTelaNivel() === "EDITA";
}
