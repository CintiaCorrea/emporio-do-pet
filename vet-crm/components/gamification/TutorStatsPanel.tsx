"use client";

import { useEffect, useState } from "react";
import KpiCard from "./KpiCard";
import BarChart from "./BarChart";

interface TutorStats {
  tutor: { id: string; name: string; dataPrimeiraVisita: string | null; dataUltimaVisita: string | null };
  ltv: number;
  ticketMedio: number;
  totalAtendimentos: number;
  totalPets: number;
  pets: { id: string; name: string; species: string }[];
  mensal: { mes: string; qtd: number; valor: number }[];
  ultimoAtendimento: string | null;
}

const fmtR = (v: number) => `R$ ${v.toFixed(2)}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtMonth = (k: string) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

export default function TutorStatsPanel({ tutorId, endpoint = "tutors" }: { tutorId: string; endpoint?: "tutors" | "clients" }) {
  const [data, setData] = useState<TutorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/${endpoint}/${tutorId}/stats`);
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setData(d);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tutorId, endpoint]);

  if (loading) return <div className="text-sm text-gray-500">Carregando estatísticas…</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="LTV total" value={fmtR(data.ltv)} sublabel={data.totalAtendimentos > 0 ? `${data.totalAtendimentos} atendimentos` : "nenhum atendimento"} tone="success" />
        <KpiCard label="Ticket médio" value={fmtR(data.ticketMedio)} tone="primary" />
        <KpiCard label="Pets" value={data.totalPets} sublabel={data.pets.map(p => p.name).slice(0, 3).join(" · ") || "—"} tone="warning" />
        <KpiCard label="Última visita" value={fmtDate(data.tutor.dataUltimaVisita)} sublabel={data.tutor.dataPrimeiraVisita ? `desde ${fmtDate(data.tutor.dataPrimeiraVisita)}` : ""} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "#3C3489" }}>Frequência (últimos 12 meses)</div>
          <BarChart data={data.mensal.map(m => ({ label: fmtMonth(m.mes), value: m.qtd }))} height={120} valueFmt={String} tone="#3C3489" />
        </div>
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "#3C3489" }}>Faturamento por mês</div>
          <BarChart data={data.mensal.map(m => ({ label: fmtMonth(m.mes), value: m.valor }))} height={120} valueFmt={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v))} tone="#1E6B36" />
        </div>
      </div>
    </div>
  );
}
