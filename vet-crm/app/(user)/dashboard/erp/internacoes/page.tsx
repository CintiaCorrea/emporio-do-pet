"use client";
// [EMP-COWORK] Internações estilo Base44 (Ativas/Histórico, boletins/dia, valor diária) — Cintia 07/06
// Reusa /api/hospitalizations (internação = appointment c/ metadata em notes; extras em vitalSigns). Boletins via Listas intbol_<id>.

import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuPlus, LuClipboardList, LuCalendar, LuCircleDollarSign, LuBell, LuX } from "react-icons/lu";

const ESTADOS = [
  { v: "Estável", prio: "LOW", bg: "#E1F5EE", fg: "#0F6E56" },
  { v: "Em observação", prio: "MEDIUM", bg: "#E6F1FB", fg: "#0C447C" },
  { v: "Instável", prio: "HIGH", bg: "#FBEFE0", fg: "#B45309" },
  { v: "Crítico", prio: "CRITICAL", bg: "#FCE9EF", fg: "#CC3366" },
];
const CANAIS = ["WhatsApp", "Telefone", "Presencial", "E-mail"];
const prioToEstado: Record<string, string> = { LOW: "Estável", MEDIUM: "Em observação", HIGH: "Instável", CRITICAL: "Crítico" };
function estadoDe(h: any): string { return h?.vitalSigns?.estadoClinico || prioToEstado[h?.priority] || "Estável"; }
function estadoStyle(e: string) { return ESTADOS.find((x) => x.v === e) || ESTADOS[0]; }
function ini(n?: string) { return ((n || "?").trim().slice(0, 2)).toUpperCase(); }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function diasInternado(adm: string): number { try { const d = new Date(adm); const ms = Date.now() - d.getTime(); return Math.max(1, Math.ceil(ms / 86400000)); } catch { return 1; } }
function fmtData(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return "—"; } }

