"use client";
// [EMP-COWORK] Vendas — gráficos (Vendas · Fase 3). FIEL ao mockup (CSS portado, prefixo vg-). Base44 + olhinho.
// Backend: GET /api/caixa/vendas-resumo?from=&to= (total/ticket + evolução bucketizada + por grupo/marca + top itens).

import { useCallback, useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MARCA: Record<string, { lbl: string; cls: string }> = {
  EMPORIO: { lbl: "🏥 Empório", cls: "e" }, MUNDO_A_PARTE: { lbl: "🌿 Mundo à Parte", cls: "m" }, DRA_VIVIAN: { lbl: "✨ Dra. Vivian", cls: "v" },
};
// Métricas do gráfico de evolução (BI Fatia 1)
const METRICAS: { k: string; l: string; money: boolean; v: (b: any) => number }[] = [
  { k: "LIQUIDA", l: "💰 Venda líquida", money: true, v: (b) => Number(b.liquido) || 0 },
  { k: "BRUTA", l: "Venda bruta", money: true, v: (b) => Number(b.bruto) || 0 },
  { k: "TICKET", l: "Ticket médio", money: true, v: (b) => (b.qtdVendas ? (Number(b.liquido) || 0) / b.qtdVendas : 0) },
  { k: "DESCONTO", l: "Descontos", money: true, v: (b) => Number(b.desconto) || 0 },
  { k: "QTDV", l: "Nº de vendas", money: false, v: (b) => Number(b.qtdVendas) || 0 },
  { k: "QTDI", l: "Nº de itens", money: false, v: (b) => Number(b.qtdItens) || 0 },
];
const GRUPOS: { k: string; l: string }[] = [{ k: "DIA", l: "Dia" }, { k: "SEMANA", l: "Semana" }, { k: "MES", l: "Mês" }];
const ORIGEM_LBL: Record<string, string> = { ORGANIC: "Orgânico", GOOGLE_ADS: "Google Ads", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", REFERRAL: "Indicação", LANDING_PAGE: "Landing page", WHATSAPP: "WhatsApp", EMAIL: "E-mail", DIRECT: "Direto", OTHER: "Outra" };

const CSS = `
.vg-wrap{width:100%;padding:2px 0 40px}
.vg-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.vg-print-h{display:none}
@media print{ .no-print{display:none!important} .vg-print-h{display:block;font-size:16px;font-weight:600;color:#014D5E;margin-bottom:10px} .vg-wrap{padding:0} }
.vg-in{border:1px solid #E8E2D6;border-radius:9px;padding:7px 10px;font-size:13px;background:#fff;color:#1F2A2E}
.vg-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.vg-btn.pri{background:#009AAC;border-color:#009AAC;color:#fff}
.vg-sub{font-size:12.5px;color:#374151;margin-bottom:14px}
.vg-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.vg-kpi{background:#fff;border:1px solid #E8E2D6;border-radius:12px;padding:12px 14px}
.vg-kpi .l{font-size:10.5px;color:#374151;text-transform:uppercase;letter-spacing:.3px}
.vg-kpi .v{font-size:22px;font-weight:500;color:#014D5E;margin-top:3px;font-variant-numeric:tabular-nums}
.vg-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden;margin-bottom:14px}
.vg-ch{padding:11px 15px;border-bottom:1px solid #F0EBE0;font-size:13px;font-weight:500;color:#014D5E}
.vg-cb{padding:14px 16px}
.vg-chart{display:flex;align-items:flex-end;gap:6px;height:130px}
.vg-chart .col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.vg-chart .b{width:100%;max-width:26px;background:#009AAC;border-radius:5px 5px 0 0;min-height:2px}
.vg-chart .x{font-size:9.5px;color:#374151}
.vg-seg{display:inline-flex;border:1px solid #E8E2D6;border-radius:9px;overflow:hidden}
.vg-segb{border:none;background:#fff;color:#5C6B70;padding:6px 12px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit}
.vg-segb.on{background:#E0F4F6;color:#014D5E}
.vg-chart .b .bv{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:9.5px;color:#33454A;white-space:nowrap;opacity:0}
.vg-chart .col:hover .bv{opacity:1}
.vg-split{display:flex;height:26px;border-radius:8px;overflow:hidden;margin-bottom:10px}
.vg-split .s{display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#fff;white-space:nowrap;min-width:0}
.vg-leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#5C6B70}.vg-leg b{color:#014D5E}
.vg-dot{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:5px;vertical-align:middle}
.vg-pct{color:#8A938F;font-weight:400;margin-left:5px;font-size:11px}
.vg-pill{font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;background:#E0F4F6;color:#00798A;margin-left:6px}
.vg-fld{display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:#5C6B70;font-weight:600}
.vg-fld .vg-in{font-weight:400;width:100%}
.vg-btn.pri.on{background:#00798A}
.vg-hbar{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.vg-hbar:last-child{margin-bottom:0}
.vg-hbar .nm{width:150px;font-size:12.5px;color:#5C6B70;flex-shrink:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vg-hbar .track{flex:1;background:#F0EBE0;border-radius:999px;height:16px;overflow:hidden}
.vg-hbar .fill{height:100%;background:#009AAC;border-radius:999px}
.vg-hbar .val{width:88px;text-align:right;font-size:12px;font-weight:500;color:#014D5E;font-variant-numeric:tabular-nums;flex-shrink:0}
.vg-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:680px){.vg-cols{grid-template-columns:1fr}}
.vg-tbl{width:100%;border-collapse:collapse;font-size:13px}
.vg-tbl td{padding:8px 14px;border-bottom:1px solid #F0EBE0}
.vg-tbl tr:last-child td{border-bottom:0}
.vg-tbl td.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:500;color:#014D5E}
.vg-hbar .nm.e .dummy,.vg-mk{width:150px}
.vg-fill.e{background:#009AAC}.vg-fill.m{background:#639922}.vg-fill.v{background:#7F77DD}
.vg-empty{padding:26px;text-align:center;color:#374151;font-size:13px}
`;

export default function VendasGraficosPage() {
  usePageTitle("Vendas — gráficos", "Como as vendas evoluem e de onde vêm");
  const hoje = new Date(); const ini = new Date(); ini.setDate(1);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [olho, setOlho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any>(null);
  const [metrica, setMetrica] = useState("LIQUIDA");
  const [grupo, setGrupo] = useState("MES");
  // Fatia 3a — filtros da venda/item
  const [fOpen, setFOpen] = useState(false);
  const [fProf, setFProf] = useState(""), [fProd, setFProd] = useState("");
  const [fGrupo, setFGrupo] = useState(""), [fMarca, setFMarca] = useState("");
  const [fTipo, setFTipo] = useState(""), [fTurno, setFTurno] = useState("");
  const [fHIni, setFHIni] = useState(""), [fHFim, setFHFim] = useState("");
  const [fPerfil, setFPerfil] = useState(""), [fNps, setFNps] = useState("");
  const [fOrigem, setFOrigem] = useState(""), [fCidade, setFCidade] = useState(""), [fBairro, setFBairro] = useState("");
  const [fCliente, setFCliente] = useState(""), [fPet, setFPet] = useState(""); // referência por nome do cliente/pet
  const [profs, setProfs] = useState<{ id: string; name: string }[]>([]);
  const [produtos, setProdutos] = useState<{ id: string; nome: string }[]>([]);
  const fAtivos = [fProf, fProd, fGrupo, fMarca, fTipo, fTurno, (fHIni || fHFim) ? "h" : "", fPerfil, fNps, fOrigem, fCidade, fBairro].filter(Boolean).length;
  const limparFiltros = () => { setFProf(""); setFProd(""); setFGrupo(""); setFMarca(""); setFTipo(""); setFTurno(""); setFHIni(""); setFHFim(""); setFPerfil(""); setFNps(""); setFOrigem(""); setFCidade(""); setFBairro(""); };

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" }).then((r) => r.json()).then((x) => { const a = Array.isArray(x) ? x : (x.users || x.data || []); setProfs(a.map((u: any) => ({ id: u.id, name: u.name || u.nome || u.email }))); }).catch(() => {});
    fetch("/api/servicos/itens", { cache: "no-store" }).then((r) => r.json()).then((x) => { const a = Array.isArray(x) ? x : (x.itens || x.data || []); setProdutos(a.map((s: any) => ({ id: s.id, nome: s.nome })).filter((s: any) => s.id && s.nome)); }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ from, to, groupBy: grupo });
      if (fProf) p.set("profissionalId", fProf);
      if (fProd) p.set("produtoId", fProd);
      if (fGrupo) p.set("grupo", fGrupo);
      if (fMarca) p.set("marca", fMarca);
      if (fTipo) p.set("tipo", fTipo);
      if (fTurno) p.set("turno", fTurno);
      if (fHIni) p.set("hIni", fHIni);
      if (fHFim) p.set("hFim", fHFim);
      if (fPerfil) p.set("perfil", fPerfil);
      if (fNps) p.set("nps", fNps);
      if (fOrigem) p.set("origem", fOrigem);
      if (fCidade) p.set("cidade", fCidade);
      if (fBairro) p.set("bairro", fBairro);
      if (fCliente.trim()) p.set("cliente", fCliente.trim());
      if (fPet.trim()) p.set("pet", fPet.trim());
      const r = await fetch(`/api/caixa/vendas-resumo?${p.toString()}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null); setD(r);
    } catch {}
    setLoading(false);
  }, [from, to, grupo, fProf, fProd, fGrupo, fMarca, fTipo, fTurno, fHIni, fHFim, fPerfil, fNps, fOrigem, fCidade, fBairro, fCliente, fPet]);
  useEffect(() => { const t = setTimeout(() => load(), 350); return () => clearTimeout(t); }, [load]); // debounce (texto do cliente/pet)

  const money = (v: number) => (olho ? brl(v) : "R$ •••");
  const met = METRICAS.find((m) => m.k === metrica) || METRICAS[0];
  const fmtMet = (v: number) => (met.money ? money(v) : (Number(v) || 0).toLocaleString("pt-BR"));
  const evol = d?.evolucao || [];
  const maxEvol = Math.max(1, ...evol.map((e: any) => met.v(e)));
  const totais = d?.totais || { liquido: d?.total || 0, qtdVendas: d?.count || 0, ticket: d?.ticket || 0, desconto: 0 };
  const grupos = d?.porGrupo || [];
  const maxGrupo = Math.max(1, ...grupos.map((g: any) => Number(g.valor) || 0));
  const marcas = d?.porMarca || [];
  const maxMarca = Math.max(1, ...marcas.map((m: any) => Number(m.valor) || 0));
  const somaGrupos = grupos.reduce((s: number, g: any) => s + (Number(g.valor) || 0), 0) || 1;
  const somaMarcas = marcas.reduce((s: number, m: any) => s + (Number(m.valor) || 0), 0) || 1;
  // Fatia 2 — quebras
  const turno = d?.porTurno || { MANHA: 0, TARDE: 0, NOITE: 0 };
  const turnoArr = [
    { l: "☀️ Manhã", v: Number(turno.MANHA) || 0, c: "#E0A100" },
    { l: "🌤️ Tarde", v: Number(turno.TARDE) || 0, c: "#009AAC" },
    { l: "🌙 Noite", v: Number(turno.NOITE) || 0, c: "#6A4FB0" },
  ];
  const maxTurno = Math.max(1, ...turnoArr.map((t) => t.v));
  const somaTurno = turnoArr.reduce((s, t) => s + t.v, 0) || 1;
  const ds: number[] = d?.porDiaSemana || [0, 0, 0, 0, 0, 0, 0];
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const maxDS = Math.max(1, ...ds.map((x) => Number(x) || 0));
  const melhorDia = Math.max(...ds) > 0 ? DIAS[ds.indexOf(Math.max(...ds))] : "—";
  const prodServ = d?.produtoServico || { servico: 0, produto: 0 };
  const vServ = Number(prodServ.servico) || 0, vProd = Number(prodServ.produto) || 0;
  const somaPS = vServ + vProd || 1;
  const pctServ = Math.round((vServ / somaPS) * 100);
  const pacotesTop = d?.pacotesTop || [];
  const semVendas = !loading && (!d || (Number(d.total) || 0) === 0);

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="vg-wrap">
        <div className="vg-sub no-print">Como as vendas evoluem e de onde vêm (grupo, marca, top itens). Valores ocultáveis pelo 👁️.</div>
        <div className="vg-print-h">Vendas — {from.split("-").reverse().join("/")} a {to.split("-").reverse().join("/")}</div>
        <div className="vg-bar no-print">
          <input className="vg-in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span style={{ color: "#374151" }}>a</span>
          <input className="vg-in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="vg-btn pri" onClick={load}>🔍 Consultar</button>
          <button className={`vg-btn${fAtivos ? " pri" : ""}`} onClick={() => setFOpen((v) => !v)}>🎛️ Filtros{fAtivos ? ` (${fAtivos})` : ""} {fOpen ? "▲" : "▾"}</button>
          <button className="vg-btn" style={{ marginLeft: "auto" }} onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
          <button className="vg-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
        </div>

        {fOpen && (
          <div className="vg-card no-print" style={{ borderColor: "#009AAC" }}>
            <div className="vg-ch">🎛️ Filtros <span style={{ marginLeft: "auto", fontWeight: 400, color: "#5C6B70", fontSize: 11.5 }}>aplica a todos os gráficos</span></div>
            <div className="vg-cb">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                <label className="vg-fld">👤 Profissional (vendedor)
                  <select className="vg-in" value={fProf} onChange={(e) => setFProf(e.target.value)}><option value="">Todos</option>{profs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                </label>
                <label className="vg-fld">Produto / serviço
                  <select className="vg-in" value={fProd} onChange={(e) => setFProd(e.target.value)}><option value="">Todos</option>{produtos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
                </label>
                <label className="vg-fld">Grupo
                  <select className="vg-in" value={fGrupo} onChange={(e) => setFGrupo(e.target.value)}><option value="">Todos</option>{(d?.opcoes?.grupos || []).map((g: string) => <option key={g} value={g}>{g}</option>)}</select>
                </label>
                <label className="vg-fld">Marca
                  <select className="vg-in" value={fMarca} onChange={(e) => setFMarca(e.target.value)}><option value="">Todas</option>{(d?.opcoes?.marcas || []).map((m: string) => <option key={m} value={m}>{MARCA[m]?.lbl || m}</option>)}</select>
                </label>
                <label className="vg-fld">Tipo de item
                  <select className="vg-in" value={fTipo} onChange={(e) => setFTipo(e.target.value)}><option value="">Todos</option><option value="SERVICO">Serviço</option><option value="PRODUTO">Produto</option></select>
                </label>
                <label className="vg-fld">Turno
                  <select className="vg-in" value={fTurno} onChange={(e) => setFTurno(e.target.value)}><option value="">Todos</option><option value="MANHA">☀️ Manhã</option><option value="TARDE">🌤️ Tarde</option><option value="NOITE">🌙 Noite</option></select>
                </label>
                <label className="vg-fld">Faixa de horário
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}><input className="vg-in" type="time" value={fHIni} onChange={(e) => setFHIni(e.target.value)} style={{ flex: 1 }} /><span style={{ color: "#5C6B70" }}>–</span><input className="vg-in" type="time" value={fHFim} onChange={(e) => setFHFim(e.target.value)} style={{ flex: 1 }} /></span>
                </label>
              </div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#8A938F", fontWeight: 700, margin: "14px 2px 8px" }}>Do cliente</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                <label className="vg-fld">👤 Cliente
                  <input className="vg-in" value={fCliente} onChange={(e) => setFCliente(e.target.value)} placeholder="Nome do cliente…" />
                </label>
                <label className="vg-fld">🐾 Pet
                  <input className="vg-in" value={fPet} onChange={(e) => setFPet(e.target.value)} placeholder="Nome do pet…" />
                </label>
                <label className="vg-fld">Perfil
                  <select className="vg-in" value={fPerfil} onChange={(e) => setFPerfil(e.target.value)}><option value="">Todos</option><option value="NOVOS">🆕 Novos</option><option value="RECORRENTES">🔁 Recorrentes</option></select>
                </label>
                <label className="vg-fld">⭐ NPS
                  <select className="vg-in" value={fNps} onChange={(e) => setFNps(e.target.value)}><option value="">Todos</option><option value="PROMOTOR">😍 Promotor</option><option value="NEUTRO">😐 Neutro</option><option value="DETRATOR">😞 Detrator</option></select>
                </label>
                <label className="vg-fld">🧲 Origem (captação)
                  <select className="vg-in" value={fOrigem} onChange={(e) => setFOrigem(e.target.value)}><option value="">Todas</option>{(d?.opcoes?.origens || []).map((o: string) => <option key={o} value={o}>{ORIGEM_LBL[o] || o}</option>)}</select>
                </label>
                <label className="vg-fld">Cidade
                  <select className="vg-in" value={fCidade} onChange={(e) => setFCidade(e.target.value)}><option value="">Todas</option>{(d?.opcoes?.cidades || []).map((c: string) => <option key={c} value={c}>{c}</option>)}</select>
                </label>
                <label className="vg-fld">Bairro
                  <select className="vg-in" value={fBairro} onChange={(e) => setFBairro(e.target.value)}><option value="">Todos</option>{(d?.opcoes?.bairros || []).map((b: string) => <option key={b} value={b}>{b}</option>)}</select>
                </label>
              </div>
              {fAtivos > 0 && <div style={{ marginTop: 10 }}><button className="vg-btn" onClick={limparFiltros}>Limpar filtros</button></div>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="vg-card"><div className="vg-empty">Carregando...</div></div>
        ) : semVendas ? (
          <div className="vg-card"><div className="vg-empty">📊 Sem vendas no período para gráficos.<br /><span style={{ fontSize: 12 }}>Conforme as vendas forem lançadas, os gráficos aparecem aqui.</span></div></div>
        ) : (
          <>
            <div className="vg-kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              <div className="vg-kpi"><div className="l">💰 Venda líquida</div><div className="v">{money(Number(totais.liquido) || 0)}</div></div>
              <div className="vg-kpi"><div className="l">🧾 Nº de vendas</div><div className="v">{totais.qtdVendas || 0}</div></div>
              <div className="vg-kpi"><div className="l">🎯 Ticket médio</div><div className="v">{money(Number(totais.ticket) || 0)}</div></div>
              <div className="vg-kpi"><div className="l">🏷️ Descontos</div><div className="v">{money(Number(totais.desconto) || 0)}</div></div>
            </div>

            <div className="vg-card">
              <div className="vg-ch" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span>📈 Evolução — {met.l.replace(/^💰 /, "")}</span>
                <select className="vg-in no-print" value={metrica} onChange={(e) => setMetrica(e.target.value)} style={{ marginLeft: "auto", padding: "6px 8px" }}>
                  {METRICAS.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
                </select>
                <div className="vg-seg no-print">
                  {GRUPOS.map((g) => <button key={g.k} onClick={() => setGrupo(g.k)} className={`vg-segb${grupo === g.k ? " on" : ""}`}>{g.l}</button>)}
                </div>
              </div>
              <div className="vg-cb">
                <div className="vg-chart" style={{ height: 180 }}>
                  {evol.length === 0 ? <div style={{ fontSize: 12, color: "#374151" }}>Sem dados no período.</div> : evol.map((e: any, i: number) => { const val = met.v(e); return (
                    <div className="col" key={i}><div className="b" style={{ position: "relative", height: `${Math.max(2, val / maxEvol * 100)}%` }} title={fmtMet(val)}><span className="bv">{fmtMet(val)}</span></div><div className="x">{e.label}</div></div>
                  ); })}
                </div>
              </div>
            </div>

            <div className="vg-cols">
              <div className="vg-card">
                <div className="vg-ch">🕐 Vendas por turno</div>
                <div className="vg-cb">
                  <div className="vg-chart" style={{ height: 130 }}>
                    {turnoArr.map((t) => (
                      <div className="col" key={t.l}><div className="b" style={{ position: "relative", height: `${Math.max(2, t.v / maxTurno * 100)}%`, background: t.c, maxWidth: 40 }} title={money(t.v)}><span className="bv">{money(t.v)}</span></div><div className="x">{t.l}</div></div>
                    ))}
                  </div>
                  <div className="vg-leg" style={{ marginTop: 12, justifyContent: "center" }}>{turnoArr.map((t) => <span key={t.l}>{t.l.split(" ")[1]} <b>{Math.round(t.v / somaTurno * 100)}%</b></span>)}</div>
                </div>
              </div>
              <div className="vg-card">
                <div className="vg-ch">📅 Vendas por dia da semana</div>
                <div className="vg-cb">
                  <div className="vg-chart" style={{ height: 130 }}>
                    {ds.map((v: number, i: number) => (
                      <div className="col" key={i}><div className="b" style={{ position: "relative", height: `${Math.max(2, (Number(v) || 0) / maxDS * 100)}%`, background: DIAS[i] === melhorDia ? "#00798A" : "#009AAC", maxWidth: 30 }} title={money(Number(v) || 0)}><span className="bv">{money(Number(v) || 0)}</span></div><div className="x">{DIAS[i]}</div></div>
                    ))}
                  </div>
                  <div className="vg-leg" style={{ marginTop: 12, justifyContent: "center" }}>Melhor dia: <b>{melhorDia}</b></div>
                </div>
              </div>
            </div>

            <div className="vg-card">
              <div className="vg-ch">🔀 Produto × Serviço</div>
              <div className="vg-cb">
                <div className="vg-split">
                  <div className="s" style={{ width: `${pctServ}%`, background: "#009AAC" }}>{pctServ >= 14 ? `Serviços ${pctServ}%` : ""}</div>
                  <div className="s" style={{ width: `${100 - pctServ}%`, background: "#0F6E56" }}>{100 - pctServ >= 14 ? `Produtos ${100 - pctServ}%` : ""}</div>
                </div>
                <div className="vg-leg"><span><span className="vg-dot" style={{ background: "#009AAC" }} />Serviços <b>{money(vServ)}</b></span><span><span className="vg-dot" style={{ background: "#0F6E56" }} />Produtos <b>{money(vProd)}</b></span></div>
              </div>
            </div>

            <div className="vg-cols">
              <div className="vg-card">
                <div className="vg-ch">🗂️ Vendas por grupo</div>
                <div className="vg-cb">
                  {grupos.length === 0 ? <div style={{ fontSize: 12, color: "#374151" }}>Sem dados.</div> : grupos.slice(0, 8).map((g: any) => (
                    <div className="vg-hbar" key={g.nome}><span className="nm">{g.nome}</span><div className="track"><div className="fill" style={{ width: `${(Number(g.valor) || 0) / maxGrupo * 100}%` }} /></div><span className="val">{money(Number(g.valor) || 0)}<small className="vg-pct">{Math.round((Number(g.valor) || 0) / somaGrupos * 100)}%</small></span></div>
                  ))}
                </div>
              </div>
              <div className="vg-card">
                <div className="vg-ch">🏥 Vendas por marca</div>
                <div className="vg-cb">
                  {marcas.length === 0 ? <div style={{ fontSize: 12, color: "#374151" }}>Sem dados.</div> : marcas.map((m: any) => { const info = MARCA[m.nome] || { lbl: m.nome, cls: "" }; return (
                    <div className="vg-hbar" key={m.nome}><span className="nm">{info.lbl}</span><div className="track"><div className={`fill ${info.cls}`} style={{ width: `${(Number(m.valor) || 0) / maxMarca * 100}%` }} /></div><span className="val">{money(Number(m.valor) || 0)}<small className="vg-pct">{Math.round((Number(m.valor) || 0) / somaMarcas * 100)}%</small></span></div>
                  ); })}
                </div>
              </div>
            </div>

            <div className="vg-card">
              <div className="vg-ch">🏆 Top serviços / produtos</div>
              <table className="vg-tbl"><tbody>
                {(d.topItens || []).length === 0 ? <tr><td className="vg-empty" colSpan={2}>Sem itens no período.</td></tr> : (d.topItens || []).map((t: any) => (
                  <tr key={t.nome}><td>{t.nome}</td><td className="r">{money(Number(t.valor) || 0)}</td></tr>
                ))}
              </tbody></table>
            </div>

            <div className="vg-card">
              <div className="vg-ch">📦 Pacotes mais vendidos</div>
              <table className="vg-tbl"><tbody>
                {pacotesTop.length === 0 ? <tr><td className="vg-empty" colSpan={2}>Sem pacotes no período.</td></tr> : pacotesTop.map((p: any) => (
                  <tr key={p.nome}><td>{p.nome}</td><td className="r">{p.qtd}<span className="vg-pill">vendidos</span></td></tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
