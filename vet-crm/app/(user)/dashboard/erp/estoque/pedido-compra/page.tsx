"use client";
// Pedido de compra — ordens de compra a fornecedores. Cria/edita o pedido (itens do catálogo
// ou texto livre) e, ao "Receber", cada item vira ENTRADA de estoque (com custo → custo médio).
// Base44, largura cheia. Backend: /api/pedidos-compra (+ /:id, /:id/receber).
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

interface ItemForm { key: string; productId?: string | null; descricao: string; quantidade: number; custoUnitario?: number | null }
interface PedItem { id: string; productId?: string | null; descricao: string; quantidade: number; custoUnitario?: number | null; product?: { id: string; name: string; stock: number } | null }
interface Pedido { id: string; numero: number; status: string; observacao?: string | null; previsao?: string | null; recebidoEm?: string | null; fornecedor?: { id: string; nome: string } | null; fornecedorId?: string | null; itens: PedItem[]; createdAt: string; userName?: string | null }
interface Prod { id: string; name: string; custoPadrao?: number | null }
interface Forn { id: string; nome: string }

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v)));
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
const uid = () => Math.random().toString(36).slice(2, 9);

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  RASCUNHO: { label: "Rascunho", bg: "#EEF0EF", fg: "#5C6B70" },
  ENVIADO: { label: "Enviado", bg: "#E6F1FB", fg: "#0C447C" },
  RECEBIDO: { label: "Recebido", bg: "#E7F6EE", fg: "#1c7a47" },
  CANCELADO: { label: "Cancelado", bg: "#FCE9E7", fg: "#b23b39" },
};

const CSS = `
.pc-page{width:100%;padding:2px 2px 48px}
.pc-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.pc-sel,.pc-in{border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E;font-family:inherit}
.pc-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.pc-btn:hover{border-color:#009AAC;color:#009AAC}
.pc-panel{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.pc-scroll{overflow-x:auto}
.pc-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pc-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:600;padding:9px 14px;background:#FBF9F4;white-space:nowrap}
.pc-tbl th.r{text-align:right}
.pc-tbl td{padding:9px 14px;border-bottom:1px solid #F0EBE0;white-space:nowrap;color:#1F2A2E}
.pc-tbl td.r{text-align:right;font-variant-numeric:tabular-nums}
.pc-tbl tr:last-child td{border-bottom:0}
.pc-pill{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px}
.pc-empty{padding:40px;text-align:center;color:#374151;font-size:13px}
.pc-act{border:none;background:none;cursor:pointer;font-size:14px;padding:4px 5px;border-radius:7px}
.pc-act:hover{background:#F0EBE0}
.pc-ov{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(1,30,36,.45)}
.pc-modal{background:#fff;width:100%;max-width:720px;border-radius:16px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column}
.pc-mh{padding:14px 18px;border-bottom:1px solid #E8DFC8;display:flex;align-items:center;justify-content:space-between}
.pc-mb{padding:16px 18px;overflow-y:auto}
.pc-mf{padding:14px 18px;border-top:1px solid #E8DFC8;display:flex;justify-content:flex-end;gap:8px}
.pc-lbl{font-size:11.5px;color:#374151;font-weight:600;display:block;margin-bottom:4px}
.pc-fin{border:1px solid #E8E2D6;border-radius:9px;padding:8px 10px;font-size:13px;font-family:inherit;color:#1F2A2E;background:#fff;width:100%;box-sizing:border-box}
@media print{.no-print{display:none!important}body{background:#fff}.pc-page{padding:0}.pc-panel{box-shadow:none}}
`;

