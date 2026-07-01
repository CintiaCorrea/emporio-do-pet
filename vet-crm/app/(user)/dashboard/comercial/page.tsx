"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const PIPELINE_STAGES = [
  "Aguardando triagem",
  "Lead novo",
  "Em qualificação",
  "Orçamento enviado",
  "Aguardando retorno",
  "Retomar contato",
  "Reaproximação",
  "Agendado",
  "Compareceu",
  "Perdido",
];

const STAGE_EMOJI: Record<string, string> = {
  "Aguardando triagem": "⏳",
  "Lead novo": "🌱",
  "Em qualificação": "🔍",
  "Orçamento enviado": "📄",
  "Aguardando retorno": "⏰",
  "Retomar contato": "📞",
  "Reaproximação": "🤝",
  "Agendado": "📅",
  "Compareceu": "✅",
  "Perdido": "❌",
  "Sem etapa": "📥",
};

function getTemp(score: number) {
  if (score <= 40) return { label: "Frio", icon: "🧊", color: "#4d72a0", bg: "#E6F1FB" };
  if (score <= 70) return { label: "Morno", icon: "☕", color: "#B25C0A", bg: "#FBEED8" };
  return { label: "Quente", icon: "🔥", color: "#C2410C", bg: "#FFE2D2" };
}

function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

// badge de contagem por tipo de etapa
function stageBadgeColors(stage: string) {
  const s = (stage || "").toLowerCase();
  if (s.includes("agendado") || s.includes("compareceu")) return { bg: "#E1F5EE", color: "#0F6E56" };
  if (s.includes("perdido")) return { bg: "#FCEBEB", color: "#A32D2D" };
  return { bg: "#E0F4F6", color: "#00798A" };
}

const SEM_ETAPA = "Sem etapa";
const ORCAMENTO_RE = /or[çc]amento/i;

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email?: string;
  pipelineComercialEtapa?: string | null;
  currentScore?: number;
  status?: string;
  customFields?: any;
}

