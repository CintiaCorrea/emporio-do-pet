"use client";
// [EMP-COWORK] Retenção & Churn (Inteligência). Recorte CLÍNICO vs FISIOTERAPIA por recência.
// Backend: GET /api/caixa/retencao (última visita por cliente/linha; churn de pacotes de fisio).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const nf = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);

type Bucket = { n: number; valor: number };
type Linha = { total: number; ativos: Bucket; risco: Bucket; inativos: Bucket };

const CSS = `
.rt-wrap{width:100%;padding:2px 0 40px}
.rt-bar{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.rt-btn{border:1px solid #E8E2D6;background:#fff;color:#5C6B70;border-radius:9px;padding:8px 12px;font-size:12.5px;cursor:pointer;font-weight:500}
.rt-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:16px}
@media(max-width:820px){.rt-grid2{grid-template-columns:1fr}}
.rt-col{background:#fff;border:1px solid #E8E2D6;border-radius:14px;padding:16px 18px}
.rt-col h3{margin:0 0 2px;font-size:15px;color:#014D5E;display:flex;align-items:center;gap:8px}
.rt-col .sub{font-size:12px;color:#6b7e83;margin-bottom:12px}
.rt-stack{display:flex;height:12px;border-radius:7px;overflow:hidden;background:#eef2f3;margin:6px 0 14px}
.rt-stack i{display:block;height:100%}
.rt-rows{display:flex;flex-direction:column;gap:9px}
.rt-row{display:flex;align-items:center;gap:10px}
.rt-dot{width:11px;height:11px;border-radius:3px;flex:0 0 auto}
.rt-row .lab{font-size:13px;color:#1F2A2E;flex:1;min-width:0}
.rt-row .lab small{color:#6b7e83}
.rt-row .num{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.rt-row .val{font-size:11.5px;color:#6b7e83;min-width:88px;text-align:right;font-variant-numeric:tabular-nums}
.rt-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
@media(max-width:680px){.rt-kpis{grid-template-columns:1fr}}
.rt-k{border-radius:13px;padding:14px 16px;border:1px solid #E8E2D6;background:#fff}
.rt-k .n{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;color:#0E2244}
.rt-k .l{font-size:12px;color:#6b7e83;margin-top:3px}
.rt-k.warn{background:#FBF3E3;border-color:#efe1c2}.rt-k.warn .n{color:#8a6400}
.rt-k.bad{background:#FDEDED;border-color:#f3d2d2}.rt-k.bad .n{color:#B00000}
.rt-pac{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
@media(max-width:680px){.rt-pac{grid-template-columns:repeat(2,1fr)}}
.rt-pac .c{background:#F7FBFC;border:1px solid #E8E2D6;border-radius:11px;padding:11px 12px;text-align:center}
.rt-pac .c .n{font-size:20px;font-weight:600;color:#014D5E;font-variant-numeric:tabular-nums}
.rt-pac .c .l{font-size:11px;color:#6b7e83;margin-top:2px}
.rt-card{background:#fff;border:1px solid #E8E2D6;border-radius:14px;overflow:hidden}
.rt-h{padding:13px 16px;border-bottom:1px solid #F0EBE0;font-size:13.5px;font-weight:600;color:#014D5E}
.rt-scroll{overflow-x:auto}
.rt-tbl{width:100%;border-collapse:collapse;font-size:13px}
.rt-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#374151;font-weight:500;padding:10px 12px;border-bottom:1px solid #E8E2D6;white-space:nowrap;background:#FBF9F4}
.rt-tbl td{padding:10px 12px;border-bottom:1px solid #F0EBE0;white-space:nowrap}
.rt-tbl td.r,.rt-tbl th.r{text-align:right;font-variant-numeric:tabular-nums}
.rt-tbl tr:last-child td{border-bottom:0}
.rt-nm{font-size:13.5px;font-weight:500;color:#014D5E;text-decoration:none}.rt-nm:hover{text-decoration:underline}
.rt-tag{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px}
.rt-tag.cl{background:#E6F1FB;color:#0C447C}.rt-tag.fi{background:#E1F5EE;color:#0F6E56}
.rt-note{font-size:12px;color:#6b7e83;margin-top:14px;line-height:1.6}
.rt-empty{padding:40px 24px;text-align:center;color:#5C6B70}
.rt-print-h{display:none}
@media print{.no-print{display:none!important}.rt-print-h{display:block;font-size:16px;font-weight:600;color:#014D5E;margin-bottom:10px}.rt-wrap{padding:0}}
`;

