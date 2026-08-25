"use client";
// Editor de ORÇAMENTO compartilhado — usado onde quer que apareça um orçamento (ficha/PDV),
// pra a edição ficar IGUAL em todas as telas. Edita itens/qtd/valor/desconto e salva via
// PATCH /api/orcamentos/:id (o backend troca os itens e recalcula o total).
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DecimalInput from "@/components/DecimalInput";

type LinItem = { descricao: string; servicoId?: string; productId?: string; quantidade: number; valorUnitario: number; desconto: number };

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inp: React.CSSProperties = { border: "1px solid #E8E2D6", borderRadius: 9, padding: "6px 8px", fontSize: 13, background: "#fff", color: "#1F2A2E", boxSizing: "border-box" };

export default function EditarOrcamentoModal({ orc, onClose, onSaved }: { orc: any | null; onClose: () => void; onSaved: (novo: any) => void }) {
  const [itens, setItens] = useState<LinItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState<any[]>([]);

  useEffect(() => {
    if (!orc) return;
    setItens((orc.itens || []).map((it: any) => ({
      descricao: it.descricao || it.servico?.nome || it.product?.name || "",
      servicoId: it.servicoId ?? undefined, productId: it.productId ?? undefined,
      quantidade: Number(it.quantidade ?? 1), valorUnitario: Number(it.valorUnitario ?? 0), desconto: Number(it.desconto ?? 0),
    })));
  }, [orc]);

  useEffect(() => { (async () => { try { const r = await fetch("/api/servicos/itens", { cache: "no-store" }); const d = await r.json(); setCat(Array.isArray(d) ? d : (d.data || d.itens || [])); } catch { setCat([]); } })(); }, []);

  const total = useMemo(() => itens.reduce((s, it) => s + Math.max(0, (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) - (Number(it.desconto) || 0)), 0), [itens]);
  const set = (i: number, patch: Partial<LinItem>) => setItens((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function salvar() {
    if (!orc) return;
    const limpos = itens.filter((it) => (it.descricao || "").trim());
    if (!limpos.length) { toast.error("Adicione ao menos um item."); return; }
    setSaving(true);
    try {
      const body = { itens: limpos.map((it) => ({ servicoId: it.servicoId || undefined, productId: it.productId || undefined, descricao: it.descricao, quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, desconto: Number(it.desconto) || 0 })) };
      const r = await fetch(`/api/orcamentos/${orc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Erro ao salvar"); }
      const novo = await r.json().catch(() => null);
      toast.success("Orçamento atualizado!");
      onSaved(novo || { ...orc, itens: limpos, valorTotal: total });
      onClose();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); } finally { setSaving(false); }
  }

  if (!orc) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", background: "#F6F2EA", border: "1px solid #E8E2D6", borderRadius: 16 }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid #E8E2D6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6D28D9", fontSize: 15, fontWeight: 600 }}>✏️ Editar orçamento</span>
          <button onClick={onClose} style={{ border: "none", background: "none", color: "#5C6B70", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 7 }}>
          <datalist id="orc-editcat">{cat.map((s: any, i: number) => <option key={i} value={s.nome} />)}</datalist>
          {itens.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input list="orc-editcat" value={it.descricao} onChange={(e) => { const val = e.target.value; const s = cat.find((x: any) => (x.nome || "") === val); set(i, s ? { descricao: s.nome, servicoId: s.id ?? it.servicoId, valorUnitario: Number(s.valorPadrao ?? s.preco ?? it.valorUnitario) } : { descricao: val }); }} placeholder="Buscar no catálogo…" style={{ ...inp, flex: 1 }} />
              <input value={it.quantidade} inputMode="numeric" onChange={(e) => set(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })} title="Qtd" style={{ ...inp, width: 42, textAlign: "center" }} />
              <DecimalInput value={it.valorUnitario} onValue={(n) => set(i, { valorUnitario: n })} placeholder="Unit." title="Valor unitário" style={{ ...inp, width: 78 }} />
              <DecimalInput value={it.desconto} onValue={(n) => set(i, { desconto: n })} placeholder="Desc." title="Desconto" style={{ ...inp, width: 60 }} />
              <button onClick={() => setItens((c) => c.filter((_, j) => j !== i))} title="Remover" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>
            </div>
          ))}
          <button onClick={() => setItens((c) => [...c, { descricao: "", quantidade: 1, valorUnitario: 0, desconto: 0 }])} style={{ alignSelf: "flex-start", border: "1px dashed #E8E2D6", background: "none", color: "#014D5E", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 11px", borderRadius: 9, marginTop: 4 }}>➕ item</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ color: "#5C6B70", fontSize: 13 }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#014D5E" }}>{brl(total)}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={onClose} style={{ border: "1px solid #E8E2D6", borderRadius: 9, background: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "#5C6B70" }}>Cancelar</button>
            <button onClick={salvar} disabled={saving} style={{ marginLeft: "auto", border: "none", borderRadius: 9, background: "#6D28D9", color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? .5 : 1 }}>{saving ? "Salvando…" : "✓ Salvar orçamento"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
