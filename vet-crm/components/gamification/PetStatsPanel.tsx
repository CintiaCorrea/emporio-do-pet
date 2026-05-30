"use client";

import { useEffect, useState } from "react";
import KpiCard from "./KpiCard";
import BarChart from "./BarChart";

interface PetStats {
  pet: { id: string; name: string; weight?: number | null; birthDate?: string | null };
  total: number;
  totalGasto: number;
  ultimoAtendimento: string | null;
  proximoAgendado: { id: string; date: string; description?: string | null; user?: { name: string } | null } | null;
  mensal: { mes: string; qtd: number }[];
  timeline: { id: string; date: string; value: number; status: string; description?: string | null; profissional?: string }[];
}

const fmtR = (v: number) => `R$ ${v.toFixed(2)}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtMonth = (k: string) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

export default function PetStatsPanel({ petId }: { petId: string }) {
  const [data, setData] = useState<PetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pets/${petId}/stats`);
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setData(d);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [petId]);

  if (loading) return <div className="text-sm text-gray-500">Carregando estatísticas…</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Consultas" value={data.total} sublabel={data.total > 0 ? "no histórico" : "nenhum atendimento ainda"} tone="primary" />
        <KpiCard label="Total gasto" value={fmtR(data.totalGasto)} sublabel={data.total > 0 ? `${fmtR(data.totalGasto / data.total)} ticket médio` : "—"} tone="success" />
        <KpiCard label="Último atendimento" value={fmtDate(data.ultimoAtendimento)} tone="neutral" />
        <KpiCard label="Próximo agendado"
          value={data.proximoAgendado ? fmtDate(data.proximoAgendado.date) : "—"}
          sublabel={data.proximoAgendado?.user?.name || ""} tone={data.proximoAgendado ? "warning" : "neutral"} />
      </div>

      <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: "#3C3489" }}>Frequência (últimos 6 meses)</div>
          <div className="text-xs text-gray-500">{data.mensal.reduce((s, m) => s + m.qtd, 0)} atendimentos no período</div>
        </div>
        <BarChart data={data.mensal.map(m => ({ label: fmtMonth(m.mes), value: m.qtd }))} height={120} valueFmt={String} />
      </div>

      {data.timeline.length > 0 && (
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "#3C3489" }}>Timeline clínica</div>
          <div className="space-y-2">
            {data.timeline.map(t => (
              <div key={t.id} className="flex items-start gap-3 pb-2 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-xs text-gray-500 tabular-nums w-20 flex-shrink-0 pt-0.5">{fmtDate(t.date)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{t.description || `Atendimento (${t.status.toLowerCase()})`}</div>
                  {t.profissional && <div className="text-xs text-gray-500">com {t.profissional}</div>}
                </div>
                {t.value > 0 && <div className="text-xs tabular-nums text-gray-600 flex-shrink-0">{fmtR(t.value)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
