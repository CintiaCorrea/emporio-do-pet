"use client";
// [EMP-COWORK] Ranking ABC de clientes (Vendas · Fase 3 relatórios). Gasto 365/90/30 dias + classe A/B/C.
// Backend: GET /api/caixa/ranking-clientes (soma appointments com value>0, ranqueia, classifica pela % acumulada da receita).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const CLASSE: Record<string, { bg: string; fg: string; card: string }> = {
  A: { bg: "#E1F5EE", fg: "#0F6E56", card: "#0F6E56" },
  B: { bg: "#E6F1FB", fg: "#0C447C", card: "#0C447C" },
  C: { bg: "#FBEFE0", fg: "#B45309", card: "#B45309" },
};
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }

export default function RankingClientesPage() {
  usePageTitle("Ranking de clientes", "Curva ABC — quem mais compra");
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="text-[12.5px] text-[#8A989D] mb-3">Quem mais compra. A curva ABC mostra que poucos clientes (A) fazem a maior parte das vendas (últimos 12 meses).</div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar cliente…" className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
        <button onClick={() => setOlho((v) => !v)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(["A", "B", "C"] as const).map((c) => (
          <div key={c} className="bg-white border rounded-xl px-4 py-3.5" style={{ borderColor: "#E8E2D6" }}>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: CLASSE[c].fg }} />
              <span className="text-[10.5px] uppercase tracking-wide text-[#8A989D]">Clientes {c}</span>
            </div>
            <div className="text-[22px] font-medium tabular-nums text-[#014D5E] mt-1">{resumo[c]?.count ?? 0}</div>
            <div className="text-[11px] text-[#8A989D]">{resumo[c]?.pct ?? 0}% das vendas</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#8A989D]">Carregando ranking...</div>
      ) : clientes.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-sm text-[#5C6B70]">Sem vendas nos últimos 12 meses para ranquear.</div>
          <div className="text-[12px] text-[#8A989D] mt-1">Quando houver vendas registradas, o ranking aparece aqui.</div>
        </div>
      ) : (
        <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide" style={{ background: "#FBF9F4" }}>
                <th className="text-left font-medium px-3 py-2.5">#</th><th className="text-left font-medium px-3 py-2.5">Cliente</th><th className="text-left font-medium px-2 py-2.5">Classe</th><th className="text-right font-medium px-3 py-2.5">365 dias</th><th className="text-right font-medium px-3 py-2.5">90 dias</th><th className="text-right font-medium px-3 py-2.5">30 dias</th>
              </tr></thead>
              <tbody>
                {lista.map((c) => { const cl = CLASSE[c.classe] || CLASSE.C; return (
                  <tr key={c.tutorId} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-3 py-2.5 text-[#8A989D] tabular-nums">{c.posicao}º</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/dashboard/erp/tutores/${c.tutorId}`} className="text-[14px] font-medium text-[#014D5E] hover:underline">{c.nome}</Link>
                      <div className="text-[11px] text-[#8A989D] truncate max-w-[280px]">{(c.pets || []).slice(0, 4).map((p: any) => `${especieEmoji(p.s)} ${p.n}`).join(" · ")}{(c.pets || []).length > 4 ? "…" : ""}</div>
                    </td>
                    <td className="px-2 py-2.5"><span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: cl.bg, color: cl.fg }}>{c.classe}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#014D5E]">{money(c.total365)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#5C6B70]">{money(c.total90)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#5C6B70]">{money(c.total30)}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
