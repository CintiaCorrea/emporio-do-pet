"use client";
import { useState } from "react";
import toast from "react-hot-toast";

// Modal ÚNICO de "resolver follow-up com observação" — usado no Meu painel, lista de clientes e fichas.
// Registra a observação como NOTA (autor = usuário logado → individualizado) e zera o proximoFollowupAt
// do destino certo (pet/tutor/lead). Assim resolver em qualquer tela sincroniza tudo.
export type FuAlvo = { kind: "pet" | "tutor" | "lead"; id: string; nome: string };

export default function ResolverFuModal({ alvo, onClose, onResolved }: { alvo: FuAlvo | null; onClose: () => void; onResolved?: () => void }) {
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  if (!alvo) return null;
  async function confirmar() {
    if (!alvo) return;
    setSaving(true);
    try {
      const o = obs.trim();
      if (o) {
        const chave = alvo.kind === "pet" ? { petId: alvo.id } : alvo.kind === "tutor" ? { tutorId: alvo.id } : { leadId: alvo.id };
        await fetch("/api/interacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...chave, tipo: "NOTA", texto: `Follow-up resolvido: ${o}`, canal: "Follow-up" }) }).catch(() => {});
      }
      const r = alvo.kind === "lead"
        ? await fetch(`/api/leads/${alvo.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) })
        : await fetch(`/api/${alvo.kind === "tutor" ? "tutors" : "pets"}/${alvo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximoFollowupAt: null }) });
      if (!r.ok) throw new Error();
      toast.success("Follow-up resolvido ✓");
      onResolved?.();
      onClose();
    } catch { toast.error("Não consegui resolver."); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(20,35,40,.30)" }} onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" style={{ border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
          <div className="text-[14px] font-semibold" style={{ color: "#014D5E" }}>✓ Resolver follow-up</div>
          <div className="text-[12px]" style={{ color: "#5C6B70" }}>{alvo.nome}</div>
        </div>
        <div className="p-4">
          <label className="text-[11px] font-medium" style={{ color: "#8A938F" }}>Observação (o que aconteceu no retorno)</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} autoFocus placeholder="Ex.: cliente retornou, pet bem; ou não atendeu, remarcar…" className="w-full mt-1 border rounded-lg px-2.5 py-2 text-[13px]" style={{ borderColor: "#E8E2D6" }} />
          <div className="text-[10.5px] mt-1" style={{ color: "#8A938F" }}>Fica registrada na ficha (autor: você). Pode deixar em branco.</div>
        </div>
        <div className="px-4 py-2.5 border-t flex justify-end gap-2" style={{ borderColor: "#F0EBE0" }}>
          <button onClick={onClose} disabled={saving} className="text-[12px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "#E8E2D6", color: "#5C6B70" }}>Cancelar</button>
          <button onClick={confirmar} disabled={saving} className="text-[12px] px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: "#1c7a47" }}>{saving ? "Salvando…" : "✓ Resolver"}</button>
        </div>
      </div>
    </div>
  );
}
