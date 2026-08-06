"use client";
// [EMP-COWORK] Relacionamento (RFM) — Inteligência. Níveis + segmentos RFM + key accounts.
// Backend: GET /api/caixa/rfm (Recência-Frequência-Monetário em lote, mesmo score da ficha).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const nf = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);

const NIVEL: Record<string, { emoji: string; bg: string; fg: string; bar: string }> = {
  Diamante: { emoji: "💎", bg: "#EDE9FA", fg: "#3C3489", bar: "#7F77DD" },
  Ouro: { emoji: "🥇", bg: "#FBEFD6", fg: "#8A5A0B", bar: "#E0A100" },
  Prata: { emoji: "🥈", bg: "#EEF1F3", fg: "#49555C", bar: "#9AA5AD" },
  Bronze: { emoji: "🥉", bg: "#F6E7D8", fg: "#7A4A1E", bar: "#B87333" },
};
const SEG: Record<string, { emoji: string; hint: string; cor: string }> = {
  "Campeões": { emoji: "🏆", hint: "Recentes, frequentes e gastam muito — blinde!", cor: "#0F6E56" },
  "Fiéis": { emoji: "💚", hint: "Voltam sempre — mantenha o vínculo", cor: "#1B9E5A" },
  "Promissores": { emoji: "🌱", hint: "Vieram há pouco — desenvolva", cor: "#009AAC" },
  "Precisam de atenção": { emoji: "👀", hint: "Bons clientes esfriando", cor: "#D9A400" },
  "Regulares": { emoji: "•", hint: "Comportamento médio", cor: "#6b7e83" },
  "Em risco": { emoji: "⚠️", hint: "Já foram valiosos e sumindo — reative", cor: "#D9A400" },
  "Hibernando": { emoji: "😴", hint: "Sem vir e baixa frequência", cor: "#C0392B" },
};

const CSS = `
.re-wrap{width:100%;padding:2px 0 40px}
.re-bar{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.re-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.re-niveis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
@media(max-width:680px){.re-niveis{grid-template-columns:repeat(2,1fr)}}
.re-nk{border-radius:13px;padding:14px 16px;border:1px solid transparent}
.re-nk .top{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700}
.re-nk .n{font-size:26px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:6px}
.re-nk .l{font-size:11.5px;opacity:.85;margin-top:2px}
.re-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden;margin-bottom:16px}
.re-h{padding:13px 16px;border-bottom:1px solid #F0EBE0;font-size:13.5px;font-weight:600;color:#014D5E}
.re-seg{display:flex;flex-direction:column;gap:10px;padding:14px 16px}
.re-srow{display:flex;align-items:center;gap:12px}
.re-srow .ico{width:26px;text-align:center;font-size:15px;flex:0 0 auto}
.re-srow .info{flex:1;min-width:0}
.re-srow .info .nm{font-size:13.5px;font-weight:600;color:#1F2A2E}
.re-srow .info .ht{font-size:11.5px;color:#6b7e83}
.re-srow .barwrap{flex:2;min-width:80px;max-width:340px}
.re-srow .barwrap .bar{height:9px;border-radius:6px;background:#eef2f3;overflow:hidden}
.re-srow .barwrap .bar i{display:block;height:100%;border-radius:6px}
.re-srow .num{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;min-width:44px;text-align:right}
.re-srow .val{font-size:11.5px;color:#6b7e83;min-width:92px;text-align:right;font-variant-numeric:tabular-nums}
.re-scroll{overflow-x:auto}
.re-tbl{width:100%;border-collapse:collapse;font-size:13px}
.re-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:500;padding:10px 12px;border-bottom:1px solid #E8E2D6;white-space:nowrap;background:#FBF9F4}
.re-tbl td{padding:10px 12px;border-bottom:1px solid #F0EBE0;white-space:nowrap}
.re-tbl td.r,.re-tbl th.r{text-align:right;font-variant-numeric:tabular-nums}
.re-tbl tr:last-child td{border-bottom:0}
.re-nm{font-size:13.5px;font-weight:500;color:#014D5E;text-decoration:none}.re-nm:hover{text-decoration:underline}
.re-pill{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px}
.re-rfm{font-variant-numeric:tabular-nums;font-size:12px;color:#374151;letter-spacing:1px}
.re-note{font-size:12px;color:#6b7e83;margin-top:14px;line-height:1.6}
.re-empty{padding:40px 24px;text-align:center;color:#5C6B70}
.re-print-h{display:none}
@media print{.no-print{display:none!important}.re-print-h{display:block;font-size:16px;font-weight:600;color:#014D5E;margin-bottom:10px}.re-wrap{padding:0}}
`;

