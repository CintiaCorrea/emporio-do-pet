"use client";
// [EMP-COWORK] Cadastro único de item (Fase 1) — Produto/Serviço. Tipo no topo adapta os campos.
// Salva em /api/products (catálogo unificado). Grupo = categorias (/api/servicos/categorias) com "+ criar" inline.

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

const B = { line: "#E8E2D6", soft: "#FBF9F4", lineSoft: "#F0EBE0", navy: "#014D5E", primary: "#009AAC", t1: "#1F2A2E", t2: "#5C6B70", t3: "#374151", tint: "#E0F4F6" };
const inp: React.CSSProperties = { border: `1px solid ${B.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: B.t1, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 11.5, color: B.t3, fontWeight: 500, display: "block", marginBottom: 4 };
const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v));

interface Cat { id: string; nome: string }
interface Forn { id: string; nome: string; tipo?: string }

export default function ItemFormModal({ editId, onClose, onSaved }: { editId?: string | null; onClose: () => void; onSaved: () => void }) {
  const canSeeCost = useCanSeeCost(); // custo/markup/preço sugerido só p/ ADMIN
  const [tipo, setTipo] = useState<"PRODUTO" | "SERVICO">("PRODUTO");
  const [f, setF] = useState<any>({
    name: "", unidadeVenda: "", marca: "", codigoBarras: "", categoryId: "", proposito: "Venda e consumo interno",
    custoPadrao: "", markup: "", price: "", exibeListaPreco: true, permiteAlterarPreco: false,
    controlaEstoque: true, estoqueMin: "", estoqueMax: "", stock: "",
    comissionado: false, comissaoTipo: "PERCENTUAL", comissaoValor: "", fornecedorId: "",
  });
  const [cats, setCats] = useState<Cat[]>([]);
  const [forns, setForns] = useState<Forn[]>([]);
  const [marcasCat, setMarcasCat] = useState<string[]>([]); // catálogo de marcas (autocompletar)
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  // ficha técnica (insumos consumidos)
  const [comp, setComp] = useState<any[]>([]);
  const [compBusca, setCompBusca] = useState("");
  const [compRes, setCompRes] = useState<any[]>([]);
  const [compBuscando, setCompBuscando] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, fo, mk] = await Promise.all([
        fetch("/api/servicos/categorias", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/fornecedores?includeInactive=true", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=marcas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setCats(Array.isArray(c) ? c : (c.data || c.itens || []));
      setForns(Array.isArray(fo) ? fo : (fo.data || []));
      const mkArr = Array.isArray(mk) ? mk : (mk.itens || mk.data || []);
      setMarcasCat(mkArr.map((x: any) => x.valor).filter(Boolean).sort());
    })();
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const d = await fetch(`/api/products/${editId}`, { cache: "no-store" }).then((r) => r.json());
        setTipo(d.type === "SERVICE" ? "SERVICO" : "PRODUTO");
        setF({
          name: d.name || "", unidadeVenda: d.unidadeVenda || "", marca: d.marca || "", codigoBarras: d.codigoBarras || "",
          categoryId: d.categoryId || "", proposito: d.proposito || "Venda e consumo interno",
          custoPadrao: d.custoPadrao ?? "", markup: d.markup ?? "", price: d.price ?? "",
          exibeListaPreco: d.exibeListaPreco !== false, permiteAlterarPreco: !!d.permiteAlterarPreco,
          controlaEstoque: d.controlaEstoque !== false, estoqueMin: d.estoqueMin ?? "", estoqueMax: d.estoqueMax ?? "", stock: d.stock ?? "",
          comissionado: !!d.comissionado, comissaoTipo: d.comissaoTipo || "PERCENTUAL", comissaoValor: d.comissaoValor ?? "", fornecedorId: d.fornecedorId || "",
        });
      } catch { toast.error("Erro ao carregar item"); }
      try { const cc = await fetch(`/api/products/${editId}/composicao`, { cache: "no-store" }).then((r) => r.json()); if (Array.isArray(cc)) setComp(cc); } catch { /* sem ficha técnica */ }
      setLoading(false);
    })();
  }, [editId]);

  const num = (v: any) => (v === "" || v == null ? undefined : Number(String(v).replace(",", ".")));
  const isProd = tipo === "PRODUTO";
  const precoSug = (() => { const c = num(f.custoPadrao), m = num(f.markup); return c != null && m != null ? c * (1 + m / 100) : null; })();

  // Cálculo nos dois sentidos: ao digitar o PREÇO DE VENDA (valor final), calcula o markup %
  // automaticamente a partir do custo (o que a Cintia pediu). Idem ao mudar o custo.
  const markupDe = (custo?: number, preco?: number) =>
    custo != null && custo > 0 && preco != null ? String(Math.round(((preco / custo) - 1) * 1000) / 10) : undefined;
  const setPrecoVenda = (v: string) =>
    setF((x: any) => { const mk = markupDe(num(x.custoPadrao), num(v)); return { ...x, price: v, ...(mk !== undefined ? { markup: mk } : {}) }; });
  const setCusto = (v: string) =>
    setF((x: any) => { const mk = markupDe(num(v), num(x.price)); return { ...x, custoPadrao: v, ...(mk !== undefined ? { markup: mk } : {}) }; });

  const criarGrupo = async () => {
    const nome = window.prompt("Nome do novo grupo:");
    if (!nome || !nome.trim()) return;
    try {
      const r = await fetch("/api/servicos/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim() }) });
      const nova = await r.json();
      if (!r.ok) throw new Error(nova?.message);
      setCats((cs) => [...cs, nova]);
      set("categoryId", nova.id);
      toast.success("Grupo criado");
    } catch { toast.error("Erro ao criar grupo"); }
  };

  const salvar = async () => {
    if (!f.name.trim()) { toast.error("Informe o nome"); return; }
    if (num(f.price) == null) { toast.error("Informe o preço de venda"); return; }
    setSaving(true);
    const payload: any = {
      name: f.name.trim(), type: isProd ? "MEDICINE" : "SERVICE", price: num(f.price) ?? 0,
      unidadeVenda: f.unidadeVenda || undefined, categoryId: f.categoryId || undefined, proposito: f.proposito || undefined,
      custoPadrao: num(f.custoPadrao), markup: num(f.markup),
      exibeListaPreco: !!f.exibeListaPreco, permiteAlterarPreco: !!f.permiteAlterarPreco,
      comissionado: !!f.comissionado,
      comissaoTipo: f.comissionado ? f.comissaoTipo : undefined,
      comissaoValor: f.comissionado ? num(f.comissaoValor) : undefined,
      fornecedorId: f.fornecedorId || undefined,
    };
    if (isProd) {
      payload.codigoBarras = f.codigoBarras || undefined;
      payload.marca = f.marca || undefined;
      payload.controlaEstoque = !!f.controlaEstoque;
      payload.estoqueMin = num(f.estoqueMin);
      payload.estoqueMax = num(f.estoqueMax);
      payload.stock = num(f.stock) ?? 0;
    }
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Erro ao salvar"); }
      const saved = await r.json().catch(() => ({} as any));
      const pid = editId || saved?.id;
      if (pid) {
        try {
          await fetch(`/api/products/${pid}/composicao`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itens: comp.map((c) => ({ itemId: c.itemId, quantidade: num(c.quantidade) || 0, custoUnitario: c.item?.custoPadrao ?? null })) }) });
        } catch { /* ficha técnica é best-effort — não trava o salvar do item */ }
      }
      toast.success(editId ? "Item atualizado!" : "Item criado!");
      onSaved();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  // ── Ficha técnica: buscar/adicionar/remover insumos ──
  async function buscarInsumo(q: string) {
    setCompBusca(q);
    if (q.trim().length < 2) { setCompRes([]); return; }
    setCompBuscando(true);
    try {
      const r = await fetch(`/api/products?search=${encodeURIComponent(q.trim())}&excludeService=1&limit=8`, { cache: "no-store" }).then((x) => x.json());
      const arr = Array.isArray(r) ? r : (r.data || r.products || r.items || []);
      setCompRes(arr.filter((p: any) => p.id !== editId && !comp.some((c) => c.itemId === p.id)));
    } catch { setCompRes([]); }
    finally { setCompBuscando(false); }
  }
  function addInsumo(p: any) {
    if (comp.some((c) => c.itemId === p.id)) return;
    setComp((cs) => [...cs, { itemId: p.id, quantidade: 1, item: { id: p.id, name: p.name, stock: p.stock, unidadeVenda: p.unidadeVenda, custoPadrao: p.custoPadrao } }]);
    setCompBusca(""); setCompRes([]);
  }
  const updQtd = (itemId: string, v: string) => setComp((cs) => cs.map((c) => (c.itemId === itemId ? { ...c, quantidade: v } : c)));
  const rmInsumo = (itemId: string) => setComp((cs) => cs.filter((c) => c.itemId !== itemId));
  const custoFicha = comp.reduce((s, c) => s + (Number(c.item?.custoPadrao) || 0) * (num(c.quantidade) || 0), 0);

  const Toggle = ({ v, on, off, onChange }: { v: boolean; on?: string; off?: string; onChange: (b: boolean) => void }) => (
    <div style={{ display: "inline-flex", border: `1px solid ${B.line}`, borderRadius: 9, overflow: "hidden" }}>
      <button type="button" onClick={() => onChange(true)} style={{ border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: "7px 16px", cursor: "pointer", background: v ? B.navy : "#fff", color: v ? "#fff" : B.t2 }}>{on || "Sim"}</button>
      <button type="button" onClick={() => onChange(false)} style={{ border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: "7px 16px", cursor: "pointer", background: !v ? B.navy : "#fff", color: !v ? "#fff" : B.t2 }}>{off || "Não"}</button>
    </div>
  );
  const sec: React.CSSProperties = { padding: "16px 0", borderBottom: `1px solid ${B.lineSoft}` };
  const h3: React.CSSProperties = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em", color: B.navy, fontWeight: 600, margin: "0 0 12px" };
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(1,43,46,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", zIndex: 60, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, border: `1px solid ${B.line}` }} onClick={(e) => e.stopPropagation()}>
        {/* header + tipo */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${B.lineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: B.navy, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>🗂️ {editId ? "Editar item" : "Novo item"}</h2>
          <div style={{ display: "inline-flex", background: B.soft, border: `1px solid ${B.line}`, borderRadius: 11, padding: 3, gap: 2 }}>
            {(["PRODUTO", "SERVICO"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} disabled={!!editId} style={{ border: "none", background: tipo === t ? B.primary : "none", color: tipo === t ? "#fff" : B.t2, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 8, cursor: editId ? "not-allowed" : "pointer", opacity: editId && tipo !== t ? .5 : 1 }}>{t === "PRODUTO" ? "📦 Produto" : "🛎️ Serviço"}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: B.t2 }}>Carregando…</div>
        ) : (
          <div style={{ padding: "6px 20px 4px" }}>
            {/* DADOS BÁSICOS */}
            <div style={sec}>
              <h3 style={h3}>📋 Dados básicos</h3>
              <div style={grid}>
                {isProd && <div><label style={lbl}>Código de barras</label><input style={inp} value={f.codigoBarras} onChange={(e) => set("codigoBarras", e.target.value)} placeholder="7896014670062" /></div>}
                {isProd && <div><label style={lbl}>Marca</label><input style={inp} list="marcas-catalogo" value={f.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ex.: Royal Canin" />
                  <datalist id="marcas-catalogo">{marcasCat.map((m) => <option key={m} value={m} />)}</datalist>
                </div>}
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Nome *</label><input style={inp} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome do item" /></div>
                <div><label style={lbl}>Unidade de venda</label><input style={inp} value={f.unidadeVenda} onChange={(e) => set("unidadeVenda", e.target.value)} placeholder="UN, KG, ML…" /></div>
                <div>
                  <label style={lbl}>Grupo</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select style={{ ...inp, flex: 1 }} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                      <option value="">Selecione…</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <button type="button" onClick={criarGrupo} title="Criar novo grupo" style={{ border: `1px solid ${B.primary}`, background: "#fff", color: B.primary, borderRadius: 9, padding: "0 12px", cursor: "pointer", fontWeight: 600 }}>+</button>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Fornecedor (opcional)</label>
                  <select style={inp} value={f.fornecedorId} onChange={(e) => set("fornecedorId", e.target.value)}>
                    <option value="">Nenhum</option>
                    {forns.map((fo) => <option key={fo.id} value={fo.id}>{fo.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* CUSTO E PREÇO */}
            <div style={sec}>
              <h3 style={h3}>💲 Custo e preço</h3>
              <div style={grid}>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Propósito</label>
                  <select style={inp} value={f.proposito} onChange={(e) => set("proposito", e.target.value)}>
                    <option>Venda e consumo interno</option><option>Apenas venda</option><option>Apenas consumo interno</option>
                  </select>
                </div>
                {canSeeCost && <><div><label style={lbl}>Custo de aquisição</label><input style={inp} inputMode="decimal" value={f.custoPadrao} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" /></div>
                <div><label style={lbl}>Markup desejado (%)</label><input style={inp} inputMode="decimal" value={f.markup} onChange={(e) => set("markup", e.target.value)} placeholder="0" /></div>
                <div>
                  <label style={lbl}>Preço sugerido</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input style={{ ...inp, background: B.soft, color: B.t2, flex: 1 }} readOnly title="Cálculo automático: custo + markup" value={precoSug == null ? "—" : brl(precoSug)} />
                    {precoSug != null && (
                      <button type="button" onClick={() => setPrecoVenda(String(Math.round(precoSug * 100) / 100))} title="Usar o sugerido como preço de venda" style={{ border: `1px solid ${B.primary}`, background: "#fff", color: B.primary, borderRadius: 9, padding: "0 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>usar ➡</button>
                    )}
                  </div>
                </div></>}
                <div><label style={lbl}>Preço de venda *</label><input style={inp} inputMode="decimal" value={f.price} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0,00" />
                  <div style={{ fontSize: 10.5, color: B.t2, marginTop: 3 }}>Digite o valor final aqui — o markup % é calculado sozinho.</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: B.t1, cursor: "pointer", padding: "3px 0" }}><input type="checkbox" checked={f.exibeListaPreco} onChange={(e) => set("exibeListaPreco", e.target.checked)} /> Exibe na lista de preço</label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: B.t1, cursor: "pointer", padding: "3px 0" }}><input type="checkbox" checked={f.permiteAlterarPreco} onChange={(e) => set("permiteAlterarPreco", e.target.checked)} /> Permite alterar preço na venda</label>
                </div>
              </div>
            </div>

            {/* ESTOQUE (só produto) */}
            {isProd && (
              <div style={sec}>
                <h3 style={h3}>📦 Estoque</h3>
                <div style={grid}>
                  <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Controla estoque?</label><br /><Toggle v={f.controlaEstoque} onChange={(b) => set("controlaEstoque", b)} /></div>
                  {f.controlaEstoque && <>
                    <div><label style={lbl}>Mínimo</label><input style={inp} inputMode="numeric" value={f.estoqueMin} onChange={(e) => set("estoqueMin", e.target.value)} placeholder="0" /></div>
                    <div><label style={lbl}>Máximo</label><input style={inp} inputMode="numeric" value={f.estoqueMax} onChange={(e) => set("estoqueMax", e.target.value)} placeholder="0" /></div>
                    <div><label style={lbl}>Estoque atual</label><input style={inp} inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" /></div>
                  </>}
                </div>
              </div>
            )}

            {/* FICHA TÉCNICA (insumos consumidos) */}
            <div style={sec}>
              <h3 style={h3}>🧪 Ficha técnica — insumos consumidos</h3>
              <div style={{ fontSize: 11.5, color: B.t2, marginBottom: 10 }}>Ao vender este item, o sistema baixa estes insumos do estoque. Ex.: um procedimento consome placa + parafusos. (O insumo é compartilhado — não tem departamento; o custo cai no departamento da venda.)</div>
              {comp.length > 0 && (
                <div style={{ border: `1px solid ${B.lineSoft}`, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                  {comp.map((c) => (
                    <div key={c.itemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderBottom: `1px solid ${B.lineSoft}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: B.t1, fontWeight: 500 }}>{c.item?.name || "insumo"}</div>
                        <div style={{ fontSize: 10.5, color: B.t2 }}>estoque: {c.item?.stock ?? "—"}{canSeeCost && c.item?.custoPadrao != null ? ` · custo ${brl(c.item.custoPadrao)}` : ""}</div>
                      </div>
                      <input value={String(c.quantidade)} onChange={(e) => updQtd(c.itemId, e.target.value)} inputMode="decimal" style={{ ...inp, width: 72, textAlign: "right", padding: "6px 8px" }} title="Quantidade consumida por venda" />
                      <span style={{ fontSize: 11, color: B.t2, width: 26 }}>{c.item?.unidadeVenda || "un"}</span>
                      <button type="button" onClick={() => rmInsumo(c.itemId)} title="Remover" style={{ border: "none", background: "none", color: "#b23b39", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                  {canSeeCost && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 11px", background: B.soft, fontSize: 12, color: B.navy, fontWeight: 600 }}><span>Custo dos insumos</span><span>{brl(custoFicha)}</span></div>}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input style={inp} value={compBusca} onChange={(e) => buscarInsumo(e.target.value)} placeholder="🔎 adicionar insumo (buscar produto do estoque)…" />
                {compBusca.trim().length >= 2 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${B.line}`, borderRadius: 9, marginTop: 4, maxHeight: 200, overflowY: "auto", zIndex: 5, boxShadow: "0 8px 20px rgba(0,0,0,.12)" }}>
                    {compBuscando ? <div style={{ padding: 10, fontSize: 12, color: B.t2 }}>Buscando…</div>
                      : compRes.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: B.t2 }}>Nenhum produto encontrado.</div>
                      : compRes.map((p) => (
                        <button key={p.id} type="button" onClick={() => addInsumo(p)} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "#fff", padding: "8px 11px", cursor: "pointer", fontSize: 12.5, color: B.t1, borderBottom: `1px solid ${B.lineSoft}` }}>
                          {p.name} <span style={{ color: B.t2, fontSize: 11 }}>· estoque {p.stock ?? 0}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* COMISSÃO */}
            <div style={{ ...sec, borderBottom: "none" }}>
              <h3 style={h3}>🤝 Comissão</h3>
              <div style={grid}>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>O item é comissionado?</label><br /><Toggle v={f.comissionado} onChange={(b) => set("comissionado", b)} /></div>
                {f.comissionado && <>
                  <div><label style={lbl}>Tipo</label>
                    <select style={inp} value={f.comissaoTipo} onChange={(e) => set("comissaoTipo", e.target.value)}><option value="PERCENTUAL">Percentual (%)</option><option value="VALOR_FIXO">Valor fixo (R$)</option></select>
                  </div>
                  <div><label style={lbl}>{f.comissaoTipo === "VALOR_FIXO" ? "Valor (R$)" : "Percentual (%)"} padrão</label><input style={inp} inputMode="decimal" value={f.comissaoValor} onChange={(e) => set("comissaoValor", e.target.value)} placeholder="0" /></div>
                </>}
                <div style={{ gridColumn: "1 / -1", fontSize: 11, color: B.t3 }}>Se vazio, usa o % padrão do profissional (config em Comissionamento). 🔒 Fiscal e limite de desconto ficam pra etapa futura.</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "15px 20px", borderTop: `1px solid ${B.lineSoft}`, background: B.soft }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 500, padding: "10px 18px", borderRadius: 9, cursor: "pointer", border: `1px solid ${B.line}`, background: "#fff", color: B.navy }}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={saving} style={{ fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 9, cursor: "pointer", border: "none", background: B.primary, color: "#fff", opacity: saving ? .6 : 1 }}>{saving ? "Salvando…" : "💾 Salvar item"}</button>
        </div>
      </div>
    </div>
  );
}