const COR = { ativo: "#1B9E5A", risco: "#D9A400", inativo: "#C0392B" };

function ColunaLinha({ titulo, emoji, linha, money }: { titulo: string; emoji: string; linha: Linha; money: (v: number) => string }) {
  const total = linha.total || 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const retencao = pct(linha.ativos.n);
  return (
    <div className="rt-col">
      <h3>{emoji} {titulo}</h3>
      <div className="sub">{nf(total)} cliente(s) com histórico · <b style={{ color: COR.ativo }}>{retencao}% ativos</b></div>
      <div className="rt-stack">
        <i style={{ width: `${pct(linha.ativos.n)}%`, background: COR.ativo }} />
        <i style={{ width: `${pct(linha.risco.n)}%`, background: COR.risco }} />
        <i style={{ width: `${pct(linha.inativos.n)}%`, background: COR.inativo }} />
      </div>
      <div className="rt-rows">
        {([["Ativos", "até 90 dias", linha.ativos, COR.ativo],
           ["Em risco", "91 a 180 dias", linha.risco, COR.risco],
           ["Inativos", "mais de 180 dias", linha.inativos, COR.inativo]] as const).map(([lab, hint, b, cor]) => (
          <div className="rt-row" key={lab}>
            <span className="rt-dot" style={{ background: cor }} />
            <span className="lab">{lab} <small>· {hint}</small></span>
            <span className="num" style={{ color: cor }}>{nf(b.n)}</span>
            <span className="val">{money(b.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RetencaoPage() {
  usePageTitle("Retenção e Churn", "Quem está ativo, esfriando ou já sumiu — separado por Clínica e Fisioterapia. A base para reativar antes de perder.");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [olho, setOlho] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await fetch("/api/caixa/retencao").then((r) => r.json()).catch(() => null)); } catch {}
      setLoading(false);
    })();
  }, []);

  const money = (v: number) => (olho ? fmtBRL(v) : "R$ •••");
  const clin: Linha = data?.linhas?.clinico || { total: 0, ativos: { n: 0, valor: 0 }, risco: { n: 0, valor: 0 }, inativos: { n: 0, valor: 0 } };
  const fis: Linha = data?.linhas?.fisio || { total: 0, ativos: { n: 0, valor: 0 }, risco: { n: 0, valor: 0 }, inativos: { n: 0, valor: 0 } };
  const pac = data?.pacotesFisio || {};
  const top: any[] = data?.topInativos || [];

  const emRiscoTotal = clin.risco.n + fis.risco.n;
  const inativosTotal = clin.inativos.n + fis.inativos.n;
  const receitaParada = useMemo(() => clin.risco.valor + clin.inativos.valor + fis.risco.valor + fis.inativos.valor, [clin, fis]);

  if (loading) return <div className="p-6"><div className="rt-empty">Carregando…</div></div>;

  return (
    <div className="p-6">
      <style>{CSS}</style>
      <div className="rt-wrap">
        <div className="rt-print-h">Retenção e Churn — {new Date().toLocaleDateString("pt-BR")}</div>
        <div className="rt-bar no-print">
          <button className="rt-btn" onClick={() => setOlho((v) => !v)}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
          <button className="rt-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
        </div>

        {/* KPIs de topo */}
        <div className="rt-kpis">
          <div className="rt-k warn">
            <div className="n">{nf(emRiscoTotal)}</div>
            <div className="l">Clientes <b>em risco</b> (esfriando: 91–180 dias sem vir)</div>
          </div>
          <div className="rt-k bad">
            <div className="n">{nf(inativosTotal)}</div>
            <div className="l">Clientes <b>inativos</b> (mais de 180 dias sem vir)</div>
          </div>
          <div className="rt-k">
            <div className="n">{money(receitaParada)}</div>
            <div className="l">Receita que já veio desses clientes parados — o que dá pra reconquistar</div>
          </div>
        </div>

        {/* Duas linhas lado a lado */}
        <div className="rt-grid2">
          <ColunaLinha titulo="Clínica" emoji="🩺" linha={clin} money={money} />
          <ColunaLinha titulo="Fisioterapia" emoji="🌿" linha={fis} money={money} />
        </div>

        {/* Pacotes de fisio */}
        <div className="rt-card" style={{ marginBottom: 16 }}>
          <div className="rt-h">📦 Pacotes de fisioterapia {pac.taxaConclusao != null && <span style={{ float: "right", fontWeight: 500, color: "#0F6E56" }}>Taxa de conclusão: {pac.taxaConclusao}%</span>}</div>
          <div style={{ padding: 16 }}>
            <div className="rt-pac">
              <div className="c"><div className="n">{nf(pac.ativo || 0)}</div><div className="l">Ativos</div></div>
              <div className="c" style={{ background: "#FBF3E3", borderColor: "#efe1c2" }}><div className="n" style={{ color: "#8a6400" }}>{nf(pac.ultimaSessao || 0)}</div><div className="l">Na última sessão (renovar!)</div></div>
              <div className="c"><div className="n" style={{ color: "#0F6E56" }}>{nf(pac.concluido || 0)}</div><div className="l">Concluídos</div></div>
              <div className="c"><div className="n" style={{ color: "#B00000" }}>{nf(pac.cancelado || 0)}</div><div className="l">Cancelados</div></div>
              <div className="c"><div className="n" style={{ color: "#B00000" }}>{nf(pac.expirado || 0)}</div><div className="l">Expirados</div></div>
            </div>
          </div>
        </div>

        {/* Top inativos por valor */}
        <div className="rt-card">
          <div className="rt-h">🎯 Prioridade de reativação — quem já gastou mais e sumiu</div>
          <div className="rt-scroll">
            {top.length === 0 ? (
              <div className="rt-empty">Ninguém em risco ou inativo. 🎉</div>
            ) : (
              <table className="rt-tbl">
                <thead><tr><th>Cliente</th><th>Linha</th><th className="r">Dias sem vir</th><th className="r">Já gastou</th></tr></thead>
                <tbody>
                  {top.map((t) => (
                    <tr key={t.tutorId + t.linha}>
                      <td><Link href={`/dashboard/erp/tutores/${t.tutorId}`} className="rt-nm">{t.nome}</Link></td>
                      <td><span className={`rt-tag ${t.linha === "Fisio" ? "fi" : "cl"}`}>{t.linha}</span></td>
                      <td className="r">{nf(t.dias)}</td>
                      <td className="r">{money(t.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rt-note">
          <b>Como lemos:</b> cada cliente é classificado pela <b>última visita</b> em cada linha — <b style={{ color: COR.ativo }}>Ativo</b> (até {data?.limites?.ativo ?? 90} dias), <b style={{ color: COR.risco }}>Em risco</b> ({(data?.limites?.ativo ?? 90) + 1}–{data?.limites?.risco ?? 180} dias) e <b style={{ color: COR.inativo }}>Inativo</b> (mais de {data?.limites?.risco ?? 180} dias). Base dos últimos {Math.round((data?.janelaDias ?? 540) / 30)} meses. Clínica e Fisioterapia são contadas separadas (um mesmo cliente pode estar nas duas). Esses limites de dias são <b>ajustáveis</b> — me diga se quiser outros.
        </div>
      </div>
    </div>
  );
}
