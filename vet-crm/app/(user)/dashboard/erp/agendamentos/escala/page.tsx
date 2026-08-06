"use client";
// Escala — tela única de EQUIPE + HORÁRIOS (Cintia 06/08). Reúne 3 abas:
//   1) Escala de trabalho: horário semanal de cada profissional (alimenta a agenda).
//   2) Acesso por horário: restrição de login + acesso livre + avisos (movido de Config › Acesso por horário).
//   3) Plantão: revezamento semanal (diurno/noturno).
// Base44, largura cheia. Guarda tudo em /api/listas (sem tocar no schema) + /api/profissionais.

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import EscalaEditor, { parseEsc, type Esc } from "@/components/agendamentos/EscalaEditor";

type Prof = {
  id: string; nomeCompleto: string; nomeExibicao?: string | null; ativo: boolean;
  escala?: any; user?: { id: string; role: string; email: string } | null;
};

const temEscala = (e: any) => { try { const o = typeof e === "string" ? JSON.parse(e) : e; return !!o && o.semana && Object.keys(o.semana).length > 0; } catch { return false; } };

// Segunda-feira da semana de uma data (âncora da escala semanal de plantão).
function segundaDaSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}
const fmtYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDiaMes = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const addDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DIAS_PLANTAO: Array<{ dow: number; label: string; turnos: Array<"dia" | "noite"> }> = [
  { dow: 1, label: "Segunda", turnos: ["noite"] },
  { dow: 2, label: "Terça", turnos: ["noite"] },
  { dow: 3, label: "Quarta", turnos: ["noite"] },
  { dow: 4, label: "Quinta", turnos: ["noite"] },
  { dow: 5, label: "Sexta", turnos: ["noite"] },
  { dow: 6, label: "Sábado", turnos: ["noite"] },
  { dow: 0, label: "Domingo", turnos: ["dia", "noite"] },
];

type Tab = "trabalho" | "acesso" | "plantao";
const TABS: { v: Tab; label: string }[] = [
  { v: "trabalho", label: "🗓️ Escala de trabalho" },
  { v: "acesso", label: "🔒 Acesso por horário" },
  { v: "plantao", label: "🌙 Plantão" },
];

const Switch = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className="relative w-11 h-6 rounded-full transition disabled:opacity-50" style={{ background: on ? "#009AAC" : "#d8d0bc" }}>
    <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: on ? "20px" : "3px" }} />
  </button>
);

