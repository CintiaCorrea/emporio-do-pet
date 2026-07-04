"use client";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

const DIAS: [string, string][] = [["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["0", "Dom"]];
type Esc = { semana: Record<string, [string, string][]>; bloqueios: { inicio: string; fim: string; label: string }[] };
const VAZIA: Esc = { semana: {}, bloqueios: [] };
const card = "bg-white border rounded-[14px] p-4";
const inpT = "border rounded-[9px] px-2 py-1.5 text-[14px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC]";

function parseEsc(v: any): Esc {
  let o: any = v;
  if (typeof v === "string") { try { o = JSON.parse(v); } catch { o = null; } }
  if (!o || typeof o !== "object") return { semana: {}, bloqueios: [] };
  return { semana: o.semana || {}, bloqueios: Array.isArray(o.bloqueios) ? o.bloqueios : [] };
}

export default function EscalaPage() {
  usePageTitle("Escala", "Jornada e bloqueios por profissional");
  const [profs, setProfs] = useState<any[]>([]);
  const [sel, setSel] = useState<string>("");
  const [esc, setEsc] = useState<Esc>(VAZIA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/profissionais", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.data || d.items || []); const f = arr.filter((p: any) => p.ativo !== false && !["RECEPCIONISTA", "GERENTE"].includes(p.tipo)); setProfs(f); if (f[0]) { setSel(f[0].id); setEsc(parseEsc(f[0].escala)); } } catch {}
    })();
  }, []);

  function escolher(p: any) { setSel(p.id); setEsc(parseEsc(p.escala)); }
  function janelas(wd: string) { return esc.semana[wd] || []; }
  function setJanela(wd: string, i: number, idx: 0 | 1, val: string) { setEsc((e) => { const s = { ...e.semana }; const arr = [...(s[wd] || [])]; const par: [string, string] = [...(arr[i] || ["", ""])] as any; par[idx] = val; arr[i] = par; s[wd] = arr; return { ...e, semana: s }; }); }
  function addJanela(wd: string) { setEsc((e) => { const s = { ...e.semana }; s[wd] = [...(s[wd] || []), ["08:00", "12:00"]]; return { ...e, semana: s }; }); }
  function rmJanela(wd: string, i: number) { setEsc((e) => { const s = { ...e.semana }; s[wd] = (s[wd] || []).filter((_, k) => k !== i); return { ...e, semana: s }; }); }
  function addBloqueio() { setEsc((e) => ({ ...e, bloqueios: [...e.bloqueios, { inicio: "", fim: "", label: "Folga" }] })); }
  function setBloqueio(i: number, k: "inicio" | "fim" | "label", v: string) { setEsc((e) => ({ ...e, bloqueios: e.bloqueios.map((b, idx) => idx === i ? { ...b, [k]: v } : b) })); }
  function rmBloqueio(i: number) { setEsc((e) => ({ ...e, bloqueios: e.bloqueios.filter((_, k) => k !== i) })); }

  async function salvar() {
    if (!sel) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/profissionais/${sel}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ escala: esc }) });
      if (!r.ok) throw new Error();
      setProfs((ps) => ps.map((p) => p.id === sel ? { ...p, escala: esc } : p));
      toast.success("Escala salva");
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(false); }
  }

  const selProf = profs.find((p) => p.id === sel);

  return (
    <div className="p-4" style={{ background: "#F6F2EA", minHeight: "100%" }}>
      <div className="flex items-center gap-4 border-b pb-2.5 mb-4" style={{ borderColor: "#E8E2D6" }}>
        <a href="/dashboard/erp/agendamentos/agenda" className="text-[14px] text-[#5C6B70] flex items-center gap-1 hover:text-[#009AAC]"><span>📅</span> Dia</a>
        <span className="text-[14px] text-[#014D5E] font-medium border-b-2 pb-2.5 -mb-2.5 flex items-center gap-1" style={{ borderColor: "#009AAC" }}><span>📋</span> Escala</span>
        <a href="/dashboard/erp/agendamentos/configuracoes" className="text-[14px] text-[#5C6B70] flex items-center gap-1 hover:text-[#009AAC]"><span>⚙️</span> Configurações</a>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "200px minmax(0,1fr)" }}>
        <div className={card} style={{ borderColor: "#E8E2D6" }}>
          <p className="text-[12px] text-[#8A989D] mb-2">Profissionais</p>
          {profs.length === 0 ? <p className="text-[13px] text-[#8A989D]">Cadastre em Configurações › Profissionais.</p> : profs.map((p) => (
            <button key={p.id} onClick={() => escolher(p)} className="w-full text-left px-2.5 py-2 rounded-[9px] text-[14px] mb-0.5" style={sel === p.id ? { background: "#E0F4F6", color: "#014D5E", fontWeight: 500 } : { color: "#5C6B70" }}>
              <span className="mr-1">👤</span>{p.nomeExibicao || p.nomeCompleto}
            </button>
          ))}
        </div>

        <div>
          <div className={card} style={{ borderColor: "#E8E2D6" }}>
            <p className="text-[13px] font-medium text-[#014D5E] mb-3 flex items-center gap-1.5"><span>🕐</span> Jornada {selProf ? `de ${selProf.nomeExibicao || selProf.nomeCompleto}` : ""}</p>
            <div className="flex flex-col gap-2">
              {DIAS.map(([wd, lbl]) => {
                const js = janelas(wd);
                return (
                  <div key={wd} className="flex items-center gap-2 flex-wrap">
                    <span className="w-9 text-[13px] text-[#5C6B70]">{lbl}</span>
                    {js.length === 0 ? <span className="text-[12px] text-[#8A989D] italic">Folga</span> : js.map((par, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-[#E0F4F6] rounded-[9px] px-2 py-1">
                        <input type="time" step={900} value={par[0]} onChange={(e) => setJanela(wd, i, 0, e.target.value)} className={inpT + " bg-transparent border-0 px-0 py-0"} />
                        <span className="text-[#014D5E]">–</span>
                        <input type="time" step={900} value={par[1]} onChange={(e) => setJanela(wd, i, 1, e.target.value)} className={inpT + " bg-transparent border-0 px-0 py-0"} />
                        <button onClick={() => rmJanela(wd, i)} className="text-[#014D5E] text-[13px]"><span>🗑️</span></button>
                      </span>
                    ))}
                    <button onClick={() => addJanela(wd)} className="text-[12px] text-[#009AAC] inline-flex items-center gap-0.5"><span>➕</span> janela</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={card + " mt-3"} style={{ borderColor: "#E8E2D6" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-medium text-[#014D5E] flex items-center gap-1.5"><span>🚫</span> Bloqueios e exceções</p>
              <button onClick={addBloqueio} className="text-[12px] text-[#009AAC] inline-flex items-center gap-0.5"><span>➕</span> adicionar</button>
            </div>
            {esc.bloqueios.length === 0 ? <p className="text-[12px] text-[#8A989D]">Nenhum bloqueio.</p> : esc.bloqueios.map((b, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap py-1.5 border-b last:border-0" style={{ borderColor: "#F0EBE0" }}>
                <input value={b.label} onChange={(e) => setBloqueio(i, "label", e.target.value)} placeholder="Motivo (férias, folga…)" className={inpT} style={{ borderColor: "#E8E2D6", width: "180px" }} />
                <input type="date" value={b.inicio} onChange={(e) => setBloqueio(i, "inicio", e.target.value)} className={inpT} style={{ borderColor: "#E8E2D6" }} />
                <span className="text-[#8A989D] text-[13px]">até</span>
                <input type="date" value={b.fim} onChange={(e) => setBloqueio(i, "fim", e.target.value)} className={inpT} style={{ borderColor: "#E8E2D6" }} />
                <button onClick={() => rmBloqueio(i)} className="text-[#8A989D] hover:text-[#D85A30] text-[15px]"><span>🗑️</span></button>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={salvar} disabled={saving || !sel} className="px-4 py-2 text-[14px] text-white rounded-[9px] disabled:opacity-60 flex items-center gap-1.5" style={{ background: "#009AAC" }}><span>✅</span> {saving ? "Salvando…" : "Salvar escala"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
