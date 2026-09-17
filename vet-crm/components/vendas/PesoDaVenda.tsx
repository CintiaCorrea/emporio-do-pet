"use client";

// ⚖️ O PESO DO PET, ONDE SE VENDE.
//
// Cintia, 16/09/2026: "peso tem que estar registrado" — e o bloco de peso do prontuário é o
// registro central. Item cobrado por faixa de peso não entra sem peso (lib/catalogoVendavel,
// lancarDoCadastro). Para a recepção não precisar sair da venda, o peso é registrado aqui mesmo,
// pelo mesmo caminho do prontuário (POST /api/pets/:id/peso): entra no histórico e vira o peso
// atual do pet. Nada de escolher faixa na mão.

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  petId?: string | null;
  petNome?: string | null;
  pesoKg: number | null;
  onPeso: (kg: number) => void;
  /** Destaca a caixa quando um item acabou de ser recusado por falta de peso. */
  pedindo?: boolean;
};

export default function PesoDaVenda({ petId, petNome, pesoKg, onPeso, pedindo }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  if (!petId) return null;

  async function salvar() {
    const kg = Number(String(valor).replace(",", "."));
    if (!(kg >= 0.05 && kg <= 120)) { toast.error("Peso inválido. Use quilos, com vírgula: 8,4"); return; }
    setSalvando(true);
    try {
      const r = await fetch(`/api/pets/${petId}/peso`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ peso: kg, origem: "VENDA" }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Não consegui registrar o peso."); }
      onPeso(kg);
      setEditando(false); setValor("");
      toast.success(`Peso de ${petNome || "pet"} registrado: ${String(kg).replace(".", ",")} kg`);
    } catch (e: any) { toast.error(e?.message || "Não consegui registrar o peso."); }
    finally { setSalvando(false); }
  }

  const abrir = editando || !pesoKg;
  const destaque = pedindo || !pesoKg;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12,
        padding: "6px 10px", borderRadius: 8,
        border: `1px solid ${destaque ? "#E9C77B" : "#E8E2D6"}`,
        background: destaque ? "#FFF7E8" : "#FBF9F4", color: "#5C6B70",
      }}
    >
      <span>⚖️ <b style={{ color: "#1F2A2E" }}>{petNome || "Pet"}</b>:</span>
      {!abrir ? (
        <>
          <b style={{ color: "#014D5E" }} className="tabular-nums">{String(pesoKg).replace(".", ",")} kg</b>
          <button type="button" onClick={() => { setEditando(true); setValor(""); }} style={{ border: "none", background: "none", color: "#009AAC", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>
            registrar pesagem nova
          </button>
        </>
      ) : (
        <>
          {!pesoKg && <span style={{ color: "#8A5A0B" }}>sem peso registrado — item cobrado por peso só entra com peso.</span>}
          <input
            id={`peso-venda-${petId}`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); salvar(); } }}
            inputMode="decimal" placeholder="kg"
            aria-label={`Peso de ${petNome || "pet"} em quilos`}
            style={{ width: 70, border: "1px solid #E8E2D6", borderRadius: 6, padding: "3px 6px", fontSize: 12 }}
          />
          <button type="button" onClick={salvar} disabled={salvando || !valor.trim()}
            style={{ border: "none", borderRadius: 6, padding: "4px 10px", background: "#009AAC", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: salvando || !valor.trim() ? 0.6 : 1 }}>
            {salvando ? "Salvando…" : "Registrar peso"}
          </button>
          {pesoKg ? <button type="button" onClick={() => setEditando(false)} style={{ border: "none", background: "none", color: "#8A857A", cursor: "pointer", fontSize: 12 }}>cancelar</button> : null}
        </>
      )}
    </div>
  );
}
