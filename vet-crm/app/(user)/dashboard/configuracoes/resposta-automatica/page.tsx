"use client";
/* Configurações › Resposta automática fora do horário (Cintia 14/07).
   Salva um item em Listas (auto_resposta_config, JSON). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuClock, LuLoader } from "react-icons/lu";
import toast from "react-hot-toast";

const TEAL = "#009AAC";
const NAVY = "#0E2244";
const LINE = "#E8DFC8";
const LISTA = "auto_resposta_config";

const DIAS: [string, string][] = [
  ["1", "Segunda"], ["2", "Terça"], ["3", "Quarta"], ["4", "Quinta"], ["5", "Sexta"], ["6", "Sábado"], ["0", "Domingo"],
];
const MSG_PADRAO = "Olá! No momento estamos fora do horário de atendimento. Atendemos de segunda a sexta das 8h às 18h e aos sábados das 8h às 17h. Assim que possível retornaremos sua mensagem. 🐾";
const HORARIOS_PADRAO: Record<string, { ativo: boolean; ini: string; fim: string }> = {
  "1": { ativo: true, ini: "08:00", fim: "18:00" }, "2": { ativo: true, ini: "08:00", fim: "18:00" },
  "3": { ativo: true, ini: "08:00", fim: "18:00" }, "4": { ativo: true, ini: "08:00", fim: "18:00" },
  "5": { ativo: true, ini: "08:00", fim: "18:00" }, "6": { ativo: true, ini: "08:00", fim: "17:00" },
  "0": { ativo: false, ini: "08:00", fim: "12:00" },
};

export default function RespostaAutomaticaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mensagem, setMensagem] = useState(MSG_PADRAO);
  const [horarios, setHorarios] = useState(HORARIOS_PADRAO);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/listas?lista=${LISTA}`, { cache: "no-store" });
        const d = await r.json().catch(() => ([]));
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        if (arr[0]) {
          setItemId(arr[0].id);
          try {
            const o = JSON.parse(arr[0].valor);
            setEnabled(!!o.enabled);
            if (o.mensagem) setMensagem(o.mensagem);
            if (o.horarios) setHorarios({ ...HORARIOS_PADRAO, ...o.horarios });
          } catch { /* usa padrão */ }
        }
      } catch { /* usa padrão */ }
      setLoading(false);
    })();
  }, []);

  function setDia(d: string, patch: Partial<{ ativo: boolean; ini: string; fim: string }>) {
    setHorarios((h) => ({ ...h, [d]: { ...h[d], ...patch } }));
  }

  async function salvar() {
    setSaving(true);
    const valor = JSON.stringify({ enabled, mensagem, horarios });
    try {
      const res = itemId
        ? await fetch(`/api/listas/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor }) })
        : await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA, valor }) });
      if (!res.ok) throw new Error();
      const d = await res.json().catch(() => ({}));
      if (!itemId && d?.id) setItemId(d.id);
      toast.success("Salvo!");
    } catch { toast.error("Não consegui salvar. Tente de novo."); }
    setSaving(false);
  }

  const inp: React.CSSProperties = { padding: "6px 8px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 13, color: NAVY };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 20px 48px" }}>
      <Link href="/dashboard/configuracoes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        <LuArrowLeft size={14} /> Configurações
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ background: "#E0F4F6", color: TEAL, borderRadius: 10, padding: 8, display: "inline-flex" }}><LuClock size={20} /></div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: NAVY, margin: 0 }}>Resposta automática fora do horário</h1>
      </div>
      <p style={{ color: "#64748b", fontSize: 13.5, margin: "0 0 20px 52px" }}>Quando alguém escrever fora do horário, o sistema responde 1× automaticamente.</p>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}><LuLoader className="animate-spin" size={16} /> Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Liga/desliga */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${LINE}`, borderRadius: 12, padding: 14 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: NAVY }}>Ativar resposta automática</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Só dispara fora dos horários definidos abaixo.</div>
            </div>
            <button onClick={() => setEnabled((v) => !v)} role="switch" aria-checked={enabled}
              style={{ position: "relative", width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: enabled ? TEAL : "#CBD3D6" }}>
              <span style={{ position: "absolute", top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left .15s" }} />
            </button>
          </div>

          {/* Mensagem */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>Mensagem enviada</label>
            <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4}
              style={{ ...inp, width: "100%", marginTop: 6, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* Horários por dia */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>Horário de atendimento</label>
            <div style={{ marginTop: 8, border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
              {DIAS.map(([d, nome], i) => {
                const h = horarios[d];
                return (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? `1px solid #F0EBE0` : "none" }}>
                    <button onClick={() => setDia(d, { ativo: !h.ativo })} style={{ width: 90, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: h.ativo ? NAVY : "#9aa0a8" }}>
                      {h.ativo ? "🟢" : "⚪"} {nome}
                    </button>
                    {h.ativo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="time" value={h.ini} onChange={(e) => setDia(d, { ini: e.target.value })} style={inp} />
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>às</span>
                        <input type="time" value={h.fim} onChange={(e) => setDia(d, { fim: e.target.value })} style={inp} />
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={salvar} disabled={saving}
            style={{ alignSelf: "flex-start", background: saving ? "#9aa0a8" : TEAL, color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 500, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}
