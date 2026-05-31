"use client";

interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}

export function KpiCards({ items, cols = 4 }: { items: Kpi[]; cols?: 1 | 2 | 3 | 4 }) {
  // Mantém 2 colunas em mobile (sempre) e amplia conforme cols solicitado
  const grid = cols === 2 ? "grid-cols-2" :
               cols === 3 ? "grid-cols-2 sm:grid-cols-3" :
               cols === 1 ? "grid-cols-1" :
               "grid-cols-2 md:grid-cols-4";
  return (
    <div className={`grid ${grid} gap-3`}>
      {items.map((k, i) => (
        <div key={i} className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
          <div className="text-[11px] text-gray-500 leading-tight">{k.label}</div>
          <div className="text-[20px] font-semibold tabular-nums mt-1.5 leading-none" style={{ color: k.highlight ? "#009AAC" : "#1A1A1A" }}>
            {k.value}
          </div>
          {k.hint && <div className="text-[10.5px] text-gray-400 mt-1 leading-tight">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