export default function PedidoCompraPage() {
  usePageTitle("Pedido de compra", "Ordens de compra a fornecedores — receber dá entrada no estoque.");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [forns, setForns] = useState<Forn[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("");
  const [recebendo, setRecebendo] = useState<string | null>(null);

  // modal
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [salvando, setSalvando] = useState(false);
  // rascunho de item
  const [prodText, setProdText] = useState("");
  const [qtd, setQtd] = useState("1");
  const [custo, setCusto] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pe, pr, fo] = await Promise.all([
        fetch("/api/pedidos-compra", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/products?limit=2000&excludeService=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/fornecedores", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setPedidos(Array.isArray(pe) ? pe : (pe.data || pe.itens || []));
      const list: any[] = Array.isArray(pr?.products) ? pr.products : (Array.isArray(pr) ? pr : []);
      setProds(list.filter((p) => p.type !== "SERVICE").map((p) => ({ id: p.id, name: p.name, custoPadrao: p.custoPadrao ?? null })));
      setForns(Array.isArray(fo) ? fo : (fo.data || fo.itens || []));
    } catch { setPedidos([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtrados = useMemo(() => pedidos.filter((p) => !statusF || p.status === statusF), [pedidos, statusF]);
  const totalDe = (p: { itens: { quantidade: number; custoUnitario?: number | null }[] }) => p.itens.reduce((a, i) => a + (i.custoUnitario ? i.custoUnitario * i.quantidade : 0), 0);

  // ── modal ──
  const abrirNovo = () => { setEditId(null); setFornecedorId(""); setObservacao(""); setPrevisao(""); setItens([]); setProdText(""); setQtd("1"); setCusto(""); setOpen(true); };
  const abrirEditar = (p: Pedido) => {
    setEditId(p.id); setFornecedorId(p.fornecedorId || ""); setObservacao(p.observacao || "");
    setPrevisao(p.previsao ? String(p.previsao).slice(0, 10) : "");
    setItens(p.itens.map((i) => ({ key: uid(), productId: i.productId, descricao: i.descricao, quantidade: i.quantidade, custoUnitario: i.custoUnitario })));
    setProdText(""); setQtd("1"); setCusto(""); setOpen(true);
  };
  const addItem = () => {
    const nome = prodText.trim();
    if (!nome) { toast.error("Informe o produto (ou um texto livre)."); return; }
    const q = Math.max(1, Math.trunc(Number(qtd) || 0));
    const prod = prods.find((p) => p.name.toLowerCase() === nome.toLowerCase());
    const c = custo.trim() ? Number(String(custo).replace(",", ".")) : (prod?.custoPadrao ?? null);
    setItens((arr) => [...arr, { key: uid(), productId: prod?.id ?? null, descricao: prod?.name ?? nome, quantidade: q, custoUnitario: c }]);
    setProdText(""); setQtd("1"); setCusto("");
  };
  const rmItem = (key: string) => setItens((arr) => arr.filter((i) => i.key !== key));
  const onProdText = (v: string) => {
    setProdText(v);
    const prod = prods.find((p) => p.name.toLowerCase() === v.toLowerCase());
    if (prod && prod.custoPadrao != null && !custo) setCusto(String(prod.custoPadrao));
  };

  const salvar = async () => {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return; }
    setSalvando(true);
    const payload = {
      fornecedorId: fornecedorId || undefined,
      observacao: observacao || undefined,
      previsao: previsao || undefined,
      itens: itens.map((i) => ({ productId: i.productId || undefined, descricao: i.descricao, quantidade: i.quantidade, custoUnitario: i.custoUnitario ?? undefined })),
    };
    try {
      const url = editId ? `/api/pedidos-compra/${editId}` : "/api/pedidos-compra";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || `Erro ${r.status}`);
      toast.success(editId ? "Pedido atualizado" : "Pedido criado");
      setOpen(false); load();
    } catch (e: any) { toast.error("Não consegui salvar: " + (e?.message || "erro")); }
    finally { setSalvando(false); }
  };

  const mudarStatus = async (p: Pedido, status: string) => {
    try {
      const r = await fetch(`/api/pedidos-compra/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error();
      toast.success("Status atualizado"); load();
    } catch { toast.error("Erro ao mudar status."); }
  };
  const receber = async (p: Pedido) => {
    const comProduto = p.itens.filter((i) => i.productId).length;
    if (!confirm(`Receber o pedido #${p.numero}?\n\n${comProduto} item(ns) vão dar ENTRADA no estoque (com o custo informado, recalculando o custo médio). Essa ação não se desfaz.`)) return;
    setRecebendo(p.id);
    try {
      const r = await fetch(`/api/pedidos-compra/${p.id}/receber`, { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || `Erro ${r.status}`);
      toast.success(`Pedido recebido — ${d?.entradas ?? 0} entrada(s) no estoque.`); load();
    } catch (e: any) { toast.error("Erro ao receber: " + (e?.message || "")); }
    finally { setRecebendo(null); }
  };
  const excluir = async (p: Pedido) => {
    if (!confirm(`Excluir o pedido #${p.numero}? Não dá pra desfazer.`)) return;
    try {
      const r = await fetch(`/api/pedidos-compra/${p.id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
      toast.success("Pedido excluído"); load();
    } catch { toast.error("Erro ao excluir."); }
  };

  const totalItensForm = itens.reduce((a, i) => a + (i.custoUnitario ? i.custoUnitario * i.quantidade : 0), 0);

  return (
    <div className="pc-page">
      <style>{CSS}</style>

      <div className="pc-bar no-print">
        <select className="pc-sel" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="pc-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
        <button className="pc-btn" style={{ background: "#009AAC", borderColor: "#009AAC", color: "#fff" }} onClick={abrirNovo}>➕ Novo pedido</button>
      </div>

      <div className="pc-panel">
        <div className="pc-scroll">
          <table className="pc-tbl">
            <thead>
              <tr>
                <th>Nº</th><th>Fornecedor</th><th>Status</th><th className="r">Itens</th><th className="r">Total</th><th>Previsão</th><th>Criado</th><th className="no-print" style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="pc-empty">Carregando…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={8} className="pc-empty">Nenhum pedido de compra. Crie o primeiro em ➕ Novo pedido.</td></tr>}
              {!loading && filtrados.map((p) => {
                const st = STATUS[p.status] || STATUS.RASCUNHO;
                const podeReceber = p.status !== "RECEBIDO" && p.status !== "CANCELADO";
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: "#014D5E" }}>#{p.numero}</td>
                    <td>{p.fornecedor?.nome || <span style={{ color: "#94a3a0" }}>—</span>}</td>
                    <td><span className="pc-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                    <td className="r">{p.itens.length}</td>
                    <td className="r" style={{ fontWeight: 600, color: "#014D5E" }}>{brl(totalDe(p))}</td>
                    <td style={{ color: "#5C6B70" }}>{dt(p.previsao)}</td>
                    <td style={{ color: "#5C6B70" }}>{dt(p.createdAt)}</td>
                    <td className="no-print" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      {podeReceber && <button className="pc-act" title="Editar" onClick={() => abrirEditar(p)}>✏️</button>}
                      {podeReceber && <button className="pc-act" title="Receber (dá entrada no estoque)" onClick={() => receber(p)} disabled={recebendo === p.id} style={{ color: "#1c7a47" }}>{recebendo === p.id ? "⏳" : "📥"}</button>}
                      {p.status === "RASCUNHO" && <button className="pc-act" title="Marcar como enviado" onClick={() => mudarStatus(p, "ENVIADO")} style={{ color: "#0C447C" }}>✈️</button>}
                      {podeReceber && <button className="pc-act" title="Cancelar pedido" onClick={() => mudarStatus(p, "CANCELADO")} style={{ color: "#b23b39" }}>🚫</button>}
                      <button className="pc-act" title="Excluir" onClick={() => excluir(p)} style={{ color: "#b23b39" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal criar/editar */}
      {open && (
        <div className="pc-ov no-print" onClick={() => setOpen(false)}>
          <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-mh">
              <span style={{ fontSize: 15, fontWeight: 700, color: "#014D5E" }}>{editId ? "Editar pedido de compra" : "Novo pedido de compra"}</span>
              <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "#5C6B70" }}>✕</button>
            </div>
            <div className="pc-mb">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 170px", gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="pc-lbl">Fornecedor</label>
                  <select className="pc-fin" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                    <option value="">— sem fornecedor —</option>
                    {forns.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pc-lbl">Previsão de entrega</label>
                  <input type="date" className="pc-fin" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
                </div>
              </div>

              {/* adicionar item */}
              <label className="pc-lbl">Adicionar item</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <input className="pc-fin" list="pc-prods" style={{ flex: 1, minWidth: 180 }} placeholder="Produto do catálogo ou texto livre…" value={prodText} onChange={(e) => onProdText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                <datalist id="pc-prods">{prods.map((p) => <option key={p.id} value={p.name} />)}</datalist>
                <input className="pc-fin" style={{ width: 74 }} type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Qtd" title="Quantidade" />
                <input className="pc-fin" style={{ width: 110 }} inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Custo un." title="Custo unitário" />
                <button className="pc-btn" style={{ background: "#009AAC", borderColor: "#009AAC", color: "#fff" }} onClick={addItem}>+ Add</button>
              </div>

              {/* lista de itens */}
              <div className="pc-panel" style={{ marginBottom: 12 }}>
                <table className="pc-tbl">
                  <thead><tr><th>Item</th><th className="r">Qtd</th><th className="r">Custo un.</th><th className="r">Total</th><th></th></tr></thead>
                  <tbody>
                    {itens.length === 0 && <tr><td colSpan={5} className="pc-empty" style={{ padding: 22 }}>Nenhum item ainda.</td></tr>}
                    {itens.map((i) => (
                      <tr key={i.key}>
                        <td style={{ whiteSpace: "normal" }}>{i.descricao}{!i.productId && <span style={{ fontSize: 11, color: "#8a6400" }}> (texto livre — não movimenta estoque)</span>}</td>
                        <td className="r">{i.quantidade}</td>
                        <td className="r" style={{ color: "#5C6B70" }}>{brl(i.custoUnitario)}</td>
                        <td className="r" style={{ fontWeight: 600, color: "#014D5E" }}>{i.custoUnitario ? brl(i.custoUnitario * i.quantidade) : "—"}</td>
                        <td style={{ textAlign: "right" }}><button className="pc-act" onClick={() => rmItem(i.key)} style={{ color: "#b23b39" }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: "right", fontSize: 13, color: "#014D5E", fontWeight: 700, marginBottom: 12 }}>Total do pedido: {brl(totalItensForm)}</div>

              <label className="pc-lbl">Observação</label>
              <textarea className="pc-fin" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Condições, forma de pagamento, etc." />
            </div>
            <div className="pc-mf">
              <button className="pc-btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="pc-btn" disabled={salvando} style={{ background: "#009AAC", borderColor: "#009AAC", color: "#fff", opacity: salvando ? 0.6 : 1 }} onClick={salvar}>{salvando ? "Salvando…" : (editId ? "Salvar" : "Criar pedido")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
