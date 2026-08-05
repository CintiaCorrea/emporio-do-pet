"use client";
/* Avisos de internação (Etapa 2): pop-up + som ~15 min antes de cada medicação
   ou aferição vencer, valendo em qualquer tela. Consulta o endpoint leve
   /api/internacao-alertas/proximos. Respeita os toggles (avisos.popup/som) de
   cada internação e não repete o mesmo alerta (dedup por dia no localStorage). */
import { useEffect, useRef, useState } from "react";

interface Alerta {
  apptId: string; petNome: string; tipo: "medicacao" | "afericao";
  descricao: string; horario: string; dueInMin: number; atrasado?: boolean;
  avisos?: { popup?: boolean; som?: boolean };
}
interface Pop { key: string; apptId: string; tipo: string; petNome: string; descricao: string; horario: string; atrasado?: boolean; atrasoMin?: number; }

const hoje = () => new Date().toISOString().slice(0, 10);
const chaveDia = () => `alertas_int_fired_${hoje()}`;

export default function AlertasInternacao() {
  const [pops, setPops] = useState<Pop[]>([]);
  const firedRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);

  // dedup persistido no dia (sobrevive a recarga)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chaveDia());
      if (raw) firedRef.current = new Set(JSON.parse(raw));
      // limpa chaves de dias anteriores
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("alertas_int_fired_") && k !== chaveDia()) localStorage.removeItem(k);
      }
    } catch {}
  }, []);

  // libera o áudio no 1º clique do usuário (política de autoplay dos navegadores)
  useEffect(() => {
    const liberar = () => {
      try {
        if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioRef.current?.resume?.();
      } catch {}
      window.removeEventListener("pointerdown", liberar);
    };
    window.addEventListener("pointerdown", liberar);
    return () => window.removeEventListener("pointerdown", liberar);
  }, []);

  function beep() {
    try {
      const ctx = audioRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioRef.current = ctx;
      const tocar = (freq: number, at: number, dur: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = freq; o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur + 0.02);
      };
      tocar(880, 0, 0.18); tocar(1175, 0.2, 0.22);
    } catch {}
  }

  function marcarFired(key: string) {
    firedRef.current.add(key);
    try { localStorage.setItem(chaveDia(), JSON.stringify([...firedRef.current])); } catch {}
  }
  function fechar(key: string) { setPops((p) => p.filter((x) => x.key !== key)); }

  async function checar() {
    if (document.visibilityState !== "visible") return;
    try {
      const r = await fetch("/api/internacao-alertas/proximos?janela=16", { cache: "no-store", credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      const alertas: Alerta[] = Array.isArray(d?.alertas) ? d.alertas : [];
      let tocou = false;
      const novos: Pop[] = [];
      for (const a of alertas) {
        // Atrasado (repetir-se-atrasar): re-dispara a cada ~10 min de atraso, via um
        // "balde" no key. O aviso antecipado dispara 1x no dia (key sem balde), como antes.
        const atrasoMin = a.atrasado ? Math.max(0, -a.dueInMin) : 0;
        const key = a.atrasado
          ? `${a.apptId}|${a.tipo}|${a.horario}|late${Math.floor(atrasoMin / 10)}`
          : `${a.apptId}|${a.tipo}|${a.horario}`;
        if (firedRef.current.has(key)) continue;
        if (a.avisos && a.avisos.popup === false) { marcarFired(key); continue; } // pop-up desligado nessa internação
        marcarFired(key);
        novos.push({ key, apptId: a.apptId, tipo: a.tipo, petNome: a.petNome, descricao: a.descricao, horario: a.horario, atrasado: a.atrasado, atrasoMin });
        if (!a.avisos || a.avisos.som !== false) tocou = true;
      }
      if (novos.length) {
        setPops((p) => [...p, ...novos].slice(-6));
        if (tocou) beep();
      }
    } catch {}
  }

  useEffect(() => {
    const t = setTimeout(checar, 4000); // primeira checagem logo após carregar
    const id = setInterval(checar, 120000); // a cada 2 min
    const onVis = () => { if (document.visibilityState === "visible") checar(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(t); clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pops.length) return null;
  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
      {pops.map((p) => {
        const med = p.tipo === "medicacao";
        const cor = p.atrasado ? "#C0392B" : (med ? "#6A4FB0" : "#B26B00");
        return (
          <div key={p.key} style={{ background: p.atrasado ? "#FEF4F3" : "#fff", border: "1px solid #E8DFC8", borderLeft: `4px solid ${cor}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(1,77,94,.16)", padding: "13px 15px", animation: "alertaSlide .35s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: cor, fontSize: 13, marginBottom: 4 }}>
              {p.atrasado ? `🔴 Atrasado há ~${p.atrasoMin} min` : "⏰ Faltam ~15 minutos"}
            </div>
            <div style={{ fontSize: 13, color: "#014D5E" }}>
              {med ? "💊" : "🌡️"} <b>{p.descricao}</b>{med ? "" : ""} — paciente <b>{p.petNome}</b>, {p.atrasado ? "era às" : "às"} <b>{p.horario}</b>.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <a href={`/dashboard/erp/internacoes/${p.apptId}`} style={{ flex: 1, textAlign: "center", background: "#009AAC", color: "#fff", borderRadius: 8, padding: "7px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Abrir ficha</a>
              <button onClick={() => fechar(p.key)} style={{ flex: 1, background: "#F3F1EC", color: "#33454A", border: 0, borderRadius: 8, padding: "7px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ok</button>
            </div>
          </div>
        );
      })}
      <style>{`@keyframes alertaSlide{from{transform:translateX(340px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
