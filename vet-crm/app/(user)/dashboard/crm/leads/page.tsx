"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuSearch, LuPlus, LuUpload, LuDownload, LuTrash2, LuPhone, LuStickyNote, LuFootprints } from "react-icons/lu";

type Filter = "ativos" | "perdidos" | "outros" | "convertidos" | "todos";

interface Lead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  status: string;
  currentScore: number;
  channel?: string | null;
  source: string;
  sourceDetail: string | null;
  customFields?: any;
  lastSeenAt: string;
  createdAt: string;
}

const TEMPERATURE = (score: number) => {
  if (score <= 40) return { label: "Frio", icon: "🧊", color: "#4d72a0", bg: "#E6F1FB" };
  if (score <= 70) return { label: "Morno", icon: "☕", color: "#B25C0A", bg: "#FBEED8" };
  return { label: "Quente", icon: "🔥", color: "#C2410C", bg: "#FFE2D2" };
};

const CHANNEL = (ch?: string | null) => {
  const v = (ch || "").toUpperCase();
  if (v === "WHATSAPP" || !v) return { label: "WhatsApp", icon: LuStickyNote, color: "#0F6E56", bg: "#E1F5EE" };
  if (v === "LIGACAO") return { label: "Ligação", icon: LuPhone, color: "#0C447C", bg: "#E6F1FB" };
  if (v === "WALK_IN") return { label: "Walk-in", icon: LuFootprints, color: "#8a6313", bg: "#FBEED8" };
  return { label: "Outro", icon: LuStickyNote, color: "#4d5a66", bg: "#f0e8d4" };
};

const STAGE_BADGE = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "AGUARDANDO_TRIAGEM") return { label: "Aguardando triagem", color: "#8A5A0F", bg: "#FCE5C8" };
  if (s === "NEW") return { label: "Lead novo", color: "#0C447C", bg: "#E6F1FB" };
  if (s === "ENRICHING" || s === "ENRICHED" || s === "QUALIFIED") return { label: "Em qualificação", color: "#00798A", bg: "#E0F4F6" };
  if (s === "CONTACTED") return { label: "Aguardando retorno", color: "#8A5A0F", bg: "#FCE5C8" };
  if (s === "CONVERTED") return { label: "Convertido", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "LOST") return { label: "Perdido", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: status, color: "#4d5a66", bg: "#f0e8d4" };
};

const getInitials = (name: string | null) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ativos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        setLeads(Array.isArray(data?.leads) ? data.leads : Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...leads];
    if (filter === "ativos") arr = arr.filter((l) => !["LOST", "CONVERTED"].includes(l.status));
    if (filter === "perdidos") arr = arr.filter((l) => l.status === "LOST");
    if (filter === "convertidos") arr = arr.filter((l) => l.status === "CONVERTED");
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.includes(q),
      );
    }
    return arr;
  }, [leads, filter, search]);

  const counts = useMemo(() => {
    const ativos = leads.filter((l) => !["LOST", "CONVERTED"].includes(l.status));
    return {
      total: leads.length,
      quentes: ativos.filter((l) => l.currentScore > 70).length,
      mornos: ativos.filter((l) => l.currentScore > 40 && l.currentScore <= 70).length,
      frios: ativos.filter((l) => l.currentScore <= 40).length,
    };
  }, [leads]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl text-[#0E2244] font-medium">Leads</h1>
          <p className="text-sm text-[#5b6470] mt-0.5">
            {counts.total} leads · <span className="text-[#C2410C] font-medium">🔥 {counts.quentes} quentes</span> ·{" "}
            <span className="text-[#B25C0A] font-medium">☕ {counts.mornos} mornos</span> ·{" "}
            <span className="text-[#4d72a0] font-medium">🧊 {counts.frios} frios</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuUpload className="w-3.5 h-3.5" />Importar
          </button>
          <button className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuDownload className="w-3.5 h-3.5" />CSV
          </button>
          <Link href="/dashboard/crm/leads/novo" className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <LuPlus className="w-3.5 h-3.5" />Novo Lead
          </Link>
        </div>
      </header>

      <div className="flex gap-2 mb-3 flex-wrap">
        {(["ativos", "perdidos", "outros", "convertidos", "todos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${
              filter === f
                ? "bg-[#009AAC] text-white"
                : "bg-white text-[#4d5a66] border border-[#cfd8e0]"
            }`}
          >
            {f === "ativos" ? "Ativos" : f === "perdidos" ? "Perdidos" : f === "outros" ? "Outros contatos" : f === "convertidos" ? "Convertidos" : "Todos"}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tutor, pet, telefone..."
          className="w-full bg-white border border-[#d8d0bc] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#d8d0bc] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F3E4] border-b border-[#d8d0bc] text-[11px] text-[#5b6470] font-medium">
              <th className="text-left py-2.5 px-3">Tutor / Pet</th>
              <th className="text-left py-2.5 px-3">Telefone</th>
              <th className="text-left py-2.5 px-3">Serviço</th>
              <th className="text-left py-2.5 px-3">Canal</th>
              <th className="text-left py-2.5 px-3">Etapa</th>
              <th className="text-left py-2.5 px-3">Temperatura</th>
              <th className="text-right py-2.5 px-3">Valor</th>
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Nenhum lead nesse filtro</td></tr>
            ) : (
              filtered.map((l) => {
                const temp = TEMPERATURE(l.currentScore || 0);
                const channel = CHANNEL(l.channel);
                const stage = STAGE_BADGE(l.status);
                const Icon = channel.icon;
                const petName = l.customFields?.petName;
                const servico = l.customFields?.servicoInteresse || l.sourceDetail;
                const valor = l.customFields?.valor;
                return (
                  <tr key={l.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee] transition">
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/crm/leads/${l.id}`} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E0F4F6] text-[#00798A] flex items-center justify-center text-[11px] font-medium">
                          {getInitials(l.name)}
                        </div>
                        <div>
                          <div className="text-[#0E2244] font-medium">{l.name || "Sem nome"}</div>
                          <div className="text-[11px] text-[#5b6470]">{petName ? `🐾 ${petName}` : "sem pet"}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{l.phone || "—"}</td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{servico || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span style={{ background: channel.bg, color: channel.color }} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full">
                        <Icon className="w-3 h-3" />{channel.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span style={{ background: stage.bg, color: stage.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {stage.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-9 h-1 bg-[#f0e8d4] rounded-full overflow-hidden">
                          <div style={{ width: `${Math.min(100, l.currentScore || 0)}%`, background: temp.color }} className="h-full rounded-full" />
                        </div>
                        <span style={{ color: temp.color }} className="text-[11px] font-medium inline-flex items-center gap-0.5">
                          <span className="text-[11px]">{temp.icon}</span>{l.currentScore || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0E2244] font-medium">
                      {valor ? `R$ ${valor}` : "—"}
                    </td>
                    <td className="py-2.5 px-3"><LuTrash2 className="w-3.5 h-3.5 text-[#cfd8e0] cursor-pointer hover:text-[#A32D2D]" /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 bg-white border border-[#e8dfc8] rounded-lg px-3 py-2 flex gap-4 text-[11px] text-[#5b6470]">
        <span className="text-[#0E2244] font-medium">Temperatura:</span>
        <span>🧊 Frio 0–40</span>
        <span>☕ Morno 41–70</span>
        <span>🔥 Quente 71–100</span>
      </div>
    </div>
  );
}
