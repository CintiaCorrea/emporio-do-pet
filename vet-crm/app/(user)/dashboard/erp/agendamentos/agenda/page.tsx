"use client";
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { useRolePreview } from "@/lib/ui/RolePreview";
import NovoAgendamentoModal from "@/components/agendamentos/NovoAgendamentoModal";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import toast from "react-hot-toast";

const HORAS = Array.from({ length: 12 }, (_, i) => i + 8);
const STATUS_COR: Record<string, { c: string; bg: string }> = {
  "Agendado": { c: "#185FA5", bg: "#E6F1FB" }, "Confirmado": { c: "#0F6E56", bg: "#E1F5EE" },
  "Em espera": { c: "#854F0B", bg: "#FAEEDA" }, "Aguardando": { c: "#854F0B", bg: "#FAEEDA" },
  "Em atendimento": { c: "#0F6E56", bg: "#E1F5EE" }, "Atendido": { c: "#3B6D11", bg: "#EAF3DE" },
  "Realizado": { c: "#3B6D11", bg: "#EAF3DE" }, "Atrasado": { c: "#A32D2D", bg: "#FCEBEB" },
  "Cancelado": { c: "#5F5E5A", bg: "#F1EFE8" }, "Faltou": { c: "#A32D2D", bg: "#FCEBEB" },
};
function corDe(st?: string, cores?: any) { const base = STATUS_COR[st || ""] || { c: "#5F5E5A", bg: "#F1EFE8" }; return { c: base.c, bg: (cores && cores[st || ""]) || base.bg }; }
function ymd(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function hm(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
function nomeCurto(p: any) { if (p.nomeExibicao && p.nomeExibicao.trim()) return p.nomeExibicao; const w = (p.nomeCompleto || "Profissional").trim().split(/\s+/); return w.slice(0, 2).map(cap).join(" "); }
function inic(p: any) { if (p.iniciais && p.iniciais.trim()) return p.iniciais.slice(0, 2).toUpperCase(); const w = (p.nomeCompleto || "").trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase() || "—"; }
function norm(s?: string) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(dra?|dr)\.?\b/g, "").replace(/\s+/g, " ").trim(); }
function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function addD(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const DIAS_SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "s\u00e1b"];

