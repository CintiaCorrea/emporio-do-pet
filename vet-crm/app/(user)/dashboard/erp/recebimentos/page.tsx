"use client";
// [EMP-COWORK] Recebimentos analítico (Vendas · Fase 3) — Resumo (KPIs + quebras) + Lista. Base44 + olhinho.
// Resumo: GET /api/caixa/recebimentos-resumo?from=&to=. Lista: GET /api/caixa/recebimentos?from=&to=.

import { useCallback, useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
const dh = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "—");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaBR = (s: string) => { try { const [y, m, dd] = s.split("-"); return `${dd}/${m}`; } catch { return s; } };

export default function RecebimentosPage() {
  usePageTitle("Recebimentos", "Análise dos recebimentos do caixa");
  const hoje = new Date(); const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [tab, setTab] = useState<"resumo" | "lista">("resumo");
  const [olho, setOlho] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, lst] = await Promise.all([
        fetch(`/api/caixa/recebimentos-resumo?from=${from}&to=${to}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`/api/caixa/recebimentos?from=${from}&to=${to}`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setResumo(res);
      setRows(Array.isArray(lst) ? lst : (lst.data || []));
    } catch {}
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const money = (v: number) => (olho ? brl(v) : "R$ •••");
  const k = resumo?.kpis || {};
  const KPIS = [
    { l: "💵 Baixas no dia da venda", v: k.noDia, c: "#0C447C" },
    { l: "⏳ Baixas posteriores", v: k.posteriores, c: "#8a6400" },
    { l: "🏦 Adiantamento (caução)", v: k.adiantamento, c: "#5C6B70" },
    { l: "✅ Receita total", v: k.receitaTotal, c: "#0F6E56" },
    { l: "🔴 Em aberto", v: k.emAberto, c: "#b23b39" },
  ];
  const Quebra = ({ titulo, dados }: { titulo: string; dados: any[] }) => (
    <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
      <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>{titulo}</div>
      {(!dados || dados.length === 0) ? (
        <div className="px-4 py-4 text-[12px] text-[#8A989D] text-center">Sem dados no período.</div>
      ) : (
        <table className="w-full text-[13px]">
          <tbody>
            {dados.map((d: any) => (
              <tr key={d.nome} className="border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                <td className="px-4 py-2 text-[#5C6B70]">{d.nome}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-[#014D5E]">{money(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-[13px] bg-white" style={{ borderColor: "#E8E2D6" }} />
        <span className="text-[#8A989D] text-[12px]">a</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-[13px] bg-white" style={{ borderColor: "#E8E2D6" }} />
        <button onClick={load} className="text-[12.5px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg">🔍 Consultar</button>
        <button onClick={() => setOlho((v) => !v)} className="ml-auto text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
      </div>

      <div className="flex gap-1 border-b mb-4" style={{ borderColor: "#E8E2D6" }}>
        {(["resumo", "lista"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="text-[12.5px] px-3.5 py-2 -mb-px border-b-2" style={tab === t ? { color: "#014D5E", borderColor: "#009AAC", fontWeight: 500 } : { color: "#5C6B70", borderColor: "transparent" }}>{t === "resumo" ? "Resumo" : `Lista (${rows.length})`}</button>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#8A989D]">Carregando...</div>
      ) : tab === "resumo" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {KPIS.map((kp) => (
              <div key={kp.l} className="bg-white border rounded-xl px-3.5 py-3" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-[10.5px] text-[#8A989D] flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: kp.c }} />{kp.l}</div>
                <div className="text-[18px] font-medium tabular-nums text-[#014D5E] mt-1">{money(Number(kp.v) || 0)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Quebra titulo="💳 Por forma de recebimento" dados={resumo?.porForma} />
            <Quebra titulo="🧑 Por quem realizou a baixa" dados={resumo?.porUsuario} />
            <Quebra titulo="📅 Por dia" dados={(resumo?.porDia || []).map((d: any) => ({ nome: diaBR(d.nome), valor: d.valor }))} />
            <Quebra titulo="🏥 Por marca" dados={resumo?.porMarca} />
          </div>
        </>
      ) : (
        <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[13px] font-medium text-[#014D5E]">{rows.length} recebimento(s)</span>
            <span className="text-[12.5px] text-[#5C6B70]">Total <b className="text-[#014D5E]">{money(rows.reduce((s, r) => s + Number(r.valorTotal || 0), 0))}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide" style={{ background: "#FBF9F4" }}>
                <th className="text-left font-medium px-4 py-2.5">Data</th><th className="text-left font-medium px-3 py-2.5">Cliente · Pet</th><th className="text-left font-medium px-3 py-2.5">Formas</th><th className="text-right font-medium px-4 py-2.5">Valor</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-[#8A989D] text-[13px]">Nenhum recebimento no período.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-2.5 text-[#8A989D] whitespace-nowrap">{dh(r.data)}</td>
                    <td className="px-3 py-2.5 text-[#1F2A2E]">{r.appointment?.tutor?.name || "Cliente"} · {r.appointment?.pet?.name || "Pet"}</td>
                    <td className="px-3 py-2.5 text-[#8A989D]">{(r.formas || []).map((f: any) => f.forma).join(" + ") || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[#014D5E]">{money(Number(r.valorTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
