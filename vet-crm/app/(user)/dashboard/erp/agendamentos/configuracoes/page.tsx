"use client";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuCheck, LuClock, LuUsers, LuPalette, LuArrowLeft, LuCalendarPlus, LuPencil, LuTrash2, LuPlus } from "react-icons/lu";
import toast from "react-hot-toast";
import EscalaEditor, { parseEsc } from "@/components/agendamentos/EscalaEditor";

const CORES_AVULSA = ["#7C3AED", "#009AAC", "#0F6E56", "#B45309", "#A32D2D", "#2563EB", "#DB2777", "#475569"];
function uid() { try { return crypto.randomUUID(); } catch { return "av-" + Date.now() + "-" + Math.floor(Math.random() * 1e6); } }

const STATUSES = ["Agendado", "Confirmado", "Em espera", "Em atendimento", "Atendido", "Cancelado"];
const COR_DEFAULT: Record<string, string> = { "Agendado": "#E6F1FB", "Confirmado": "#E1F5EE", "Em espera": "#FAEEDA", "Em atendimento": "#E1F5EE", "Atendido": "#EAF3DE", "Cancelado": "#F1EFE8" };
const DEF = { horaInicio: 8, horaFim: 19, intervalo: 30, duracaoPadrao: 30, profsOcultos: [] as string[], cores: {} as Record<string, string> };
const card = "bg-white border rounded-xl p-4";
const lbl = "text-[12px] text-[#475569] block mb-1";
const inp = "w-full border rounded-lg px-3 py-2 text-[14px] text-[#14253a] focus:outline-none focus:border-[#009AAC]";

