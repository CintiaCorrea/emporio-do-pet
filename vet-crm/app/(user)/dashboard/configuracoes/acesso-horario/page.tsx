"use client";
// [EMP-COWORK] Acesso por horário (Fatia 1A) — Cintia 20/07
// Interruptor MESTRE (começa desligado) da restrição de login por escala + a chave
// "acesso livre" por pessoa. Guardado em listas (sem tocar no schema):
//   config_acesso_login = { ativo, toleranciaMin, avisarAdmin }  (1 item)
//   acesso_livre        = 1 item por userId (valor = userId)
// A checagem no login (Fatia 1C) só entra depois; aqui nada bloqueia ninguém.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Prof = {
  id: string; nomeCompleto: string; nomeExibicao?: string | null; ativo: boolean;
  escala?: any; user?: { id: string; role: string; email: string } | null;
};

const temEscala = (e: any) => { try { const o = typeof e === "string" ? JSON.parse(e) : e; return !!o && o.semana && Object.keys(o.semana).length > 0; } catch { return false; } };

export default function AcessoHorarioPage() {
  usePageTitle("Acesso por horário", "Restringe o login ao horário de escala de cada um");

  const [cfg, setCfg] = useState<{ ativo: boolean; toleranciaMin: number; avisarAdmin: boolean }>({ ativo: false, toleranciaMin: 60, avisarAdmin: true });
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [livres, setLivres] = useState<Record<string, string>>({}); // userId -> listaItemId
  const [loading, setLoading] = useState(true);
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [mexendo, setMexendo] = useState("");
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [c, l, p] = await Promise.all([
        fetch("/api/listas?lista=config_acesso_login").then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=acesso_livre").then((r) => r.json()).catch(() => []),
        fetch("/api/profissionais").then((r) => r.json()).catch(() => []),
      ]);
      const cArr = Array.isArray(c) ? c : (c.itens || c.data || []);
      if (cArr[0]) { setCfgId(cArr[0].id); try { const v = JSON.parse(cArr[0].valor); setCfg({ ativo: !!v.ativo, toleranciaMin: Number(v.toleranciaMin) || 60, avisarAdmin: v.avisarAdmin !== false }); } catch {} }
      const lArr = Array.isArray(l) ? l : (l.itens || l.data || []);
      const mapa: Record<string, string> = {}; lArr.forEach((x: any) => { if (x.valor) mapa[x.valor] = x.id; });
      setLivres(mapa);
      setProfs(Array.isArray(p) ? p : (p.data || p.itens || []));
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const salvarCfg = async (patch: Partial<typeof cfg>) => {
    const novo = { ...cfg, ...patch };
    setCfg(novo); setSalvandoCfg(true);
    try {
      const valor = JSON.stringify(novo);
      if (cfgId) await fetch(`/api/listas/${cfgId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else { const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "config_acesso_login", valor }) }); const d = await r.json().catch(() => null); if (d?.id) setCfgId(d.id); }
    } catch { alert("Erro ao salvar a configuração."); }
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
    } catch { alert("Erro ao alterar a chave de acesso."); }
    finally { setMexendo(""); }
  };

  const comLogin = useMemo(() => profs.filter((p) => p.ativo && p.user?.id), [profs]);

  const Switch = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} className="relative w-11 h-6 rounded-full transition disabled:opacity-50" style={{ background: on ? "#009AAC" : "#d8d0bc" }}>
      <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: on ? "20px" : "3px" }} />
    </button>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* estado atual */}
      <div className="rounded-lg px-4 py-3 mb-4 text-[13px]" style={cfg.ativo ? { background: "#FCE9EF", color: "#CC3366" } : { background: "#E1F5EE", color: "#0F6E56" }}>
        {cfg.ativo
          ? <><b>Restrição LIGADA.</b> Fora do horário, só entram: admin, quem tem acesso livre, quem não tem escala e quem está de plantão.</>
          : <><b>Restrição desligada.</b> Todo mundo entra normalmente. Nada bloqueia ninguém até você ligar o interruptor abaixo.</>}
      </div>

      {/* interruptor mestre */}
      <div className="bg-white border rounded-[13px] mb-4" style={{ borderColor: "#E8E2D6" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}><h3 className="text-[13px] font-medium text-[#014D5E]">🔒 Restrição de acesso por horário</h3></div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-[13px] text-[#1F2A2E] font-medium">Ligar a restrição</div><div className="text-[11.5px] text-[#8A989D]">Enquanto desligado, o login funciona como sempre.</div></div>
            <Switch on={cfg.ativo} onClick={() => salvarCfg({ ativo: !cfg.ativo })} disabled={salvandoCfg} />
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
            <div><div className="text-[13px] text-[#1F2A2E] font-medium">Tolerância</div><div className="text-[11.5px] text-[#8A989D]">Minutos de folga depois do fim do horário.</div></div>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={240} value={cfg.toleranciaMin} onChange={(e) => setCfg({ ...cfg, toleranciaMin: Number(e.target.value) })} onBlur={() => salvarCfg({ toleranciaMin: Math.max(0, Math.min(240, cfg.toleranciaMin || 0)) })} className="w-20 border rounded-lg px-2 py-1.5 text-[13px] text-right" style={{ borderColor: "#E8E2D6" }} />
              <span className="text-[12px] text-[#8A989D]">min</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
            <div><div className="text-[13px] text-[#1F2A2E] font-medium">Avisar a administração</div><div className="text-[11.5px] text-[#8A989D]">Quando alguém for bloqueado por horário, registra um aviso pra você.</div></div>
            <Switch on={cfg.avisarAdmin} onClick={() => salvarCfg({ avisarAdmin: !cfg.avisarAdmin })} disabled={salvandoCfg} />
          </div>
        </div>
      </div>

      {/* acesso livre por pessoa */}
      <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
          <h3 className="text-[13px] font-medium text-[#014D5E]">🔑 Acesso livre (entra a qualquer hora)</h3>
          <p className="text-[11.5px] text-[#8A989D] mt-0.5">Ligue a chave para quem pode acessar sem restrição de horário. Administradores já entram sempre.</p>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-[#8A989D]">Carregando...</div>
        ) : comLogin.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-[#8A989D]">Nenhum profissional com login ativo.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
            {comLogin.map((p) => {
              const uid = p.user!.id; const admin = p.user!.role === "ADMIN"; const escOk = temEscala(p.escala);
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1F2A2E] truncate">{p.nomeExibicao || p.nomeCompleto}</div>
                    <div className="text-[11px] text-[#8A989D]">
                      {admin ? "Administrador" : p.user!.role} · {escOk ? "tem escala" : <span className="text-[#B45309]">sem escala — entra sempre até preencher</span>}
                    </div>
                  </div>
                  {admin ? (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: "#E0F4F6", color: "#00707E" }}>sempre entra</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8A989D]">{livres[uid] ? "livre" : "pelo horário"}</span>
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
  );
}