export default function RelacionamentoPage() {
  usePageTitle("Relacionamento (RFM)", "Quem são seus melhores clientes por Recência, Frequência e quanto gastam. Os 💎 e 🥇 são seus key accounts — os 20% para blindar.");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [olho, setOlho] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await fetch("/api/caixa/rfm").then((r) => r.json()).catch(() => null)); } catch {}
      setLoading(false);
    })();
  }, []);

  const money = (v: number) => (olho ? fmtBRL(v) : "R$ •••");
  const niveis: any[] = data?.niveis || [];
  const segmentos: any[] = data?.segmentos || [];
  const keyAccounts: any[] = data?.keyAccounts || [];
  const total = data?.total || 0;
  const maxSeg = Math.max(1, ...segmentos.map((s) => s.n));

  if (loading) return <div className="p-6"><div className="re-empty">Carregando…</div></div>;

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="re-wrap">
        <div className="re-print-h">Relacionamento (RFM) — {new Date().toLocaleDateString("pt-BR")}</div>
        <div className="re-bar no-print">
          <button className="re-btn" onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
          <button className="re-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
        </div>

        {/* Níveis de relacionamento */}
        <div className="re-niveis">
          {["Diamante", "Ouro", "Prata", "Bronze"].map((k) => {
            const it = niveis.find((n) => n.key === k) || { n: 0, valor: 0 };
            const meta = NIVEL[k];
            const pct = total ? Math.round((it.n / total) * 100) : 0;
            return (
              <div key={k} className="re-nk" style={{ background: meta.bg, color: meta.fg, borderColor: meta.bar + "55" }}>
                <div className="top">{meta.emoji} {k}</div>
                <div className="n">{nf(it.n)}</div>
                <div className="l">{pct}% dos clientes · {money(it.valor)}</div>
              </div>
            );
          })}
        </div>

        {/* Segmentos RFM */}
        <div className="re-card">
          <div className="re-h">🎯 Segmentos de comportamento (RFM)</div>
          <div className="re-seg">
            {segmentos.length === 0 ? <div className="re-empty">Sem dados suficientes.</div> : segmentos.map((s) => {
              const meta = SEG[s.key] || { emoji: "•", hint: "", cor: "#6b7e83" };
              return (
                <div className="re-srow" key={s.key}>
                  <span className="ico">{meta.emoji}</span>
                  <div className="info"><div className="nm">{s.key}</div><div className="ht">{meta.hint}</div></div>
                  <div className="barwrap"><div className="bar"><i style={{ width: `${Math.round((s.n / maxSeg) * 100)}%`, background: meta.cor }} /></div></div>
                  <span className="num" style={{ color: meta.cor }}>{nf(s.n)}</span>
                  <span className="val">{money(s.valor)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key accounts */}
        <div className="re-card">
          <div className="re-h">👑 Key accounts — seus 💎 Diamante e 🥇 Ouro (blindar)</div>
          <div className="re-scroll">
            {keyAccounts.length === 0 ? <div className="re-empty">Nenhum key account ainda.</div> : (
              <table className="re-tbl">
                <thead><tr><th>Cliente</th><th>Nível</th><th>Segmento</th><th>RFM</th><th className="r">Visitas</th><th className="r">Última visita</th><th className="r">Total gasto</th></tr></thead>
                <tbody>
                  {keyAccounts.map((k) => {
                    const meta = NIVEL[k.nivel];
                    return (
                      <tr key={k.tutorId}>
                        <td><Link href={`/dashboard/erp/tutores/${k.tutorId}`} className="re-nm">{k.nome}</Link></td>
                        <td><span className="re-pill" style={{ background: meta.bg, color: meta.fg }}>{meta.emoji} {k.nivel}</span></td>
                        <td style={{ fontSize: 12, color: "#374151" }}>{k.segmento}</td>
                        <td><span className="re-rfm">{k.r}{k.f}{k.m}</span></td>
                        <td className="r">{nf(k.freq)}</td>
                        <td className="r">{k.recDias === 0 ? "hoje" : `há ${nf(k.recDias)}d`}</td>
                        <td className="r">{money(k.valor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="re-note">
          <b>RFM</b> = <b>R</b>ecência (há quanto tempo veio), <b>F</b>requência (quantas vezes) e <b>M</b>onetário (quanto gastou), cada um de 1 a 5. O <b>nível</b> (💎🥇🥈🥉) é o mesmo da ficha do cliente e agora usa o <b>gasto real</b> (antes vinha zerado). Os <b>Campeões / Diamante / Ouro</b> são os que valem blindar — pouca gente que traz a maior parte da receita.
        </div>
      </div>
    </div>
  );
}
