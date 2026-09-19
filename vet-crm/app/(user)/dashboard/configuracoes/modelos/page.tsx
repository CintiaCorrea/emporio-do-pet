"use client";
// Modelos — tela ÚNICA com abas: Receita · Documento · Boletim (Cintia 06/08).
// Junta as 3 telas antigas (que agora redirecionam pra cá). Orçamento/Demonstrativo
// seguem em Vendas (são de venda). Cada aba edita/cria/exclui seus modelos.
import { useEffect, useState } from "react";
import { Abas } from "@/lib/ui/Abas";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import ModelosTextoTab from "@/components/documentos/ModelosTextoTab";
import ModelosBoletimTab from "@/components/documentos/ModelosBoletimTab";

type Aba = "receita" | "documento" | "patologia" | "boletim";
const ABAS: { v: Aba; label: string }[] = [
  { v: "receita", label: "💊 Receita" },
  { v: "documento", label: "📄 Documento" },
  { v: "patologia", label: "🦠 Patologia" },
  { v: "boletim", label: "🔔 Boletim" },
];

export default function ModelosPage() {
  usePageTitle("Modelos", "Modelos de receita, documento e boletim — num lugar só.");
  const [aba, setAba] = useState<Aba>("receita");

  // Abre já na aba certa quando vem dos atalhos antigos (?tab=documento/boletim).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "documento" || t === "boletim" || t === "receita" || t === "patologia") setAba(t);
  }, []);

  return (
    <div className="w-full">
      {/* ABA SUBLINHADA, nao pilula (19/09/2026, Bloco 3). Mesmos nomes, mesma ordem,
          mesmo lugar — muda so o desenho do botao. */}
      <div className="flex border-b pb-3 mb-4" style={{ borderColor: "#E8DFC8" }}>
        <Abas opcoes={ABAS.map((a) => [a.v, a.label] as [string, string])} valor={aba} aoTrocar={(v) => setAba(v as any)} />
      </div>

      {aba === "receita" && <ModelosTextoTab lista="receita_modelo" tipo="receita" />}
      {aba === "documento" && <ModelosTextoTab lista="documento_modelo" tipo="documento" />}
      {aba === "patologia" && <ModelosTextoTab lista="patologia_modelo" tipo="patologia" />}
      {aba === "boletim" && <ModelosBoletimTab />}
    </div>
  );
}