export default function EscalaPage() {
  usePageTitle("Escala", "Equipe e horários — escala de trabalho, acesso por horário e plantão.");
  const [tab, setTab] = useState<Tab>("trabalho");

  // ── comum ──
  const [profs, setProfs] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);

  // ── escala de trabalho ──
  const [aberto, setAberto] = useState<string | null>(null); // profId com editor aberto
  const [escEdits, setEscEdits] = useState<Record<string, Esc>>({});
  const [salvandoEsc, setSalvandoEsc] = useState<string | null>(null);

  // ── acesso por horário ──
  const [cfg, setCfg] = useState<{ ativo: boolean; toleranciaMin: number; avisarAdmin: boolean; whatsappAviso: string }>({ ativo: false, toleranciaMin: 60, avisarAdmin: true, whatsappAviso: "" });
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [livres, setLivres] = useState<Record<string, string>>({});
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [mexendo, setMexendo] = useState("");
  const [bloqueios, setBloqueios] = useState<any[]>([]);

  // ── plantão ──
  const [semanaBase, setSemanaBase] = useState<Date>(() => segundaDaSemana(new Date()));
  const [plantaoTodos, setPlantaoTodos] = useState<any[]>([]);
  const [salvandoPlantao, setSalvandoPlantao] = useState(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [c, l, p, pl, bq] = await Promise.all([
        fetch("/api/listas?lista=config_acesso_login").then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=acesso_livre").then((r) => r.json()).catch(() => []),
        fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=plantao_escala").then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=acesso_bloqueio").then((r) => r.json()).catch(() => []),
      ]);
      const bqArr = Array.isArray(bq) ? bq : (bq.itens || bq.data || []);
      setBloqueios(bqArr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } }).sort((a: any, b: any) => String(b.at || "").localeCompare(String(a.at || ""))));
      setPlantaoTodos(Array.isArray(pl) ? pl : (pl.itens || pl.data || []));
      const cArr = Array.isArray(c) ? c : (c.itens || c.data || []);
      if (cArr[0]) { setCfgId(cArr[0].id); try { const v = JSON.parse(cArr[0].valor); setCfg({ ativo: !!v.ativo, toleranciaMin: Number(v.toleranciaMin) || 60, avisarAdmin: v.avisarAdmin !== false, whatsappAviso: v.whatsappAviso || "" }); } catch {} }
      const lArr = Array.isArray(l) ? l : (l.itens || l.data || []);
      const mapa: Record<string, string> = {}; lArr.forEach((x: any) => { if (x.valor) mapa[x.valor] = x.id; });
      setLivres(mapa);
      setProfs(Array.isArray(p) ? p : (p.data || p.itens || []));
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const comLogin = useMemo(() => profs.filter((p) => p.ativo && p.user?.id), [profs]);
  const profsAtivos = useMemo(() => profs.filter((p) => p.ativo), [profs]);
  const nomeDoUser = (uid: string) => { const p = comLogin.find((x) => x.user?.id === uid); return p ? (p.nomeExibicao || p.nomeCompleto) : uid; };

  // ── escala de trabalho: salvar ──
  const escDe = (p: Prof): Esc => escEdits[p.id] ?? parseEsc(p.escala);
  const salvarEscala = async (p: Prof) => {
    const val = escDe(p);
    setSalvandoEsc(p.id);
    try {
      const r = await fetch(`/api/profissionais/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ escala: val }) });
      if (!r.ok) throw new Error();
      setProfs((prev) => prev.map((x) => (x.id === p.id ? { ...x, escala: val } : x)));
      setEscEdits((m) => { const n = { ...m }; delete n[p.id]; return n; });
      setAberto(null);
      toast.success("Escala salva.");
    } catch { toast.error("Erro ao salvar a escala."); }
    finally { setSalvandoEsc(null); }
  };

  // ── acesso: handlers ──
  const salvarCfg = async (patch: Partial<typeof cfg>) => {
    const novo = { ...cfg, ...patch };
    setCfg(novo); setSalvandoCfg(true);
    try {
      const valor = JSON.stringify(novo);
      if (cfgId) await fetch(`/api/listas/${cfgId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else { const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "config_acesso_login", valor }) }); const d = await r.json().catch(() => null); if (d?.id) setCfgId(d.id); }
    } catch { toast.error("Erro ao salvar a configuração."); }
    finally { setSalvandoCfg(false); }
  };
  const toggleLivre = async (userId: string) => {
    setMexendo(userId);
    try {
      if (livres[userId]) {
        await fetch(`/api/listas/${livres[userId]}`, { method: "DELETE", credentials: "include" });
        setLivres((m) => { const n = { ...m }; delete n[userId]; return n; });
      } else {
        const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "acesso_livre", valor: userId }) });
        const d = await r.json().catch(() => null);
        if (d?.id) setLivres((m) => ({ ...m, [userId]: d.id }));
      }
    } catch { toast.error("Erro ao alterar a chave de acesso."); }
    finally { setMexendo(""); }
  };
  const limparBloqueios = async () => {
    if (!confirm("Limpar todos os avisos de bloqueio?")) return;
    try { await Promise.all(bloqueios.map((b: any) => fetch(`/api/listas/${b.id}`, { method: "DELETE", credentials: "include" }))); load(); } catch {}
  };

  // ── plantão ──
  const semanaKey = fmtYMD(semanaBase);
  const plantaoItem = useMemo(() => plantaoTodos.find((it) => { try { return JSON.parse(it.valor).semana === semanaKey; } catch { return false; } }), [plantaoTodos, semanaKey]);
  const slots: Record<string, string[]> = useMemo(() => { try { return plantaoItem ? (JSON.parse(plantaoItem.valor).slots || {}) : {}; } catch { return {}; } }, [plantaoItem]);
  const salvarPlantao = async (novoSlots: Record<string, string[]>) => {
    setSalvandoPlantao(true);
    try {
      const valor = JSON.stringify({ semana: semanaKey, slots: novoSlots });
      if (plantaoItem) await fetch(`/api/listas/${plantaoItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "plantao_escala", valor }) });
      const pl = await fetch("/api/listas?lista=plantao_escala").then((r) => r.json()).catch(() => []);
      setPlantaoTodos(Array.isArray(pl) ? pl : (pl.itens || pl.data || []));
    } catch { toast.error("Erro ao salvar o plantão."); }
    finally { setSalvandoPlantao(false); }
  };
  const addNoSlot = (key: string, uid: string) => { if (!uid) return; const atual = slots[key] || []; if (atual.includes(uid)) return; salvarPlantao({ ...slots, [key]: [...atual, uid] }); };
  const removeDoSlot = (key: string, uid: string) => { salvarPlantao({ ...slots, [key]: (slots[key] || []).filter((x) => x !== uid) }); };

  const card = { background: "#fff", border: "1px solid #E8E2D6", borderRadius: 13 } as const;

  return (
    <div className="p-6 w-full">
      {/* Abas */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition"
            style={tab === t.v ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70", border: "1px solid #E8E2D6" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ───────── ABA 1: ESCALA DE TRABALHO ───────── */}
      {tab === "trabalho" && (
        <div style={card}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
            <h3 className="text-[13px] font-medium text-[#014D5E]">🗓️ Escala de trabalho da equipe</h3>
            <p className="text-[11.5px] text-[#374151] mt-0.5">O horário semanal de cada profissional. É ele que define os encaixes disponíveis na agenda.</p>
          </div>
          {loading ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-[#374151]">Carregando…</div>
          ) : profsAtivos.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-[#374151]">Nenhum profissional ativo. Cadastre em Configurações › Equipe.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
              {profsAtivos.map((p) => {
                const aberta = aberto === p.id;
                const escOk = temEscala(escEdits[p.id] ?? p.escala);
                return (
                  <div key={p.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1F2A2E] truncate">{p.nomeExibicao || p.nomeCompleto}</div>
                        <div className="text-[11px] text-[#374151]">
                          {p.user?.role === "ADMIN" ? "Administrador" : (p.user?.role || "sem login")} · {escOk ? "tem escala" : <span className="text-[#B45309]">sem escala</span>}
                        </div>
                      </div>
                      <button onClick={() => setAberto(aberta ? null : p.id)} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6", color: aberta ? "#009AAC" : "#5C6B70" }}>
                        {aberta ? "Fechar" : "Editar escala"}
                      </button>
                    </div>
                    {aberta && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                        <EscalaEditor value={escDe(p)} onChange={(e) => setEscEdits((m) => ({ ...m, [p.id]: e }))} allowSobDemanda />
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => { setEscEdits((m) => { const n = { ...m }; delete n[p.id]; return n; }); setAberto(null); }} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6", color: "#475569" }}>Cancelar</button>
                          <button onClick={() => salvarEscala(p)} disabled={salvandoEsc === p.id} className="text-[12px] px-4 py-1.5 rounded-lg text-white font-bold disabled:opacity-50" style={{ background: "#009AAC" }}>{salvandoEsc === p.id ? "Salvando…" : "Salvar escala"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── ABA 2: ACESSO POR HORÁRIO ───────── */}
      {tab === "acesso" && (
        <div className="space-y-4">
          <div className="rounded-lg px-4 py-3 text-[13px]" style={cfg.ativo ? { background: "#FCE9EF", color: "#CC3366" } : { background: "#E1F5EE", color: "#0F6E56" }}>
            {cfg.ativo
              ? <><b>Restrição LIGADA.</b> Fora do horário, só entram: admin, quem tem acesso livre, quem não tem escala e quem está de plantão.</>
              : <><b>Restrição desligada.</b> Todo mundo entra normalmente. Nada bloqueia ninguém até você ligar o interruptor abaixo.</>}
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* interruptor mestre */}
            <div style={card}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}><h3 className="text-[13px] font-medium text-[#014D5E]">🔒 Restrição de acesso por horário</h3></div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div><div className="text-[13px] text-[#1F2A2E] font-medium">Ligar a restrição</div><div className="text-[11.5px] text-[#374151]">Enquanto desligado, o login funciona como sempre.</div></div>
                  <Switch on={cfg.ativo} onClick={() => salvarCfg({ ativo: !cfg.ativo })} disabled={salvandoCfg} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div><div className="text-[13px] text-[#1F2A2E] font-medium">Tolerância</div><div className="text-[11.5px] text-[#374151]">Minutos de folga depois do fim do horário.</div></div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={240} value={cfg.toleranciaMin} onChange={(e) => setCfg({ ...cfg, toleranciaMin: Number(e.target.value) })} onBlur={() => salvarCfg({ toleranciaMin: Math.max(0, Math.min(240, cfg.toleranciaMin || 0)) })} className="w-20 border rounded-lg px-2 py-1.5 text-[13px] text-right" style={{ borderColor: "#E8E2D6" }} />
                    <span className="text-[12px] text-[#374151]">min</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div><div className="text-[13px] text-[#1F2A2E] font-medium">Avisar a administração</div><div className="text-[11.5px] text-[#374151]">Quando alguém for bloqueado por horário, registra um aviso pra você.</div></div>
                  <Switch on={cfg.avisarAdmin} onClick={() => salvarCfg({ avisarAdmin: !cfg.avisarAdmin })} disabled={salvandoCfg} />
                </div>
                {cfg.avisarAdmin && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                    <div><div className="text-[13px] text-[#1F2A2E] font-medium">📱 WhatsApp para aviso</div><div className="text-[11.5px] text-[#374151]">Recebe no seu celular quando alguém for bloqueado. Com DDD.</div></div>
                    <input type="tel" value={cfg.whatsappAviso} onChange={(e) => setCfg({ ...cfg, whatsappAviso: e.target.value })} onBlur={() => salvarCfg({ whatsappAviso: cfg.whatsappAviso.trim() })} placeholder="85 90000-0000" className="w-40 border rounded-lg px-2 py-1.5 text-[13px] text-right" style={{ borderColor: "#E8E2D6" }} />
                  </div>
                )}
              </div>
            </div>

            {/* acesso livre por pessoa */}
            <div style={card}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E]">🔑 Acesso livre (entra a qualquer hora)</h3>
                <p className="text-[11.5px] text-[#374151] mt-0.5">Ligue a chave para quem pode acessar sem restrição de horário. Administradores já entram sempre.</p>
              </div>
              {loading ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-[#374151]">Carregando...</div>
              ) : comLogin.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-[#374151]">Nenhum profissional com login ativo.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
                  {comLogin.map((p) => {
                    const uid = p.user!.id; const admin = p.user!.role === "ADMIN"; const escOk = temEscala(p.escala);
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#1F2A2E] truncate">{p.nomeExibicao || p.nomeCompleto}</div>
                          <div className="text-[11px] text-[#374151]">
                            {admin ? "Administrador" : p.user!.role} · {escOk ? "tem escala" : <span className="text-[#B45309]">sem escala — entra sempre até preencher</span>}
                          </div>
                        </div>
                        {admin ? (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: "#E0F4F6", color: "#00707E" }}>sempre entra</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#374151]">{livres[uid] ? "livre" : "pelo horário"}</span>
                            <Switch on={!!livres[uid]} onClick={() => toggleLivre(uid)} disabled={mexendo === uid} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* avisos de bloqueio */}
          <div style={card}>
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "#F0EBE0" }}>
              <div>
                <h3 className="text-[13px] font-medium text-[#014D5E]">🚫 Tentativas fora do horário</h3>
                <p className="text-[11.5px] text-[#374151] mt-0.5">Quem foi bloqueado no login aparece aqui (mais recente primeiro).</p>
              </div>
              {bloqueios.length > 0 && <button onClick={limparBloqueios} className="text-[11.5px] text-[#CC3366] flex-shrink-0">Limpar tudo</button>}
            </div>
            {bloqueios.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12.5px] text-[#374151]">Nenhuma tentativa bloqueada até agora. ✅</div>
            ) : (
              <div className="px-4 py-1">
                {bloqueios.slice(0, 30).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 py-2 border-b last:border-b-0 text-[12.5px]" style={{ borderColor: "#F0EBE0" }}>
                    <span>🚫</span>
                    <span className="font-medium text-[#1F2A2E]">{b.nome || b.email || "—"}</span>
                    <span className="text-[#5C6B70] flex-1 truncate">{b.nome && b.email ? b.email : ""}</span>
                    <span className="text-[#374151] tabular-nums whitespace-nowrap">{b.at ? new Date(b.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────── ABA 3: PLANTÃO ───────── */}
      {tab === "plantao" && (
        <div style={card}>
          <div className="px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <div>
              <h3 className="text-[13px] font-medium text-[#014D5E]">🌙 Plantão — escala semanal</h3>
              <p className="text-[11.5px] text-[#374151] mt-0.5">Quem está de plantão entra no turno + tolerância, mesmo fora da escala normal.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSemanaBase((d) => addDias(d, -7))} className="w-8 h-8 rounded-lg border text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>‹</button>
              <div className="text-[12px] text-[#1F2A2E] text-center min-w-[120px]">
                {fmtDiaMes(semanaBase)} – {fmtDiaMes(addDias(semanaBase, 6))}
                {salvandoPlantao && <span className="text-[10px] text-[#374151] block">salvando…</span>}
              </div>
              <button onClick={() => setSemanaBase((d) => addDias(d, 7))} className="w-8 h-8 rounded-lg border text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>›</button>
              <button onClick={() => setSemanaBase(segundaDaSemana(new Date()))} className="text-[11.5px] text-[#00798A] px-2">Hoje</button>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] text-[#374151] uppercase tracking-wide">
                  <th className="text-left font-medium py-2 pr-3">Dia</th>
                  <th className="text-left font-medium py-2 pr-3">Diurno <span className="normal-case font-normal">(07–19)</span></th>
                  <th className="text-left font-medium py-2">Noturno <span className="normal-case font-normal">(19:01–06:59)</span></th>
                </tr>
              </thead>
              <tbody>
                {DIAS_PLANTAO.map((dia) => (
                  <tr key={dia.dow} className="border-t align-top" style={{ borderColor: "#F0EBE0" }}>
                    <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-[#014D5E]">{dia.label}<div className="text-[10.5px] text-[#374151] font-normal">{fmtDiaMes(addDias(semanaBase, dia.dow === 0 ? 6 : dia.dow - 1))}</div></td>
                    {(["dia", "noite"] as const).map((turno) => {
                      const habilitado = dia.turnos.includes(turno);
                      const key = `${dia.dow}-${turno}`;
                      const sel = slots[key] || [];
                      const disponiveis = comLogin.filter((p) => !sel.includes(p.user!.id));
                      return (
                        <td key={turno} className="py-2.5 pr-3">
                          {!habilitado ? (
                            <span className="text-[#B4BCC0] text-[12px]">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {sel.map((uid) => (
                                <span key={uid} className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-full" style={{ background: "#E0F4F6", color: "#00707E" }}>
                                  {nomeDoUser(uid)}
                                  <button onClick={() => removeDoSlot(key, uid)} className="text-[#00707E] hover:text-[#CC3366]">✕</button>
                                </span>
                              ))}
                              {disponiveis.length > 0 && (
                                <select value="" onChange={(e) => { addNoSlot(key, e.target.value); e.currentTarget.selectedIndex = 0; }} className="text-[11.5px] border rounded-lg px-2 py-1 text-[#5C6B70] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>
                                  <option value="">+ adicionar</option>
                                  {disponiveis.map((p) => <option key={p.id} value={p.user!.id}>{p.nomeExibicao || p.nomeCompleto}</option>)}
                                </select>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[10.5px] text-[#374151] mt-3">Só domingo tem plantão diurno. O plantão noturno não vira à meia-noite: quem começa às 22h de sexta segue no plantão de sexta até as 06h59 de sábado.</div>
          </div>
        </div>
      )}
    </div>
  );
}
