"use client";

interface Bar { label: string; value: number; }

export function MiniBarChart({ title, data, unit = "", color = "#3C3489", height = 100 }: {
  title?: string; data: Bar[]; unit?: string; color?: string; height?: number;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E5DCC9" }}>
      {title && <div className="text-sm font-medium mb-3" style={{ color: "#3C3489" }}>{title}</div>}
      <div className="flex items-end justify-between gap-1" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * height;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
              <div className="text-[10px] text-gray-400 tabular-nums opacity-0 group-hover:opacity-100 transition">
                {d.value}{unit}
              </div>
              <div
                className="w-full rounded-t"
                style={{ height: Math.max(2, h), background: d.value > 0 ? color : "#E5E5E5" }}
                title={`${d.label}: ${d.value}${unit}`}
              />
              <div className="text-[10px] text-gray-500 capitalize">{d.label.replace('.', '')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
