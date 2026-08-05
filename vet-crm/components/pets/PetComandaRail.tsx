"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuShoppingCart, LuPlus, LuTrash, LuX, LuPrinter, LuArrowRight } from "react-icons/lu";
import toast from "react-hot-toast";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { imprimirVenda } from "@/lib/documentos/venda-print";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Item = { descricao: string; servicoId?: string; quantidade: number; valorUnitario: number };

const ST: any = {
  RASCUNHO: { l: "Rascunho", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};

export default function PetComandaRail({ petId, tutorId, petNome, tutorNome }: { petId: string; tutorId?: string; petNome?: string; tutorNome?: string }) {
  const [aberto, setAberto] = useState(false);
  const [sub, setSub] = useState<"VENDA" | "ORC">("VENDA");
  const [itens, setItens] = useState<Item[]>([]);
  const [cat, setCat] = useState<{ id: string; nome: string; valor: number }[]>([]);
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [orcs, setOrcs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [ultVenda, setUltVenda] = useState<any>(null); // última venda fechada (p/ imprimir comprovante)
  const key = `comanda_${petId}`;
  const carregou = useRef(false);

  // Carrega comanda salva (rascunho) do localStorage
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setItens(JSON.parse(raw) || []); } catch {}
    carregou.current = true;
    // eslint-disable-next-line
  }, [petId]);
  // Persiste a comanda
  useEffect(() => { if (carregou.current) { try { localStorage.setItem(key, JSON.stringify(itens)); } catch {} } }, [itens, key]);

  // Catálogo (produtos + serviços)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/products?limit=1000`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.products || d.data || d.itens || []);
        setCat(arr.map((s: any) => ({ id: s.id, nome: s.name || s.nome, valor: Number(s.price ?? s.preco ?? 0), ativo: s.ativo })).filter((x: any) => x.nome && x.ativo !== false));
      } catch {}
    })();
  }, []);

  async function loadOrcs() {
    try { const r = await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || [])); } catch {}
  }
  useEffect(() => { if (aberto) loadOrcs(); /* eslint-disable-next-line */ }, [aberto, petId]);

  // Gancho p/ outras partes da ficha lançarem itens: window.dispatchEvent(new CustomEvent('comanda:add', {detail:{descricao,valorUnitario,servicoId,quantidade}}))
  useEffect(() => {
    function onAdd(e: any) { const d = e?.detail; if (!d?.descricao) return; addItem({ descricao: d.descricao, servicoId: d.servicoId, valorUnitario: Number(d.valorUnitario) || 0, quantidade: Number(d.quantidade) || 1 }); setAberto(true); toast.success("Lançado na comanda"); }
    window.addEventListener("comanda:add", onAdd as any);
    return () => window.removeEventListener("comanda:add", onAdd as any);
    // eslint-disable-next-line
  }, []);

  const total = useMemo(() => itens.reduce((s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0), 0), [itens]);
  function addItem(it: Item) { setItens((arr) => [...arr, it]); }
  function setQtd(i: number, q: number) { setItens((arr) => arr.map((x, idx) => idx === i ? { ...x, quantidade: Math.max(1, q) } : x)); }
  function del(i: number) { setItens((arr) => arr.filter((_, idx) => idx !== i)); }
  function limpar() { setItens([]); }
  const matches = useMemo(() => { const q = busca.trim().toLowerCase(); if (!q) return cat.slice(0, 20); return cat.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 20); }, [cat, busca]);

  const linhasBody = () => itens.map((it) => ({ descricao: it.descricao, quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, ...(it.servicoId ? { servicoId: it.servicoId, productId: it.servicoId } : {}) }));

  async function gerarOrcamento() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, itens: linhasBody() }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento gerado ✅"); limpar(); await loadOrcs(); setSub("ORC");
    } catch { toast.error("Erro ao gerar orçamento"); } finally { setSaving(false); }
  }
  async function converterOrc(id: string) {
    if (!confirm("Transformar este orçamento em venda? (cria a venda com os mesmos itens)")) return;
    try {
      const r = await fetch(`/api/orcamentos/${id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) throw new Error();
      toast.success("Orçamento transformado em venda ✅"); await loadOrcs();
    } catch { toast.error("Erro ao transformar em venda"); }
  }
  async function fecharVenda() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    if (!confirm(`Fechar a venda de ${BRL(total)}? Vai entrar como venda do pet (recebimento é feito no Caixa).`)) return;
    setSaving(true);
    try {
      const itensVenda = linhasBody().map((x) => ({ descricao: x.descricao, quantidade: x.quantidade, valorUnitario: x.valorUnitario, valorTotal: (Number(x.quantidade) || 1) * (Number(x.valorUnitario) || 0) }));
      const body: any = { petId, tutorId, date: new Date().toISOString(), type: "Venda", status: "COMPLETED", items: linhasBody() };
      const r = await fetch(`/api/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      setUltVenda({ itens: itensVenda, valor: total, petNome, tutorNome, date: new Date().toISOString() });
      toast.success("Venda registrada ✅"); limpar();
    } catch { toast.error("Erro ao fechar venda"); } finally { setSaving(false); }
  }

  const nItens = itens.length;

  // Aba recolhida (fixa na lateral direita)
  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} title="Abrir comanda"
        className="fixed z-40 flex flex-col items-center gap-1 text-white font-bold shadow-lg print:hidden"
        style={{ right: 0, top: "42%", background: "#009AAC", borderRadius: "12px 0 0 12px", padding: "12px 8px", writingMode: "vertical-rl" as any }}>
        <LuShoppingCart size={18} style={{ transform: "rotate(90deg)" }} />
        <span style={{ fontSize: 12 }}>Comanda{nItens ? ` (${nItens})` : ""}</span>
      </button>
    );
  }

  return (
    <div className="fixed z-40 bg-white border shadow-2xl flex flex-col print:hidden"
      style={{ right: 0, top: 64, bottom: 0, width: 330, maxWidth: "92vw", borderColor: "#E8DFC8" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
        <b style={{ color: "#014D5E", fontSize: 14 }}>🛒 Comanda — {petNome || "pet"}</b>
        <button onClick={() => setAberto(false)} className="text-[#94a3b8]" title="Recolher"><LuX size={18} /></button>
      </div>
      <div className="flex" style={{ borderBottom: "1px solid #F0EBE0" }}>
        {(["VENDA", "ORC"] as const).map((k) => (
          <button key={k} onClick={() => setSub(k)} className="flex-1 text-[12.5px] font-semibold py-2" style={{ color: sub === k ? "#009AAC" : "#8A857A", borderBottom: sub === k ? "2px solid #009AAC" : "2px solid transparent" }}>
            {k === "VENDA" ? `🛒 Comanda${nItens ? ` (${nItens})` : ""}` : "📄 Orçamentos"}
          </button>
        ))}
      </div>

      {sub === "VENDA" ? (
        <>
          <div className="px-3 pt-3">
            <button onClick={() => { setAddOpen((v) => !v); setBusca(""); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Adicionar item {addOpen ? "▲" : "▾"}</button>
            {addOpen && (
              <div className="mt-2">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus placeholder="🔍 Buscar produto ou serviço…" className="w-full border rounded-lg px-2 py-1.5 text-[12.5px]" style={{ borderColor: "#E8DFC8" }} />
                <div className="border rounded-lg mt-1 max-h-44 overflow-auto" style={{ borderColor: "#F0EBE0" }}>
                  {matches.length === 0 ? <div className="text-[12px] text-gray-400 text-center py-3">Nada encontrado</div> :
                    matches.map((c) => (
                      <button key={c.id} onClick={() => { addItem({ descricao: c.nome, servicoId: c.id, valorUnitario: c.valor, quantidade: 1 }); setBusca(""); }} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                        <span className="text-[#1F2A2E] truncate pr-2">{c.nome}</span><span className="text-[#0F6E56] font-semibold shrink-0">{BRL(c.valor)}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto px-3 py-2">
            {itens.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-8">Nada lançado ainda.<br />Use “Adicionar item”.</div>
            ) : itens.map((it, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "#F5F1E8" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E] truncate">{it.descricao}</div>
                  <div className="text-[11px] text-gray-400">{BRL(it.valorUnitario)} cada</div>
                </div>
                <input type="number" min={1} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} className="w-11 border rounded text-center text-[12px] py-0.5" style={{ borderColor: "#E8DFC8" }} />
                <span className="text-[12.5px] font-semibold text-[#0F6E56] w-16 text-right tabular-nums">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                <button onClick={() => del(i)} className="text-[#b23b39]" title="Remover"><LuTrash size={13} /></button>
              </div>
            ))}
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: "#F0EBE0" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-semibold text-[#014D5E]">Total</span>
              <span className="text-[16px] font-bold text-[#014D5E] tabular-nums">{BRL(total)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={gerarOrcamento} disabled={saving || !itens.length} className="flex-1 border-2 rounded-lg py-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#F0FBFC" }}>📄 Salvar orçamento</button>
              <button onClick={fecharVenda} disabled={saving || !itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }}>🧾 Fechar venda</button>
            </div>
            {itens.length > 0 && <button onClick={limpar} className="w-full text-[11px] text-gray-400 mt-2">limpar comanda</button>}
            {ultVenda && <button onClick={() => imprimirVenda(ultVenda)} className="w-full mt-2 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 border rounded-lg py-1.5" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}>🖨️ Imprimir comprovante da última venda</button>}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-3">
          <button onClick={() => { setSub("VENDA"); setAddOpen(true); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Montar novo orçamento</button>
          <p className="text-[10.5px] text-gray-400 mb-3 mt-1 text-center">Adicione os itens na aba <b>🛒 Comanda</b> e clique <b>“📄 Salvar orçamento”</b>.</p>
          {orcs.length === 0 ? <div className="text-center text-[12px] text-gray-400 py-8">Nenhum orçamento deste pet.</div> :
            orcs.map((o) => {
              const st = ST[o.status] || ST.RASCUNHO; const conv = !!o.appointmentId;
              return (
                <div key={o.id} className="border rounded-lg px-2.5 py-2 mb-2" style={{ borderColor: "#F0EBE0" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[12.5px] font-semibold text-[#0F6E56]">{BRL(o.valorTotal)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: conv ? "#E6F1FB" : st.b, color: conv ? "#185FA5" : st.c }}>{conv ? "Vendido" : st.l}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""} · {(o.itens || []).length} itens</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button onClick={() => imprimirOrcamento(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={11} /> Imprimir</button>
                    {!conv && <button onClick={() => converterOrc(o.id)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-white" style={{ background: "#009AAC" }}><LuArrowRight size={11} /> Transformar em venda</button>}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
