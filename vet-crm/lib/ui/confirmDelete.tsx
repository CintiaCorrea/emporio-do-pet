"use client";
import { createRoot } from "react-dom/client";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";

/**
 * Confirmação de exclusão no padrão do sistema (modal vermelho), de forma imperativa.
 * Uso: if (!(await confirmDelete({ entityLabel: "Etiqueta", itemName: e.texto }))) return;
 */
export function confirmDelete(opts: { entityLabel: string; itemName: string; consequenceText?: string }): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let settled = false;
    const done = (v: boolean) => { if (!settled) { settled = true; resolve(v); } };
    const cleanup = () => { setTimeout(() => { try { root.unmount(); host.remove(); } catch {} }, 0); };
    root.render(
      <ConfirmDeleteModal
        isOpen={true}
        entityLabel={opts.entityLabel}
        itemName={opts.itemName}
        consequenceText={opts.consequenceText}
        onConfirm={() => done(true)}
        onClose={() => { done(false); cleanup(); }}
      />
    );
  });
}
