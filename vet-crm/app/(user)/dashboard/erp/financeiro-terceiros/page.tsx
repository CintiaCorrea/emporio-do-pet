"use client";
// [EMP-COWORK] Financeiro de Terceiros — automático dos exames dos pets (Listas petexa_) x catálogo (Cintia 07/06)
// Período por Mês ou Personalizado (de/até). Pago do lote é por fornecedor×mês (intpag_<fid>_<YYYYMM>).

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuChevronLeft, LuChevronRight, LuCheck, LuChevronDown } from "react-icons/lu";

const MODELO_LABEL: Record<string, string> = { LOTE_MENSAL: "Lote mensal", REPASSE_VIA_CLINICA: "Repasse", DIRETO_CLIENTE: "Direto" };
const TABS: { k: string; label: string }[] = [
  { k: "LOTE_MENSAL", label: "Lotes mensais" },
  { k: "REPASSE_VIA_CLINICA", label: "Repasses individuais" },
  { k: "DIRETO_CLIENTE", label: "Pagamento direto" },
];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const norm = (s: string) => (s || "").trim().toLowerCase();
const ymOf = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function FinanceiroTerceirosPage() {
  usePageTitle("Financeiro de Terceiros", "Pagamentos a laboratórios e parceiros");
  const [modo, setModo] = useState<"mes" | "custom">("mes");
  const [ref, setRef] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");
  const [tab, setTab] = useState("LOTE_MENSAL");
  const [loading, setLoading] = useState(true);
  const [listas, setListas] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [openCard, setOpenCard] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [l, c, f, p] = await Promise.all([
        fetch("/api/listas").then((r) => r.json()).catch(() => []),
        fetch("/api/fornecedores/exames/lista").then((r) => r.json()).catch(() => []),
        fetch("/api/fornecedores").then((r) => r.json()).catch(() => []),
        fetch("/api/pets?limit=1000").then((r) => r.json()).catch(() => []),
      ]);
      setListas(Array.isArray(l) ? l : (l.itens || l.data || []));
      setCatalogo(Array.isArray(c) ? c : (c.exames || c.data || c.itens || []));
      setFornecedores(Array.isArray(f) ? f : (f.fornecedores || f.data || []));
      setPets(Array.isArray(p) ? p : (p.pets || p.data || []));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const catByNome = useMemo(() => { const m: Record<string, any> = {}; for (const e of catalogo) m[norm(e.nome)] = e; return m; }, [catalogo]);
  const fornById = useMemo(() => { const m: Record<string, any> = {}; for (const f of fornecedores) m[f.id] = f; return m; }, [fornecedores]);
  const petById = useMemo(() => { const m: Record<string, any> = {}; for (const p of pets) m[p.id] = p; return m; }, [pets]);
  const pagoSet = useMemo(() => new Set(listas.filter((x) => (x.lista || "").startsWith("intpag_")).map((x) => x.lista)), [listas]);
  const examPago = (e: any) => pagoSet.has(`intpag_${e.fornecedorId}_${ymOf(new Date(e.date))}`);

  const noPeriodo = (d: Date) => {
    if (modo === "mes") return d.getFullYear() === ref.y && d.getMonth() === ref.m;
    const ini = customIni ? new Date(customIni + "T00:00:00") : null;
    const fim = customFim ? new Date(customFim + "T23:59:59") : null;
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return !!(ini || fim);
  };

  const exames = useMemo(() => {
    const out: any[] = [];
    for (const it of listas) {
      const lista = it.lista || "";
      if (!lista.startsWith("petexa_")) continue;
      let d: any = {}; try { d = JSON.parse(it.valor); } catch {}
      if (!d.date) continue;
      const dt = new Date(d.date);
      if (!noPeriodo(dt)) continue;
      const cat = catByNome[norm(d.nome)];
      const fornecedorId = d.fornecedorId || cat?.fornecedorId || cat?.fornecedor?.id;
      if (!fornecedorId) continue;
      const custo = Number(d.custo ?? cat?.valorFornecedor) || 0;
      const valor = Number(d.valor ?? cat?.valorClienteSugerido) || 0;
      const petId = lista.replace("petexa_", "");
      const pet = petById[petId];
      out.push({ id: it.id, fornecedorId, nome: d.nome, date: d.date, custo, valor, petName: pet?.name || "Pet", tutorName: pet?.tutor?.name || "" });
    }
    return out;
  }, [listas, catByNome, petById, modo, ref, customIni, customFim]);

  const grupos = useMemo(() => {
    const g: Record<string, { fid: string; itens: any[]; custo: number; valor: number; pendCusto: number; pend: number; allPago: boolean }> = {};
    for (const e of exames) {
      if (!g[e.fornecedorId]) g[e.fornecedorId] = { fid: e.fornecedorId, itens: [], custo: 0, valor: 0, pendCusto: 0, pend: 0, allPago: true };
      const grp = g[e.fornecedorId]; grp.itens.push(e); grp.custo += e.custo; grp.valor += e.valor;
      if (!examPago(e)) { grp.pendCusto += e.custo; grp.pend += 1; grp.allPago = false; }
    }
    return Object.values(g);
  }, [exames, pagoSet]);

  const kpis = useMemo(() => {
    const receita = exames.reduce((s, e) => s + e.valor, 0);
    const custo = exames.reduce((s, e) => s + e.custo, 0);
    const aPagar = exames.filter((e) => !examPago(e)).reduce((s, e) => s + e.custo, 0);
    const top = grupos.slice().sort((a, b) => b.custo - a.custo)[0];
    return { receita, custo, margem: receita - custo, aPagar, topNome: top ? (fornById[top.fid]?.nome || "—") : "—", topVal: top?.custo || 0 };
  }, [exames, grupos, pagoSet, fornById]);

  const gruposTab = grupos.filter((g) => (fornById[g.fid]?.modeloPagamento || "LOTE_MENSAL") === tab);

  const marcarPago = async (g: any) => {
    const meses = [...new Set(g.itens.map((e: any) => ymOf(new Date(e.date))))] as string[];
    const keys = meses.map((m) => `intpag_${g.fid}_${m}`);
    try {
      if (g.allPago) {
        for (const k of keys) { const row = listas.find((x) => (x.lista || "") === k); if (row) await fetch(`/api/listas/${row.id}`, { method: "DELETE", credentials: "include" }); }
      } else {
        for (const k of keys) { if (!pagoSet.has(k)) await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: k, valor: JSON.stringify({ at: new Date().toISOString() }) }) }); }
      }
      load();
    } catch {}
  };
  const prevMes = () => setRef((r) => { const m = r.m - 1; return m < 0 ? { y: r.y - 1, m: 11 } : { y: r.y, m }; });
  const nextMes = () => setRef((r) => { const m = r.m + 1; return m > 11 ? { y: r.y + 1, m: 0 } : { y: r.y, m }; });
  const fmtDia = (s: string) => { try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border rounded-lg overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
            <button onClick={() => setModo("mes")} className="px-3 py-1.5 text-[11px] font-medium border-r" style={{ borderColor: "#d8d0bc", ...(modo === "mes" ? { background: "#009AAC", color: "#fff" } : { color: "#4d5a66" }) }}>Mês</button>
            <button onClick={() => setModo("custom")} className="px-3 py-1.5 text-[11px] font-medium" style={modo === "custom" ? { background: "#009AAC", color: "#fff" } : { color: "#4d5a66" }}>Personalizado</button>
          </div>
          {modo === "mes" ? (
            <div className="flex items-center gap-1.5 bg-white border rounded-lg px-1.5 py-1" style={{ borderColor: "#d8d0bc" }}>
              <button onClick={prevMes} className="p-1 rounded hover:bg-[#fdfaee]" aria-label="Mês anterior"><LuChevronLeft className="w-4 h-4 text-[#5b6470]" /></button>
              <span className="text-[12.5px] font-medium text-[#014D5E] min-w-[110px] text-center">{MESES[ref.m]} {ref.y}</span>
              <button onClick={nextMes} className="p-1 rounded hover:bg-[#fdfaee]" aria-label="Próximo mês"><LuChevronRight className="w-4 h-4 text-[#5b6470]" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} className="bg-white border rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#d8d0bc" }} />
              <span className="text-[11px] text-[#94a3b8]">até</span>
              <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className="bg-white border rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#d8d0bc" }} />
            </div>
          )}
        </div>
        <span className="text-[11.5px] text-[#94a3b8]">Automático — puxado dos exames dos pets</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-5">
        <div className="rounded-xl p-3" style={{ background: "#E1F5EE" }}><div className="text-[11px]" style={{ color: "#0F6E56" }}>Receita</div><div className="text-[19px] font-bold" style={{ color: "#0F6E56" }}>{fmtBRL(kpis.receita)}</div></div>
        <div className="rounded-xl p-3" style={{ background: "#FCEBEB" }}><div className="text-[11px]" style={{ color: "#A32D2D" }}>Custo</div><div className="text-[19px] font-bold" style={{ color: "#A32D2D" }}>{fmtBRL(kpis.custo)}</div></div>
        <div className="rounded-xl p-3" style={{ background: "#E6F6F8" }}><div className="text-[11px]" style={{ color: "#00798A" }}>Margem</div><div className="text-[19px] font-bold" style={{ color: "#00798A" }}>{fmtBRL(kpis.margem)}</div></div>
        <div className="rounded-xl p-3" style={{ background: "#FAEEDA" }}><div className="text-[11px]" style={{ color: "#854F0B" }}>A pagar</div><div className="text-[19px] font-bold" style={{ color: "#854F0B" }}>{fmtBRL(kpis.aPagar)}</div></div>
        <div className="rounded-xl p-3 bg-white border" style={{ borderColor: "#ece4d2" }}><div className="text-[11px] text-[#94a3b8]">Top fornecedor</div><div className="text-[15px] font-bold text-[#014D5E]">{kpis.topNome}</div><div className="text-[11px] text-[#94a3b8]">{fmtBRL(kpis.topVal)}</div></div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map((t) => { const n = grupos.filter((g) => (fornById[g.fid]?.modeloPagamento || "LOTE_MENSAL") === t.k).length; return (
          <button key={t.k} onClick={() => setTab(t.k)} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={tab === t.k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>{t.label} ({n})</button>
        ); })}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#94a3b8]">Carregando...</div>
      ) : (modo === "custom" && !customIni && !customFim) ? (
        <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#94a3b8]" style={{ borderColor: "#e8dfc8" }}>Escolha as datas do período acima.</div>
      ) : gruposTab.length === 0 ? (
        <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#94a3b8]" style={{ borderColor: "#e8dfc8" }}>Nenhum serviço de terceiros neste período/modo.</div>
      ) : (
        <div className="space-y-3">
          {gruposTab.map((g) => {
            const f = fornById[g.fid] || {}; const aberto = openCard === g.fid;
            return (
              <div key={g.fid} className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8dfc8" }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setOpenCard(aberto ? null : g.fid)} className="flex-1 min-w-0 text-left flex items-center gap-2">
                    <LuChevronDown className={`w-4 h-4 text-[#94a3b8] transition ${aberto ? "rotate-180" : ""}`} />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#0E2244]">{f.nome || "Fornecedor"} <span className="text-[10px] bg-[#E6F1FB] text-[#0C447C] px-2 py-0.5 rounded-full ml-1">{MODELO_LABEL[f.modeloPagamento] || "Lote"}</span></div>
                      <div className="text-[11.5px] text-[#888]">{g.itens.length} serviços · fechamento dia {f.diaFechamentoLote || "—"} · {g.allPago ? <span className="text-[#0F6E56]">tudo pago</span> : <span className="text-[#A32D2D]">{g.pend} pendentes</span>}</div>
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="text-[11px] text-[#94a3b8]">A pagar</div>
                    <div className="text-[15px] font-bold" style={{ color: g.allPago ? "#0F6E56" : "#854F0B" }}>{fmtBRL(g.pendCusto)}</div>
                  </div>
                  {g.allPago ? (
                    <button onClick={() => marcarPago(g)} title="Desfazer pagamento" className="text-[11px] text-[#0F6E56] bg-[#E1F5EE] px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><LuCheck className="w-3.5 h-3.5" />Pago</button>
                  ) : (
                    <button onClick={() => marcarPago(g)} className="text-[11px] text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">Marcar pago</button>
                  )}
                </div>
                {aberto && (
                  <div style={{ background: "#fbfaf6", borderTop: "1px solid #f4eede" }}>
                    <div className="grid grid-cols-[1.4fr_1.6fr_0.6fr_0.7fr_0.7fr] gap-2 px-4 py-2 text-[10px] uppercase text-[#94a3b8] border-b" style={{ borderColor: "#f4eede" }}>
                      <span>Pet / Tutor</span><span>Exame</span><span>Data</span><span className="text-right">Custo</span><span className="text-right">Status</span>
                    </div>
                    {g.itens.map((e: any) => { const pg = examPago(e); return (
                      <div key={e.id} className="grid grid-cols-[1.4fr_1.6fr_0.6fr_0.7fr_0.7fr] gap-2 px-4 py-2 text-[12px] text-[#0E2244] items-center border-b" style={{ borderColor: "#f4eede" }}>
                        <span className="truncate">{e.petName}{e.tutorName ? ` · ${e.tutorName}` : ""}</span>
                        <span className="text-[#5b6470] truncate">{e.nome}</span>
                        <span className="text-[#5b6470]">{fmtDia(e.date)}</span>
                        <span className="text-right">{fmtBRL(e.custo)}</span>
                        <span className="text-right"><span className="text-[10px] px-2 py-0.5 rounded-full" style={pg ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#FCEBEB", color: "#A32D2D" }}>{pg ? "Pago" : "Pendente"}</span></span>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
