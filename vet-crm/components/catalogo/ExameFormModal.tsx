"use client";
// Precificação de EXAME direto do catálogo. Exames vivem em `catalogo_exames` (têm laboratório),
// então são editados via PATCH /api/fornecedores/exames/:id — NÃO em /api/products.
// Foco: definir custo (valorFornecedor) e preço de venda (valorClienteSugerido), com markup automático.

import { useState } from "react";
import toast from "react-hot-toast";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

const B = { line: "#E8E2D6", soft: "#FBF9F4", lineSoft: "#F0EBE0", navy: "#014D5E", primary: "#009AAC", t1: "#1F2A2E", t2: "#5C6B70", t3: "#374151" };
const inp: React.CSSProperties = { border: `1px solid ${B.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: B.t1, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 11.5, color: B.t3, fontWeight: 500, display: "block", marginBottom: 4 };
const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v));

export interface ExameEdit { id: string; nome: string; codigo?: string | number | null; fornecedor?: string | null; valorFornecedor?: number | null; valorClienteSugerido?: number | null; tempo?: number | null; ativo?: boolean; }

export default function ExameFormModal({ exame, onClose, onSaved }: { exame: ExameEdit; onClose: () => void; onSaved: () => void }) {
  const [custo, setCusto] = useState(exame.valorFornecedor == null ? "" : String(exame.valorFornecedor));
  const [preco, setPreco] = useState(exame.valorClienteSugerido == null ? "" : String(exame.valorClienteSugerido));
  const [tempo, setTempo] = useState(exame.tempo == null ? "" : String(exame.tempo));
  const [ativo, setAtivo] = useState(exame.ativo !== false);
  const [saving, setSaving] = useState(false);
  const canSeeCost = useCanSeeCost(); // custo/markup/margem só p/ ADMIN

  const [perc, setPerc] = useState("");
  const num = (v: any) => (v === "" || v == null ? undefined : Number(String(v).replace(",", ".")));
  const c = num(custo), p = num(preco);
  const markup = c != null && c > 0 && p != null ? Math.round(((p / c) - 1) * 1000) / 10 : null;

  // Precificar pela MARGEM: digita a % e o preço se calcula (preço = custo × (1 + %/100)).
  const onPerc = (v: string) => {
    setPerc(v);
    const cc = num(custo), pp = num(v);
    if (cc != null && cc > 0 && pp != null) setPreco(String(Math.round(cc * (1 + pp / 100) * 100) / 100));
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const payload: any = { valorFornecedor: num(custo) ?? null, valorClienteSugerido: num(preco) ?? null, tempoResultadoDias: num(tempo) ?? null, ativo };
      const r = await fetch(`/api/fornecedores/exames/${exame.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Erro ao salvar"); }
      toast.success("Exame precificado!");
      onSaved();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(1,43,46,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 60, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, border: `1px solid ${B.line}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${B.lineSoft}` }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: B.navy, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>🔬 Precificar exame</h2>
          <div style={{ fontSize: 12.5, color: B.t1, marginTop: 4, fontWeight: 500 }}>{exame.nome}{exame.codigo != null && exame.codigo !== "" ? <span style={{ color: B.t2, fontWeight: 400 }}> · cód. {exame.codigo}</span> : null}</div>
          {exame.fornecedor ? <div style={{ fontSize: 11.5, color: B.t2, marginTop: 2 }}>Laboratório: {exame.fornecedor}</div> : null}
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
          {canSeeCost && <div><label style={lbl}>Custo (laboratório)</label><input style={inp} inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" /></div>}
          <div style={canSeeCost ? undefined : { gridColumn: "1 / -1" }}><label style={lbl}>Preço de venda</label><input style={inp} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
            {canSeeCost && <div style={{ fontSize: 10.5, color: B.t2, marginTop: 3 }}>{markup == null ? "Digite o preço final" : `Markup: ${markup}%`}</div>}
          </div>
          {canSeeCost && <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: B.t2 }}>💰 Ou precifique pela <b style={{ color: B.navy }}>margem</b>:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${B.line}`, borderRadius: 8, padding: "5px 9px", background: "#fff" }}>
              <input inputMode="decimal" value={perc} onChange={(e) => onPerc(e.target.value)} placeholder="ex.: 100" style={{ width: 62, border: "none", outline: "none", textAlign: "right", fontSize: 13, background: "transparent", color: B.t1, fontFamily: "inherit" }} />
              <span style={{ fontSize: 12, color: B.t2 }}>%</span>
            </div>
            <span style={{ fontSize: 11, color: B.t2 }}>preço = custo × (1 + %)</span>
          </div>}
          {canSeeCost && <div style={{ gridColumn: "1 / -1", fontSize: 11.5, color: B.t2, background: B.soft, border: `1px solid ${B.line}`, borderRadius: 9, padding: "8px 11px" }}>
            💡 Custo atual: <b>{brl(exame.valorFornecedor)}</b>{markup != null ? <> · com esse preço, sua margem é <b>{markup}%</b></> : null}
          </div>}
          <div><label style={lbl}>Prazo do resultado (dias)</label><input style={inp} inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="—" /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: B.t1, cursor: "pointer", padding: "9px 0" }}><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo</label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "13px 20px", borderTop: `1px solid ${B.lineSoft}`, background: B.soft }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 500, padding: "10px 18px", borderRadius: 9, cursor: "pointer", border: `1px solid ${B.line}`, background: "#fff", color: B.navy }}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={saving} style={{ fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 9, cursor: "pointer", border: "none", background: B.primary, color: "#fff", opacity: saving ? .6 : 1 }}>{saving ? "Salvando…" : "💾 Salvar preço"}</button>
        </div>
      </div>
    </div>
  );
}
