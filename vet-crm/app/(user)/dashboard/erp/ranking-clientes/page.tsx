"use client";
// [EMP-COWORK] Ranking ABC de clientes (Vendas · Fase 3). FIEL ao mockup ranking-abc-mockup.html (CSS portado, prefixo rk-).
// Backend: GET /api/caixa/ranking-clientes (soma appointments com value>0, ranqueia, classifica pela % acumulada da receita).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
const cls = (c?: string) => (c === "A" ? "a" : c === "B" ? "b" : "c");

const CSS = `
.rk-wrap{width:100%;padding:2px 0 40px}
.rk-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.rk-search{flex:1;min-width:200px;border:1px solid #E8E2D6;border-radius:9px;padding:8px 12px;font-size:13px;background:#fff;color:#1F2A2E}
.rk-search:focus{outline:none;border-color:#009AAC}
.rk-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.rk-abc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.rk-k{border-radius:13px;padding:14px 16px;border:1px solid transparent}
.rk-k.a{background:#E7F6EE;border-color:#c9ecd8;color:#1c7a47}.rk-k.b{background:#E6F1FB;border-color:#cfe0f2;color:#0C447C}.rk-k.c{background:#FBF3E3;border-color:#efe1c2;color:#8a6400}
.rk-k .n{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums}
.rk-k .l{font-size:12px;opacity:.9;margin-top:3px}
.rk-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.rk-scroll{overflow-x:auto}
.rk-tbl{width:100%;border-collapse:collapse;font-size:13px}
.rk-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#8A989D;font-weight:500;padding:10px 12px;border-bottom:1px solid #E8E2D6;white-space:nowrap;background:#FBF9F4}
.rk-tbl td{padding:10px 12px;border-bottom:1px solid #F0EBE0;white-space:nowrap}
.rk-tbl td.r,.rk-tbl th.r{text-align:right;font-variant-numeric:tabular-nums}
.rk-tbl tr:last-child td{border-bottom:0}
.rk-pos{color:#8A989D;font-variant-numeric:tabular-nums}
.rk-nm{font-size:14px;font-weight:500;color:#014D5E;text-decoration:none}
.rk-nm:hover{text-decoration:underline}
.rk-pets{font-size:11.5px;color:#8A989D}
.rk-cl{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px}
.rk-cl.a{background:#E1F5EE;color:#0F6E56}.rk-cl.b{background:#E6F1FB;color:#0C447C}.rk-cl.c{background:#FBEFE0;color:#B45309}
.rk-empty{padding:56px 24px;text-align:center;color:#5C6B70}
`;

export default function RankingClientesPage() {
  usePageTitle("Ranking de clientes", "Quem mais compra. A curva ABC mostra que poucos clientes (A) fazem a maior parte das vendas.");
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>({ A: { count: 0, pct: 0 }, B: { count: 0, pct: 0 }, C: { count: 0, pct: 0 } });
  const [olho, setOlho] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/caixa/ranking-clientes").then((r) => r.json()).catch(() => null);
        setClientes(Array.isArray(d?.clientes) ? d.clientes : []);
        if (d?.resumo) setResumo(d.resumo);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const money = (v: number) => (olho ? fmtBRL(v) : "R$ •••");
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? clientes.filter((c) => (c.nome || "").toLowerCase().includes(q)) : clientes;
  }, [clientes, busca]);

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="rk-wrap">
        <div className="rk-bar">
          <input className="rk-search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar cliente…" />
          <button className="rk-btn" onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
        </div>

        <div className="rk-abc">
          {(["A", "B", "C"] as const).map((c) => (
            <div key={c} className={`rk-k ${cls(c)}`}>
              <div className="n">{resumo[c]?.count ?? 0}</div>
              <div className="l">Clientes {c} · {resumo[c]?.pct ?? 0}% das vendas</div>
            </div>
          ))}
        </div>

        <div className="rk-card">
          {loading ? (
            <div className="rk-empty">Carregando ranking…</div>
          ) : lista.length === 0 ? (
            <div className="rk-empty"><div style={{ fontSize: 30, marginBottom: 6 }}>🏆</div>Sem vendas nos últimos 12 meses para ranquear.<div style={{ fontSize: 12, color: "#8A989D", marginTop: 4 }}>Quando houver vendas registradas, o ranking aparece aqui.</div></div>
          ) : (
            <div className="rk-scroll">
              <table className="rk-tbl">
                <thead><tr><th>#</th><th>Cliente</th><th>Classe</th><th className="r">365 dias</th><th className="r">90 dias</th><th className="r">30 dias</th></tr></thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.tutorId}>
                      <td className="rk-pos">{c.posicao}º</td>
                      <td>
                        <Link href={`/dashboard/erp/tutores/${c.tutorId}`} className="rk-nm">{c.nome}</Link>
                        <div className="rk-pets">{(c.pets || []).slice(0, 4).map((p: any) => `${especieEmoji(p.s)} ${p.n}`).join(" · ")}{(c.pets || []).length > 4 ? "…" : ""}</div>
                      </td>
                      <td><span className={`rk-cl ${cls(c.classe)}`}>{c.classe}</span></td>
                      <td className="r">{money(c.total365)}</td>
                      <td className="r">{money(c.total90)}</td>
                      <td className="r">{money(c.total30)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
