"use client";
interface Props { label: string; value: string | number; sublabel?: string; tone?: "primary" | "success" | "warning" | "danger" | "neutral"; }
const TONE: Record<string, string> = {
  primary: "#3C3489", success: "#1E6B36", warning: "#8a6313", danger: "#A32D2D", neutral: "#374151",
};
export default function KpiCard({ label, value, sublabel, tone = "neutral" }: Props) {
  return (
    <div className="bg-white border rounded-xl p-3" style={{ borderColor: "#E5DCC9" }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums" style={{ color: TONE[tone] }}>{value}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-1">{sublabel}</div>}
    </div>
  );
}