export default function AgendaPage() {
  usePageTitle("Agenda", "Agendamentos do dia por profissional");
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === "ADMIN";
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const mostrarValores = isAdmin && valoresVisiveis;
  const [dia, setDia] = useState<Date>(() => new Date());
  const [appts, setAppts] = useState<any[]>([]);
  const [profs, setProfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoDefaults, setNovoDefaults] = useState<any>(null);
  const [editAppt, setEditAppt] = useState<any>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [cfg, setCfg] = useState<any>(null);
  const [view, setView] = useState<"dia" | "semana" | "mes">("dia");
  const [menuAppt, setMenuAppt] = useState<{ a: any; x: number; y: number } | null>(null);

  useEffect(() => { try { const s = localStorage.getItem("agenda_filas_hidden"); if (s) setHidden(new Set(JSON.parse(s))); } catch {} }, []);
  function persist(s: Set<string>) { try { localStorage.setItem("agenda_filas_hidden", JSON.stringify([...s])); } catch {} }

  async function load() {
    setLoading(true);
    try {
      const [a, p, c] = await Promise.all([
        fetch("/api/appointments?limit=1000", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/profissionais", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=agenda_config", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setAppts(Array.isArray(a) ? a : (a.data || a.appointments || a.items || []));
      setProfs(Array.isArray(p) ? p : (p.data || p.items || []));
      try { const arr = Array.isArray(c) ? c : (c.itens || c.data || []); if (arr[0]?.valor) setCfg(JSON.parse(arr[0].valor)); } catch {}
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const profsAtende = useMemo(() => profs.filter((p: any) => p.ativo !== false && !["RECEPCIONISTA", "GERENTE"].includes(p.tipo) && !((cfg?.profsOcultos || []).includes(p.id))), [profs, cfg]);
  const hIni = Number(cfg?.horaInicio ?? 8); const hFim = Number(cfg?.horaFim ?? 19);
  const horas = useMemo(() => Array.from({ length: Math.max(hFim - hIni + 1, 1) }, (_, i) => i + hIni), [hIni, hFim]);
  const slots = useMemo(() => (Number(cfg?.intervalo) === 30 ? [0, 30] : [0, 15, 30, 45]), [cfg]);
  const wdAtual = dia.getDay();
  function escDe(p: any) { let o: any = p?.escala; if (typeof o === "string") { try { o = JSON.parse(o); } catch { o = null; } } return o && typeof o === "object" ? o : null; }
  function foraDoHorario(p: any, h: number, m: number) { const e = escDe(p); if (!e || !e.semana) return false; if (Array.isArray(e.bloqueios) && e.bloqueios.some((b: any) => b.inicio && diaStr >= b.inicio && (!b.fim || diaStr <= b.fim))) return true; const js = e.semana[String(wdAtual)] || []; if (js.length === 0) return true; const t = h * 60 + m; return !js.some((par: any) => { const a = (par[0] || "0:0").split(":"); const b = (par[1] || "0:0").split(":"); return t >= (+a[0]) * 60 + (+a[1]) && t < (+b[0]) * 60 + (+b[1]); }); }
  const visiveis = useMemo(() => profsAtende.filter((p: any) => !hidden.has(p.id)), [profsAtende, hidden]);

  const diaStr = ymd(dia);
  const doDia = useMemo(() => appts.filter((a: any) => a.date && ymd(new Date(a.date)) === diaStr), [appts, diaStr]);
  function valorDe(a: any) { const tr = a.treatments || []; return tr.reduce((s: number, t: any) => s + (Number(t.product?.price) || Number(t.valorUnitario) || 0) * (Number(t.quantidade) || 1), 0); }
  const profUserIds = useMemo(() => new Set(profsAtende.map((p: any) => p.userId).filter(Boolean)), [profsAtende]);
  function ehDoProf(a: any, prof: any) {
    if (prof.userId && a.userId === prof.userId) return true;
    if (!profUserIds.has(a.userId)) { const an = norm(a.user?.name); if (an && (an === norm(prof.nomeCompleto) || an === norm(prof.nomeExibicao))) return true; }
    return false;
  }
  function apptsDe(prof: any, hora: number, minuto: number) { return doDia.filter((a: any) => { if (!ehDoProf(a, prof)) return false; const d = new Date(a.date); return d.getHours() === hora && Math.floor(d.getMinutes() / 15) * 15 === minuto; }); }
  const doDiaVis = useMemo(() => doDia.filter((a: any) => visiveis.some((p: any) => ehDoProf(a, p))), [doDia, visiveis, profUserIds]);
  const previsao = useMemo(() => doDiaVis.reduce((s: number, a: any) => s + valorDe(a), 0), [doDiaVis]);
  const espera = useMemo(() => doDiaVis.filter((a: any) => ["Em espera", "Aguardando", "Em atendimento"].includes(a.status)), [doDiaVis]);

  function addDays(n: number) { const d = new Date(dia); if (view === "mes") d.setMonth(d.getMonth() + n); else if (view === "semana") d.setDate(d.getDate() + n * 7); else d.setDate(d.getDate() + n); setDia(d); }
  function cardMenu(e: any, a: any) { e.stopPropagation(); setMenuAppt({ a, x: e.clientX, y: e.clientY }); }
  function toggleFila(id: string) { const s = new Set(hidden); s.has(id) ? s.delete(id) : s.add(id); setHidden(s); persist(s); }
  function soEste(id: string) { const s = new Set(profsAtende.filter((p: any) => p.id !== id).map((p: any) => p.id)); setHidden(s); persist(s); }
  function esperaDesde(a: any) { const diff = Math.round((Date.now() - new Date(a.date).getTime()) / 60000); return diff > 0 ? `há ${diff} min` : hm(new Date(a.date)); }
  const label = dia.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
  const tituloView = view === "mes" ? cap(dia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })) : view === "semana" ? (() => { const i = startOfWeek(dia); const f = addD(i, 6); return `${i.getDate()}/${i.getMonth() + 1} – ${f.getDate()}/${f.getMonth() + 1}`; })() : labelCap;
  const cols = `52px repeat(${Math.max(visiveis.length, 1)}, minmax(120px, 1fr))`;

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => addDays(-1)} aria-label="Dia anterior" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[#5C6B70] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><LuChevronLeft size={16} /></button>
          <button onClick={() => setDia(new Date())} className="px-3 h-8 rounded-lg border text-[13px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>Hoje</button>
          <button onClick={() => addDays(1)} aria-label="Próximo dia" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[#5C6B70] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><LuChevronRight size={16} /></button>
          <span className="text-[14px] font-medium ml-2" style={{ color: "#014D5E" }}>{tituloView}</span>
        </div>
        <div className="flex-1" />
        <input type="date" value={diaStr} onChange={(e) => { if (e.target.value) setDia(new Date(e.target.value + "T12:00:00")); }} className="text-[13px] px-2 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6" }} />
        <div className="flex gap-0.5 border rounded-lg p-0.5" style={{ borderColor: "#E8E2D6" }}>
          {(([["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]]) as [any, string][]).map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} className="text-[12px] px-3 py-1.5 rounded-md" style={view === v ? { background: "#009AAC", color: "#fff" } : { color: "#5C6B70" }}>{lbl}</button>
          ))}
        </div>
        <a href="/dashboard/erp/agendamentos/escala" title="Escala" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[16px] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>📆</a>
        <a href="/dashboard/erp/agendamentos/configuracoes" title="Configurações da agenda" className="w-8 h-8 rounded-lg border flex items-center justify-center text-[16px] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>⚙️</a>
        <button onClick={() => { setEditAppt(null); setNovoDefaults({ date: diaStr, duration: cfg?.duracaoPadrao }); setNovoOpen(true); }} className="text-[13px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>➕ Agendar</button>
      </div>

      {profsAtende.length > 0 ? (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-[#8A989D] flex items-center gap-1.5">🔎 Filas</span>
          {profsAtende.map((p: any) => { const on = !hidden.has(p.id); return (
            <span key={p.id} className="inline-flex items-center rounded-full border text-[11px]" style={on ? { background: "#E1F3F5", color: "#014D5E", borderColor: "#9ED8DE" } : { background: "#fff", color: "#8A989D", borderColor: "#E8E2D6" }}>
              <button onClick={() => toggleFila(p.id)} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"><span className="w-2 h-2 rounded-full" style={{ background: p.corAvatar || "#009AAC" }} />{nomeCurto(p)}{on ? <span className="text-[11px]">✓</span> : null}</button>
              <button onClick={() => soEste(p.id)} title="Mostrar só este" className="text-[10px] pr-2.5 pl-1 py-1 opacity-70 hover:opacity-100">só</button>
            </span>
          ); })}
        </div>
      ) : null}

      {view === "dia" && (<>
      <div className="flex gap-2.5 mb-3">
        <div className="rounded-lg px-3.5 py-2.5 border" style={{ background: "#FBF9F4", borderColor: "#F0EBE0" }}><div className="text-[11px] text-[#5C6B70]">📋 Agendamentos</div><div className="text-[18px] font-medium" style={{ color: "#014D5E" }}>{doDiaVis.length}</div></div>
        {isAdmin ? (
          <div className="rounded-lg px-3.5 py-2.5 border" style={{ background: "#FBF9F4", borderColor: "#F0EBE0" }}>
            <div className="text-[11px] text-[#5C6B70] flex items-center gap-1">💰 Previsão do dia<button onClick={() => setValoresVisiveis((v) => !v)} title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"} className="text-[12px] leading-none">{valoresVisiveis ? "👁️" : "🙈"}</button></div>
            <div className="text-[18px] font-medium" style={{ color: "#0F6E56" }}>{valoresVisiveis ? brl(previsao) : "R$ ••••"}</div>
          </div>
        ) : null}
        <div className="rounded-lg px-3.5 py-2.5 border" style={{ background: "#FBF9F4", borderColor: "#F0EBE0" }}><div className="text-[11px] text-[#5C6B70]">⏳ Aguardando</div><div className="text-[18px] font-medium" style={{ color: "#854F0B" }}>{espera.length}</div></div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 248px" }}>
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-12">Carregando agenda...</div>
          ) : visiveis.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-12">{profsAtende.length === 0 ? "Cadastre profissionais em Configurações › Profissionais." : "Nenhuma fila selecionada — escolha acima."}</div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${64 + visiveis.length * 130}px` }}>
                <div className="grid border-b" style={{ gridTemplateColumns: cols, borderColor: "#F0EBE0", background: "#FBF9F4" }}>
                  <div />
                  {visiveis.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-center gap-1.5 py-2.5 px-2 border-l" style={{ borderColor: "#F0EBE0" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: p.corAvatar || "#009AAC" }} />
                      <span className="text-[12px] font-medium" style={{ color: "#014D5E" }}>{nomeCurto(p)}</span>
                    </div>
                  ))}
                </div>
                {horas.flatMap((h) => slots.map((m) => (
                  <div key={`${h}-${m}`} className="grid" style={{ gridTemplateColumns: cols, borderBottom: m === slots[slots.length - 1] ? "0.5px solid #F0EBE0" : "0.5px dashed #F0EBE0", minHeight: "22px" }}>
                    <div className="text-[10px] text-right pr-2 pt-0.5" style={{ color: m === 0 ? "#8A989D" : "#cbd2cb" }}>{m === 0 ? `${String(h).padStart(2, "0")}:00` : `:${m}`}</div>
                    {visiveis.map((p: any) => (
                      <div key={p.id} onClick={() => { if (!p.userId) { toast("Profissional sem login — cadastre o acesso em Configurações › Profissionais"); return; } setEditAppt(null); setNovoDefaults({ date: diaStr, time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, userId: p.userId, duration: cfg?.duracaoPadrao }); setNovoOpen(true); }} className="border-l p-0.5 cursor-pointer hover:bg-[#f9fbfb]" style={{ borderColor: "#F0EBE0", background: foraDoHorario(p, h, m) ? "repeating-linear-gradient(45deg,#f5f6f4,#f5f6f4 4px,#e9ebe6 4px,#e9ebe6 8px)" : undefined }}>
                        {apptsDe(p, h, m).map((a: any) => { const cor = corDe(a.status, cfg?.cores); const v = valorDe(a); const quem = a.pet?.name ? `${a.pet.name}${a.tutor?.name ? ` · ${a.tutor.name}` : ""}` : (a.tutor?.name || "Agendamento"); return (
                          <div key={a.id} onClick={(e) => cardMenu(e, a)} title="Clique para editar" className="rounded-r-md px-2 py-1 mb-0.5 cursor-pointer" style={{ borderLeft: `3px solid ${cor.c}`, background: cor.bg }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-medium" style={{ color: cor.c }}>{hm(new Date(a.date))}</span>
                              {mostrarValores && v > 0 ? <span className="text-[10px] font-medium" style={{ color: "#0F6E56" }}>{brl(v)}</span> : null}
                            </div>
                            <div className="text-[12px] font-medium truncate" style={{ color: "#014D5E" }}>{quem}</div>
                            <div className="text-[10px] truncate" style={{ color: cor.c }}>{a.type || "Atendimento"}{a.status ? ` · ${a.status}` : ""}</div>
                          </div>
                        ); })}
                      </div>
                    ))}
                  </div>
                )))}
              </div>
            </div>
          )}
          <div className="flex gap-3 flex-wrap px-3 py-2 border-t text-[11px] text-[#5C6B70]" style={{ borderColor: "#F0EBE0" }}>
            <span className="flex items-center gap-1">🔵 Agendado</span>
            <span className="flex items-center gap-1">🟠 Em espera</span>
            <span className="flex items-center gap-1">🟢 Em atendimento</span>
            <span className="flex items-center gap-1">✅ Atendido</span>
            <span className="flex items-center gap-1">🔴 Atrasado</span>
          </div>
        </div>

        <aside className="bg-white border rounded-2xl overflow-hidden self-start" style={{ borderColor: "#E8E2D6" }}>
          <div className="px-3.5 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[14px]">🪑</span>
            <span className="text-[13px] font-medium" style={{ color: "#014D5E" }}>Sala de espera</span>
            <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: "#854F0B" }}>{espera.length}</span>
          </div>
          {espera.length === 0 ? (
            <div className="text-center text-[12px] text-gray-400 py-8 px-3">Ninguém aguardando agora.</div>
          ) : (
            <div className="p-2 space-y-1.5">
              {espera.map((a: any) => (
                <div key={a.id} className="rounded-lg px-2.5 py-2" style={{ background: "#FAEEDA" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium" style={{ color: "#014D5E" }}>{a.pet?.name ? `${a.pet.name}${a.tutor?.name ? ` · ${a.tutor.name}` : ""}` : (a.tutor?.name || "—")}</span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: "#854F0B" }}>⏱ {esperaDesde(a)}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#854F0B" }}>{a.type || "Atendimento"} · {a.user?.name || ""}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      </>)}

      {view === "semana" && (
        <div className="bg-white border rounded-2xl overflow-x-auto" style={{ borderColor: "#E8E2D6" }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(120px,1fr))" }}>
            {Array.from({ length: 7 }, (_, i) => addD(startOfWeek(dia), i)).map((d) => {
              const ds = ymd(d); const hoje = ds === ymd(new Date());
              const list = appts.filter((a: any) => a.date && ymd(new Date(a.date)) === ds).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return (
                <div key={ds} className="border-l first:border-l-0 min-h-[360px]" style={{ borderColor: "#F0EBE0" }}>
                  <button onClick={() => { setDia(d); setView("dia"); }} className="w-full text-center py-2 border-b hover:bg-[#f6fdfd]" style={{ borderColor: "#F0EBE0", background: hoje ? "#E1F3F5" : "#FBF9F4" }}>
                    <div className="text-[10px] uppercase text-[#8A989D]">{DIAS_SEM[d.getDay()]}</div>
                    <div className="text-[13px] font-medium" style={{ color: hoje ? "#014D5E" : "#014D5E" }}>{d.getDate()}</div>
                  </button>
                  <div className="p-1 space-y-1">
                    {list.length === 0 ? <div className="text-[10px] text-gray-300 text-center py-3">—</div> : list.map((a: any) => { const cor = corDe(a.status, cfg?.cores); return (
                      <div key={a.id} onClick={(e) => cardMenu(e, a)} title="Clique para ações" className="rounded-r-md px-1.5 py-1 cursor-pointer" style={{ borderLeft: `3px solid ${cor.c}`, background: cor.bg }}>
                        <div className="text-[10px] font-medium" style={{ color: cor.c }}>{hm(new Date(a.date))}</div>
                        <div className="text-[11px] truncate" style={{ color: "#014D5E" }}>{a.pet?.name || a.tutor?.name || "Agendamento"}</div>
                      </div>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "mes" && (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
          <div className="grid text-center text-[10px] uppercase text-[#8A989D] border-b" style={{ gridTemplateColumns: "repeat(7,1fr)", borderColor: "#F0EBE0", background: "#FBF9F4" }}>
            {DIAS_SEM.map((d) => <div key={d} className="py-1.5">{d}</div>)}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
            {Array.from({ length: 42 }, (_, i) => addD(startOfWeek(new Date(dia.getFullYear(), dia.getMonth(), 1)), i)).map((d) => {
              const ds = ymd(d); const inMonth = d.getMonth() === dia.getMonth(); const hoje = ds === ymd(new Date());
              const list = appts.filter((a: any) => a.date && ymd(new Date(a.date)) === ds).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return (
                <div key={ds} onClick={() => { setDia(d); setView("dia"); }} className="border-l border-t p-1 min-h-[92px] cursor-pointer hover:bg-[#f9fbfb]" style={{ borderColor: "#F0EBE0", opacity: inMonth ? 1 : 0.4, background: hoje ? "#F2FBFC" : undefined }}>
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: hoje ? "#014D5E" : "#014D5E" }}>{d.getDate()}</div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((a: any) => { const cor = corDe(a.status, cfg?.cores); return (
                      <div key={a.id} onClick={(e) => cardMenu(e, a)} className="rounded px-1 truncate text-[9.5px]" style={{ background: cor.bg, color: cor.c }}>{hm(new Date(a.date))} {a.pet?.name || a.tutor?.name || ""}</div>
                    ); })}
                    {list.length > 3 ? <div className="text-[9px] text-gray-400">+{list.length - 3}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {menuAppt && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAppt(null)} />
          <div className="fixed z-50 bg-white border rounded-lg shadow-lg py-1 text-[13px]" style={{ left: Math.min(menuAppt.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 230), top: Math.min(menuAppt.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 160), minWidth: 208, borderColor: "#E8E2D6" }}>
            <div className="px-3 py-1.5 text-[11px] text-[#8A989D] border-b truncate" style={{ borderColor: "#F0EBE0" }}>{menuAppt.a.pet?.name || menuAppt.a.tutor?.name || "Agendamento"}</div>
            <button onClick={() => { const a = menuAppt.a; setMenuAppt(null); setNovoDefaults(null); setEditAppt(a); setNovoOpen(true); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">✏️ Editar agendamento</button>
            <button onClick={() => { const id = menuAppt.a.id; setMenuAppt(null); window.location.href = `/dashboard/erp/atendimentos/${id}`; }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">🩺 Abrir atendimento</button>
          </div>
        </>
      )}

      <NovoAgendamentoModal open={novoOpen} defaults={novoDefaults} editAppt={editAppt} onClose={() => { setNovoOpen(false); setNovoDefaults(null); setEditAppt(null); }} onCreated={() => { setNovoOpen(false); setNovoDefaults(null); setEditAppt(null); load(); }} />
    </div>
  );
}
