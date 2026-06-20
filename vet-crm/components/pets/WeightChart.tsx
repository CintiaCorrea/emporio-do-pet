"use client";
import { useMemo } from "react";

export default function WeightChart({ atendimentos = [], current }: { atendimentos?: any[]; current?: number | null }) {
  const pts = useMemo(() => {
    const arr = (atendimentos || [])
      .filter((a: any) => a.petWeight != null && a.date)
      .map((a: any) => ({ t: new Date(a.date).getTime(), w: Number(a.petWeight) }));
    arr.sort((a, b) => a.t - b.t);
    return arr;
  }, [atendimentos]);

  if (pts.length < 2) {
    const w = pts.length === 1 ? pts[0].w : (current ?? null);
    return (
      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "#E8DFC8", color: "#475569" }}>
        <span className="font-semibold" style={{ color: "#0E2244" }}>Peso atual: </span>{w != null ? `${w} kg` : "—"}
        <span className="text-gray-400"> · sem histórico suficiente para o gráfico (registre o peso nos atendimentos).</span>
      </div>
    );
  }

  const ws = pts.map((p) => p.w);
  const min = Math.min(...ws), max = Math.max(...ws);
  const W = 320, H = 70, pad = 6;
  const span = (max - min) || 1;
  const xy = pts.map((p, i) => {
    const x = pad + (i / (pts.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((p.w - min) / span) * (H - 2 * pad);
    return [x, y] as [number, number];
  });
  const path = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1].w;

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "#E8DFC8" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: "#0E2244" }}>Evolução de peso</span>
        <span className="text-xs" style={{ color: "#009AAC" }}>{last} kg · {pts.length} registros</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70 }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#009AAC" strokeWidth="2" />
        {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#009AAC" />)}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400"><span>mín {min} kg</span><span>máx {max} kg</span></div>
    </div>
  );
}