export default function AgendaConfigPage() {
  usePageTitle("Configurações da agenda", "Horários, intervalo e profissionais exibidos");
  const [cfg, setCfg] = useState<any>(DEF);
  const [itemId, setItemId] = useState<string | null>(null);
  const [profs, setProfs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  // Agendas avulsas (Parceiro externo / MAP) — cada uma é um ListaItem {lista:"agenda_avulsa", valor: JSON{id,nome,cor,ativo}}
  const [avulsas, setAvulsas] = useState<any[]>([]);
  const [avForm, setAvForm] = useState<any>(null); // {_id?, id, nome, cor, ativo} em edição/criação
  const [avDel, setAvDel] = useState<any>(null);
  const [avSaving, setAvSaving] = useState(false);

  async function loadAvulsas() {
    try { const r = await fetch("/api/listas?lista=agenda_avulsa", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setAvulsas(arr.map((i: any) => { try { return { _id: i.id, ...JSON.parse(i.valor) }; } catch { return null; } }).filter(Boolean)); } catch {}
  }

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/listas?lista=agenda_config", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); if (arr[0]) { setItemId(arr[0].id); try { setCfg({ ...DEF, ...JSON.parse(arr[0].valor) }); } catch {} } } catch {}
      try { const r = await fetch("/api/profissionais", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.data || d.items || []); setProfs(arr.filter((p: any) => p.ativo !== false && !["RECEPCIONISTA", "GERENTE"].includes(p.tipo))); } catch {}
      loadAvulsas();
    })();
  }, []);

  async function salvarAvulsa() {
    if (!avForm?.nome?.trim()) { toast.error("Dê um nome à agenda."); return; }
    setAvSaving(true);
    try {
      const payload = { id: avForm.id, nome: avForm.nome.trim(), cor: avForm.cor || CORES_AVULSA[0], ativo: avForm.ativo !== false, horario: avForm.horario || null };
      const valor = JSON.stringify(payload);
      if (avForm._id) await fetch(`/api/listas/${avForm._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "agenda_avulsa", valor }) });
      toast.success("Agenda salva"); setAvForm(null); await loadAvulsas();
    } catch { toast.error("Erro ao salvar"); } finally { setAvSaving(false); }
  }
  async function excluirAvulsa() {
    if (!avDel?._id) { setAvDel(null); return; }
    try { await fetch(`/api/listas/${avDel._id}`, { method: "DELETE", credentials: "include" }); toast.success("Agenda excluída"); setAvDel(null); await loadAvulsas(); }
    catch { toast.error("Erro ao excluir"); }
  }
  async function toggleAvulsa(a: any) {
    try { await fetch(`/api/listas/${a._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify({ id: a.id, nome: a.nome, cor: a.cor, ativo: !(a.ativo !== false), horario: a.horario || null }) }) }); await loadAvulsas(); }
    catch { toast.error("Erro ao atualizar"); }
  }

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
        {/* Escala movida pro cadastro do profissional (Configurações › Equipe). */}
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

      <div className={card + " mt-3"} style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-medium text-[#475569] flex items-center gap-1.5"><LuCalendarPlus size={16} /> Agendas avulsas</p>
          <button onClick={() => setAvForm({ id: uid(), nome: "", cor: CORES_AVULSA[0], ativo: true })} className="text-[12px] text-[#009AAC] inline-flex items-center gap-1"><LuPlus size={13} /> Adicionar</button>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">Colunas na agenda que não estão ligadas a um profissional — ex.: Parceiro externo, MAP.</p>
        {avulsas.length === 0 ? <p className="text-[13px] text-gray-400">Nenhuma agenda avulsa. Clique em “Adicionar”.</p> : avulsas.map((a: any) => (
          <div key={a._id} className="flex items-center gap-2 py-2 border-b last:border-0" style={{ borderColor: "#eef0ec" }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: a.cor || "#7C3AED" }} />
            <span className="text-[14px] flex-1">{a.nome}{a.ativo === false ? <span className="text-[12px] text-gray-400"> · inativa</span> : null}</span>
            <button onClick={() => toggleAvulsa(a)} aria-label="Alternar" className="w-[38px] h-[22px] rounded-full relative transition" style={{ background: a.ativo !== false ? "#009AAC" : "#d8d0bc" }}><span className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: a.ativo !== false ? "18px" : "2px" }} /></button>
            <button onClick={() => setAvForm({ ...a })} className="text-[#94a3b8] hover:text-[#009AAC] p-1" aria-label="Editar"><LuPencil size={15} /></button>
            <button onClick={() => setAvDel(a)} className="text-[#94a3b8] hover:text-[#E24B4A] p-1" aria-label="Excluir"><LuTrash2 size={15} /></button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={salvar} disabled={saving} className="px-4 py-2 text-[14px] text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuCheck size={15} /> {saving ? "Salvando…" : "Salvar configurações"}</button>
      </div>

      {avForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setAvForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#014D5E] mb-3">{avForm._id ? "Editar agenda" : "Nova agenda avulsa"}</h3>
            <label className={lbl}>Nome</label>
            <input autoFocus value={avForm.nome} onChange={(e) => setAvForm((f: any) => ({ ...f, nome: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") salvarAvulsa(); }} placeholder="Ex.: Parceiro externo, MAP…" className={inp} style={{ borderColor: "#d8d0bc" }} />
            <label className={lbl + " mt-3"}>Cor da coluna</label>
            <div className="flex flex-wrap gap-2">
              {CORES_AVULSA.map((c) => <button key={c} onClick={() => setAvForm((f: any) => ({ ...f, cor: c }))} className="w-7 h-7 rounded-full" style={{ background: c, outline: avForm.cor === c ? "2px solid #014D5E" : "none", outlineOffset: 2 }} aria-label={c} />)}
            </div>
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "#E8DFC8" }}>
              <p className="text-[13px] font-medium mb-1 flex items-center gap-1.5" style={{ color: "#0E2244" }}><LuClock size={15} /> Horário de funcionamento</p>
              <p className="text-[12px] text-gray-400 mb-2">Fora desses horários os espaços ficam bloqueados. Dia sem janela = a coluna não aparece. Deixe vazio pra aparecer sempre.</p>
              <EscalaEditor value={parseEsc(avForm.horario)} onChange={(h) => setAvForm((f: any) => ({ ...f, horario: h }))} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAvForm(null)} className="px-4 py-2 text-[14px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button>
              <button onClick={salvarAvulsa} disabled={avSaving} className="px-4 py-2 text-[14px] text-white rounded-lg disabled:opacity-60 inline-flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuCheck size={15} /> {avSaving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {avDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setAvDel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#9b2c3a] mb-2">Excluir agenda</h3>
            <p className="text-[14px] text-[#334155] mb-1">Excluir a agenda <b>{avDel.nome}</b>?</p>
            <p className="text-[12px] text-gray-400 mb-4">Os agendamentos já lançados nela continuam no sistema, mas a coluna deixa de aparecer na agenda.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAvDel(null)} className="px-4 py-2 text-[14px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button>
              <button onClick={excluirAvulsa} className="px-4 py-2 text-[14px] text-white rounded-lg inline-flex items-center gap-1.5" style={{ background: "#E24B4A" }}><LuTrash2 size={15} /> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
