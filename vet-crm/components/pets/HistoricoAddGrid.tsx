"use client";
import { LuStethoscope, LuActivity, LuTriangleAlert, LuFileText, LuFlaskConical, LuCamera, LuSyringe, LuPencil, LuMessageSquare, LuVideo, LuClipboardList } from "react-icons/lu";

const TIPOS: { k: string; c: string; I: any }[] = [
  { k: "Atendimento", c: "#2f80c4", I: LuStethoscope },
  { k: "Peso", c: "#b8860b", I: LuActivity },
  { k: "Patologia", c: "#7c3aed", I: LuTriangleAlert },
  { k: "Documento", c: "#2e9e5b", I: LuFileText },
  { k: "Exame", c: "#e0556b", I: LuFlaskConical },
  { k: "Fotos", c: "#2b6cb0", I: LuCamera },
  { k: "Vacina", c: "#e08a1e", I: LuSyringe },
  { k: "Receita", c: "#9333ea", I: LuPencil },
  { k: "Observação", c: "#64748b", I: LuMessageSquare },
  { k: "Vídeo", c: "#0f7a52", I: LuVideo },
  { k: "Internação", c: "#9b2c3a", I: LuClipboardList },
];

export default function HistoricoAddGrid({ onPick, ready = [] }: { onPick: (k: string) => void; ready?: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: "#94a3b8" }}>Adicionar ao histórico</div>
      <div className="grid grid-cols-3 gap-2.5">
        {TIPOS.map((t) => {
          const Icon = t.I; const on = ready.includes(t.k);
          return (
            <button
              key={t.k}
              onClick={() => onPick(t.k)}
              title={on ? t.k : `${t.k} — em construção`}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl text-white font-semibold transition hover:opacity-90"
              style={{ background: t.c, opacity: on ? 1 : 0.55, padding: "16px 6px" }}
            >
              <Icon size={20} />
              <span className="text-[12px]">{t.k}</span>
              {!on ? <span className="text-[8.5px] leading-tight rounded px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.18)" }}>em construção</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-[11px]" style={{ color: "#9aa3ad" }}>Cada artefato abre aqui (inline) e vira uma entrada na timeline ao salvar.</div>
    </div>
  );
}
