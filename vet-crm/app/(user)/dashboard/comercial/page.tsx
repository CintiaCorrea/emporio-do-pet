"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

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
// Etapas que sinalizam "precisa de retorno" no Follow-up
const FOLLOWUP_RE = /(retorno|retomar|reaproxim|aguard)/i;

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email?: string;
  pipelineComercialEtapa?: string | null;
  proximoFollowupAt?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string;
  currentScore?: number;
  status?: string;
  customFields?: any;
}

export default function ComercialPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<string[]>(PIPELINE_STAGES);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"followup" | "leads" | "funil" | "orcamentos">("followup");
  usePageTitle("Comercial", "funil de vendas e leads");
  const [menuLeadId, setMenuLeadId] = useState<string | null>(null);

  // ---- Cadastro de novo lead (modal reaproveitado da tela de Leads) ----
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPetNome, setNovoPetNome] = useState("");
  const [novoPetEspecie, setNovoPetEspecie] = useState("Cão");
  const [savingNovo, setSavingNovo] = useState(false);

  function abrirNovoLead() {
    setNovoNome(""); setNovoTel(""); setNovoEmail(""); setNovoPetNome(""); setNovoPetEspecie("Cão");
    setNovoOpen(true);
  }

  const handleCriarLead = async () => {
    if (!novoNome.trim() && !novoTel.trim()) { toast.error("Informe pelo menos nome ou telefone"); return; }
    setSavingNovo(true);
    try {
      const digits = novoTel.replace(/\D/g, "");
      const email = novoEmail.trim() || `${digits || Date.now()}@whatsapp.lead`;
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: novoNome.trim() || undefined,
          phone: digits || undefined,
          email,
          ...(novoPetNome.trim() ? { customFields: { petName: novoPetNome.trim(), especie: novoPetEspecie } } : {}),
        }),
      });
      if (!res.ok) {
        let payload: any = null;
        try { payload = await res.json(); } catch { /* corpo não-JSON */ }
        // Telefone/e-mail já é de um CLIENTE (Tutor): não cria lead duplicado.
        if (res.status === 409 && payload?.code === "PHONE_BELONGS_TO_TUTOR" && payload?.tutorId) {
          const nome = (typeof payload.message === "string" && payload.message.replace(/^Telefone ja pertence ao cliente\s*/i, "").trim()) || "";
          const abrir = window.confirm(
            `Esse telefone já é do cliente${nome ? ` ${nome}` : ""}. Não vou criar um lead duplicado.\n\nDeseja abrir a ficha do cliente?`
          );
          if (abrir) router.push(`/dashboard/erp/tutores/${payload.tutorId}`);
          return;
        }
        if (res.status === 409) {
          toast.error(payload?.message || "Já existe um lead com esse telefone ou e-mail.");
          return;
        }
        throw new Error(payload?.message || (await res.text().catch(() => "")));
      }
      const novo = await res.json();
      setNovoOpen(false);
      toast.success("Lead cadastrado");
      if (novo?.id) {
        // Atualiza a lista local sem sair da tela
        setLeads((prev) => [novo, ...prev.filter((l) => l.id !== novo.id)]);
      } else {
        await loadLeads();
      }
    } catch {
      toast.error("Não foi possível criar o lead. Verifique os dados e tente novamente.");
    } finally {
      setSavingNovo(false);
    }
  };

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
    for (const key of Object.keys(byStage)) {
      if (key !== SEM_ETAPA && !cols.includes(key)) cols.push(key);
    }
    if (byStage[SEM_ETAPA]?.length) cols.unshift(SEM_ETAPA);
    return cols.filter((c, i) => cols.indexOf(c) === i);
  }, [stages, byStage]);

  const orcamentoLeads = useMemo(
    () => leads.filter((l) => ORCAMENTO_RE.test(l.pipelineComercialEtapa || "")),
    [leads]
  );

  // ---- Follow-up: leads ativos que aguardam retorno ----
  // Prioriza quem tem proximoFollowupAt; senão, quem está numa etapa de "aguardando/retomar/reaproximação".
  // Ordena: follow-up vencido/mais próximo primeiro; depois por atividade mais recente.
  const followupLeads = useMemo(() => {
    const ativos = leads.filter(isAtivo);
    const arr = ativos.filter(
      (l) => l.proximoFollowupAt || FOLLOWUP_RE.test(l.pipelineComercialEtapa || "")
    );
    const ts = (l: Lead) =>
      l.proximoFollowupAt ? new Date(l.proximoFollowupAt).getTime() : Number.POSITIVE_INFINITY;
    const atividade = (l: Lead) =>
      new Date(l.lastActivityAt || l.createdAt || 0).getTime();
    return arr.sort((a, b) => {
      const fa = ts(a);
      const fb = ts(b);
      if (fa !== fb) return fa - fb; // follow-up mais próximo/vencido primeiro
      return atividade(b) - atividade(a); // depois, mais recentes
    });
  }, [leads]);

  const followupVencidos = useMemo(() => {
    const agora = Date.now();
    return followupLeads.filter((l) => l.proximoFollowupAt && new Date(l.proximoFollowupAt).getTime() <= agora).length;
  }, [followupLeads]);

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
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, pipelineComercialEtapa: anterior } : l))
      );
      toast.error("Erro ao mudar etapa" + (e?.message ? `: ${e.message}` : ""));
    }
  }

  const cardKpi = "bg-white border border-[#E8E2D6] rounded-[11px] p-3";
  const fmtData = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

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
        <div></div>
        <button
          type="button"
          onClick={abrirNovoLead}
          className="bg-[#0F6E56] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
        >
          ➕ Novo lead
        </button>
      </div>

      {/* Abas (barra Base44) */}
      <div className="flex gap-4 mb-4 border-b border-[#E8E2D6] flex-wrap">
        {([
          ["followup", "📞 Follow-up"],
          ["leads", "🧲 Leads"],
          ["funil", "🗂️ Funil"],
          ["orcamentos", "📄 Orçamentos"],
        ] as [typeof aba, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`pb-2 -mb-px text-[13px] transition ${
              aba === key
                ? "border-b-2 border-[#009AAC] text-[#014D5E] font-medium"
                : "text-[#8A989D] hover:text-[#5C6B70]"
            }`}
          >
            {label}
            {key === "followup" && followupLeads.length > 0 && (
              <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#FBEED8] text-[#B25C0A]">
                {followupLeads.length}
              </span>
            )}
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
          {/* ABA FOLLOW-UP */}
          {aba === "followup" && (
            <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#F0EBE0] bg-[#FBF9F4]">
                <span className="text-[12px] font-medium text-[#014D5E]">📞 Quem contatar</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#E0F4F6] text-[#00798A]">
                  {followupLeads.length}
                </span>
                {followupVencidos > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#FCEBEB] text-[#A32D2D]">
                    {followupVencidos} vencido{followupVencidos > 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-[10px] text-[#8A989D] ml-auto">follow-up pendente ou aguardando retorno</span>
              </div>
              {followupLeads.length === 0 ? (
                <div className="py-12 text-center text-[#8A989D] text-[13px]">
                  🎉 Ninguém aguardando retorno agora.
                </div>
              ) : (
                <div>
                  {followupLeads.map((l) => {
                    const temp = getTemp(l.currentScore || 0);
                    const fu = l.proximoFollowupAt ? new Date(l.proximoFollowupAt).getTime() : null;
                    const vencido = fu !== null && fu <= Date.now();
                    return (
                      <div
                        key={l.id}
                        onClick={() => router.push(`/dashboard/crm/leads/${l.id}`)}
                        className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F0EBE0] hover:bg-[#FBF9F4] cursor-pointer transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#E0F4F6] text-[#014D5E] flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                          {getInitials(l.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-[#014D5E] font-medium truncate">{l.name || "Sem nome"}</div>
                          <div className="text-[11px] text-[#5C6B70] truncate">
                            {l.phone || "sem telefone"}
                            {l.pipelineComercialEtapa ? ` · ${l.pipelineComercialEtapa}` : ""}
                          </div>
                        </div>
                        {l.proximoFollowupAt && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                            style={
                              vencido
                                ? { background: "#FCEBEB", color: "#A32D2D" }
                                : { background: "#FBEED8", color: "#B25C0A" }
                            }
                          >
                            {vencido ? "⚠️ " : "📅 "}{fmtData(l.proximoFollowupAt)}
                          </span>
                        )}
                        <span
                          style={{ background: temp.bg, color: temp.color }}
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                        >
                          {temp.icon} {temp.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA LEADS (lista + cadastrar aqui mesmo) */}
          {aba === "leads" && (
            <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#F0EBE0] bg-[#FBF9F4]">
                <span className="text-[12px] font-medium text-[#014D5E]">🧲 Todos os leads</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#E0F4F6] text-[#00798A]">
                  {leads.length}
                </span>
                <button
                  type="button"
                  onClick={abrirNovoLead}
                  className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#009AAC] text-white hover:opacity-90"
                >
                  ➕ Novo lead
                </button>
              </div>
              {leads.length === 0 ? (
                <div className="py-12 text-center text-[#8A989D]">Nenhum lead ainda. Clique em “Novo lead”.</div>
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
                  Mostrando 200 de {leads.length} leads.{" "}
                  <Link href="/dashboard/crm/leads" className="text-[#009AAC]">Abra a tela de Leads</Link> para filtrar.
                </div>
              )}
            </div>
          )}

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

      {/* Modal Novo Lead (reaproveitado da tela de Leads) */}
      {novoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setNovoOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-[420px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-[#014D5E]">Novo Lead</h2>
              <button onClick={() => setNovoOpen(false)} className="text-[#8A989D] hover:text-[#5C6B70] text-lg leading-none">✕</button>
            </div>
            <label className="text-[11px] text-[#8A989D]">Nome</label>
            <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do lead" className="w-full h-9 mt-0.5 mb-3 px-3 border border-[#E8E2D6] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <label className="text-[11px] text-[#8A989D]">Telefone</label>
            <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="(85) 9 9999-9999" className="w-full h-9 mt-0.5 mb-3 px-3 border border-[#E8E2D6] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <label className="text-[11px] text-[#8A989D]">Email (opcional)</label>
            <input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCriarLead(); }} placeholder="email@exemplo.com" className="w-full h-9 mt-0.5 px-3 border border-[#E8E2D6] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <p className="text-[10px] text-[#8A989D] mt-1.5">Sem email, geramos um provisório a partir do telefone.</p>
            <label className="text-[11px] text-[#8A989D] block mt-3">Pet de interesse (opcional)</label>
            <div className="flex gap-2 mt-0.5">
              <input value={novoPetNome} onChange={(e) => setNovoPetNome(e.target.value)} placeholder="Nome do pet" className="flex-1 h-9 px-3 border border-[#E8E2D6] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              <select value={novoPetEspecie} onChange={(e) => setNovoPetEspecie(e.target.value)} className="h-9 px-2 border border-[#E8E2D6] rounded-lg text-sm w-[90px] focus:outline-none focus:border-[#009AAC]">
                <option>Cão</option><option>Gato</option><option>Outro</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 border border-[#E8E2D6] rounded-lg text-sm text-[#5C6B70]">Cancelar</button>
              <button onClick={handleCriarLead} disabled={savingNovo} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingNovo ? "Criando..." : "Cadastrar lead"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
