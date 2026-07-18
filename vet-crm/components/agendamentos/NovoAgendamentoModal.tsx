"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LuX, LuSearch, LuRepeat, LuPlus, LuTrash2, LuCheck, LuUserPlus, LuExternalLink } from "react-icons/lu";

type Defaults = { date?: string; time?: string; userId?: string; duration?: number; tutor?: any; petId?: string; agendaAvulsa?: string; avulsaNome?: string } | null;
type Props = { open: boolean; onClose: () => void; onCreated?: () => void; defaults?: Defaults; editAppt?: any; inline?: boolean };

const STATUS = ["Agendado", "Confirmado", "Em espera", "Em atendimento", "Atendido", "Animal pronto", "Atrasado", "Cancelado"];
const DURACOES = [10, 15, 20, 30, 40, 45, 60, 90, 120];
const FREQS: [string, string][] = [["7", "Semanal"], ["14", "Quinzenal"], ["30", "Mensal"], ["90", "Trimestral"], ["180", "Semestral"], ["365", "Anual"]];
const DIAS: [string, string][] = [["1", "seg"], ["2", "ter"], ["3", "qua"], ["4", "qui"], ["5", "sex"], ["6", "sáb"], ["0", "dom"]];
const TIPOS_FALLBACK = ["Consulta Clínica", "Consulta Integrativa", "Consulta Fisioterapia", "MAP", "Retorno", "Vacinação", "Acupuntura", "Cirurgia"];
// lbl/inp movidos para dentro do componente (variante "inline" mais delicada)

