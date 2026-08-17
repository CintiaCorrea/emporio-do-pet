"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuShoppingCart, LuPlus, LuTrash, LuX, LuPrinter, LuArrowRight } from "react-icons/lu";
import toast from "react-hot-toast";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { imprimirVenda } from "@/lib/documentos/venda-print";
import { carregarCatalogoVendavel, linhaDoItem, itemParaVenda, labDoItem } from "@/lib/catalogoVendavel";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Item = { descricao: string; servicoId?: string; quantidade: number; valorUnitario: number; custoUnitario?: number; fornecedorId?: string | null; fornecedorNome?: string | null; catalogoExameId?: string; _exame?: boolean; _novo?: boolean; catalogoItemId?: string };

const ST: any = {
  RASCUNHO: { l: "Rascunho", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};

// Serializa um item da comanda p/ o formato de venda do backend — NÚCLEO ÚNICO `itemParaVenda`
// (mesmo do PDV/atendimento/internação/orçamento). A tela só acrescenta quantidade + total.
const linhaBody = (it: Item) => ({ ...itemParaVenda(it as any), quantidade: Number(it.quantidade) || 1, valorTotal: (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) });
const somaDe = (arr: Item[]) => arr.reduce((s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0), 0);

export default function PetComandaRail({ petId, tutorId, petNome, tutorNome }: { petId: string; tutorId?: string; petNome?: string; tutorNome?: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [sub, setSub] = useState<"VENDA" | "ORC">("VENDA");
  const [itens, setItens] = useState<Item[]>([]);
  const [cat, setCat] = useState<{ id: string; nome: string; valor: number; custoPadrao?: number; _exame?: boolean; _fornecedorId?: string | null; _fornecedorNome?: string | null }[]>([]);
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [orcs, setOrcs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  // A comanda é uma VENDA em aberto no servidor (aparece no Caixa). Guardamos o id dela.
  const [apptId, setApptId] = useState<string | null>(null);
  const [numeroVenda, setNumeroVenda] = useState<number | null>(null);
  const [sync, setSync] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const key = `comanda_${petId}`;
  const apptKey = `comanda_appt_${petId}`;
  const carregou = useRef(false);
  const primeira = useRef(true);
  // sincronização com o servidor (debounce + trava anti-duplicidade)
  const apptIdRef = useRef<string | null>(null);
  const pendingRef = useRef<Item[]>([]);
  const timerRef = useRef<any>(null);
  const syncingRef = useRef(false);
  const redoRef = useRef(false);
  useEffect(() => { apptIdRef.current = apptId; }, [apptId]);

  // Carrega a comanda salva (rascunho local + id da venda no servidor)
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setItens(JSON.parse(raw) || []); } catch {}
    try { const a = localStorage.getItem(apptKey); if (a) { setApptId(a); apptIdRef.current = a; } } catch {}
    carregou.current = true;
    // eslint-disable-next-line
  }, [petId]);
  // Persiste o rascunho local (resposta instantânea, mesmo offline)
  useEffect(() => { if (carregou.current) { try { localStorage.setItem(key, JSON.stringify(itens)); } catch {} } }, [itens, key]);

  // Catálogo (produtos + serviços + medicamentos/vacinas + exames) — FONTE ÚNICA
  useEffect(() => {
    (async () => {
      try {
        const its = await carregarCatalogoVendavel();
        setCat(its.map((i) => ({ id: i.id, nome: i.nome, valor: i.valorPadrao, custoPadrao: i.custoPadrao, _exame: i._exame, _fornecedorId: i._fornecedorId, _fornecedorNome: i._fornecedorNome })));
      } catch {}
    })();
  }, []);

  // 💾 SINCRONIZA a comanda com o servidor (vira venda em aberto → aparece no Caixa).
  // Cria no 1º item, atualiza a cada mudança (sem duplicar), e APAGA quando esvazia.
  async function sincronizar() {
    if (syncingRef.current) { redoRef.current = true; return; }
    if (!tutorId) { setSync("idle"); return; } // sem tutor não dá pra abrir venda
    syncingRef.current = true;
    const arr = pendingRef.current;
    try {
      setSync("saving");
      if (arr.length === 0) {
        if (apptIdRef.current) {
          await fetch(`/api/appointments/${apptIdRef.current}`, { method: "DELETE" });
          setApptId(null); apptIdRef.current = null; setNumeroVenda(null);
          try { localStorage.removeItem(apptKey); } catch {}
          try { window.dispatchEvent(new Event("pet:venda")); } catch {}
        }
        setSync("idle");
        return;
      }
      const body: any = { value: somaDe(arr), items: arr.map(linhaBody) };
      const eraNovo = !apptIdRef.current;
      let r: Response;
      if (apptIdRef.current) {
        r = await fetch(`/api/appointments/${apptIdRef.current}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        r = await fetch(`/api/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, date: new Date().toISOString(), type: "Venda", status: "COMPLETED", ...body }) });
      }
      if (!r.ok) throw new Error();
      const data = await r.json().catch(() => ({}));
      if (eraNovo && data?.id) { setApptId(data.id); apptIdRef.current = data.id; try { localStorage.setItem(apptKey, data.id); } catch {} }
      if (data?.numeroVenda != null) setNumeroVenda(Number(data.numeroVenda));
      setSync("saved");
      if (eraNovo) { try { window.dispatchEvent(new Event("pet:venda")); } catch {} } // avisa a ficha só ao CRIAR
    } catch { setSync("error"); }
    finally {
      syncingRef.current = false;
      if (redoRef.current) { redoRef.current = false; setTimeout(sincronizar, 60); }
    }
  }
  function agendarSync(next: Item[]) {
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sincronizar, 800);
  }
  // Dispara a sincronização a cada mudança dos itens (pula o carregamento inicial).
  useEffect(() => {
    if (!carregou.current) return;
    if (primeira.current) { primeira.current = false; pendingRef.current = itens; return; }
    agendarSync(itens);
    // eslint-disable-next-line
  }, [itens]);
  // Ao sair da tela, garante que a última mudança foi salva.
  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current); sincronizar(); } /* eslint-disable-next-line */ }, []);

  async function loadOrcs() {
    try { const r = await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || [])); } catch {}
  }
  useEffect(() => { if (aberto) loadOrcs(); /* eslint-disable-next-line */ }, [aberto, petId]);

  // Gancho p/ outras partes da ficha lançarem itens na comanda
  useEffect(() => {
    function onAdd(e: any) { const d = e?.detail; if (!d?.descricao) return; addItem({ descricao: d.descricao, servicoId: d.servicoId, valorUnitario: Number(d.valorUnitario) || 0, custoUnitario: d.custoUnitario != null ? Number(d.custoUnitario) : undefined, fornecedorId: d.fornecedorId ?? undefined, fornecedorNome: d.fornecedorNome ?? undefined, catalogoExameId: d.catalogoExameId, _exame: d._exame, _novo: d._novo, catalogoItemId: d.catalogoItemId, quantidade: Number(d.quantidade) || 1 }); setAberto(true); toast.success("Lançado na comanda"); }
    window.addEventListener("comanda:add", onAdd as any);
    return () => window.removeEventListener("comanda:add", onAdd as any);
    // eslint-disable-next-line
  }, []);

  const total = useMemo(() => somaDe(itens), [itens]);
  function addItem(it: Item) { setItens((arr) => [...arr, it]); }
  function setQtd(i: number, q: number) { setItens((arr) => arr.map((x, idx) => idx === i ? { ...x, quantidade: Math.max(1, q) } : x)); }
  function del(i: number) { setItens((arr) => arr.filter((_, idx) => idx !== i)); }
  async function limpar() {
    if (apptId && !confirm("Limpar a comanda? Ela também sai do Caixa.")) return;
    setItens([]);
  }
  const matches = useMemo(() => { const q = busca.trim().toLowerCase(); if (!q) return cat.slice(0, 20); return cat.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 20); }, [cat, busca]);

  function imprimirComanda() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    imprimirVenda({ itens: itens.map(linhaBody), valor: total, petNome, tutorNome, numeroVenda, date: new Date().toISOString() }, { rotulo: "Comanda" });
  }
  function irAoCaixa() {
    router.push(`/dashboard/erp/ponto-de-venda?tutorId=${tutorId || ""}&petId=${petId}`);
  }

  async function gerarOrcamento() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, itens: itens.map(linhaBody) }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento gerado ✅"); await limpar(); await loadOrcs(); setSub("ORC");
    } catch { toast.error("Erro ao gerar orçamento"); } finally { setSaving(false); }
  }
  async function converterOrc(id: string) {
    if (!confirm("Transformar este orçamento em venda? (cria a venda com os mesmos itens)")) return;
    try {
      const r = await fetch(`/api/orcamentos/${id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) throw new Error();
      toast.success("Orçamento transformado em venda ✅"); await loadOrcs();
      try { window.dispatchEvent(new Event("pet:venda")); } catch {} // avisa a ficha p/ recarregar Compras
    } catch { toast.error("Erro ao transformar em venda"); }
  }

  const nItens = itens.length;
  const statusTxt = !tutorId ? "sem tutor — não vai ao Caixa"
    : sync === "saving" ? "salvando no Caixa…"
    : sync === "error" ? "⚠️ erro ao salvar — mexa em algo p/ tentar de novo"
    : apptId ? `✓ No Caixa${numeroVenda ? ` · nº ${numeroVenda}` : ""} · a receber`
    : "vai pro Caixa ao adicionar itens";
  const statusCor = sync === "error" ? "#B23B39" : apptId ? "#0F6E56" : "#8A857A";

  // Botão flutuante (canto inferior direito)
  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} title="Abrir comanda"
        className="fixed z-40 flex items-center gap-2 text-white font-bold shadow-lg print:hidden hover:brightness-105 transition"
        style={{ right: 20, bottom: 20, background: "#009AAC", borderRadius: 999, padding: "12px 18px" }}>
        <LuShoppingCart size={18} />
        <span style={{ fontSize: 13 }}>Comanda{nItens ? ` (${nItens})` : ""}</span>
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
                      <button key={c.id} onClick={() => { const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor, custoPadrao: c.custoPadrao, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome }); addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: 1 }); setBusca(""); }} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                        <span className="text-[#1F2A2E] truncate pr-2 flex items-center gap-1.5 min-w-0"><span className="truncate">{c.nome}</span>{(() => { const lab = labDoItem(c); return lab ? <span className="shrink-0 text-[10px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}</span><span className="text-[#0F6E56] font-semibold shrink-0">{BRL(c.valor)}</span>
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
                  <div className="text-[12.5px] text-[#1F2A2E] truncate flex items-center gap-1.5">
                    <span className="truncate">{it.descricao}</span>
                    {(() => { const lab = labDoItem({ _exame: !!it.fornecedorNome, _fornecedorNome: it.fornecedorNome }); return lab ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}
                  </div>
                  <div className="text-[11px] text-gray-400">{BRL(it.valorUnitario)} cada</div>
                </div>
                <input type="number" min={1} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} className="w-11 border rounded text-center text-[12px] py-0.5" style={{ borderColor: "#E8DFC8" }} />
                <span className="text-[12.5px] font-semibold text-[#0F6E56] w-16 text-right tabular-nums">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                <button onClick={() => del(i)} className="text-[#b23b39]" title="Remover"><LuTrash size={13} /></button>
              </div>
            ))}
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: "#F0EBE0" }}>
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold text-[#014D5E]">Total</span>
              <span className="text-[16px] font-bold text-[#014D5E] tabular-nums">{BRL(total)}</span>
            </div>
            <div className="text-[10.5px] mb-2 mt-0.5" style={{ color: statusCor }}>{statusTxt}</div>
            <div className="flex gap-2">
              <button onClick={imprimirComanda} disabled={!itens.length} className="flex-1 border-2 rounded-lg py-2 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={13} /> Imprimir comanda</button>
              <button onClick={irAoCaixa} disabled={!itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }}>💰 Receber no Caixa</button>
            </div>
            <button onClick={gerarOrcamento} disabled={saving || !itens.length} className="w-full mt-2 border-2 rounded-lg py-1.5 text-[12px] font-semibold disabled:opacity-50" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#F0FBFC" }}>📄 Salvar como orçamento</button>
            {itens.length > 0 && <button onClick={limpar} className="w-full text-[11px] text-gray-400 mt-2">limpar comanda</button>}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-3">
          <button onClick={() => { setSub("VENDA"); setAddOpen(true); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Montar novo orçamento</button>
          <p className="text-[10.5px] text-gray-400 mb-3 mt-1 text-center">Adicione os itens na aba <b>🛒 Comanda</b> e clique <b>“📄 Salvar como orçamento”</b>.</p>
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
