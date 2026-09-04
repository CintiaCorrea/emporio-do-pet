"use client";
// [EMP-COWORK] Linhas de pagamento (fonte única — PDV + Caixa). Tela do FUNCIONÁRIO: só coleta
// forma + valor e, no cartão, modalidade/bandeira/parcelas/NSU. Taxa/líquido/previsão são
// calculados nos bastidores (backend) pela tabela TaxaContratada e ficam só no Financeiro (admin).

import React, { useState } from "react";
// Fonte única: tipos + modalidades + helpers vêm de lib/formasPagamento (re-exportados aqui p/ compat).
import { PagForma, FormaCfg, TaxaRow, MODALIDADES, PARC, modalidadeToTaxaForma, ehMaquininha, adquirenteDe, adquirenteDaLinha } from "@/lib/formasPagamento";
export type { PagForma, FormaCfg, TaxaRow };
export { modalidadeToTaxaForma, ehMaquininha, adquirenteDe, adquirenteDaLinha };

const C = { teal: "#009AAC", navy: "#014D5E", line: "#E8E2D6", ink: "#112", mut: "#5C6B70" };

const inp: React.CSSProperties = { padding: "8px 9px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, background: "#fff", color: C.ink, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const lbl: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: ".3px", color: C.mut, marginBottom: 3, display: "block" };
// Campo obrigatório ainda vazio: borda âmbar. Avisa antes de a pessoa tentar salvar.
const faltando: React.CSSProperties = { borderColor: "#D9A62B", background: "#FFFBF0" };

export default function PagamentoFormas({ formas, onChange, formasList, formasConfig, taxas }: {
  formas: PagForma[];
  onChange: (f: PagForma[]) => void;
  formasList: string[];
  formasConfig: FormaCfg[];
  taxas: TaxaRow[];
}) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null); // p/ mostrar 2 casas quando não está digitando
  const cfgByNome = new Map(formasConfig.map((c) => [c.nome, c]));
  const set = (i: number, patch: Partial<PagForma>) => onChange(formas.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const fmtValor = (v: number) => (v ? v.toFixed(2).replace(".", ",") : "");
  const bandeirasDe = (adq: string) => [...new Set(taxas.filter((t) => t.adquirente === adq).map((t) => t.bandeira))];
  // Operadoras que a clínica tem contrato (mesma fonte da taxa oficial). É o que a pessoa escolhe.
  const OPERADORAS = [...new Set(taxas.map((t) => t.adquirente).filter(Boolean))].sort();
  // 💳 Prévia da taxa (só visual) — MESMA chave da taxa oficial (adquirente|bandeira|forma|parcelas),
  // pra não divergir do lançamento que alimenta a conciliação. Não muda o que é gravado.
  const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const nrm = (s?: string) => String(s || "").trim().toLowerCase();
  const taxaBpsDe = (f: PagForma, cfg?: FormaCfg): number | null => {
    if (!ehMaquininha(cfg) || !f.modalidade || !f.bandeira) return null;
    const adq = adquirenteDaLinha(f, cfg); const formaTaxa = modalidadeToTaxaForma(f.modalidade);
    const parc = f.modalidade === "Crédito parcelado" ? (f.parcelas || 2) : 1;
    const row = taxas.find((t) => nrm(t.adquirente) === nrm(adq) && nrm(t.bandeira) === nrm(f.bandeira) && nrm(t.forma) === nrm(formaTaxa) && Number(t.parcelas) === parc);
    return row ? Number(row.aliquotaBps) : null;
  };
  const taxaTotal = formas.reduce((s, f) => { const bps = taxaBpsDe(f, cfgByNome.get(f.forma)); return s + (bps != null ? (Number(f.valor) || 0) * bps / 10000 : 0); }, 0);
  const cartaoBruto = formas.reduce((s, f) => s + (taxaBpsDe(f, cfgByNome.get(f.forma)) != null ? (Number(f.valor) || 0) : 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {formas.map((f, i) => {
        const cfg = cfgByNome.get(f.forma);
        const cartao = ehMaquininha(cfg);
        const adqLinha = adquirenteDaLinha(f, cfg);
        const bandeiras = cartao ? bandeirasDe(adqLinha) : [];
        const parcelado = f.modalidade === "Crédito parcelado";
        return (
          <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: 9, background: "#fff" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1.4, minWidth: 118 }}>
                <label style={lbl}>Forma</label>
                <select value={f.forma} onChange={(e) => {
                  const nf = e.target.value; const nc = cfgByNome.get(nf); const patch: Partial<PagForma> = { forma: nf };
                  if (!ehMaquininha(nc)) { patch.modalidade = undefined; patch.bandeira = undefined; patch.parcelas = undefined; patch.nsu = undefined; patch.aut = undefined; patch.adquirente = undefined; }
                  else { patch.adquirente = adquirenteDe(nc) || undefined; patch.bandeira = undefined; }
                  onChange(formas.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                }} style={inp}>{formasList.map((op) => <option key={op} value={op}>{op}</option>)}</select>
              </div>
              <div style={{ flex: 1, minWidth: 78 }}>
                <label style={lbl}>Valor</label>
                <input value={focusIdx === i ? (f.valor || "") : fmtValor(f.valor)} inputMode="decimal" placeholder="R$ 0,00" onFocus={() => setFocusIdx(i)} onBlur={() => setFocusIdx(null)} onChange={(e) => set(i, { valor: Number(String(e.target.value).replace(",", ".")) || 0 })} style={inp} />
              </div>
              {formas.length > 1 && <button onClick={() => onChange(formas.filter((_, j) => j !== i))} title="Remover" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, padding: "8px 2px" }}>🗑️</button>}
            </div>
            {cartao && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                <div style={{ flex: 1.2, minWidth: 112 }}>
                  <label style={lbl}>Operadora *</label>
                  <select value={adqLinha} onChange={(e) => set(i, { adquirente: e.target.value, bandeira: undefined })} style={{ ...inp, ...(adqLinha ? null : faltando) }}>
                    <option value="">—</option>
                    {[...new Set([...OPERADORAS, ...(adqLinha ? [adqLinha] : [])])].sort().map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1.3, minWidth: 120 }}>
                  <label style={lbl}>Modalidade</label>
                  <select value={f.modalidade || ""} onChange={(e) => { const m = e.target.value; set(i, { modalidade: m, parcelas: m === "Crédito parcelado" ? (f.parcelas && f.parcelas >= 2 ? f.parcelas : 2) : undefined }); }} style={inp}>
                    <option value="">—</option>
                    {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1.2, minWidth: 108 }}>
                  <label style={lbl}>Bandeira</label>
                  <select value={f.bandeira || ""} onChange={(e) => set(i, { bandeira: e.target.value })} style={inp}>
                    <option value="">—</option>
                    {bandeiras.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {parcelado && (
                  <div style={{ flex: 0.7, minWidth: 66 }}>
                    <label style={lbl}>Parcelas</label>
                    <select value={f.parcelas || 2} onChange={(e) => set(i, { parcelas: Number(e.target.value) })} style={inp}>
                      {PARC.map((n) => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 88 }}>
                  <label style={lbl}>NSU *</label>
                  <input value={f.nsu || ""} placeholder="NSU" title="Número do comprovante da maquininha — usado pra casar com o extrato" onChange={(e) => set(i, { nsu: e.target.value })} style={{ ...inp, ...(String(f.nsu || "").trim() ? null : faltando) }} />
                </div>
                <div style={{ flex: 1, minWidth: 88 }}>
                  <label style={lbl}>AUT *</label>
                  <input value={f.aut || ""} placeholder="Autorização" title="Código de autorização do comprovante" onChange={(e) => set(i, { aut: e.target.value })} style={{ ...inp, ...(String(f.aut || "").trim() ? null : faltando) }} />
                </div>
              </div>
            )}
            {(() => { const bps = taxaBpsDe(f, cfg); if (bps == null) return null; const v = Number(f.valor) || 0; const taxa = v * bps / 10000; return <div style={{ marginTop: 6, fontSize: 11, color: "#9A6C1F" }}>💳 taxa ~{(bps / 100).toFixed(2)}% = {brl(taxa)} · líquido {brl(v - taxa)}</div>; })()}
          </div>
        );
      })}
      {taxaTotal > 0.001 && (
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12, color: "#9A6C1F", background: "#FBF1DA", border: "1px solid #F0D9A6", borderRadius: 9, padding: "7px 11px" }}>
          <span>💳 Taxa estimada dos cartões: {brl(taxaTotal)}</span>
          <span>Líquido dos cartões: <b>{brl(cartaoBruto - taxaTotal)}</b></span>
        </div>
      )}
      <button onClick={() => onChange([...formas, { forma: formasList[0] || "Dinheiro", valor: 0 }])} style={{ alignSelf: "flex-start", border: `1px dashed ${C.teal}`, background: "none", color: C.teal, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 11px", borderRadius: 9 }}>➕ outra forma</button>
    </div>
  );
}