export default function InternacoesPage() {
  usePageTitle("Internações", "Pacientes internados e boletins");
  const [tab, setTab] = useState<"ativas" | "historico">("ativas");
  const [loading, setLoading] = useState(true);
  const [hosps, setHosps] = useState<any[]>([]);
  const [listas, setListas] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [novoOpen, setNovoOpen] = useState(false);
  const [petsModal, setPetsModal] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ tutorId: "", petId: "", userId: "", reason: "", estado: "Estável", canal: "WhatsApp", estimatedDischargeDate: "", dailyRate: "", boletinsDia: 3, boletinsHorarios: "07:00, 14:00, 20:00", notes: "" });
  const [salvando, setSalvando] = useState(false);

  const [detId, setDetId] = useState<string | null>(null);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [bolEstado, setBolEstado] = useState("Estável");
  const [bolTexto, setBolTexto] = useState("");
  const [bolSaving, setBolSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, l] = await Promise.all([
        fetch("/api/hospitalizations?limit=1000").then((r) => r.json()).catch(() => ({})),
        fetch("/api/listas").then((r) => r.json()).catch(() => []),
      ]);
      setHosps(Array.isArray(h) ? h : (h.hospitalizations || h.data || []));
      setListas(Array.isArray(l) ? l : (l.itens || l.data || []));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!novoOpen) return; (async () => {
    const [t, u] = await Promise.all([
      fetch("/api/tutors?limit=1000").then((r) => r.json()).catch(() => []),
      fetch("/api/users").then((r) => r.json()).catch(() => []),
    ]);
    setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
    setUsers(Array.isArray(u) ? u : (u.users || u.data || []));
  })(); }, [novoOpen]);
  useEffect(() => { if (!form.tutorId) { setPetsModal([]); return; } (async () => {
    try { const d = await fetch(`/api/tutors/${form.tutorId}/pets`).then((r) => r.json()); const arr = Array.isArray(d) ? d : (d.pets || d.data || []); setPetsModal(arr); setForm((f: any) => ({ ...f, petId: arr.length === 1 ? arr[0].id : "" })); } catch { setPetsModal([]); }
  })(); }, [form.tutorId]);

  const boletinsDe = (id: string) => listas.filter((x) => (x.lista || "") === `intbol_${id}`).map((x) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } });
  const boletinsHojeCount = (id: string) => { const hoje = new Date().toDateString(); return boletinsDe(id).filter((b: any) => { try { return new Date(b.at).toDateString() === hoje; } catch { return false; } }).length; };
  const proximoBoletim = (h: any) => {
    const hor = String(h?.vitalSigns?.boletinsHorarios || "").split(",").map((s: string) => s.trim()).filter(Boolean).sort();
    if (!hor.length) return null;
    const done = boletinsHojeCount(h.id);
    if (done >= hor.length) return { txt: "Boletins do dia concluídos", atrasado: false, done, total: hor.length };
    const nextH = hor[done];
    const now = new Date(); const [hh, mm] = nextH.split(":").map(Number);
    const nd = new Date(); nd.setHours(hh || 0, mm || 0, 0, 0);
    return { txt: nextH, atrasado: nd < now, done, total: hor.length };
  };

  const ativas = useMemo(() => hosps.filter((h) => !["DISCHARGED", "DECEASED"].includes(h.status)), [hosps]);
  const historico = useMemo(() => hosps.filter((h) => ["DISCHARGED", "DECEASED"].includes(h.status)), [hosps]);
  const lista = tab === "ativas" ? ativas : historico;

  const criar = async () => {
    if (!form.tutorId || !form.petId || !form.userId || !form.reason.trim()) { alert("Preencha cliente, pet, profissional e motivo."); return; }
    setSalvando(true);
    try {
      const est = estadoStyle(form.estado);
      const body = {
        tutorId: form.tutorId, petId: form.petId, userId: form.userId, reason: form.reason.trim(),
        dailyRate: Number(form.dailyRate) || 0, priority: est.prio,
        estimatedDischargeDate: form.estimatedDischargeDate || undefined, notes: form.notes || undefined,
        vitalSigns: { estadoClinico: form.estado, canalTutor: form.canal, boletinsDia: Number(form.boletinsDia) || 0, boletinsHorarios: form.boletinsHorarios },
      };
      const res = await fetch("/api/hospitalizations", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setNovoOpen(false);
      setForm({ tutorId: "", petId: "", userId: "", reason: "", estado: "Estável", canal: "WhatsApp", estimatedDischargeDate: "", dailyRate: "", boletinsDia: 3, boletinsHorarios: "07:00, 14:00, 20:00", notes: "" });
      load();
    } catch { alert("Erro ao criar internação."); }
    finally { setSalvando(false); }
  };

  const abrirDetalhes = async (id: string) => {
    setDetId(id); setBolTexto(""); 
    const h = hosps.find((x) => x.id === id); setBolEstado(estadoDe(h));
    try { const d = await fetch(`/api/listas?lista=intbol_${id}`).then((r) => r.json()); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setBoletins(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } })); } catch { setBoletins([]); }
  };
  const registrarBoletim = async () => {
    if (!detId || !bolTexto.trim()) { alert("Escreva o boletim."); return; }
    setBolSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), estado: bolEstado, texto: bolTexto.trim() });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intbol_${detId}`, valor }) });
      setBolTexto(""); await abrirDetalhes(detId); load();
    } catch { alert("Erro ao registrar boletim."); }
    finally { setBolSaving(false); }
  };
  const darAlta = async (id: string) => {
    if (!confirm("Confirmar alta deste paciente?")) return;
    try { await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DISCHARGED" }) }); setDetId(null); load(); } catch { alert("Erro ao dar alta."); }
  };

  const det = detId ? hosps.find((h) => h.id === detId) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-[13px] text-[#64748b]">{ativas.length} paciente(s) internado(s)</div>
        <button onClick={() => setNovoOpen(true)} className="text-[12px] font-medium text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova internação</button>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setTab("ativas")} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={tab === "ativas" ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>Ativas ({ativas.length})</button>
        <button onClick={() => setTab("historico")} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={tab === "historico" ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>Histórico ({historico.length})</button>
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#94a3b8]">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#94a3b8]" style={{ borderColor: "#e8dfc8" }}>{tab === "ativas" ? "Nenhum paciente internado no momento." : "Nenhuma internação no histórico."}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lista.map((h) => {
            const est = estadoStyle(estadoDe(h)); const pb = tab === "ativas" ? proximoBoletim(h) : null;
            return (
              <div key={h.id} className="bg-white border rounded-2xl p-4" style={{ borderColor: "#e8dfc8" }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0" style={{ background: est.bg, color: est.fg }}>{ini(h.pet?.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#0E2244] truncate">{h.pet?.name || "Pet"} <span className="text-[11px] text-[#94a3b8] font-normal">· {h.tutor?.name}</span></div>
                    <div className="text-[11px] text-[#888]">{h.pet?.species}{h.pet?.breed ? ` · ${h.pet.breed}` : ""}</div>
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: est.bg, color: est.fg }}>{estadoDe(h)}</span>
                </div>
                <div className="text-[12px] text-[#5b6470] mb-2"><LuClipboardList className="inline w-3.5 h-3.5 align-[-2px] text-[#94a3b8]" /> {h.reason || "—"} <span className="text-[#94a3b8]">· {h.veterinarian?.name || "Sem responsável"}</span></div>
                <div className="flex gap-4 text-[11.5px] text-[#5b6470] mb-2.5 flex-wrap">
                  <span><LuCalendar className="inline w-3.5 h-3.5 align-[-2px] text-[#009AAC]" /> Dia {diasInternado(h.admissionDate)} · desde {fmtData(h.admissionDate)}</span>
                  <span><LuCircleDollarSign className="inline w-3.5 h-3.5 align-[-2px] text-[#009AAC]" /> {fmtBRL(h.totalCost)} <span className="text-[#94a3b8]">({fmtBRL(h.dailyRate)}/dia)</span></span>
                </div>
                {pb && (
                  <div className="rounded-lg px-3 py-2 mb-2.5 flex items-center justify-between" style={pb.atrasado ? { background: "#fdf3f6", border: "1px solid #f3d2de" } : { background: "#f4fbfc", border: "1px solid #d9eef1" }}>
                    <span className="text-[11.5px]" style={{ color: pb.atrasado ? "#CC3366" : "#00798A" }}><LuBell className="inline w-3.5 h-3.5 align-[-2px]" /> {pb.atrasado ? `Boletim atrasado ${pb.txt}` : (pb.total ? `Próximo boletim ${pb.txt}` : "")}</span>
                    <span className="text-[11px] text-[#5b6470]">Hoje {pb.done}/{pb.total}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {tab === "ativas" && <button onClick={() => abrirDetalhes(h.id)} className="flex-1 text-[11.5px] text-white bg-[#009AAC] py-1.5 rounded-lg">+ Boletim</button>}
                  <button onClick={() => abrirDetalhes(h.id)} className="flex-1 text-[11.5px] text-[#00798A] bg-[#E6F6F8] py-1.5 rounded-lg">Detalhes</button>
                  {tab === "ativas" && <button onClick={() => darAlta(h.id)} className="flex-1 text-[11.5px] text-[#0F6E56] bg-[#E1F5EE] py-1.5 rounded-lg">Dar alta</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {novoOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setNovoOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}>
              <h3 className="text-base font-semibold text-[#014D5E]">Nova internação</h3>
              <button onClick={() => setNovoOpen(false)} className="text-[#94a3b8]"><LuX className="w-4 h-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Cliente *</label>
                <select value={form.tutorId} onChange={(e) => setForm({ ...form, tutorId: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"><option value="">Selecione...</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Pet *</label>
                <select value={form.petId} onChange={(e) => setForm({ ...form, petId: e.target.value })} disabled={!form.tutorId} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] disabled:bg-[#f6f5f0]"><option value="">{form.tutorId ? "Selecione o pet..." : "Selecione um cliente primeiro"}</option>{petsModal.map((p) => <option key={p.id} value={p.id}>{p.name}{p.species ? ` · ${p.species}` : ""}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Profissional responsável</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"><option value="">Selecionar...</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Estado clínico inicial</label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.v}</option>)}</select></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Motivo da internação *</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex: Pós-operatório, crise convulsiva..." className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Canal com tutor</label>
                <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Alta prevista</label>
                <input type="date" value={form.estimatedDischargeDate} onChange={(e) => setForm({ ...form, estimatedDischargeDate: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Valor diária (R$)</label>
                <input type="number" min={0} step="0.01" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} placeholder="0,00" className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Boletins/dia</label>
                <input type="number" min={0} value={form.boletinsDia} onChange={(e) => setForm({ ...form, boletinsDia: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Horários dos boletins (HH:MM separados por vírgula)</label>
                <input value={form.boletinsHorarios} onChange={(e) => setForm({ ...form, boletinsHorarios: e.target.value })} placeholder="07:00, 14:00, 20:00" className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Observações gerais</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] resize-none" /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}>
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button>
              <button onClick={criar} disabled={salvando} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{salvando ? "Salvando..." : "Internar"}</button>
            </div>
          </div>
        </div>
      )}

      {det && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDetId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}>
              <div><h3 className="text-base font-semibold text-[#014D5E]">{det.pet?.name} <span className="text-[12px] text-[#94a3b8] font-normal">· {det.tutor?.name}</span></h3></div>
              <button onClick={() => setDetId(null)} className="text-[#94a3b8]"><LuX className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-[11px] text-[#94a3b8]">Estado</div><span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: estadoStyle(estadoDe(det)).bg, color: estadoStyle(estadoDe(det)).fg }}>{estadoDe(det)}</span></div>
                <div><div className="text-[11px] text-[#94a3b8]">Responsável</div><div className="text-[#0E2244]">{det.veterinarian?.name || "—"}</div></div>
                <div className="col-span-2"><div className="text-[11px] text-[#94a3b8]">Motivo</div><div className="text-[#0E2244]">{det.reason || "—"}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Início</div><div className="text-[#0E2244]">{fmtData(det.admissionDate)} (dia {diasInternado(det.admissionDate)})</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Alta prevista</div><div className="text-[#0E2244]">{fmtData(det.estimatedDischargeDate)}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Diária / acumulado</div><div className="text-[#0E2244]">{fmtBRL(det.dailyRate)} · {fmtBRL(det.totalCost)}</div></div>
                <div><div className="text-[11px] text-[#94a3b8]">Canal</div><div className="text-[#0E2244]">{det.vitalSigns?.canalTutor || "—"}</div></div>
                {det.notes && <div className="col-span-2"><div className="text-[11px] text-[#94a3b8]">Observações</div><div className="text-[#475569]">{typeof det.notes === "string" ? det.notes : ""}</div></div>}
              </div>

              {det.status !== "DISCHARGED" && (
                <div className="border-t pt-3" style={{ borderColor: "#eef0e6" }}>
                  <div className="text-[12px] font-medium text-[#014D5E] mb-2">Registrar boletim</div>
                  <div className="flex gap-2 mb-2">
                    <select value={bolEstado} onChange={(e) => setBolEstado(e.target.value)} className="border border-[#d8d0bc] rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#009AAC]">{ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.v}</option>)}</select>
                    <input value={bolTexto} onChange={(e) => setBolTexto(e.target.value)} placeholder="Como o paciente está..." className="flex-1 border border-[#d8d0bc] rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-[#009AAC]" />
                    <button onClick={registrarBoletim} disabled={bolSaving} className="text-[12px] text-white bg-[#009AAC] px-3 py-1.5 rounded-lg disabled:opacity-60">Registrar</button>
                  </div>
                </div>
              )}

              <div className="border-t pt-3" style={{ borderColor: "#eef0e6" }}>
                <div className="text-[12px] font-medium text-[#014D5E] mb-2">Boletins ({boletins.length})</div>
                {boletins.length === 0 ? (
                  <div className="text-[12px] text-[#94a3b8]">Nenhum boletim ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {boletins.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((b) => { const es = estadoStyle(b.estado || ""); return (
                      <div key={b.id} className="bg-[#fbfaf6] border rounded-lg p-2.5" style={{ borderColor: "#eef0e6" }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] text-[#5b6470]">{fmtData(b.at)} {b.hora || ""}</span>
                          {b.estado && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.fg }}>{b.estado}</span>}
                        </div>
                        <div className="text-[12.5px] text-[#0E2244]">{b.texto}</div>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-between gap-2" style={{ borderColor: "#eef0e6" }}>
              {det.status !== "DISCHARGED" ? <button onClick={() => darAlta(det.id)} className="px-4 py-2 text-[13px] text-[#0F6E56] bg-[#E1F5EE] rounded-lg">Dar alta</button> : <span className="text-[12px] text-[#94a3b8] py-2">Paciente já recebeu alta</span>}
              <button onClick={() => setDetId(null)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
