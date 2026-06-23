"use client";
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import NovoAgendamentoModal from "@/components/agendamentos/NovoAgendamentoModal";
import { LuChevronLeft, LuChevronRight, LuPlus, LuClock, LuUsers, LuFilter } from "react-icons/lu";
import toast from "react-hot-toast";

const HORAS = Array.from({ length: 12 }, (_, i) => i + 8);
const STATUS_COR: Record<string, { c: string; bg: string }> = {
  "Agendado": { c: "#185FA5", bg: "#E6F1FB" },
  "Confirmado": { c: "#0F6E56", bg: "#E1F5EE" },
  "Em espera": { c: "#854F0B", bg: "#FAEEDA" },
  "Aguardando": { c: "#854F0B", bg: "#FAEEDA" },
  "Em atendimento": { c: "#0F6E56", bg: "#E1F5EE" },
  "Atendido": { c: "#3B6D11", bg: "#EAF3DE" },
  "Realizado": { c: "#3B6D11", bg: "#EAF3DE" },
  "Atrasado": { c: "#A32D2D", bg: "#FCEBEB" },
  "Cancelado": { c: "#5F5E5A", bg: "#F1EFE8" },
  "Faltou": { c: "#A32D2D", bg: "#FCEBEB" },
};
function corDe(st?: string) { return STATUS_COR[st || ""] || { c: "#5F5E5A", bg: "#F1EFE8" }; }
function ymd(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function hm(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function AgendaPage() {
  usePageTitle("Agenda", "Agendamentos do dia por profissional");
  const [dia, setDia] = useState<Date>(() => new Date());
  const [appts, setAppts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        fetch("/api/appointments?limit=1000", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/users", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setAppts(Array.isArray(a) ? a : (a.data || a.appointments || a.items || []));
      setUsers(Array.isArray(u) ? u : (u.users || u.data || []));
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const diaStr = ymd(dia);
  const doDia = useMemo(() => appts.filter((a: any) => a.date && ymd(new Date(a.date)) === diaStr), [appts, diaStr]);

  const profs = useMemo(() => {
    const ativos = new Set(doDia.map((a: any) => a.user?.id || a.userId).filter(Boolean));
    let list = users.filter((u: any) => ativos.has(u.id));
    if (list.length === 0) list = users.slice(0, 5);
    return list;
  }, [users, doDia]);

  function valorDe(a: any) {
    const tr = a.treatments || [];
    return tr.reduce((s: number, t: any) => s + (Number(t.product?.price) || Number(t.valorUnitario) || 0) * (Number(t.quantidade) || 1), 0);
  }
  const previsao = useMemo(() => doDia.reduce((s: number, a: any) => s + valorDe(a), 0), [doDia]);
  const espera = useMemo(() => doDia.filter((a: any) => ["Em espera", "Aguardando", "Em atendimento"].includes(a.status)), [doDia]);

  function addDays(n: number) { const d = new Date(dia); d.setDate(d.getDate() + n); setDia(d); }
  const hojeStr = ymd(new Date());
  const label = dia.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

  function cardsDe(profId: string, hora: number) {
    return doDia.filter((a: any) => (a.user?.id || a.userId) === profId && new Date(a.date).getHours() === hora);
  }
  function esperaDesde(a: any) {
    const diff = Math.round((Date.now() - new Date(a.date).getTime()) / 60000);
    return diff > 0 ? `há ${diff} min` : hm(new Date(a.date));
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => addDays(-1)} aria-label="Dia anterior" className="w-8 h-8 rounded-lg border flex items-center justify-center text-gray-500 hover:text-[#009AAC]" style={{ borderColor: "#E8DFC8" }}><LuChevronLeft size={16} /></button>
          <button onClick={() => setDia(new Date())} className="px-3 h-8 rounded-lg border text-[13px] text-gray-600" style={{ borderColor: "#E8DFC8" }}>Hoje</button>
          <button onClick={() => addDays(1)} aria-label="Próximo dia" className="w-8 h-8 rounded-lg border flex items-center justify-center text-gray-500 hover:text-[#009AAC]" style={{ borderColor: "#E8DFC8" }}><LuChevronRight size={16} /></button>
          <span className="text-[14px] font-medium ml-2" style={{ color: "#0E2244" }}>{labelCap}{diaStr === hojeStr ? "" : ""}</span>
        </div>
        <div className="flex-1" />
        <input type="date" value={diaStr} onChange={(e) => { if (e.target.value) setDia(new Date(e.target.value + "T12:00:00")); }} className="text-[13px] px-2 py-1.5 rounded-lg border" style={{ borderColor: "#E8DFC8" }} />
        <div className="flex gap-0.5 border rounded-lg p-0.5" style={{ borderColor: "#E8DFC8" }}>
          <span className="text-[12px] px-3 py-1.5 rounded-md text-white" style={{ background: "#009AAC" }}>Dia</span>
          <button onClick={() => toast("Visão semana chega numa próxima fatia")} className="text-[12px] px-3 py-1.5 rounded-md text-gray-500">Semana</button>
          <button onClick={() => toast("Visão mês chega numa próxima fatia")} className="text-[12px] px-3 py-1.5 rounded-md text-gray-500">Mês</button>
        </div>
        <button onClick={() => setNovoOpen(true)} className="text-[13px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuPlus size={15} /> Agendar</button>
      </div>

      <div className="flex gap-2.5 mb-3">
        <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#F1F5F9" }}><div className="text-[11px] text-gray-500">Agendamentos</div><div className="text-[18px] font-medium" style={{ color: "#0E2244" }}>{doDia.length}</div></div>
        <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#F1F5F9" }}><div className="text-[11px] text-gray-500">Previsão do dia</div><div className="text-[18px] font-medium" style={{ color: "#0F6E56" }}>{brl(previsao)}</div></div>
        <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#F1F5F9" }}><div className="text-[11px] text-gray-500">Aguardando</div><div className="text-[18px] font-medium" style={{ color: "#854F0B" }}>{espera.length}</div></div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 248px" }}>
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-12">Carregando agenda...</div>
          ) : profs.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-12">Nenhum profissional cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${64 + profs.length * 150}px` }}>
                <div className="grid border-b" style={{ gridTemplateColumns: `52px repeat(${profs.length}, 1fr)`, borderColor: "#eef0ec", background: "#fafbfa" }}>
                  <div />
                  {profs.map((p: any) => <div key={p.id} className="text-[12px] font-medium text-center py-2 px-2 border-l" style={{ color: "#475569", borderColor: "#eef0ec" }}>{p.name}</div>)}
                </div>
                {HORAS.map((h) => (
                  <div key={h} className="grid border-b" style={{ gridTemplateColumns: `52px repeat(${profs.length}, 1fr)`, borderColor: "#eef0ec", minHeight: "56px" }}>
                    <div className="text-[11px] text-gray-400 text-right pr-2 pt-1.5">{String(h).padStart(2, "0")}:00</div>
                    {profs.map((p: any) => (
                      <div key={p.id} className="border-l p-1" style={{ borderColor: "#eef0ec" }}>
                        {cardsDe(p.id, h).map((a: any) => { const cor = corDe(a.status); const v = valorDe(a); return (
                          <div key={a.id} className="rounded-r-md px-2 py-1.5 mb-1" style={{ borderLeft: `3px solid ${cor.c}`, background: cor.bg }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-medium" style={{ color: cor.c }}>{hm(new Date(a.date))}</span>
                              {v > 0 ? <span className="text-[10px] font-medium" style={{ color: "#0F6E56" }}>{brl(v)}</span> : null}
                            </div>
                            <div className="text-[12px] font-medium truncate" style={{ color: "#0E2244" }}>{a.pet?.name || a.tutor?.name || "Agendamento"}</div>
                            <div className="text-[10px] truncate" style={{ color: cor.c }}>{a.type || "Atendimento"}{a.status ? ` · ${a.status}` : ""}</div>
                          </div>
                        ); })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="bg-white border rounded-2xl overflow-hidden self-start" style={{ borderColor: "#e8edf0" }}>
          <div className="px-3.5 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "#eef0ec" }}>
            <LuUsers size={15} style={{ color: "#854F0B" }} />
            <span className="text-[13px] font-medium" style={{ color: "#0E2244" }}>Sala de espera</span>
            <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: "#854F0B" }}>{espera.length}</span>
          </div>
          {espera.length === 0 ? (
            <div className="text-center text-[12px] text-gray-400 py-8 px-3">Ninguém aguardando agora.</div>
          ) : (
            <div className="p-2 space-y-1.5">
              {espera.map((a: any) => (
                <div key={a.id} className="rounded-lg px-2.5 py-2" style={{ background: "#FAEEDA" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium" style={{ color: "#0E2244" }}>{a.pet?.name || a.tutor?.name || "—"}</span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: "#854F0B" }}><LuClock size={11} /> {esperaDesde(a)}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#854F0B" }}>{a.type || "Atendimento"} · {a.user?.name || ""}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <NovoAgendamentoModal open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={() => { setNovoOpen(false); load(); }} />
    </div>
  );
}
