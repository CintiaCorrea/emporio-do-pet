"use client";

interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean; // true = cor roxa Empório
}

export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((k, i) => (
        <div key={i} className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-xs text-gray-500">{k.label}</div>
          <div className="text-2xl font-semibold tabular-nums mt-1" style={{ color: k.highlight ? "#3C3489" : "#1A1A1A" }}>
            {k.value}
          </div>
          {k.hint && <div className="text-xs text-gray-400 mt-0.5">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
