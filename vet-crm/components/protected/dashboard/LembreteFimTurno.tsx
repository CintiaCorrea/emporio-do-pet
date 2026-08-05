"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Lembrete de FIM DE TURNO   [EMP-COWORK]
   Aparece ~15 min antes do fim da escala do profissional logado.
   Só LEMBRA (não executa ação nenhuma) — decisão da Cintia (23/07).
   Uma vez por dia, por pessoa (marca no localStorage).
   Sem escala cadastrada = nenhum lembrete aparece.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const AVISO_ANTES_MIN = 15;    // aparece 15 min antes do fim do turno
const JANELA_DEPOIS_MIN = 90;  // e só até 90 min depois (não pula do nada de madrugada)

function hm(s: any): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Fim do turno de HOJE = maior horário de saída entre as janelas do dia. */
function fimDoTurnoHoje(escala: any): number | null {
  let o: any = escala;
  if (typeof o === "string") { try { o = JSON.parse(o); } catch { return null; } }
  const janelas: any[] = o?.semana?.[String(new Date().getDay())] || [];
  let fim: number | null = null;
  for (const par of janelas) {
    const f = hm(par?.[1]);
    if (f != null && (fim == null || f > fim)) fim = f;
  }
  return fim;
}

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export default function LembreteFimTurno() {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id as string | undefined;
  const [aberto, setAberto] = useState(false);
  const [fimTexto, setFimTexto] = useState("");
  const escalaRef = useRef<any>(null);

  const chaveHoje = () => `fimTurnoVisto:${meId}:${new Date().toISOString().slice(0, 10)}`;

  // Escala do profissional logado (busca uma vez).
  useEffect(() => {
    if (!meId) return;
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/profissionais/me", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json().catch(() => null);
        if (vivo) escalaRef.current = d?.escala ?? null;
      } catch { /* sem escala = sem lembrete, e tudo bem */ }
    })();
    return () => { vivo = false; };
  }, [meId]);

  // Confere de minuto em minuto se entrou na janela do aviso.
  useEffect(() => {
    if (!meId) return;
    const checar = () => {
      if (!escalaRef.current) return;
      try { if (localStorage.getItem(chaveHoje())) return; } catch { return; }
      const fim = fimDoTurnoHoje(escalaRef.current);
      if (fim == null) return;
      const agora = new Date();
      const mins = agora.getHours() * 60 + agora.getMinutes();
      if (mins >= fim - AVISO_ANTES_MIN && mins <= fim + JANELA_DEPOIS_MIN) {
        setFimTexto(hhmm(fim));
        setAberto(true);
      }
    };
    checar();
    const t = setInterval(checar, 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  const fechar = () => {
    try { localStorage.setItem(chaveHoje(), "1"); } catch {}
    setAberto(false);
  };

  if (!aberto) return null;

  const itens = [
    <>Revisei meus <b>atendimentos</b> do dia</>,
    <>Lancei <b>todas as observações</b> nas fichas/conversas</>,
    <>Soltei minhas <b>conversas do WhatsApp</b>, pra equipe conseguir ver</>,
    <>Deixei <b>todas as informações</b> para o próximo profissional que vai assumir</>,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-[16px] w-full max-w-[400px] overflow-hidden" style={{ border: "1px solid #E8E2D6", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}>
        <div className="flex gap-3 items-start" style={{ background: "#FBF3E3", borderBottom: "1px solid #F0DCB0", padding: "16px 18px" }}>
          <span className="text-[22px] leading-none">⚠️</span>
          <div>
            <div className="text-[15px] font-bold" style={{ color: "#8a6400" }}>Seu turno está terminando</div>
            <div className="text-[12.5px] text-[#5C6B70] mt-[2px]">
              Faltam poucos minutos para o fim da sua escala{fimTexto ? ` (${fimTexto})` : ""}.
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 18px" }}>
          <div className="text-[13px] text-[#1F2A2E] mb-2">Antes de sair, dê uma conferida:</div>
          {itens.map((t, i) => (
            <div key={i} className="flex gap-2.5 items-start" style={{ padding: "9px 0", borderBottom: i < itens.length - 1 ? "1px solid #F0EBE0" : "none" }}>
              <span className="flex-shrink-0" style={{ width: 19, height: 19, borderRadius: 5, border: "1.6px solid #009AAC", marginTop: 1 }} />
              <span className="text-[13.5px] text-[#1F2A2E]">{t}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "4px 18px 18px" }}>
          <button onClick={fechar} className="w-full text-white rounded-[10px] text-[13.5px] font-semibold" style={{ background: "#009AAC", padding: "11px" }}>
            Ok, entendi 💛
          </button>
          <div className="text-[11px] text-[#5C6B70] text-center mt-2 italic">
            Aparece uma vez por dia, perto do fim da sua escala.
          </div>
        </div>
      </div>
    </div>
  );
}