export default function NovoAgendamentoModal({ open, onClose, onCreated, defaults, editAppt, inline }: Props) {
  const router = useRouter();
  const { data: _sess } = useSession();
  const meId = (_sess as any)?.user?.id as string | undefined;
  const lbl = inline ? "text-[10.5px] text-[#5b6470] font-medium block mb-0.5" : "text-[13px] text-[#334155] font-medium block mb-1";
  const inp = inline ? "w-full border border-[#E3DEC9] rounded-lg px-2 py-1.5 text-[12.5px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" : "w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]";
  const [step, setStep] = useState(1);
  const [profs, setProfs] = useState<any[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [tutor, setTutor] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [petId, setPetId] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState("Agendado");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<{ descricao: string; qtd: string; valor: string; servicoId?: string }[]>([]);
  const [servicos, setServicos] = useState<any[]>([]); // catálogo (Config › Serviços e Produtos)
  const [avulsas, setAvulsas] = useState<any[]>([]); // agendas avulsas (MAP / Parceiro) p/ poder trocar a agenda
  const [recOn, setRecOn] = useState(false);
  const [freq, setFreq] = useState("7");
  const [dias, setDias] = useState<string[]>([]);
  const [ate, setAte] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [novoCli, setNovoCli] = useState(false);
  const [nNome, setNNome] = useState("");
  const [nTel, setNTel] = useState("");
  const [savingCli, setSavingCli] = useState(false);
  const [cfgAgenda, setCfgAgenda] = useState<any>({});
  const [agendaAvulsa, setAgendaAvulsa] = useState<string>("");
  const [avulsaNome, setAvulsaNome] = useState<string>("");
  const [dayAppts, setDayAppts] = useState<any[]>([]);
  const [confirmarWa, setConfirmarWa] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [p, c] = await Promise.all([
        fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=agenda_config", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      try { const ca = Array.isArray(c) ? c : (c.itens || c.data || []); if (ca[0]?.valor) setCfgAgenda(JSON.parse(ca[0].valor)); } catch {}
      const pl = Array.isArray(p) ? p : (p.data || []);
      setProfs(pl.filter((x: any) => x.ativo !== false && x.userId && !["RECEPCIONISTA", "GERENTE"].includes(x.tipo)));
      try { const r = await fetch("/api/listas?lista=atendimento_tipo", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); const ts = arr.map((i: any) => { try { const o = JSON.parse(i.valor); return o.l || o.nome || o.v || i.valor; } catch { return i.valor; } }).filter(Boolean); setTipos(ts.length ? ts : TIPOS_FALLBACK); } catch { setTipos(TIPOS_FALLBACK); }
      try { const r = await fetch("/api/servicos/itens?limit=1000", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.servicos || d.itens || d.data || []); setServicos(arr); } catch {}
      try { const r = await fetch("/api/listas?lista=agenda_avulsa", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setAvulsas(arr.map((i: any) => { try { return JSON.parse(i.valor); } catch { return null; } }).filter((a: any) => a && a.ativo !== false)); } catch {}
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editAppt) {
      const dd = new Date(editAppt.date); const z = (n: number) => String(n).padStart(2, "0");
      setEditId(editAppt.id); setStep(2);
      setTutor(editAppt.tutor || { id: editAppt.tutorId, name: editAppt.tutor?.name || "Cliente" });
      setPetId(editAppt.pet?.id || editAppt.petId || ""); setUserId(editAppt.userId || "");
      setType(editAppt.type || ""); setStatus(editAppt.status || "Agendado");
      setDate(`${dd.getFullYear()}-${z(dd.getMonth() + 1)}-${z(dd.getDate())}`); setTime(`${z(dd.getHours())}:${z(dd.getMinutes())}`);
      setDuration(editAppt.duration || 30); setObs(editAppt.notes || "");
      setAgendaAvulsa(editAppt.agendaAvulsa || ""); setAvulsaNome(editAppt.agendaAvulsaNome || "");
    } else if (defaults) { if (defaults.date) setDate(defaults.date); if (defaults.time) setTime(defaults.time); if (defaults.userId) setUserId(defaults.userId); if (defaults.duration) setDuration(Number(defaults.duration)); if (defaults.tutor) { setTutor(defaults.tutor); setStep(2); } if (defaults.petId) setPetId(defaults.petId); if (defaults.agendaAvulsa) setAgendaAvulsa(defaults.agendaAvulsa); if (defaults.avulsaNome) setAvulsaNome(defaults.avulsaNome); }
  }, [open, editAppt, defaults]);

  useEffect(() => {
    if (!tutor) { setPets([]); setPetId(""); return; }
    (async () => { try { const r = await fetch(`/api/tutors/${tutor.id}/pets`); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.pets || d.data || []); setPets(arr); setPetId((cur) => cur || (arr.length === 1 ? arr[0].id : "")); } catch { setPets([]); } })();
  }, [tutor]);

  useEffect(() => {
    if (!userId || !date) { setDayAppts([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/appointments?userId=${userId}&startDate=${date}T00:00:00&endDate=${date}T23:59:59&limit=200`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.appointments || d.data || []);
        if (!cancelled) setDayAppts(arr);
      } catch { if (!cancelled) setDayAppts([]); }
    })();
    return () => { cancelled = true; };
  }, [userId, date]);

  const telOf = (t: any) => (t?.contacts?.[0]?.number) || (t?.contacts?.[0]?.value) || t?.phone || "";
  const petNomes = (t: any) => (t?.pets || []).map((p: any) => p.name).filter(Boolean);
  // Busca de cliente no SERVIDOR (entre todos os clientes), com debounce.
  // Antes filtrava só os 1000 carregados no navegador -> clientes além disso não apareciam.
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscandoCli, setBuscandoCli] = useState(false);
  useEffect(() => {
    const q = busca.trim();
    if (q.length < 2) { setResultados([]); setBuscandoCli(false); return; }
    let cancelled = false; setBuscandoCli(true);
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(q)}&limit=25`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.tutors || d.data || []);
        if (!cancelled) setResultados(arr);
      } catch { if (!cancelled) setResultados([]); }
      if (!cancelled) setBuscandoCli(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(h); };
  }, [busca]);
  const previsao = itens.reduce((s, it) => s + ((Number(it.qtd) || 1) * (Number(it.valor) || 0)), 0);
  function escDe(p: any) { let o: any = p?.escala; if (typeof o === "string") { try { o = JSON.parse(o); } catch { o = null; } } return o && typeof o === "object" ? o : null; }
  const fmtMin = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  const slotsLivres = useMemo(() => {
    if (!userId || !date) return [] as number[];
    const prof = profs.find((p: any) => p.userId === userId);
    const wd = new Date(`${date}T00:00:00`).getDay();
    const hm = (s: string) => { const [a, b] = (s || "0:0").split(":"); return (+a) * 60 + (+b); };
    let windows: number[][] = [];
    // Agenda avulsa (MAP/Parceiro) usa o HORÁRIO DELA; profissional usa a escala dele.
    const av = agendaAvulsa ? avulsas.find((a: any) => a.id === agendaAvulsa) : null;
    const e = av ? escDe({ escala: av.horario }) : escDe(prof);
    if (e && e.semana) {
      if (Array.isArray(e.bloqueios) && e.bloqueios.some((b: any) => b.inicio && date >= b.inicio && (!b.fim || date <= b.fim))) return [];
      const js = e.semana[String(wd)] || [];
      if (js.length === 0) return [];
      windows = js.map((par: any) => [hm(par[0]), hm(par[1])]);
    } else {
      const hi = Number(cfgAgenda?.horaInicio ?? 8), hf = Number(cfgAgenda?.horaFim ?? 19);
      windows = [[hi * 60, hf * 60]];
    }
    // Padrão 30 min (igual à grade da agenda). Só usa 15 se estiver configurado assim.
    const step = Number(cfgAgenda?.intervalo) === 15 ? 15 : 30;
    const dur = Number(duration) || 30;
    const busy = dayAppts.filter((a: any) => a.id !== editId && a.date).map((a: any) => { const d = new Date(a.date); const s = d.getHours() * 60 + d.getMinutes(); return [s, s + (Number(a.duration) || 30)]; });
    const out: number[] = [];
    for (const win of windows) {
      for (let t = win[0]; t + dur <= win[1]; t += step) {
        if (!busy.some((b: number[]) => t < b[1] && t + dur > b[0])) out.push(t);
      }
    }
    return out;
  }, [userId, date, duration, profs, cfgAgenda, dayAppts, editId, agendaAvulsa, avulsas]);

  function reset() { setStep(1); setEditId(null); setNovoCli(false); setNNome(""); setNTel(""); setBusca(""); setTutor(null); setPets([]); setPetId(""); setUserId(""); setType(""); setDate(""); setTime(""); setDuration(30); setStatus("Agendado"); setObs(""); setItens([]); setRecOn(false); setFreq("7"); setDias([]); setAte(""); setAgendaAvulsa(""); setAvulsaNome(""); }
  function fechar() { reset(); onClose(); }
  function escolherTutor(t: any) { setTutor(t); setStep(2); }
  function toggleDia(d: string) { setDias((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]); }

  function datasRecorrentes(): Date[] {
    const base = new Date(`${date}T${time || "09:00"}`);
    const out: Date[] = [base];
    if (!recOn || !ate) return out;
    const fim = new Date(`${ate}T23:59:59`);
    const stepDays = Number(freq);
    if (stepDays === 7 || stepDays === 14) {
      const wd = dias.length ? dias.map(Number) : [base.getDay()];
      const cursor = new Date(base); cursor.setDate(cursor.getDate() + 1);
      while (cursor.getTime() <= fim.getTime() && out.length < 120) {
        if (wd.includes(cursor.getDay())) {
          if (stepDays === 7) out.push(new Date(cursor));
          else { const wIdx = Math.floor((cursor.getTime() - base.getTime()) / (7 * 864e5)); if (wIdx % 2 === 0) out.push(new Date(cursor)); }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const cursor = new Date(base);
      while (out.length < 120) { cursor.setDate(cursor.getDate() + stepDays); if (cursor.getTime() > fim.getTime()) break; out.push(new Date(cursor)); }
    }
    return out;
  }

  const salvar = async () => {
    if (!tutor || !petId || !userId || !date || !time) { alert("Preencha cliente, pet, profissional, data e horário."); return; }
    setSaving(true);
    try {
      if (editId) {
        const body: any = { petId, userId, date: new Date(`${date}T${time}`).toISOString(), type: type || "Consulta", status, duration: Number(duration) || 30, notes: obs };
        if (agendaAvulsa) body.agendaAvulsa = agendaAvulsa;
        const res = await fetch(`/api/appointments/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
      } else {
        for (const d of datasRecorrentes()) {
          const body: any = { tutorId: tutor.id, petId, userId, date: d.toISOString(), type: type || "Consulta", status, duration: Number(duration) || 30 };
          if (agendaAvulsa) body.agendaAvulsa = agendaAvulsa;
          if (obs) body.notes = obs;
          const its = itens.filter((i) => i.descricao || i.valor).map((i) => ({ descricao: i.descricao || "Item", quantidade: Number(i.qtd) || 1, valorUnitario: Number(i.valor) || 0, ...(i.servicoId ? { servicoId: i.servicoId, productId: i.servicoId } : {}) }));
          if (its.length) body.items = its;
          const res = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
          if (!res.ok) throw new Error();
        }
        if (confirmarWa && tutor) {
          try {
            const profNome = (profs.find((p: any) => p.userId === userId)?.nomeExibicao) || "nossa equipe";
            const [yy, mm, dd] = date.split("-");
            const texto = `Olá ${(tutor.name || "").split(" ")[0] || ""}! 🐾 Sua consulta no Empório do Pet está agendada para ${dd}/${mm}/${yy} às ${time}, com ${profNome}. Qualquer dúvida, responda por aqui. Até breve! 💙`;
            const rc = await fetch(`/api/survey-avaliacao/mensagem-tutor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor.id, texto }) });
            const dc = await rc.json().catch(() => null);
            if (!rc.ok || !dc?.success) alert("Agendamento salvo! Mas a confirmação por WhatsApp não saiu agora (a Meta só permite mensagem fora da janela de 24h com um modelo aprovado).");
          } catch {}
        }
      }
      fechar(); if (onCreated) onCreated();
    } catch { alert("Erro ao criar agendamento. Tente novamente."); } finally { setSaving(false); }
  };

  const excluir = async () => {
    if (!editId || !confirm("Excluir este agendamento?")) return;
    setSaving(true);
    try { const res = await fetch(`/api/appointments/${editId}`, { method: "DELETE", credentials: "include" }); if (!res.ok) throw new Error(); fechar(); if (onCreated) onCreated(); }
    catch { alert("Erro ao excluir."); } finally { setSaving(false); }
  };
  const cadastrarCli = async () => {
    if (!nNome.trim() || nTel.replace(/\D/g, "").length < 8) { alert("Informe nome e telefone."); return; }
    setSavingCli(true);
    try {
      const res = await fetch("/api/tutors", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: nNome.trim(), contacts: [{ type: "MOBILE", number: nTel.replace(/\D/g, ""), isPrimary: true, isWhatsApp: true }] }) });
      const novo = await res.json(); if (!res.ok || !novo?.id) throw new Error();
      setNovoCli(false); setNNome(""); setNTel(""); onClose(); router.push(`/dashboard/erp/tutores/${novo.id}`);
    } catch { alert("Erro ao cadastrar cliente."); } finally { setSavingCli(false); }
  };

  if (!open) return null;

  return (
    <div className={inline ? "mt-2" : "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"} onClick={inline ? undefined : fechar}>
      <div className={inline ? "bg-white border rounded-xl w-full overflow-y-auto" : "bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto"} style={inline ? { borderColor: "#E8DFC8", maxHeight: 520 } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "#eef0e6" }}>
          <h3 className="text-base font-semibold text-[#014D5E]">{editId ? "Editar agendamento" : "Novo agendamento"}</h3>
          {editId ? null : step === 2 ? <span className="text-[11px] text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full">passo 2 · preencher</span> : <span className="text-[11px] text-[#6b7280]">passo 1 · localizar cliente</span>}
          <button onClick={fechar} className="ml-auto text-[#94a3b8] hover:text-[#5b6470]"><LuX size={18} /></button>
        </div>

        {step === 1 && !editId ? (
          <div className="p-5">
            <div className="flex items-center gap-2 border border-[#d8d0bc] rounded-lg px-3 py-2 mb-3">
              <LuSearch size={16} className="text-[#94a3b8]" />
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente (nome, telefone ou CPF)…" className="flex-1 text-[16px] text-[#14253a] focus:outline-none" />
            </div>
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {busca.trim().length < 2 ? (
                <div className="text-center text-[13px] text-[#475569] py-8">Digite ao menos 2 letras do nome, telefone ou CPF.</div>
              ) : buscandoCli ? (
                <div className="text-center text-[13px] text-[#475569] py-8">Buscando…</div>
              ) : resultados.length === 0 ? (
                <div className="text-center text-[13px] text-[#475569] py-8">Nenhum cliente encontrado.</div>
              ) : resultados.map((t: any) => (
                <button key={t.id} onClick={() => escolherTutor(t)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f6fdfd] text-left">
                  <span className="w-8 h-8 rounded-full bg-[#E1F3F5] text-[#014D5E] text-[11px] font-medium flex items-center justify-center shrink-0">{(t.name || "?").split(" ").slice(0, 2).map((x: string) => x[0]).join("").toUpperCase()}</span>
                  <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[#0E2244] truncate">{t.name}</span><span className="block text-[13px] text-[#475569] truncate">{petNomes(t).length ? petNomes(t).join(", ") : telOf(t)}</span></span>
                </button>
              ))}
            </div>
            {novoCli ? (
              <div className="border border-[#e8e3d4] rounded-lg p-4 mt-3 space-y-2">
                <div className="text-[15px] font-semibold text-[#0E2244]">Novo cliente</div>
                <div><label className={lbl}>Nome *</label><input value={nNome} onChange={(e) => setNNome(e.target.value)} placeholder="Nome completo" className={inp} /></div>
                <div><label className={lbl}>Telefone</label><input value={nTel} onChange={(e) => setNTel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") cadastrarCli(); }} placeholder="(85) 9 9999-9999" inputMode="tel" className={inp} /></div>
                <p className="text-[12px] text-gray-400">Depois de criar, você completa o resto (CPF, endereço, pet…) direto na ficha.</p>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setNovoCli(false)} className="px-4 py-2 text-[14px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button>
                  <button onClick={cadastrarCli} disabled={savingCli} className="px-4 py-2 text-[14px] text-white rounded-lg disabled:opacity-60 inline-flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuExternalLink size={15} /> {savingCli ? "Criando…" : "Criar e abrir ficha"}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNovoCli(true)} className="text-[14px] text-[#009AAC] mt-3 inline-flex items-center gap-1"><LuUserPlus size={14} /> Cadastrar novo cliente</button>
            )}
          </div>
        ) : (
          <div className={inline ? "p-3 space-y-2.5 text-[12.5px] text-[#14253a]" : "p-5 space-y-3 text-[16px] text-[#14253a]"}>
            {!inline && (
            <div className="flex items-center gap-3 bg-[#f6f7f4] rounded-lg px-3 py-2">
              <span className="w-8 h-8 rounded-full bg-[#E1F3F5] text-[#014D5E] text-[11px] font-medium flex items-center justify-center shrink-0">{(tutor?.name || "?").split(" ").slice(0, 2).map((x: string) => x[0]).join("").toUpperCase()}</span>
              <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[#0E2244] truncate">{tutor?.name}</span><span className="block text-[13px] text-[#475569]">{telOf(tutor)}</span></span>
              {editId ? null : <button onClick={() => { setStep(1); setTutor(null); setPetId(""); }} className="text-[12px] text-[#009AAC]">Trocar</button>}
            </div>
            )}

            <div className={inline ? "" : "grid grid-cols-2 gap-3"}>
              {!inline && (
              <div><label className={lbl}>Animal *</label>
                <select value={petId} onChange={(e) => setPetId(e.target.value)} className={inp}>
                  <option value="">{pets.length ? "Selecione o pet..." : "Cliente sem pets"}</option>
                  {pets.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.species ? ` · ${p.species}` : ""}</option>)}
                </select>
              </div>
              )}
              <div><label className={lbl}>Tipo de atendimento *</label>
                <input list="ag-tipos" value={type} onChange={(e) => setType(e.target.value)} placeholder="Selecione…" className={inp} />
                <datalist id="ag-tipos">{tipos.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
            </div>

            <div className={inline ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
              <div><label className={lbl}>Agenda / Profissional *</label>
                <select
                  value={agendaAvulsa ? `av:${agendaAvulsa}` : (userId ? `pf:${userId}` : "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.startsWith("av:")) { const id = v.slice(3); setAgendaAvulsa(id); setAvulsaNome(avulsas.find((a: any) => a.id === id)?.nome || ""); if (!userId) setUserId(meId || ""); }
                    else if (v.startsWith("pf:")) { setAgendaAvulsa(""); setAvulsaNome(""); setUserId(v.slice(3)); }
                    else { setAgendaAvulsa(""); setAvulsaNome(""); setUserId(""); }
                  }}
                  className={inp}
                >
                  <option value="">Selecione...</option>
                  <optgroup label="👩‍⚕️ Profissionais">
                    {profs.map((p: any) => <option key={p.id} value={`pf:${p.userId}`}>{p.nomeExibicao || p.nomeCompleto}</option>)}
                  </optgroup>
                  {avulsas.length > 0 && (
                    <optgroup label="📋 Agendas avulsas">
                      {avulsas.map((a: any) => <option key={a.id} value={`av:${a.id}`}>{a.nome}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div><label className={lbl}>Data *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} /></div>
            </div>
            <div>
              <label className={lbl}>Horário livre *</label>
              {(!userId || !date) ? (
                <div className="text-[11px] text-gray-400">Escolha o profissional e a data para ver os horários livres.</div>
              ) : slotsLivres.length === 0 ? (
                <div className="space-y-1">
                  <div className="text-[11px]" style={{ color: "#B45309" }}>Sem horários livres nesse dia — defina manualmente:</div>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inp} />
                </div>
              ) : (
                <div className="space-y-2">
                  {([["Manhã", 0, 720], ["Tarde", 720, 1440]] as [string, number, number][]).map(([rotulo, ini, fim]) => {
                    const ps = slotsLivres.filter((t) => t >= ini && t < fim);
                    if (!ps.length) return null;
                    return (
                      <div key={rotulo}>
                        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{rotulo}</div>
                        <div className="flex flex-wrap gap-1">
                          {ps.map((t) => { const on = time === fmtMin(t); return (
                            <button key={t} type="button" title={`${fmtMin(t)}–${fmtMin(t + (Number(duration) || 30))}`} onClick={() => setTime(fmtMin(t))} className="text-[11px] rounded-md px-2 py-1 border" style={on ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { color: "#475569", borderColor: "#E3DEC9", background: "white" }}>{fmtMin(t)}</button>
                          ); })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Duração</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inp}>{DURACOES.map((d) => <option key={d} value={d}>{d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}min` : ""}` : `${d} min`}</option>)}</select>
              </div>
              <div><label className={lbl}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </div>
            </div>

            {profs.length === 0 ? <p className="text-[11px] text-amber-600">Nenhum profissional com login cadastrado. Cadastre/vincule em Configurações › Profissionais.</p> : null}

            <div><label className={lbl}>Observações</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações do agendamento…" className={inp} style={{ minHeight: "48px" }} /></div>

            <div className="border border-[#e8e3d4] rounded-lg p-3">
              <label className="flex items-center gap-2 text-[13px] text-[#0E2244] cursor-pointer"><input type="checkbox" checked={recOn} onChange={(e) => setRecOn(e.target.checked)} /> <LuRepeat size={14} className="text-[#009AAC]" /> Repetir (recorrência)</label>
              {recOn ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Frequência</label><select value={freq} onChange={(e) => setFreq(e.target.value)} className={inp}>{FREQS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div><label className={lbl}>Repetir até</label><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inp} /></div>
                  </div>
                  {(freq === "7" || freq === "14") ? (
                    <div className="flex gap-1.5 flex-wrap">{DIAS.map(([v, l]) => { const on = dias.includes(v); return <button key={v} onClick={() => toggleDia(v)} className="text-[11px] rounded-md px-2.5 py-1 border" style={on ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { color: "#475569", borderColor: "#d8d0bc" }}>{l}</button>; })}</div>
                  ) : null}
                  <p className="text-[13px] text-[#475569]">Ao salvar, cria um agendamento pra cada data.</p>
                </div>
              ) : null}
            </div>

            <div className="border border-[#e8e3d4] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#0E2244]">Produtos / serviços <span className="text-[13px] text-[#475569]">(opcional)</span></span>
                <button onClick={() => setItens((p) => [...p, { descricao: "", qtd: "1", valor: "" }])} className="text-[12px] text-[#009AAC] inline-flex items-center gap-1"><LuPlus size={13} /> Adicionar</button>
              </div>
              {itens.map((it, i) => (
                <div key={i} className="flex items-center gap-2 mt-2">
                  <input list="ag-catalogo" value={it.descricao} onChange={(e) => { const val = e.target.value; const hit = servicos.find((s: any) => String(s.nome || "").toLowerCase() === val.toLowerCase()); setItens((p) => p.map((x, idx) => idx === i ? { ...x, descricao: val, ...(hit ? { valor: String(hit.valorPadrao ?? hit.valor ?? x.valor ?? ""), servicoId: hit.id } : { servicoId: undefined }) } : x)); }} placeholder="Buscar serviço/produto do catálogo…" className="flex-1 min-w-0 border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" />
                  <input value={it.qtd} onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, qtd: e.target.value } : x))} placeholder="Qtd" inputMode="numeric" title="Quantidade" className="flex-none border border-[#d8d0bc] rounded-lg px-2 py-2 text-[16px] text-[#14253a] text-center focus:outline-none focus:border-[#009AAC]" style={{ width: "58px" }} />
                  <input value={it.valor} onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, valor: e.target.value } : x))} placeholder="Valor un." inputMode="decimal" title="Valor unitário" className="flex-none border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" style={{ width: "96px" }} />
                  <button onClick={() => setItens((p) => p.filter((_, idx) => idx !== i))} className="text-[#94a3b8] hover:text-[#E24B4A]"><LuTrash2 size={15} /></button>
                </div>
              ))}
              <datalist id="ag-catalogo">{servicos.map((s: any) => <option key={s.id} value={s.nome}>{Number(s.valorPadrao ?? s.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</option>)}</datalist>
              {itens.some((it) => it.descricao && !it.servicoId) ? <div className="text-[11px] text-[#8a6400] mt-1">Itens sem vínculo com o catálogo entram como “avulso” (sem comissão/estoque). Escolha da lista pra vincular.</div> : null}
              {itens.length ? <div className="flex justify-between text-[13px] mt-2 pt-2 border-t" style={{ borderColor: "#eef0e6" }}><span className="text-[#6b7280]">Previsão de receita</span><span className="font-medium text-[#0F6E56]">{previsao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div> : null}
            </div>
          </div>
        )}

        {!editId && step === 2 && (
          <div className={inline ? "px-3 pb-1" : "px-5 pb-1"}>
            <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: inline ? "11.5px" : "13px", color: "#0E2244" }}>
              <input type="checkbox" checked={confirmarWa} onChange={(e) => setConfirmarWa(e.target.checked)} /> Enviar confirmação por WhatsApp
            </label>
          </div>
        )}
        <div className="px-5 py-4 border-t flex items-center gap-2" style={{ borderColor: "#eef0e6" }}>
          {editId ? <button onClick={excluir} disabled={saving} className="px-3 py-2 text-[13px] text-[#9b2c3a] inline-flex items-center gap-1.5"><LuTrash2 size={15} /> Excluir</button> : null}
          <div className="ml-auto flex gap-2">
            <button onClick={fechar} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg hover:bg-[#ece8dd]">Cancelar</button>
            {(step === 2 || editId) ? <button onClick={salvar} disabled={saving} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60 inline-flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuCheck size={15} /> {saving ? "Salvando..." : (editId ? "Salvar" : "Salvar agendamento")}</button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
