"use client";
import { LuStethoscope, LuActivity, LuTriangleAlert, LuFileText, LuFlaskConical, LuCamera, LuSyringe, LuPencil, LuMessageSquare, LuVideo, LuClipboardList } from "react-icons/lu";
import { corDoTipo } from "@/lib/coresProntuario";

// Cor de cada tile = FONTE ÚNICA (lib/coresProntuario) — mesma cor do card na timeline.
const TIPOS: { k: string; I: any }[] = [
  { k: "Atendimento", I: LuStethoscope },
  { k: "Peso", I: LuActivity },
  { k: "Patologia", I: LuTriangleAlert },
  { k: "Documento", I: LuFileText },
  { k: "Exame", I: LuFlaskConical },
  { k: "Fotos", I: LuCamera },
  { k: "Vacina", I: LuSyringe },
  { k: "Receita", I: LuPencil },
  { k: "Observação", I: LuMessageSquare },
  { k: "Vídeo", I: LuVideo },
  { k: "Internação", I: LuClipboardList },
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
              style={{ background: corDoTipo(t.k), opacity: on ? 1 : 0.55, padding: "16px 6px" }}
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
