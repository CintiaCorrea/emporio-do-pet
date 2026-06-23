"use client";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuCheck, LuClock, LuUsers, LuPalette, LuArrowLeft } from "react-icons/lu";
import toast from "react-hot-toast";

const STATUSES = ["Agendado", "Confirmado", "Em espera", "Em atendimento", "Atendido", "Cancelado"];
const COR_DEFAULT: Record<string, string> = { "Agendado": "#E6F1FB", "Confirmado": "#E1F5EE", "Em espera": "#FAEEDA", "Em atendimento": "#E1F5EE", "Atendido": "#EAF3DE", "Cancelado": "#F1EFE8" };
const DEF = { horaInicio: 8, horaFim: 19, intervalo: 15, duracaoPadrao: 30, profsOcultos: [] as string[], cores: {} as Record<string, string> };
const card = "bg-white border rounded-xl p-4";
const lbl = "text-[12px] text-[#475569] block mb-1";
const inp = "w-full border rounded-lg px-3 py-2 text-[14px] text-[#14253a] focus:outline-none focus:border-[#009AAC]";

export default function AgendaConfigPage() {
  usePageTitle("Configurações da agenda", "Horários, intervalo e profissionais exibidos");
  const [cfg, setCfg] = useState<any>(DEF);
  const [itemId, setItemId] = useState<string | null>(null);
  const [profs, setProfs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/listas?lista=agenda_config", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); if (arr[0]) { setItemId(arr[0].id); try { setCfg({ ...DEF, ...JSON.parse(arr[0].valor) }); } catch {} } } catch {}
      try { const r = await fetch("/api/profissionais", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.data || d.items || []); setProfs(arr.filter((p: any) => p.ativo !== false && !["RECEPCIONISTA", "GERENTE"].includes(p.tipo))); } catch {}
    })();
  }, []);

  function set(k: string, v: any) { setCfg((c: any) => ({ ...c, [k]: v })); }
  function toggleProf(id: string) { setCfg((c: any) => { const o = new Set<string>(c.profsOcultos || []); o.has(id) ? o.delete(id) : o.add(id); return { ...c, profsOcultos: [...o] }; }); }
  function setCor(st: string, hex: string) { setCfg((c: any) => ({ ...c, cores: { ...(c.cores || {}), [st]: hex } })); }

  async function salvar() {
    setSaving(true);
    try {
      const valor = JSON.stringify(cfg);
      if (itemId) await fetch(`/api/listas/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else { const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "agenda_config", valor }) }); const d = await r.json(); if (d?.id) setItemId(d.id); }
      toast.success("Configurações salvas");
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(false); }
  }

  return (
    <div className="p-4 max-w-3xl">
      <div className="flex items-center gap-4 border-b pb-2.5 mb-4" style={{ borderColor: "#E8DFC8" }}>
        <a href="/dashboard/erp/agendamentos/agenda" className="text-[14px] text-gray-500 flex items-center gap-1 hover:text-[#009AAC]"><LuArrowLeft size={15} /> Dia</a>
        <a href="/dashboard/erp/agendamentos/escala" className="text-[14px] text-gray-500 hover:text-[#009AAC]">Escala</a>
        <span className="text-[14px] text-[#014D5E] font-medium border-b-2 pb-2.5 -mb-2.5" style={{ borderColor: "#009AAC" }}>Configurações</span>
      </div>

      <div className={card} style={{ borderColor: "#E8DFC8" }}>
        <p className="text-[13px] font-medium text-[#475569] mb-3 flex items-center gap-1.5"><LuClock size={16} /> Exibição da grade</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className={lbl}>Hora de início</label><input type="number" min={0} max={23} value={cfg.horaInicio} onChange={(e) => set("horaInicio", Number(e.target.value))} className={inp} style={{ borderColor: "#d8d0bc" }} /></div>
          <div><label className={lbl}>Hora de fim</label><input type="number" min={1} max={23} value={cfg.horaFim} onChange={(e) => set("horaFim", Number(e.target.value))} className={inp} style={{ borderColor: "#d8d0bc" }} /></div>
          <div><label className={lbl}>Intervalo da grade</label><select value={cfg.intervalo} onChange={(e) => set("intervalo", Number(e.target.value))} className={inp} style={{ borderColor: "#d8d0bc" }}><option value={15}>15 min</option><option value={30}>30 min</option></select></div>
          <div><label className={lbl}>Duração padrão</label><select value={cfg.duracaoPadrao} onChange={(e) => set("duracaoPadrao", Number(e.target.value))} className={inp} style={{ borderColor: "#d8d0bc" }}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></div>
        </div>
      </div>

      <div className={card + " mt-3"} style={{ borderColor: "#E8DFC8" }}>
        <p className="text-[13px] font-medium text-[#475569] mb-1 flex items-center gap-1.5"><LuUsers size={16} /> Profissionais na agenda</p>
        <p className="text-[12px] text-gray-400 mb-3">Quem aparece como coluna na visão Dia</p>
        {profs.length === 0 ? <p className="text-[13px] text-gray-400">Cadastre profissionais em Configurações › Profissionais.</p> : profs.map((p: any) => {
          const on = !(cfg.profsOcultos || []).includes(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#eef0ec" }}>
              <span className="text-[14px]">{p.nomeExibicao || p.nomeCompleto}{p.especialidade ? <span className="text-[12px] text-gray-400"> · {p.especialidade}</span> : null}{!p.userId ? <span className="text-[12px] text-amber-600"> · sem login</span> : null}</span>
              <button onClick={() => toggleProf(p.id)} aria-label="Alternar" className="w-[38px] h-[22px] rounded-full relative transition" style={{ background: on ? "#009AAC" : "#d8d0bc" }}><span className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: on ? "18px" : "2px" }} /></button>
            </div>
          );
        })}
      </div>

      <div className={card + " mt-3"} style={{ borderColor: "#E8DFC8" }}>
        <p className="text-[13px] font-medium text-[#475569] mb-3 flex items-center gap-1.5"><LuPalette size={16} /> Cores por status</p>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((st) => {
            const v = (cfg.cores && cfg.cores[st]) || COR_DEFAULT[st];
            return (
              <label key={st} className="flex items-center gap-2 text-[13px] border rounded-lg px-2.5 py-1.5 cursor-pointer" style={{ borderColor: "#eef0ec" }}>
                <input type="color" value={v} onChange={(e) => setCor(st, e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent" />
                {st}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={salvar} disabled={saving} className="px-4 py-2 text-[14px] text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuCheck size={15} /> {saving ? "Salvando…" : "Salvar configurações"}</button>
      </div>
    </div>
  );
}
