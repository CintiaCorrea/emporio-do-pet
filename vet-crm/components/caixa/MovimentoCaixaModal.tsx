"use client";
// O FORMULÁRIO DE MOVIMENTO DO CAIXA — um só, usado na tela de Caixa e no Ponto de venda.
//
// A Cintia, em 07/09/2026, olhando o SimplesVet: "no ponto de venda o painel do caixa fica com
// Suprimento, Sangria, Despesa, Transferência, Devolução e Fechar ali à mão" — e, sobre o que
// essas operações significam: "são as informações que vão para a movimentação do caixa e o
// fluxo de caixa no financeiro".
//
// Existe como componente porque escrever um SEGUNDO formulário de dinheiro no ponto de venda é
// como a busca de itens ficou quebrada em três telas diferentes: um esquece um campo, e o
// movimento chega torto no DRE. Aqui os campos são estes e ponto — quem decide o que fazer com
// eles é o backend (POST /caixa/:id/movimento), que já lança no financeiro.

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

export type TipoMovimento = "SUPRIMENTO" | "SANGRIA" | "DESPESA" | "TRANSFERENCIA";

export const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = {
  SUPRIMENTO: "Suprimento",
  SANGRIA: "Sangria",
  DESPESA: "Despesa",
  TRANSFERENCIA: "Transferência",
};

const FORMAS_PADRAO = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito"];
const ehEntrada = (t: TipoMovimento) => t === "SUPRIMENTO";

type Props = {
  caixaId: string;
  tipo: TipoMovimento;
  onClose: () => void;
  /** Chamado depois que o movimento entra — a tela recarrega o que precisar. */
  onFeito?: () => void;
};

export default function MovimentoCaixaModal({ caixaId, tipo, onClose, onFeito }: Props) {
  const [contas, setContas] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [formas, setFormas] = useState<string[]>(FORMAS_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ valor: "", forma: "Dinheiro", descricao: "", observacao: "", categoriaId: "", contaOrigemId: "", contaDestinoId: "" });

  useEffect(() => {
    (async () => {
      try {
        const cs = await fetch("/api/financeiro/contas", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
        const lista = Array.isArray(cs) ? cs : (cs.itens || cs.data || []);
        setContas(lista.filter((c: any) => c?.id && c?.nome).map((c: any) => ({ id: c.id, nome: c.nome })));
      } catch { /* sem contas: o movimento entra sem conta ligada */ }
      try {
        const cats = await fetch("/api/financeiro/categorias", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(cats) ? cats : (cats.itens || cats.data || []);
        setCategorias(arr.filter((c: any) => String(c?.tipo || "") === "DESPESA").sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "")));
      } catch { /* sem categorias: a despesa entra sem classificação */ }
      try {
        const fs = await fetch("/api/listas?lista=formasrecebimento", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(fs) ? fs : (fs.itens || fs.data || []);
        const nomes = arr.map((f: any) => { try { const o = JSON.parse(f.valor); return o?.nome || f.valor; } catch { return f?.valor; } }).filter(Boolean);
        if (nomes.length) setFormas(nomes);
      } catch { /* usa o padrão */ }
    })();
  }, []);

  const salvar = async () => {
    const valor = Number(String(form.valor).replace(",", ".")) || 0;
    if (valor <= 0) { toast.error("Informe o valor."); return; }
    setSalvando(true);
    try {
      const r = await fetch(`/api/caixa/${caixaId}/movimento`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          tipo, valor,
          forma: form.forma || null,
          descricao: form.descricao || null,
          observacao: form.observacao || null,
          ...(tipo === "DESPESA" && form.categoriaId ? { categoriaId: form.categoriaId } : {}),
          ...((tipo === "SUPRIMENTO" || tipo === "TRANSFERENCIA") && form.contaOrigemId ? { contaOrigemId: form.contaOrigemId } : {}),
          ...((tipo === "SANGRIA" || tipo === "TRANSFERENCIA") && form.contaDestinoId ? { contaDestinoId: form.contaDestinoId } : {}),
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Erro ao registrar o movimento."); }
      toast.success(`${ROTULO_MOVIMENTO[tipo]} registrada.`);
      onFeito?.();
      onClose();
    } catch (e: any) { toast.error(e?.message || "Erro ao registrar o movimento."); }
    finally { setSalvando(false); }
  };

  const inp: React.CSSProperties = { width: "100%", border: "1px solid #E8E2D6", borderRadius: 9, padding: "9px 11px", fontSize: 13.5, background: "#fff", color: "#1F2A2E" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11.5, color: "#5C6B70", marginBottom: 4 };
  const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => <div><label style={lbl}>{label}</label>{children}</div>;

  return (
    <div {...fundoDeModal(() => onClose())} style={{ position: "fixed", inset: 0, background: "rgba(1,43,46,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 90 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 430, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: "1px solid #F0EBE0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#1F2A2E" }}>{ROTULO_MOVIMENTO[tipo]}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 17, color: "#374151" }} aria-label="Fechar">✕</button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <Campo label="Valor">
            <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") salvar(); }} inputMode="decimal" placeholder="0,00" autoFocus style={inp} />
          </Campo>

          {tipo === "TRANSFERENCIA" && (<>
            <Campo label="Conta de origem">
              <select value={form.contaOrigemId} onChange={(e) => setForm({ ...form, contaOrigemId: e.target.value })} style={inp}>
                <option value="">— Escolher —</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Conta de destino">
              <select value={form.contaDestinoId} onChange={(e) => setForm({ ...form, contaDestinoId: e.target.value })} style={inp}>
                <option value="">— Escolher —</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          </>)}

          {tipo === "SANGRIA" && (
            <Campo label="Conta de destino (sai do caixa em dinheiro)">
              <select value={form.contaDestinoId} onChange={(e) => setForm({ ...form, contaDestinoId: e.target.value })} style={inp}>
                <option value="">— Escolher —</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          )}

          {tipo === "SUPRIMENTO" && (
            <Campo label="Conta de origem (entra no caixa em dinheiro)">
              <select value={form.contaOrigemId} onChange={(e) => setForm({ ...form, contaOrigemId: e.target.value })} style={inp}>
                <option value="">— Escolher —</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          )}

          {tipo === "DESPESA" && (<>
            <Campo label="Forma">
              <select value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })} style={inp}>
                {formas.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Campo>
            <Campo label="Categoria (entra no DRE)">
              <select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} style={inp}>
                <option value="">— Escolher categoria —</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {categorias.length === 0 && <div style={{ fontSize: 11, color: "#5C6B70", marginTop: 3 }}>Sem categorias — a despesa entra sem classificação.</div>}
            </Campo>
          </>)}

          <Campo label="Descrição"><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={inp} /></Campo>
          <Campo label="Observação"><input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} style={inp} /></Campo>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 18px 18px" }}>
          <button onClick={onClose} style={{ flex: 1, border: "1px solid #E8E2D6", background: "#fff", color: "#5C6B70", borderRadius: 10, padding: "10px", fontSize: 13.5, cursor: "pointer" }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ flex: 2, border: "none", background: salvando ? "#9DBDC2" : (ehEntrada(tipo) ? "#009AAC" : "#014D5E"), color: "#fff", borderRadius: 10, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: salvando ? "default" : "pointer" }}>
            {salvando ? "Registrando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
