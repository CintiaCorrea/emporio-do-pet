"use client";

import { useEffect, useState } from "react";
import { KpiCards } from "./KpiCards";
import { MiniBarChart } from "./MiniBarChart";

interface Stats {
  totalAppointments: number;
  futurasAgendadas: number;
  diasDesdeUltima: number | null;
  valorTotal: number;
  valorPago: number;
  valorAReceber: number;
  ticketMedio: number;
  totalPets: number;
  petsAtivos: number;
  pets: { id: string; name: string; species: string; status: string }[];
  frequenciaMensal: { mes: string; total: number; valor: number }[];
}

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(0)}`;

export default function TutorProfilePanel({ tutorId }: { tutorId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/tutors/${tutorId}/profile-stats`);
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [tutorId]);

  if (loading) return <div className="bg-white border rounded-xl p-4 text-sm text-gray-500" style={{ borderColor: "#E5DCC9" }}>Carregando histórico...</div>;
  if (!stats) return null;

  const ultimaTxt = stats.diasDesdeUltima == null ? "—"
    : stats.diasDesdeUltima === 0 ? "hoje"
    : stats.diasDesdeUltima < 30 ? `há ${stats.diasDesdeUltima}d`
    : stats.diasDesdeUltima < 365 ? `há ${Math.floor(stats.diasDesdeUltima / 30)}m`
    : `há ${Math.floor(stats.diasDesdeUltima / 365)}a`;

  return (
    <div className="space-y-3">
      <KpiCards items={[
        { label: "LTV total", value: fmtR(stats.valorTotal), hint: `${stats.totalAppointments} atendimentos`, highlight: true },
        { label: "Ticket médio", value: fmtR(stats.ticketMedio), hint: stats.futurasAgendadas > 0 ? `${stats.futurasAgendadas} futuras` : undefined },
        { label: "A receber", value: fmtR(stats.valorAReceber), hint: stats.valorAReceber > 0 ? "valores em aberto" : "tudo quitado" },
        { label: "Última visita", value: ultimaTxt, hint: `${stats.petsAtivos} pets ativos` },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <MiniBarChart title="Faturamento mensal (últimos 12 meses)" data={stats.frequenciaMensal.map(f => ({ label: f.mes, value: Math.round(f.valor) }))} unit="" color="#009AAC" />
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-sm font-medium mb-3" style={{ color: "#009AAC" }}>Pets ({stats.pets.length})</div>
          <div className="space-y-1">
            {stats.pets.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0" style={{ borderColor: "#F0EBE0" }}>
                <span>{p.name}</span>
                <span className="text-xs text-gray-500">{p.species}{p.status !== 'ACTIVE' ? ' · inativo' : ''}</span>
              </div>
            ))}
            {stats.pets.length === 0 && <div className="text-xs text-gray-500">Nenhum pet vinculado.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
