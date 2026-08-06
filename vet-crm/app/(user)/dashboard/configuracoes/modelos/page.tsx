"use client";
// Modelos — tela ÚNICA com abas: Receita · Documento · Boletim (Cintia 06/08).
// Junta as 3 telas antigas (que agora redirecionam pra cá). Orçamento/Demonstrativo
// seguem em Vendas (são de venda). Cada aba edita/cria/exclui seus modelos.
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import ModelosTextoTab from "@/components/documentos/ModelosTextoTab";
import ModelosBoletimTab from "@/components/documentos/ModelosBoletimTab";

type Aba = "receita" | "documento" | "boletim";
const ABAS: { v: Aba; label: string }[] = [
  { v: "receita", label: "💊 Receita" },
  { v: "documento", label: "📄 Documento" },
  { v: "boletim", label: "🔔 Boletim" },
];

export default function ModelosPage() {
  usePageTitle("Modelos", "Modelos de receita, documento e boletim — num lugar só.");
  const [aba, setAba] = useState<Aba>("receita");

  // Abre já na aba certa quando vem dos atalhos antigos (?tab=documento/boletim).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "documento" || t === "boletim" || t === "receita") setAba(t);
  }, []);

  return (
    <div className="p-4 w-full">
      <div className="flex gap-1 mb-4 flex-wrap">
        {ABAS.map((a) => (
          <button key={a.v} onClick={() => setAba(a.v)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition"
            style={aba === a.v ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70", border: "1px solid #E8E2D6" }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === "receita" && <ModelosTextoTab lista="receita_modelo" tipo="receita" />}
      {aba === "documento" && <ModelosTextoTab lista="documento_modelo" tipo="documento" />}
      {aba === "boletim" && <ModelosBoletimTab />}
    </div>
  );
}
