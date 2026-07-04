"use client";
// [EMP-COWORK] Financeiro de Terceiros — automático dos exames dos pets (Listas petexa_) x catálogo (Cintia 07/06)
// Período por Mês ou Personalizado (de/até). Pago do lote é por fornecedor×mês (intpag_<fid>_<YYYYMM>).
// Roupagem repaginada 04/07 (Base44 delicada — bege + emojis) — LÓGICA 100% preservada.

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

// Paleta Base44 delicada (mesmos tokens do gabarito caixa/page.tsx)
const TEAL = "#009AAC";  // acento / botão primário
const NAVY = "#014D5E";  // títulos / texto forte
const CORAL = "#D85A30"; // saída / atenção
const GREEN = "#0f6e56"; // sucesso
const BG = "#F6F2EA";    // fundo da página
const SOFT = "#FBF9F4";  // caixinha suave
const TINT = "#E0F4F6";  // água
const LINE = "#E8E2D6";  // borda do cartão
const DIV = "#F0EBE0";   // divisória interna
const TXT = "#1F2A2E";   // corpo
const TXT2 = "#5C6B70";  // secundário
const TXT3 = "#8A989D";  // rótulo / dica

const dateInp: React.CSSProperties = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 9, padding: "6px 8px", fontSize: 11, color: TXT2, fontFamily: "inherit", outline: "none" };

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
    <div style={{ background: BG, minHeight: "100%" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 9, overflow: "hidden" }}>
              <button onClick={() => setModo("mes")} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, border: "none", borderRight: `1px solid ${LINE}`, cursor: "pointer", ...(modo === "mes" ? { background: TEAL, color: "#fff" } : { background: "#fff", color: TXT2 }) }}>Mês</button>
              <button onClick={() => setModo("custom")} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", ...(modo === "custom" ? { background: TEAL, color: "#fff" } : { background: "#fff", color: TXT2 }) }}>Personalizado</button>
            </div>
            {modo === "mes" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 9, padding: "2px 6px" }}>
                <button onClick={prevMes} aria-label="Mês anterior" style={{ border: "none", background: "none", cursor: "pointer", color: NAVY, fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>‹</button>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: NAVY, minWidth: 110, textAlign: "center" }}>{MESES[ref.m]} {ref.y}</span>
                <button onClick={nextMes} aria-label="Próximo mês" style={{ border: "none", background: "none", cursor: "pointer", color: NAVY, fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>›</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>📅</span>
                <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} style={dateInp} />
                <span style={{ fontSize: 11, color: TXT3 }}>até</span>
                <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} style={dateInp} />
              </div>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: TXT3, display: "inline-flex", alignItems: "center", gap: 5 }}><span>🤝</span>Automático — puxado dos exames dos pets</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-5">
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: TXT3 }}>Receita</div><div style={{ fontSize: 19, fontWeight: 500, color: GREEN }}>{fmtBRL(kpis.receita)}</div></div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: TXT3 }}>Custo</div><div style={{ fontSize: 19, fontWeight: 500, color: CORAL }}>{fmtBRL(kpis.custo)}</div></div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: TXT3 }}>Margem</div><div style={{ fontSize: 19, fontWeight: 500, color: TEAL }}>{fmtBRL(kpis.margem)}</div></div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: TXT3 }}>A pagar</div><div style={{ fontSize: 19, fontWeight: 500, color: NAVY }}>{fmtBRL(kpis.aPagar)}</div></div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: TXT3 }}>Top fornecedor</div><div style={{ fontSize: 15, fontWeight: 500, color: NAVY }}>{kpis.topNome}</div><div style={{ fontSize: 11, color: TXT3 }}>{fmtBRL(kpis.topVal)}</div></div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map((t) => { const n = grupos.filter((g) => (fornById[g.fid]?.modeloPagamento || "LOTE_MENSAL") === t.k).length; return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 999, cursor: "pointer", ...(tab === t.k ? { background: TEAL, color: "#fff", border: `1px solid ${TEAL}` } : { background: "#fff", color: TXT2, border: `1px solid ${LINE}` }) }}>{t.label} ({n})</button>
          ); })}
        </div>

        {loading ? (
          <div style={{ padding: "64px 24px", textAlign: "center", fontSize: 14, color: TXT3 }}>Carregando...</div>
        ) : (modo === "custom" && !customIni && !customFim) ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", fontSize: 14, color: TXT3 }}>Escolha as datas do período acima.</div>
        ) : gruposTab.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", fontSize: 14, color: TXT3 }}>Nenhum serviço de terceiros neste período/modo.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {gruposTab.map((g) => {
              const f = fornById[g.fid] || {}; const aberto = openCard === g.fid;
              return (
                <div key={g.fid} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                    <button onClick={() => setOpenCard(aberto ? null : g.fid)} style={{ flex: 1, minWidth: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", cursor: "pointer" }}>
                      <span style={{ fontSize: 12, color: TXT3, display: "inline-block", transition: "transform .2s", transform: aberto ? "rotate(180deg)" : "none" }}>▾</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: NAVY }}>{f.nome || "Fornecedor"} <span style={{ fontSize: 10, background: TINT, color: NAVY, padding: "2px 8px", borderRadius: 999, marginLeft: 4 }}>{MODELO_LABEL[f.modeloPagamento] || "Lote"}</span></span>
                        <span style={{ display: "block", fontSize: 11.5, color: TXT3 }}>{g.itens.length} serviços · fechamento dia {f.diaFechamentoLote || "—"} · {g.allPago ? <span style={{ color: GREEN }}>tudo pago</span> : <span style={{ color: CORAL }}>{g.pend} pendentes</span>}</span>
                      </span>
                    </button>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: TXT3 }}>A pagar</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: g.allPago ? GREEN : CORAL }}>{fmtBRL(g.pendCusto)}</div>
                    </div>
                    {g.allPago ? (
                      <button onClick={() => marcarPago(g)} title="Desfazer pagamento" style={{ fontSize: 11, color: GREEN, background: "#E1F5EE", border: "none", padding: "7px 12px", borderRadius: 9, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><span>✅</span>Pago</button>
                    ) : (
                      <button onClick={() => marcarPago(g)} style={{ fontSize: 11, color: "#fff", background: TEAL, border: "none", padding: "7px 12px", borderRadius: 9, cursor: "pointer" }}>Marcar pago</button>
                    )}
                  </div>
                  {aberto && (
                    <div style={{ background: SOFT, borderTop: `1px solid ${DIV}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 0.6fr 0.7fr 0.7fr", gap: 8, padding: "8px 16px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".03em", color: TXT3, fontWeight: 500, borderBottom: `1px solid ${DIV}` }}>
                        <span>Pet / Tutor</span><span>Exame</span><span>Data</span><span style={{ textAlign: "right" }}>Custo</span><span style={{ textAlign: "right" }}>Status</span>
                      </div>
                      {g.itens.map((e: any) => { const pg = examPago(e); return (
                        <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr 0.6fr 0.7fr 0.7fr", gap: 8, padding: "8px 16px", fontSize: 12, color: TXT, alignItems: "center", borderBottom: `1px solid ${DIV}` }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.petName}{e.tutorName ? ` · ${e.tutorName}` : ""}</span>
                          <span style={{ color: TXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</span>
                          <span style={{ color: TXT2 }}>{fmtDia(e.date)}</span>
                          <span style={{ textAlign: "right" }}>{fmtBRL(e.custo)}</span>
                          <span style={{ textAlign: "right" }}><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, ...(pg ? { background: "#E1F5EE", color: GREEN } : { background: "#FCEBEB", color: "#A32D2D" }) }}>{pg ? "Pago" : "Pendente"}</span></span>
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
    </div>
  );
}
