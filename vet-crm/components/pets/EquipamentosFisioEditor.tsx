"use client";
import { useState } from "react";
import { EQUIP_DEFS, CINESIO_EXERCICIOS, EquipVal } from "@/lib/pets/boletim";

// Editor dos equipamentos do boletim de fisio (2 colunas, campos por aparelho,
// Cinesioterapia com multi-seleção + T). Usado na ficha do pet e no popup do boletim.
export default function EquipamentosFisioEditor({ equipamentos, onChange }: {
  equipamentos: Record<string, EquipVal | string>;
  onChange: (key: string, patch: Partial<EquipVal>) => void;
}) {
  const [cinesioOpen, setCinesioOpen] = useState(false);
  const eqVal = (key: string): EquipVal => { const v = equipamentos[key]; return (v && typeof v === "object") ? (v as EquipVal) : {}; };
  const toggleEq = (key: string) => onChange(key, { on: !eqVal(key).on });
  const setParam = (key: string, p: string, val: string) => onChange(key, { on: true, [p]: val });
  const toggleCine = (key: string, ex: string) => { const cur = eqVal(key); const list = Array.isArray(cur.exercicios) ? cur.exercicios : []; onChange(key, { on: true, exercicios: list.includes(ex) ? list.filter((x) => x !== ex) : [...list, ex] }); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
      {EQUIP_DEFS.map((def) => {
        const v = eqVal(def.key); const on = !!v.on;
        return (
          <div key={def.key} className={`py-1.5 border-b border-dashed border-[#F0EBE0] ${def.cinesio ? "md:col-span-2" : ""}`}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={on} onChange={() => toggleEq(def.key)} className="accent-[#009AAC]" />
              <span className={`text-[12.5px] font-medium ${on ? "text-[#014D5E]" : "text-[#8A989D]"}`}>{def.key}</span>
            </label>
            {(def.params.length > 0 || def.free || def.cinesio) && (
              <div className="mt-1 pl-6">
                {def.cinesio ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="relative">
                      <button type="button" onClick={() => setCinesioOpen((o) => !o)} className="text-[11.5px] px-2.5 py-1.5 rounded-[8px] border border-[#E8E2D6] bg-white text-[#5C6B70] inline-flex items-center gap-1.5">Selecionar exercícios{(v.exercicios?.length || 0) > 0 ? ` (${v.exercicios!.length})` : ""} ▾</button>
                      {cinesioOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setCinesioOpen(false)} />
                          <div className="absolute left-0 mt-1 z-20 bg-white border border-[#E8E2D6] rounded-[10px] shadow-lg p-2 w-[240px]">
                            {CINESIO_EXERCICIOS.map((ex) => { const selx = (v.exercicios || []).includes(ex); return (
                              <label key={ex} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[#F6FDFD] cursor-pointer text-[12px]">
                                <input type="checkbox" checked={selx} onChange={() => toggleCine(def.key, ex)} className="accent-[#009AAC]" />{ex}
                              </label>
                            ); })}
                          </div>
                        </>
                      )}
                    </div>
                    {(v.exercicios || []).map((ex) => <span key={ex} className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#E1F3F5] text-[#014D5E]">{ex}</span>)}
                    <div className="flex flex-col"><span className="text-[8px] uppercase text-[#8A989D]">T</span><input value={v.T || ""} onChange={(e) => setParam(def.key, "T", e.target.value)} placeholder="min" className="w-[52px] px-1.5 py-1 border border-[#E8E2D6] rounded-[6px] text-[11.5px] text-center bg-white" /></div>
                  </div>
                ) : def.free ? (
                  <input value={v.livre || ""} onChange={(e) => setParam(def.key, "livre", e.target.value)} placeholder="parâmetros…" className="w-full px-2 py-1.5 border border-[#E8E2D6] rounded-[8px] text-[12.5px] bg-white" />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {def.params.map((p) => (
                      <div key={p.k} className="flex flex-col">
                        <span className="text-[8px] uppercase text-[#8A989D]">{p.label}</span>
                        <input value={v[p.k] || ""} onChange={(e) => setParam(def.key, p.k, e.target.value)} maxLength={p.wide ? 25 : 6} className={`${p.wide ? "w-[150px] text-left" : "w-[52px] text-center"} px-1.5 py-1 border border-[#E8E2D6] rounded-[6px] text-[11.5px] bg-white`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
