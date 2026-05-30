"use client";

import { useEffect, useState } from "react";
import { KpiCards } from "./KpiCards";
import { MiniBarChart } from "./MiniBarChart";
import { Timeline } from "./Timeline";

interface Stats {
  totalConsultas: number;
  realizadas: number;
  futurasAgendadas: number;
  diasDesdeUltima: number | null;
  ultima: { id: string; data: string; descricao?: string | null } | null;
  proxima: { id: string; data: string; descricao?: string | null } | null;
  diasAteProxima: number | null;
  valorTotal: number;
  valorPago: number;
  ticketMedio: number;
  idadeAnos: number | null;
  idadeMeses: number | null;
  pesoAtual: number | null;
  frequenciaMensal: { mes: string; total: number }[];
  timeline: { id: string; data: string; descricao?: string | null; valor?: number | null }[];
}

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(0)}`;

export default function PetProfilePanel({ petId }: { petId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/pets/${petId}/profile-stats`);
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [petId]);

  if (loading) return <div className="bg-white border rounded-xl p-4 text-sm text-gray-500" style={{ borderColor: "#E5DCC9" }}>Carregando histórico...</div>;
  if (!stats) return null;

  const idade = stats.idadeAnos != null
    ? (stats.idadeAnos > 0 ? `${stats.idadeAnos}a${stats.idadeMeses ? ` ${stats.idadeMeses}m` : ""}` : `${stats.idadeMeses}m`)
    : "—";

  const ultimaTxt = stats.diasDesdeUltima == null ? "—"
    : stats.diasDesdeUltima === 0 ? "hoje"
    : stats.diasDesdeUltima === 1 ? "ontem"
    : stats.diasDesdeUltima < 30 ? `há ${stats.diasDesdeUltima}d`
    : stats.diasDesdeUltima < 365 ? `há ${Math.floor(stats.diasDesdeUltima / 30)}m`
    : `há ${Math.floor(stats.diasDesdeUltima / 365)}a`;

  const proximaTxt = stats.diasAteProxima == null ? "—"
    : stats.diasAteProxima === 0 ? "hoje"
    : stats.diasAteProxima === 1 ? "amanhã"
    : stats.diasAteProxima < 7 ? `em ${stats.diasAteProxima}d`
    : stats.diasAteProxima < 30 ? `em ${Math.floor(stats.diasAteProxima / 7)}sem`
    : `em ${Math.floor(stats.diasAteProxima / 30)}m`;

  return (
    <div className="space-y-3">
      <KpiCards items={[
        { label: "Consultas realizadas", value: stats.realizadas, hint: stats.totalConsultas !== stats.realizadas ? `+ ${stats.totalConsultas - stats.realizadas} agendadas` : undefined, highlight: stats.realizadas > 0 },
        { label: "Última visita", value: ultimaTxt, hint: stats.ultima?.descricao || undefined },
        { label: "Próxima consulta", value: proximaTxt, hint: stats.proxima?.descricao || undefined },
        { label: "Idade", value: idade, hint: stats.pesoAtual ? `${stats.pesoAtual}kg` : undefined },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MiniBarChart title="Frequência de consultas (últimos 12 meses)" data={stats.frequenciaMensal.map(f => ({ label: f.mes, value: f.total }))} />
        <div className="bg-white border rounded-xl p-4 grid grid-cols-2 gap-3" style={{ borderColor: "#E5DCC9" }}>
          <div>
            <div className="text-xs text-gray-500">Valor total atendimentos</div>
            <div className="text-xl font-semibold mt-1 tabular-nums" style={{ color: "#3C3489" }}>{fmtR(stats.valorTotal)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Pago</div>
            <div className="text-xl font-semibold mt-1 tabular-nums">{fmtR(stats.valorPago)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Ticket médio</div>
            <div className="text-xl font-semibold mt-1 tabular-nums">{fmtR(stats.ticketMedio)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">A receber</div>
            <div className="text-xl font-semibold mt-1 tabular-nums" style={{ color: (stats.valorTotal - stats.valorPago) > 0 ? "#A32D2D" : "#1A1A1A" }}>{fmtR(stats.valorTotal - stats.valorPago)}</div>
          </div>
        </div>
      </div>

      {stats.timeline.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2" style={{ color: "#3C3489" }}>Histórico clínico recente</div>
          <Timeline events={stats.timeline} emptyMsg="Sem consultas registradas." />
        </div>
      )}
    </div>
  );
}
