"use client";
// [EMP-COWORK] Painel Meta Ads (E3+E4) - metricas Meta (E2) + cruzamento CRM (E4) por campanha
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type MetaCampaign = {
  campaignId: string; campaignName: string;
  spend: number; impressions: number; clicks: number; ctr: number;
  conversas: number; custoPorConversa: number;
};
type MetaResp = { period: string; accountId: string; totals: any; campaigns: MetaCampaign[]; notices: string[] };
type CrmRow = { leads: number; qualificados: number; convertidos: number; vendas: number; receita: number };

const PERIODS = [
  { v: "last_7", label: "Ultimos 7 dias" },
  { v: "last_30", label: "Ultimos 30 dias" },
  { v: "this_month", label: "Este mes" },
  { v: "last_month", label: "Mes passado" },
];
const SEGMENTS = [
  { v: "consolidado", label: "Consolidado" },
  { v: "Clinica", label: "Clinica" },
  { v: "Fisioterapia", label: "Fisioterapia" },
  { v: "Integrativa", label: "Medicina Integrativa" },
];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const numfmt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));

export default function MetaAdsPage() {
  usePageTitle("Meta Ads", "Do investimento ao cliente que pagou");
  const [period, setPeriod] = useState("last_30");
  const [segment, setSegment] = useState("consolidado");
  const [resp, setResp] = useState<MetaResp | null>(null);
  const [segMap, setSegMap] = useState<Record<string, string>>({});
  const [crmMap, setCrmMap] = useState<Record<string, CrmRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch("/api/meta-insights/metrics?period=" + period, { credentials: "include", cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/listas", { credentials: "include", cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch("/api/meta-insights/crm", { credentials: "include", cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then((out) => {
      if (!alive) return;
      setResp(out[0]);
      const la = out[1];
      const map: Record<string, string> = {};
      const arr = Array.isArray(la) ? la : [];
      for (const x of arr) {
        if (!x || !(x.lista || "").startsWith("campanha_")) continue;
        try { const d = JSON.parse(x.valor); if (d && d.metaCampaignId) map[String(d.metaCampaignId)] = d.segmento || ""; } catch (e) {}
      }
      setSegMap(map);
      setCrmMap(out[2] && typeof out[2] === "object" ? out[2] : {});
      setLoading(false);
    });
    return () => { alive = false; };
  }, [period]);

  const rows = useMemo(() => {
    const cs = (resp && resp.campaigns) || [];
    return cs.map((c) => {
      const crm = crmMap[c.campaignId] || { leads: 0, qualificados: 0, convertidos: 0, vendas: 0, receita: 0 };
      const cacReal = crm.vendas > 0 ? c.spend / crm.vendas : 0;
      const roas = c.spend > 0 ? crm.receita / c.spend : 0;
      return Object.assign({}, c, { segmento: segMap[c.campaignId] || "Geral", crm, cacReal, roas });
    });
  }, [resp, segMap, crmMap]);

  const filtered = useMemo(() => {
    if (segment === "consolidado") return rows;
    return rows.filter((r: any) => r.segmento === segment);
  }, [rows, segment]);

  const totals = useMemo(() => {
    const t = { spend: 0, impressions: 0, clicks: 0, conversas: 0, qualificados: 0, vendas: 0, receita: 0 };
    for (const r of filtered as any[]) {
      t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.conversas += r.conversas;
      t.qualificados += r.crm.qualificados; t.vendas += r.crm.vendas; t.receita += r.crm.receita;
    }
    const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
    const cpc = t.conversas > 0 ? t.spend / t.conversas : 0;
    const cacReal = t.vendas > 0 ? t.spend / t.vendas : 0;
    const roas = t.spend > 0 ? t.receita / t.spend : 0;
    const ticket = t.vendas > 0 ? t.receita / t.vendas : 0;
    return Object.assign({}, t, { ctr, cpc, cacReal, roas, ticket });
  }, [filtered]);

  const notices = (resp && resp.notices) || [];

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap gap-2 mb-3">
        {SEGMENTS.map((s) => (
          <button key={s.v} onClick={() => setSegment(s.v)} className={"px-3 py-1.5 rounded-lg text-[13px] border " + (segment === s.v ? "bg-[#009AAC] text-white border-[#009AAC]" : "bg-white text-[#014D5E] border-[#d8d0bc]")}>{s.label}</button>
        ))}
        <div className="ml-auto">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-[#d8d0bc] rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[#009AAC]">
            {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {notices.length > 0 && (
        <div className="mb-3 rounded-lg border border-[#f0d9a8] bg-[#fdf6e3] text-[#8a6d3b] text-[12px] px-3 py-2">
          {notices.map((n: string, i: number) => <div key={i}>{n}</div>)}
        </div>
      )}

      <div className="text-[11px] font-semibold text-[#6b7280] uppercase mb-1">Lado Meta (midia)</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Kpi label="Investimento" value={brl(totals.spend)} />
        <Kpi label="Impressoes" value={numfmt(totals.impressions)} />
        <Kpi label="Cliques" value={numfmt(totals.clicks)} />
        <Kpi label="CTR" value={(totals.ctr || 0).toFixed(2) + "%"} />
        <Kpi label="Conversas iniciadas" value={numfmt(totals.conversas)} />
        <Kpi label="Custo por conversa" value={brl(totals.cpc)} />
      </div>

      <div className="text-[11px] font-semibold text-[#6b7280] uppercase mb-1">O que importa (Meta x CRM)</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCrm label="Receita atribuida" value={brl(totals.receita)} />
        <KpiCrm label="CAC real" value={totals.vendas > 0 ? brl(totals.cacReal) : "-"} />
        <KpiCrm label="ROAS" value={totals.spend > 0 ? (totals.roas || 0).toFixed(2) + "x" : "-"} />
        <KpiCrm label="Ticket medio" value={totals.vendas > 0 ? brl(totals.ticket) : "-"} />
      </div>

      <div className="bg-white border border-[#e8dfc8] rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f7f3e8] text-[#6b7280]">
            <tr>
              <th className="text-left font-medium px-3 py-2">Campanha</th>
              <th className="text-left font-medium px-2 py-2">Segmento</th>
              <th className="text-right font-medium px-2 py-2">Investido</th>
              <th className="text-right font-medium px-2 py-2">Conversas</th>
              <th className="text-right font-medium px-2 py-2">Custo/conv.</th>
              <th className="text-right font-medium px-2 py-2">Leads qual.</th>
              <th className="text-right font-medium px-2 py-2">Vendas</th>
              <th className="text-right font-medium px-2 py-2">Receita</th>
              <th className="text-right font-medium px-2 py-2">CAC real</th>
              <th className="text-right font-medium px-2 py-2">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center text-[#9aa3af] py-6">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center text-[#9aa3af] py-6">Sem campanhas neste segmento/periodo.</td></tr>
            ) : (filtered as any[]).map((r) => (
              <tr key={r.campaignId} className="border-t border-[#f0ead9]">
                <td className="px-3 py-2 text-[#014D5E] font-medium">{r.campaignName || r.campaignId}</td>
                <td className="px-2 py-2 text-[#5b6470]">{r.segmento}</td>
                <td className="px-2 py-2 text-right">{brl(r.spend)}</td>
                <td className="px-2 py-2 text-right">{numfmt(r.conversas)}</td>
                <td className="px-2 py-2 text-right">{brl(r.custoPorConversa)}</td>
                <td className="px-2 py-2 text-right">{numfmt(r.crm.qualificados)}</td>
                <td className="px-2 py-2 text-right">{numfmt(r.crm.vendas)}</td>
                <td className="px-2 py-2 text-right">{brl(r.crm.receita)}</td>
                <td className="px-2 py-2 text-right">{r.crm.vendas > 0 ? brl(r.cacReal) : "-"}</td>
                <td className="px-2 py-2 text-right">{r.spend > 0 ? (r.roas || 0).toFixed(2) + "x" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#9aa3af] mt-2">CAC real = investido / clientes que pagaram. ROAS = receita atribuida / investido. Receita = soma dos atendimentos dos clientes que vieram da campanha (lead convertido). Defina o ID Meta e o Segmento de cada campanha na tela Campanhas.</p>
    </div>
  );
}

function Kpi(props: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#e8dfc8] rounded-xl px-4 py-3">
      <div className="text-[11px] text-[#6b7280] mb-1">{props.label}</div>
      <div className="text-[20px] font-semibold text-[#014D5E]">{props.value}</div>
    </div>
  );
}

function KpiCrm(props: { label: string; value: string }) {
  return (
    <div className="bg-[#E0F4F6] border border-[#009AAC] rounded-xl px-4 py-3">
      <div className="text-[11px] text-[#017a87] mb-1">{props.label}</div>
      <div className="text-[20px] font-semibold text-[#014D5E]">{props.value}</div>
    </div>
  );
}
