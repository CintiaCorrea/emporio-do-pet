"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AppRole, normalizeRole } from "./role";

interface Ctx {
  realRole: AppRole;
  effectiveRole: AppRole;
  isPreviewing: boolean;
  preview: AppRole | null;
  setPreview: (r: AppRole | null) => void;
}

const RolePreviewCtx = createContext<Ctx>({
  realRole: "ADMIN",
  effectiveRole: "ADMIN",
  isPreviewing: false,
  preview: null,
  setPreview: () => {},
});

const KEY = "emporio:role_preview";

export function RolePreviewProvider({ realRole, children }: { realRole?: string; children: ReactNode }) {
  const real = normalizeRole(realRole);
  const [preview, setPreviewState] = useState<AppRole | null>(null);

  // Carrega de localStorage (só uma vez no mount)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (real !== "ADMIN") return; // só admin pode preview
    const v = window.localStorage.getItem(KEY);
    if (v === "ADMIN" || v === "VETERINARIAN" || v === "RECEPTIONIST") {
      setPreviewState(v);
    }
  }, [real]);

  function setPreview(r: AppRole | null) {
    setPreviewState(r);
    if (typeof window !== "undefined") {
      if (r) window.localStorage.setItem(KEY, r);
      else window.localStorage.removeItem(KEY);
    }
  }

  // Só admin pode estar em preview de outro role
  const effectiveRole: AppRole = (real === "ADMIN" && preview) ? preview : real;
  const isPreviewing = real === "ADMIN" && !!preview && preview !== real;

  return (
    <RolePreviewCtx.Provider value={{ realRole: real, effectiveRole, isPreviewing, preview, setPreview }}>
      {children}
    </RolePreviewCtx.Provider>
  );
}

export function useRolePreview() {
  return useContext(RolePreviewCtx);
}
