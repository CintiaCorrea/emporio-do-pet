"use client";
// [EMP-COWORK] Painel de Tráfego Google Ads — métricas da API + cruzamento CRM (aguardando origem). Turquesa Base44. (Cintia)

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuRefreshCcw } from "react-icons/lu";

type Seg = "consolidado" | "clinica" | "fisioterapia" | "medicina-integrativa";
type Per = "last_7" | "last_30" | "this_month";

const SEGMENTS: { key: Seg; label: string }[] = [
  { key: "consolidado", label: "Consolidado" },
  { key: "clinica", label: "Clínica" },
  { key: "fisioterapia", label: "Fisioterapia" },
  { key: "medicina-integrativa", label: "Medicina Integrativa" },
];
const PERIODS: { key: Per; label: string }[] = [
  { key: "last_30", label: "Últimos 30 dias" },
  { key: "last_7", label: "Últimos 7 dias" },
  { key: "this_month", label: "Este mês" },
];

const brl = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const intl = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("pt-BR"));
const pct = (n: number | null | undefined, d = 1) => (n == null ? "—" : `${(n * 100).toFixed(d)}%`);

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  escalar: { bg: "#E1F5EE", fg: "#0F6E56", label: "Escalar" },
  manter: { bg: "#E1F5EE", fg: "#0F6E56", label: "Manter" },
  "revisar-lp": { bg: "#FAEEDA", fg: "#854F0B", label: "Revisar LP" },
  "sem-dados": { bg: "#F1EFE8", fg: "#5b6470", label: "Sem dados" },
};

