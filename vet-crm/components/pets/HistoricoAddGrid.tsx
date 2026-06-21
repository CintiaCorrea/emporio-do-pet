"use client";
import { LuStethoscope, LuActivity, LuTriangleAlert, LuFileText, LuFlaskConical, LuCamera, LuPill, LuPencil, LuMessageSquare, LuClipboardList } from "react-icons/lu";

const TIPOS: any[] = [
  { k: "Atendimento", c: "#2f80c4", I: LuStethoscope, ready: true },
  { k: "Peso", c: "#b8860b", I: LuActivity },
  { k: "Patologia", c: "#7c3aed", I: LuTriangleAlert },
  { k: "Documento", c: "#2e9e5b", I: LuFileText },
  { k: "Exame", c: "#e0556b", I: LuFlaskConical },
  { k: "Fotos", c: "#2b6cb0", I: LuCamera },
  { k: "Vacina", c: "#e08a1e", I: LuPill },
  { k: "Receita", c: "#9333ea", I: LuPencil },
  { k: "Observação", c: "#64748b", I: LuMessageSquare },
  { k: "Vídeo", c: "#0f7a52", I: LuCamera },
  { k: "Internação", c: "#9b2c3a", I: LuClipboardList },
];

export default function HistoricoAddGrid({ onAtendimento, onPendente }: { onAtendimento?: () => void; onPendente?: (t: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>Adicionar ao histórico</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {TIPOS.map((t) => {
          const Icon = t.I;
          return (
            <button
              key={t.k}
              onClick={() => (t.ready ? onAtendimento?.() : onPendente?.(t.k))}
              title={t.ready ? t.k : `${t.k} — em construção`}
              className="flex flex-col items-center justify-center gap-1 rounded-xl text-white text-[11px] font-medium py-2.5 transition hover:opacity-90"
              style={{ background: t.c, opacity: t.ready ? 1 : 0.55 }}
            >
              <Icon size={16} />
              {t.k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