export default function ComercialPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<string[]>(PIPELINE_STAGES);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"funil" | "lista" | "orcamentos">("funil");
  const [menuLeadId, setMenuLeadId] = useState<string | null>(null);

  async function loadLeads() {
    try {
      const res = await fetch("/api/leads?limit=1000", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.leads)
        ? data.leads
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setLeads(arr);
    } catch (e) {
      console.error("Falha ao carregar leads", e);
      toast.error("Erro ao carregar leads");
    }
  }

  async function loadPipeline() {
    try {
      const r = await fetch("/api/pipelines", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d.pipelines || d.data || [];
      const p = arr.find(
        (x: any) =>
          (x.escopo === "LEAD" || (x.nome || "").toLowerCase().includes("comercial")) &&
          x.ativo !== false
      );
      if (p && Array.isArray(p.estagios) && p.estagios.length) {
        setStages(
          p.estagios
            .slice()
            .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
            .map((e: any) => e.nome)
        );
      }
    } catch {
      console.error("Falha ao carregar pipeline comercial (usando fallback)");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadLeads(), loadPipeline()]);
      setLoading(false);
    })();
  }, []);

  // lead é "ativo" se status não for CONVERTED/LOST/RESOLVED (se houver status)
  const isAtivo = (l: Lead) => {
    const s = (l.status || "").toUpperCase();
    if (!s) return true;
    return !["CONVERTED", "LOST", "RESOLVED"].includes(s);
  };

  const kpis = useMemo(() => {
    const ativos = leads.filter(isAtivo);
    const quentes = leads.filter((l) => (l.currentScore || 0) > 70).length;
    const orcamentos = leads.filter((l) => ORCAMENTO_RE.test(l.pipelineComercialEtapa || "")).length;
    const totalComStatus = leads.filter((l) => l.status).length;
    const convertidos = leads.filter((l) => (l.status || "").toUpperCase() === "CONVERTED").length;
    const conversao = totalComStatus > 0 ? Math.round((convertidos / totalComStatus) * 100) : null;
    return { ativos: ativos.length, quentes, orcamentos, conversao };
  }, [leads]);

  // agrupa TODOS os leads por etapa (inclui "Sem etapa")
  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const l of leads) {
      const key = (l.pipelineComercialEtapa || "").trim() || SEM_ETAPA;
      (map[key] ||= []).push(l);
    }
    return map;
  }, [leads]);

  // colunas a mostrar: etapas do pipeline + qualquer etapa com leads fora da lista + Sem etapa (se houver)
  const columns = useMemo(() => {
    const cols: string[] = [...stages];
    // etapas presentes nos leads que não estão na lista canônica
    for (const key of Object.keys(byStage)) {
      if (key !== SEM_ETAPA && !cols.includes(key)) cols.push(key);
    }
    if (byStage[SEM_ETAPA]?.length) cols.unshift(SEM_ETAPA);
    // remove duplicatas preservando ordem
    return cols.filter((c, i) => cols.indexOf(c) === i);
  }, [stages, byStage]);

  const orcamentoLeads = useMemo(
    () => leads.filter((l) => ORCAMENTO_RE.test(l.pipelineComercialEtapa || "")),
    [leads]
  );

  async function mudarEtapa(lead: Lead, novaEtapa: string) {
    const anterior = lead.pipelineComercialEtapa || null;
    const alvo = novaEtapa === SEM_ETAPA ? null : novaEtapa;
    setMenuLeadId(null);
    // otimista
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, pipelineComercialEtapa: alvo } : l))
    );
    try {
      const r = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineComercialEtapa: alvo }),
      });
      if (!r.ok) throw new Error(String(r.status));
      toast.success("Etapa atualizada");
    } catch (e: any) {
      // reverte
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, pipelineComercialEtapa: anterior } : l))
      );
      toast.error("Erro ao mudar etapa" + (e?.message ? `: ${e.message}` : ""));
    }
  }

  const cardKpi = "bg-white border border-[#E8E2D6] rounded-[11px] p-3";

  function LeadCard({ lead }: { lead: Lead }) {
    const temp = getTemp(lead.currentScore || 0);
    const valor = lead.customFields?.valor;
    const open = menuLeadId === lead.id;
    return (
      <div
        onClick={() => router.push(`/dashboard/crm/leads/${lead.id}`)}
        className="relative bg-white border border-[#E8E2D6] rounded-[8px] p-2 mb-1.5 cursor-pointer hover:border-[#009AAC] transition"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-[18px] h-[18px] rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[9px] font-medium flex-shrink-0">
            {getInitials(lead.name)}
          </div>
          <span className="text-[12px] font-medium text-[#014D5E] truncate flex-1 min-w-0">
            {lead.name || "Sem nome"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuLeadId(open ? null : lead.id);
            }}
            className="text-[#8A989D] hover:text-[#014D5E] text-[13px] leading-none px-1 flex-shrink-0"
            title="Mudar etapa"
          >
            ▾
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            style={{ background: temp.bg, color: temp.color }}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          >
            {temp.icon} {temp.label}
          </span>
          {valor && (
            <span className="text-[10px] font-medium text-[#0F6E56]">R$ {valor}</span>
          )}
        </div>

        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-1 top-8 z-30 w-44 max-h-56 overflow-auto bg-white border border-[#E8E2D6] rounded-lg shadow-lg py-1"
          >
            <div className="px-2.5 py-1 text-[9px] text-[#8A989D] uppercase tracking-wide">Mover para</div>
            {columns.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => mudarEtapa(lead, s)}
                className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-[#F6F2EA] ${
                  (lead.pipelineComercialEtapa || SEM_ETAPA) === s ? "text-[#009AAC] font-medium" : "text-[#1F2A2E]"
                }`}
              >
                {STAGE_EMOJI[s] || "•"} {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#F6F2EA]">
      <Toaster position="top-right" />

      {/* Cabeçalho */}
      <div className="flex justify-between items-start mb-3 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-[#014D5E] flex items-center gap-1.5">
            🎯 Comercial
          </h1>
          <p className="text-sm text-[#5C6B70] mt-0.5">funil de vendas e leads</p>
        </div>
        <Link
          href="/dashboard/crm/leads/novo"
          className="bg-[#0F6E56] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
        >
          ➕ Novo lead
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([
          ["funil", "🗂️ Funil"],
          ["lista", "📋 Lista"],
          ["orcamentos", "📄 Orçamentos"],
        ] as [typeof aba, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              aba === key
                ? "bg-[#009AAC] text-white border-[#009AAC]"
                : "bg-white text-[#5C6B70] border-[#E8E2D6] hover:bg-[#FBF9F4]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <div className={cardKpi}>
          <div className="text-[11px] text-[#8A989D]">🎯 Leads ativos</div>
          <div className="text-[20px] text-[#014D5E] font-medium mt-0.5">{kpis.ativos}</div>
        </div>
        <div className={cardKpi}>
          <div className="text-[11px] text-[#8A989D]">🔥 Quentes</div>
          <div className="text-[20px] font-medium mt-0.5 text-[#C2410C]">{kpis.quentes}</div>
        </div>
        <div className={cardKpi}>
          <div className="text-[11px] text-[#8A989D]">📄 Orçamentos abertos</div>
          <div className="text-[20px] text-[#014D5E] font-medium mt-0.5">{kpis.orcamentos}</div>
        </div>
        <div className={cardKpi}>
          <div className="text-[11px] text-[#8A989D]">📈 Conversão (mês)</div>
          <div className="text-[20px] text-[#014D5E] font-medium mt-0.5">
            {kpis.conversao !== null ? `${kpis.conversao}%` : "—"}
          </div>
          <div className="text-[9px] text-[#8A989D]">aprox.</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[#8A989D] py-16">Carregando…</div>
      ) : (
        <>
          {/* ABA FUNIL */}
          {aba === "funil" && (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-min">
                {columns.map((stage) => {
                  const items = byStage[stage] || [];
                  const badge = stageBadgeColors(stage);
                  return (
                    <div
                      key={stage}
                      className="min-w-[180px] w-[180px] bg-[#FBF9F4] border border-[#F0EBE0] rounded-[11px] p-2 flex-shrink-0"
                    >
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[11px] font-medium text-[#014D5E] truncate flex-1 min-w-0">
                          {STAGE_EMOJI[stage] || "•"} {stage}
                        </span>
                        <span
                          style={{ background: badge.bg, color: badge.color }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        >
                          {items.length}
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-[10px] text-[#8A989D] py-2 text-center">—</p>
                      ) : (
                        items.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA LISTA */}
          {aba === "lista" && (
            <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden">
              {leads.length === 0 ? (
                <div className="py-12 text-center text-[#8A989D]">Nenhum lead encontrado</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FBF9F4] border-b border-[#F0EBE0] text-[11px] text-[#014D5E] font-medium">
                      <th className="text-left py-2.5 px-3">Nome</th>
                      <th className="text-left py-2.5 px-3">Telefone</th>
                      <th className="text-left py-2.5 px-3">Etapa</th>
                      <th className="text-left py-2.5 px-3">Temperatura</th>
                      <th className="text-right py-2.5 px-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 200).map((l) => {
                      const temp = getTemp(l.currentScore || 0);
                      const valor = l.customFields?.valor;
                      return (
                        <tr
                          key={l.id}
                          onClick={() => router.push(`/dashboard/crm/leads/${l.id}`)}
                          className="border-b border-[#F0EBE0] hover:bg-[#FBF9F4] cursor-pointer transition"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {getInitials(l.name)}
                              </div>
                              <span className="text-[#014D5E] font-medium">{l.name || "Sem nome"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[#5C6B70]">{l.phone || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E0F4F6] text-[#00798A]">
                              {l.pipelineComercialEtapa || "Sem etapa"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              style={{ background: temp.bg, color: temp.color }}
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                            >
                              {temp.icon} {temp.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#0F6E56] font-medium">
                            {valor ? `R$ ${valor}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {leads.length > 200 && (
                <div className="px-3 py-2 text-[11px] text-[#8A989D] bg-[#FBF9F4] border-t border-[#F0EBE0]">
                  Mostrando 200 de {leads.length} leads. Use o funil ou os filtros da tela de Leads para refinar.
                </div>
              )}
            </div>
          )}

          {/* ABA ORÇAMENTOS */}
          {aba === "orcamentos" && (
            <div>
              {orcamentoLeads.length === 0 ? (
                <div className="bg-white rounded-[12px] border border-[#E8E2D6] py-12 text-center text-[#8A989D]">
                  Nenhum orçamento aberto.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {orcamentoLeads.map((l) => {
                    const temp = getTemp(l.currentScore || 0);
                    const valor = l.customFields?.valor;
                    return (
                      <Link
                        key={l.id}
                        href={`/dashboard/crm/leads/${l.id}`}
                        className="bg-white border border-[#E8E2D6] rounded-[12px] p-3 hover:border-[#009AAC] transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                            {getInitials(l.name)}
                          </div>
                          <span className="text-[13px] font-medium text-[#014D5E] truncate flex-1 min-w-0">
                            {l.name || "Sem nome"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            style={{ background: temp.bg, color: temp.color }}
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          >
                            {temp.icon} {temp.label}
                          </span>
                          {valor && (
                            <span className="text-[12px] font-medium text-[#0F6E56]">R$ {valor}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8A989D] mt-2">📄 aguardando resposta</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
