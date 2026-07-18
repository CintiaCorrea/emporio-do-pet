"use client";
/* Editor de escala/jornada de um profissional (jornada semanal + bloqueios).
   Controlado: recebe `value` e `onChange`. Usado no cadastro do profissional
   (Configurações › Equipe) e onde mais precisar. */
import { LuPlus, LuTrash2, LuCalendarOff } from "react-icons/lu";

export type Esc = { semana: Record<string, [string, string][]>; bloqueios: { inicio: string; fim: string; label: string }[]; sobDemanda?: boolean };
export const ESC_VAZIA: Esc = { semana: {}, bloqueios: [] };

const DIAS: [string, string][] = [["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["0", "Dom"]];
const inpT = "border rounded-lg px-2 py-1.5 text-[13px] text-[#14253a] focus:outline-none focus:border-[#009AAC]";

export function parseEsc(v: any): Esc {
  let o: any = v;
  if (typeof v === "string") { try { o = JSON.parse(v); } catch { o = null; } }
  if (!o || typeof o !== "object") return { semana: {}, bloqueios: [] };
  return { semana: o.semana || {}, bloqueios: Array.isArray(o.bloqueios) ? o.bloqueios : [], sobDemanda: !!o.sobDemanda };
}

export default function EscalaEditor({ value, onChange, allowSobDemanda }: { value: Esc; onChange: (e: Esc) => void; allowSobDemanda?: boolean }) {
  const esc = value || ESC_VAZIA;
  const sob = allowSobDemanda && esc.sobDemanda === true;
  const janelas = (wd: string) => esc.semana[wd] || [];
  const setJanela = (wd: string, i: number, idx: 0 | 1, val: string) => {
    const s = { ...esc.semana }; const arr = [...(s[wd] || [])]; const par: [string, string] = [...(arr[i] || ["", ""])] as any; par[idx] = val; arr[i] = par; s[wd] = arr; onChange({ ...esc, semana: s });
  };
  const addJanela = (wd: string) => { const s = { ...esc.semana }; s[wd] = [...(s[wd] || []), ["08:00", "12:00"]]; onChange({ ...esc, semana: s }); };
  const rmJanela = (wd: string, i: number) => { const s = { ...esc.semana }; s[wd] = (s[wd] || []).filter((_, k) => k !== i); onChange({ ...esc, semana: s }); };
  const addBloqueio = () => onChange({ ...esc, bloqueios: [...esc.bloqueios, { inicio: "", fim: "", label: "Folga" }] });
  const setBloqueio = (i: number, k: "inicio" | "fim" | "label", v: string) => onChange({ ...esc, bloqueios: esc.bloqueios.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)) });
  const rmBloqueio = (i: number) => onChange({ ...esc, bloqueios: esc.bloqueios.filter((_, k) => k !== i) });

  return (
    <div className="flex flex-col gap-3">
      {allowSobDemanda && (
        <label className="flex items-start gap-2 text-[13px] cursor-pointer rounded-lg p-2.5 border" style={{ borderColor: sob ? "#009AAC" : "#E8DFC8", background: sob ? "#EAF6F7" : "transparent" }}>
          <input type="checkbox" checked={sob} onChange={(e) => onChange({ ...esc, sobDemanda: e.target.checked })} className="mt-0.5" />
          <span>
            <span className="font-medium text-[#0E2244]">Agenda sob demanda (profissional externo)</span>
            <span className="block text-[12px] text-gray-500">Não aparece na agenda a não ser que você habilite no dia ou já haja atendimento marcado. Sem jornada fixa.</span>
          </span>
        </label>
      )}
      {!sob && (<>
      <div>
        <p className="text-[12px] font-medium text-[#475569] mb-2">Jornada semanal</p>
        <div className="flex flex-col gap-2">
          {DIAS.map(([wd, lbl]) => {
            const js = janelas(wd);
            return (
              <div key={wd} className="flex items-center gap-2 flex-wrap">
                <span className="w-9 text-[13px] text-gray-500">{lbl}</span>
                {js.length === 0 ? <span className="text-[12px] text-gray-400 italic">Folga</span> : js.map((par, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-[#E1F3F5] rounded-lg px-2 py-1">
                    <input type="time" step={900} value={par[0]} onChange={(e) => setJanela(wd, i, 0, e.target.value)} className={inpT + " bg-transparent border-0 px-0 py-0"} />
                    <span className="text-[#014D5E]">–</span>
                    <input type="time" step={900} value={par[1]} onChange={(e) => setJanela(wd, i, 1, e.target.value)} className={inpT + " bg-transparent border-0 px-0 py-0"} />
                    <button type="button" onClick={() => rmJanela(wd, i)} className="text-[#014D5E]"><LuTrash2 size={13} /></button>
                  </span>
                ))}
                <button type="button" onClick={() => addJanela(wd)} className="text-[12px] text-[#009AAC] inline-flex items-center gap-0.5"><LuPlus size={13} /> janela</button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-medium text-[#475569] flex items-center gap-1.5"><LuCalendarOff size={14} /> Bloqueios e exceções</p>
          <button type="button" onClick={addBloqueio} className="text-[12px] text-[#009AAC] inline-flex items-center gap-0.5"><LuPlus size={13} /> adicionar</button>
        </div>
        {esc.bloqueios.length === 0 ? <p className="text-[12px] text-gray-400">Nenhum bloqueio.</p> : esc.bloqueios.map((b, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap py-1.5 border-b last:border-0" style={{ borderColor: "#eef0ec" }}>
            <input value={b.label} onChange={(e) => setBloqueio(i, "label", e.target.value)} placeholder="Motivo (férias, folga…)" className={inpT} style={{ borderColor: "#d8d0bc", width: "170px" }} />
            <input type="date" value={b.inicio} onChange={(e) => setBloqueio(i, "inicio", e.target.value)} className={inpT} style={{ borderColor: "#d8d0bc" }} />
            <span className="text-gray-400 text-[13px]">até</span>
            <input type="date" value={b.fim} onChange={(e) => setBloqueio(i, "fim", e.target.value)} className={inpT} style={{ borderColor: "#d8d0bc" }} />
            <button type="button" onClick={() => rmBloqueio(i)} className="text-gray-400 hover:text-[#E24B4A]"><LuTrash2 size={15} /></button>
          </div>
        ))}
      </div>
      </>)}
    </div>
  );
}
