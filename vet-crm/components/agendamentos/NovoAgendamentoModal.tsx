"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuX, LuSearch, LuRepeat, LuPlus, LuTrash2, LuCheck, LuUserPlus, LuExternalLink } from "react-icons/lu";

type Defaults = { date?: string; time?: string; userId?: string; duration?: number; tutor?: any; petId?: string } | null;
type Props = { open: boolean; onClose: () => void; onCreated?: () => void; defaults?: Defaults; editAppt?: any; inline?: boolean };

const STATUS = ["Agendado", "Confirmado", "Em espera", "Em atendimento", "Atendido", "Animal pronto", "Atrasado", "Cancelado"];
const DURACOES = [10, 15, 20, 30, 40, 45, 60, 90, 120];
const FREQS: [string, string][] = [["7", "Semanal"], ["14", "Quinzenal"], ["30", "Mensal"], ["90", "Trimestral"], ["180", "Semestral"], ["365", "Anual"]];
const DIAS: [string, string][] = [["1", "seg"], ["2", "ter"], ["3", "qua"], ["4", "qui"], ["5", "sex"], ["6", "sáb"], ["0", "dom"]];
const TIPOS_FALLBACK = ["Consulta Clínica", "Consulta Integrativa", "Consulta Fisioterapia", "MAP", "Retorno", "Vacinação", "Acupuntura", "Cirurgia"];
// lbl/inp movidos para dentro do componente (variante "inline" mais delicada)

export default function NovoAgendamentoModal({ open, onClose, onCreated, defaults, editAppt, inline }: Props) {
  const router = useRouter();
  const lbl = inline ? "text-[10.5px] text-[#5b6470] font-medium block mb-0.5" : "text-[13px] text-[#334155] font-medium block mb-1";
  const inp = inline ? "w-full border border-[#E3DEC9] rounded-lg px-2 py-1.5 text-[12.5px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" : "w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]";
  const [step, setStep] = useState(1);
  const [tutors, setTutors] = useState<any[]>([]);
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
  const [itens, setItens] = useState<{ descricao: string; qtd: string; valor: string }[]>([]);
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

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [t, p] = await Promise.all([
        fetch("/api/tutors?limit=1000").then((r) => r.json()).catch(() => []),
        fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
      ]);
      setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
      const pl = Array.isArray(p) ? p : (p.data || []);
      setProfs(pl.filter((x: any) => x.ativo !== false && x.userId && !["RECEPCIONISTA", "GERENTE"].includes(x.tipo)));
      try { const r = await fetch("/api/listas?lista=atendimento_tipo", { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); const ts = arr.map((i: any) => { try { const o = JSON.parse(i.valor); return o.l || o.nome || o.v || i.valor; } catch { return i.valor; } }).filter(Boolean); setTipos(ts.length ? ts : TIPOS_FALLBACK); } catch { setTipos(TIPOS_FALLBACK); }
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
    } else if (defaults) { if (defaults.date) setDate(defaults.date); if (defaults.time) setTime(defaults.time); if (defaults.userId) setUserId(defaults.userId); if (defaults.duration) setDuration(Number(defaults.duration)); if (defaults.tutor) { setTutor(defaults.tutor); setStep(2); } if (defaults.petId) setPetId(defaults.petId); }
  }, [open, editAppt, defaults]);

  useEffect(() => {
    if (!tutor) { setPets([]); setPetId(""); return; }
    (async () => { try { const r = await fetch(`/api/tutors/${tutor.id}/pets`); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.pets || d.data || []); setPets(arr); setPetId((cur) => cur || (arr.length === 1 ? arr[0].id : "")); } catch { setPets([]); } })();
  }, [tutor]);

  const telOf = (t: any) => (t?.contacts?.[0]?.number) || (t?.contacts?.[0]?.value) || t?.phone || "";
  const petNomes = (t: any) => (t?.pets || []).map((p: any) => p.name).filter(Boolean);
  const resultados = useMemo(() => { const q = busca.trim().toLowerCase(); if (q.length < 2) return []; const qn = busca.replace(/\D/g, ""); return tutors.filter((t: any) => (t.name || "").toLowerCase().includes(q) || (qn && telOf(t).replace(/\D/g, "").includes(qn)) || petNomes(t).some((n: string) => n.toLowerCase().includes(q))).slice(0, 25); }, [busca, tutors]);
  const previsao = itens.reduce((s, it) => s + ((Number(it.qtd) || 1) * (Number(it.valor) || 0)), 0);

  function reset() { setStep(1); setEditId(null); setNovoCli(false); setNNome(""); setNTel(""); setBusca(""); setTutor(null); setPets([]); setPetId(""); setUserId(""); setType(""); setDate(""); setTime(""); setDuration(30); setStatus("Agendado"); setObs(""); setItens([]); setRecOn(false); setFreq("7"); setDias([]); setAte(""); }
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
        const res = await fetch(`/api/appointments/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
      } else {
        for (const d of datasRecorrentes()) {
          const body: any = { tutorId: tutor.id, petId, userId, date: d.toISOString(), type: type || "Consulta", status, duration: Number(duration) || 30 };
          if (obs) body.notes = obs;
          const its = itens.filter((i) => i.descricao || i.valor).map((i) => ({ descricao: i.descricao || "Item", quantidade: Number(i.qtd) || 1, valorUnitario: Number(i.valor) || 0 }));
          if (its.length) body.items = its;
          const res = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
          if (!res.ok) throw new Error();
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
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou pet…" className="flex-1 text-[16px] text-[#14253a] focus:outline-none" />
            </div>
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {busca.trim().length < 2 ? (
                <div className="text-center text-[13px] text-[#475569] py-8">Digite ao menos 2 letras (cliente ou pet).</div>
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

            <div className={inline ? "space-y-2.5" : "grid grid-cols-3 gap-3"}>
              <div className="col-span-1"><label className={lbl}>Profissional *</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inp}>
                  <option value="">Selecione...</option>
                  {profs.map((p: any) => <option key={p.id} value={p.userId}>{p.nomeExibicao || p.nomeCompleto}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Data *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Início *</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inp} /></div>
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
                  <input value={it.descricao} onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))} placeholder="Serviço/produto" className="flex-1 min-w-0 border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" />
                  <input value={it.qtd} onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, qtd: e.target.value } : x))} placeholder="Qtd" inputMode="numeric" title="Quantidade" className="flex-none border border-[#d8d0bc] rounded-lg px-2 py-2 text-[16px] text-[#14253a] text-center focus:outline-none focus:border-[#009AAC]" style={{ width: "58px" }} />
                  <input value={it.valor} onChange={(e) => setItens((p) => p.map((x, idx) => idx === i ? { ...x, valor: e.target.value } : x))} placeholder="Valor un." inputMode="decimal" title="Valor unitário" className="flex-none border border-[#d8d0bc] rounded-lg px-3 py-2 text-[16px] text-[#14253a] focus:outline-none focus:border-[#009AAC]" style={{ width: "96px" }} />
                  <button onClick={() => setItens((p) => p.filter((_, idx) => idx !== i))} className="text-[#94a3b8] hover:text-[#E24B4A]"><LuTrash2 size={15} /></button>
                </div>
              ))}
              {itens.length ? <div className="flex justify-between text-[13px] mt-2 pt-2 border-t" style={{ borderColor: "#eef0e6" }}><span className="text-[#6b7280]">Previsão de receita</span><span className="font-medium text-[#0F6E56]">{previsao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div> : null}
            </div>
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
