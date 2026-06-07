"use client";
// [EMP-COWORK] Modal Novo Agendamento (Cliente -> Pet -> data/hora) — substitui a tela antiga do dev (Cintia 07/06)

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

const TIPOS = [
  { v: "CONSULTA", l: "Consulta" },
  { v: "RETORNO", l: "Retorno" },
  { v: "AVALIACAO", l: "Avaliação" },
  { v: "VACINACAO", l: "Vacinação" },
  { v: "PROCEDIMENTO", l: "Procedimento" },
  { v: "SESSAO_FISIO", l: "Sessão de fisioterapia" },
  { v: "CIRURGIA", l: "Cirurgia" },
  { v: "EMERGENCIA", l: "Emergência" },
  { v: "OUTRO", l: "Outro" },
];

export default function NovoAgendamentoModal({ open, onClose, onCreated }: Props) {
  const [tutors, setTutors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [tutorId, setTutorId] = useState("");
  const [petId, setPetId] = useState("");
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [type, setType] = useState("CONSULTA");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [t, u] = await Promise.all([
          fetch("/api/tutors?limit=1000").then((r) => r.json()).catch(() => []),
          fetch("/api/users").then((r) => r.json()).catch(() => []),
        ]);
        setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
        setUsers(Array.isArray(u) ? u : (u.users || u.data || []));
      } catch {}
    })();
  }, [open]);

  useEffect(() => {
    if (!tutorId) { setPets([]); setPetId(""); return; }
    (async () => {
      try {
        const r = await fetch(`/api/tutors/${tutorId}/pets`);
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.pets || d.data || []);
        setPets(arr); setPetId(arr.length === 1 ? arr[0].id : "");
      } catch { setPets([]); }
    })();
  }, [tutorId]);

  if (!open) return null;

  const salvar = async () => {
    if (!tutorId || !petId || !userId || !date || !time) { alert("Preencha cliente, pet, profissional, data e horário."); return; }
    setSaving(true);
    try {
      const dateTime = new Date(`${date}T${time}`);
      const res = await fetch("/api/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ tutorId, petId, userId, date: dateTime.toISOString(), type, status: "SCHEDULED", duration: Number(duration) || 30 }),
      });
      if (!res.ok) throw new Error();
      setTutorId(""); setPetId(""); setUserId(""); setDate(""); setTime(""); setType("CONSULTA"); setDuration(30);
      onClose(); if (onCreated) onCreated();
    } catch { alert("Erro ao criar agendamento. Tente novamente."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}>
          <h3 className="text-base font-semibold text-[#014D5E]">Novo agendamento</h3>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#5b6470] text-sm">✕</button>
        </div>
        <div className="p-5 space-y-3 text-[13px]">
          <div>
            <label className="text-[11px] text-[#6b7280] block mb-1">Cliente *</label>
            <select value={tutorId} onChange={(e) => setTutorId(e.target.value)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">
              <option value="">Selecione um cliente...</option>
              {tutors.map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
            <Link href="/dashboard/erp/tutores" className="text-[11px] text-[#009AAC] mt-1 inline-block">+ Cadastrar cliente</Link>
          </div>
          <div>
            <label className="text-[11px] text-[#6b7280] block mb-1">Pet *</label>
            <select value={petId} onChange={(e) => setPetId(e.target.value)} disabled={!tutorId} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] disabled:bg-[#f6f5f0] disabled:text-[#94a3b8]">
              <option value="">{tutorId ? (pets.length ? "Selecione o pet..." : "Cliente sem pets") : "Selecione um cliente primeiro"}</option>
              {pets.map((p: any) => (<option key={p.id} value={p.id}>{p.name}{p.species ? ` · ${p.species}` : ""}</option>))}
            </select>
            {tutorId && (<Link href="/dashboard/erp/pets" className="text-[11px] text-[#009AAC] mt-1 inline-block">+ Cadastrar pet</Link>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#6b7280] block mb-1">Profissional *</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">
                <option value="">Selecione...</option>
                {users.map((u: any) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] block mb-1">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">
                {TIPOS.map((t) => (<option key={t.v} value={t.v}>{t.l}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] block mb-1">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] block mb-1">Horário *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7280] block mb-1">Duração (min)</label>
              <input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}>
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg hover:bg-[#ece8dd]">Cancelar</button>
          <button onClick={salvar} disabled={saving} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Agendar"}</button>
        </div>
      </div>
    </div>
  );
}