export default function GoogleAdsPainelPage() {
  usePageTitle("Google Ads", "Tráfego e funil — do anúncio ao paciente");
  const [segment, setSegment] = useState<Seg>("consolidado");
  const [period, setPeriod] = useState<Per>("last_30");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/google-ads/metrics?segment=${segment}&period=${period}`, { cache: "no-store" });
      setData(await r.json());
    } catch {
      setData(null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [segment, period]);

  const k = data?.kpis;
  const funnel = data?.funnel || [];
  const maxFunnel = useMemo(() => Math.max(1, ...funnel.map((f: any) => f.value || 0)), [funnel]);
  const is = data?.impressionShare || {};
  const q = data?.quality || {};
  const campaigns = data?.campaigns || [];

  const Delta = ({ v }: { v: number | null | undefined }) => {
    if (v == null) return null;
    const up = v >= 0;
    return (
      <div className="text-[11.5px] mt-0.5 inline-flex items-center gap-1" style={{ color: up ? "#0F6E56" : "#A32D2D" }}>
        <span>{up ? "▲" : "▼"}</span>
        {`${up ? "+" : ""}${Math.round(v)}% vs período anterior`}
      </div>
    );
  };

  const KpiAds = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white border rounded-xl p-3.5" style={{ borderColor: "#e8dfc8" }}>
      <div className="text-[11.5px] text-[#64748b] mb-1">{label}</div>
      <div className="text-[22px] font-semibold text-[#014D5E]">{value}</div>
    </div>
  );
  const KpiCrm = ({ label, kpi }: { label: string; kpi: any }) => (
    <div className="rounded-xl p-3.5" style={{ background: "#E0F4F6", border: "1.5px solid #009AAC" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11.5px] text-[#014D5E]">{label}</span>
        <span className="text-[9.5px] text-white rounded px-1.5 py-0.5" style={{ background: "#009AAC" }}>CRM</span>
      </div>
      {kpi?.pending ? (
        <>
          <div className="text-[15px] font-semibold text-[#014D5E]">aguardando origem</div>
          <div className="text-[10.5px] text-[#3a7b86] mt-0.5">liga ao captar o lead no WhatsApp</div>
        </>
      ) : (
        <div className="text-[22px] font-semibold text-[#014D5E]">{brl(kpi?.value)}</div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {SEGMENTS.map((s) => (
            <button key={s.key} onClick={() => setSegment(s.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={segment === s.key
                ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" }
                : { background: "transparent", color: "#5b6470", borderColor: "#e8dfc8" }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value as Per)}
            className="border rounded-lg text-xs px-2.5 py-1.5 bg-white" style={{ borderColor: "#e8dfc8", color: "#014D5E" }}>
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button onClick={load} className="border rounded-lg p-1.5" style={{ borderColor: "#e8dfc8", color: "#009AAC" }} title="Atualizar">
            <LuRefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#94a3b8]">Carregando dados do Google Ads...</div>
      ) : (
        <>
          {data?.insight && (
            <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: "#FAF4E6", border: "1px solid #f4e4c3" }}>
              <span className="text-[12.5px]" style={{ color: "#6b5326" }}>{data.insight}</span>
            </div>
          )}

          <div className="text-[12.5px] font-medium text-[#64748b] mb-2">Indicadores de decisão</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-5">
            <KpiAds label="Custo por lead (CPA)" value={brl(k?.cpa?.value)} />
            <KpiAds label="Taxa de conversão" value={pct(k?.convRate?.value)} />
            <KpiAds label="Leads no WhatsApp" value={intl(k?.leads?.value)} />
            <KpiCrm label="Custo por agendamento" kpi={k?.custoPorAgendamento} />
            <KpiCrm label="CAC (custo por cliente)" kpi={k?.cac} />
          </div>

          <div className="text-[12.5px] font-medium text-[#64748b] mb-2">Funil completo — anúncio → paciente</div>
          <div className="bg-white border rounded-2xl p-4 mb-5" style={{ borderColor: "#e8dfc8" }}>
            <div className="flex flex-col gap-2">
              {funnel.map((f: any, i: number) => {
                const w = f.value != null ? Math.max(6, Math.round((f.value / maxFunnel) * 100)) : 32;
                const crm = f.source === "crm";
                return (
                  <div key={i}>
                    {i > 0 && f.convFromPrev != null && (
                      <div className="text-[10.5px] text-[#94a3b8] pl-1 mb-1">↓ {pct(f.convFromPrev)}{crm ? " · origem: CRM" : ""}</div>
                    )}
                    <div className="rounded-md px-3 py-2 flex justify-between text-[12.5px]"
                      style={f.pending
                        ? { width: `${w}%`, background: "#f1efe8", border: "1px dashed #014D5E", color: "#014D5E" }
                        : { width: `${w}%`, background: "#009AAC", color: "#fff" }}>
                      <span>{f.label}{crm && <span className="text-[9.5px] rounded px-1.5 py-0.5 ml-1.5" style={{ background: "#014D5E", color: "#fff" }}>CRM</span>}</span>
                      <span className="font-semibold">{f.pending ? "aguardando origem" : intl(f.value)}</span>
                    </div>
                  </div>
                );
              })}
              {funnel.length === 0 && <div className="text-sm text-[#94a3b8]">Sem dados no período.</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
            <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "#e8dfc8" }}>
              <div className="text-[13px] font-medium text-[#014D5E] mb-3">Parcela de impressões</div>
              <div className="flex h-5 rounded-md overflow-hidden mb-2.5" style={{ background: "#f1efe8" }}>
                <div style={{ width: pct(is.captured, 0), background: "#009AAC" }} />
                <div style={{ width: pct(is.lostBudget, 0), background: "#D99A2B" }} />
                <div style={{ width: pct(is.lostRank, 0), background: "#B4B2A9" }} />
              </div>
              <div className="text-[11.5px] text-[#5b6470] leading-relaxed">
                <div><span style={{ color: "#009AAC" }}>●</span> Capturado {pct(is.captured, 0)}</div>
                <div><span style={{ color: "#D99A2B" }}>●</span> Perdido por orçamento {pct(is.lostBudget, 0)} — demanda não atendida</div>
                <div><span style={{ color: "#888780" }}>●</span> Perdido por classificação {pct(is.lostRank, 0)} — ajustar lance/qualidade</div>
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "#e8dfc8" }}>
              <div className="text-[13px] font-medium text-[#014D5E] mb-3">Qualidade</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><div className="text-[#64748b]">CTR médio</div><div className="text-[16px] font-semibold text-[#014D5E]">{pct(q.ctr)}</div></div>
                <div><div className="text-[#64748b]">Índice de qualidade</div><div className="text-[16px] font-semibold text-[#014D5E]">{q.qualityScore == null ? "—" : q.qualityScore.toFixed(1)}</div></div>
                <div><div className="text-[#64748b]">CPC médio</div><div className="text-[16px] font-semibold text-[#014D5E]">{brl(q.cpc)}</div></div>
                <div><div className="text-[#64748b]">Termos negativos</div><div className="text-[16px] font-semibold" style={{ color: "#009AAC" }}>{q.negativeTermsSuggested == null ? "—" : `${q.negativeTermsSuggested} sugeridos`}</div></div>
              </div>
            </div>
          </div>

          <div className="text-[12.5px] font-medium text-[#64748b] mb-2">Por campanha</div>
          <div className="bg-white border rounded-2xl overflow-hidden mb-4" style={{ borderColor: "#e8dfc8" }}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase text-[#6b7280]">
                  <th className="text-left font-medium px-4 py-2">Campanha</th>
                  <th className="text-right font-medium px-3 py-2">Leads</th>
                  <th className="text-right font-medium px-3 py-2">CPA</th>
                  <th className="text-right font-medium px-3 py-2">Conv.</th>
                  <th className="text-right font-medium px-3 py-2">P. imp.</th>
                  <th className="text-right font-medium px-3 py-2">Status</th>
                </tr></thead>
                <tbody className="text-[12px] text-[#0E2244]">
                  {campaigns.map((c: any) => {
                    const st = STATUS_STYLE[c.status] || STATUS_STYLE["sem-dados"];
                    return (
                      <tr key={c.id} className="border-t" style={{ borderColor: "#f4eede" }}>
                        <td className="px-4 py-2">{c.name}</td>
                        <td className="text-right px-3 py-2">{intl(c.leads)}</td>
                        <td className="text-right px-3 py-2">{brl(c.cpa)}</td>
                        <td className="text-right px-3 py-2">{pct(c.convRate)}</td>
                        <td className="text-right px-3 py-2">{pct(c.impressionShare, 0)}</td>
                        <td className="text-right px-3 py-2"><span className="rounded px-2 py-0.5 text-[11px]" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                  {campaigns.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94a3b8]">Nenhuma campanha com dados no período.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {(data?.notices || []).length > 0 && (
            <div className="text-[11.5px] text-[#94a3b8] space-y-1">
              {data.notices.map((n: string, i: number) => <div key={i}>• {n}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
