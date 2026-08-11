"use client";
// Cadastro/edição de EXAME do catálogo (`catalogo_exames`, têm laboratório). CRIA (POST) ou
// EDITA (PATCH) via /api/fornecedores/exames. Edita nome, laboratório, categoria, código, custo,
// preço (com markup/margem) e prazo. Backend: UpdateExameDto = PartialType(CreateExameDto).

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

const B = { line: "#E8E2D6", soft: "#FBF9F4", lineSoft: "#F0EBE0", navy: "#014D5E", primary: "#009AAC", t1: "#1F2A2E", t2: "#5C6B70", t3: "#374151" };
const inp: React.CSSProperties = { border: `1px solid ${B.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: B.t1, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 11.5, color: B.t3, fontWeight: 500, display: "block", marginBottom: 4 };
const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v));

const CATEGORIAS = ["HEMATOLOGIA", "BIOQUIMICA", "IMAGEM", "CITOLOGIA", "MICROBIOLOGIA", "ENDOCRINOLOGIA", "HISTOPATOLOGIA", "OUTROS"];
const CAT_LABEL: Record<string, string> = { HEMATOLOGIA: "Hematologia", BIOQUIMICA: "Bioquímica", IMAGEM: "Imagem", CITOLOGIA: "Citologia", MICROBIOLOGIA: "Microbiologia", ENDOCRINOLOGIA: "Endocrinologia", HISTOPATOLOGIA: "Histopatologia", OUTROS: "Outros" };

export interface ExameEdit { id: string; nome: string; codigo?: string | number | null; fornecedor?: string | null; fornecedorId?: string | null; categoria?: string | null; valorFornecedor?: number | null; valorClienteSugerido?: number | null; tempo?: number | null; ativo?: boolean; }

export default function ExameFormModal({ exame, onClose, onSaved }: { exame: ExameEdit; onClose: () => void; onSaved: () => void }) {
  const isCreate = !exame.id;
  const [nome, setNome] = useState(exame.nome || "");
  const [codigo, setCodigo] = useState(exame.codigo == null ? "" : String(exame.codigo));
  const [fornecedorId, setFornecedorId] = useState(exame.fornecedorId || "");
  const [categoria, setCategoria] = useState(exame.categoria || "");
  const [custo, setCusto] = useState(exame.valorFornecedor == null ? "" : String(exame.valorFornecedor));
  const [preco, setPreco] = useState(exame.valorClienteSugerido == null ? "" : String(exame.valorClienteSugerido));
  const [tempo, setTempo] = useState(exame.tempo == null ? "" : String(exame.tempo));
  const [ativo, setAtivo] = useState(exame.ativo !== false);
  const [labs, setLabs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const canSeeCost = useCanSeeCost();

  const [perc, setPerc] = useState("");
  const num = (v: any) => (v === "" || v == null ? undefined : Number(String(v).replace(",", ".")));
  const c = num(custo), p = num(preco);
  const markup = c != null && c > 0 && p != null ? Math.round(((p / c) - 1) * 1000) / 10 : null;

  useEffect(() => {
    fetch("/api/fornecedores", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : (d.data || d.itens || []);
      // Laboratórios (externos) + PROFISSIONAL (exames feitos na clínica) podem ter exames.
      setLabs(arr.filter((f: any) => /LABORAT|PROFISSIONAL/i.test(String(f.tipo || ""))).map((f: any) => ({ id: f.id, nome: f.nome })));
    }).catch(() => {});
  }, []);

  const onPerc = (v: string) => {
    setPerc(v);
    const cc = num(custo), pp = num(v);
    if (cc != null && cc > 0 && pp != null) setPreco(String(Math.round(cc * (1 + pp / 100) * 100) / 100));
  };

  const salvar = async () => {
    if (!nome.trim()) { toast.error("Informe o nome do exame."); return; }
    if (!fornecedorId) { toast.error("Escolha o laboratório."); return; }
    setSaving(true);
    try {
      const payload: any = {
        nome: nome.trim(), fornecedorId,
        codigo: codigo.trim() || undefined, categoria: categoria || undefined,
        valorFornecedor: num(custo) ?? null, valorClienteSugerido: num(preco) ?? null,
        tempoResultadoDias: num(tempo) ?? null, ativo,
      };
      const r = isCreate
        ? await fetch(`/api/fornecedores/exames`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
        : await fetch(`/api/fornecedores/exames/${exame.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Erro ao salvar"); }
      toast.success(isCreate ? "Exame criado! 🔬" : "Exame salvo!");
      onSaved();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(1,43,46,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 60, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, border: `1px solid ${B.line}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${B.lineSoft}` }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: B.navy, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>🔬 {isCreate ? "Novo exame" : "Editar exame"}</h2>
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Nome do exame *</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Hemograma completo" /></div>
          <div><label style={lbl}>Laboratório *</label>
            <select style={inp} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">— Escolher —</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            {labs.length === 0 ? <div style={{ fontSize: 10.5, color: B.t2, marginTop: 3 }}>Cadastre laboratórios em Fornecedores.</div> : null}
          </div>
          <div><label style={lbl}>Categoria</label>
            <select style={inp} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">—</option>
              {CATEGORIAS.map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Código (opcional)</label><input style={inp} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="—" /></div>
          <div><label style={lbl}>Prazo do resultado (dias)</label><input style={inp} inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="—" /></div>

          <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${B.lineSoft}`, marginTop: 2, paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
            {canSeeCost && <div><label style={lbl}>Custo (laboratório)</label><input style={inp} inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" /></div>}
            <div style={canSeeCost ? undefined : { gridColumn: "1 / -1" }}><label style={lbl}>Preço de venda</label><input style={inp} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
              {canSeeCost && <div style={{ fontSize: 10.5, color: B.t2, marginTop: 3 }}>{markup == null ? "Digite o preço final" : `Markup: ${markup}%`}</div>}
            </div>
            {canSeeCost && <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: B.t2 }}>💰 Ou pela <b style={{ color: B.navy }}>margem</b>:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${B.line}`, borderRadius: 8, padding: "5px 9px", background: "#fff" }}>
                <input inputMode="decimal" value={perc} onChange={(e) => onPerc(e.target.value)} placeholder="ex.: 100" style={{ width: 62, border: "none", outline: "none", textAlign: "right", fontSize: 13, background: "transparent", color: B.t1, fontFamily: "inherit" }} />
                <span style={{ fontSize: 12, color: B.t2 }}>%</span>
              </div>
              <span style={{ fontSize: 11, color: B.t2 }}>preço = custo × (1 + %)</span>
            </div>}
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: B.t1, cursor: "pointer", padding: "6px 0" }}><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo (aparece na busca do PDV)</label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "13px 20px", borderTop: `1px solid ${B.lineSoft}`, background: B.soft }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 500, padding: "10px 18px", borderRadius: 9, cursor: "pointer", border: `1px solid ${B.line}`, background: "#fff", color: B.navy }}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={saving} style={{ fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 9, cursor: "pointer", border: "none", background: B.primary, color: "#fff", opacity: saving ? .6 : 1 }}>{saving ? "Salvando…" : (isCreate ? "🔬 Criar exame" : "💾 Salvar")}</button>
        </div>
      </div>
    </div>
  );
}
