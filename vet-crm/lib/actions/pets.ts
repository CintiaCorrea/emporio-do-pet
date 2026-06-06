"use client";

import toast from "react-hot-toast";

/**
 * Cria um Pet vazio vinculado ao tutorId e redireciona para a ficha de edicao.
 * Substitui a tela antiga /pets/novo (gradient verde) por um fluxo direto na
 * ficha Base44 — preenchimento inline.
 */
export async function criarPetEAbrir(tutorId: string, openInNewTab = false): Promise<string | null> {
  try {
    const r = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId, name: "Sem nome", species: "OTHER" }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`HTTP ${r.status}: ${txt.slice(0, 80)}`);
    }
    const pet = await r.json();
    if (!pet?.id) throw new Error("Resposta invalida");
    const url = `/dashboard/erp/pets/${pet.id}`;
    if (typeof window !== "undefined") {
      if (openInNewTab) window.open(url, "_blank", "noopener");
      else window.location.href = url;
    }
    return pet.id;
  } catch (e: any) {
    toast.error("Erro ao criar pet: " + (e?.message || ""));
    return null;
  }
}
