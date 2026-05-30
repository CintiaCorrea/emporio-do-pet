"use client";

interface Bar { label: string; value: number; }
interface Props { data: Bar[]; height?: number; valueFmt?: (v: number) => string; tone?: string; }

export default function BarChart({ data, height = 120, valueFmt = String, tone = "#3C3489" }: Props) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="text-xs tabular-nums" style={{ color: b.value > 0 ? tone : "#aaa" }}>{b.value > 0 ? valueFmt(b.value) : ""}</div>
            <div className="w-full rounded-t" style={{ height: `${(b.value / max) * 80}%`, minHeight: b.value > 0 ? 2 : 0, background: b.value > 0 ? tone : "#F3F1ED" }} />
            <div className="text-[10px] text-gray-500 truncate w-full text-center">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
