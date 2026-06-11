"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Tipo = "cliente" | "pet" | "lead";
type Props = { tipo: Tipo; id: string; nome: string; onChange?: () => void };

const FIELD: Record<Tipo, "tutorId" | "petId" | "leadId"> = { cliente: "tutorId", pet: "petId", lead: "leadId" };
const LABEL: Record<Tipo, string> = { cliente: "cliente", pet: "pet", lead: "lead" };

export default function EncaminharBox({ tipo, id, nome, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [pend, setPend] = useState<{ entryId: string; data: any } | null>(null);
  const [meName, setMeName] = useState("");

  async function loadPend() {
    try {
      const r = await fetch(`/api/listas?lista=encfila`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const mine = arr
        .map((it: any) => { try { return { entryId: it.id, data: JSON.parse(it.valor) }; } catch { return null; } })
        .filter((x: any) => x && x.data?.tipo === tipo && x.data?.id === id && x.data?.status === "PENDENTE");
      setPend(mine.length ? mine[0] : null);
    } catch { /* ignora */ }
  }

  useEffect(() => {
    loadPend();
    fetch(`/api/inbox/context/staff`).then((r) => r.json()).then((d) => setStaff(Array.isArray(d) ? d : (d.users || d.data || []))).catch(() => {});
    fetch(`/api/auth/session`).then((r) => r.json()).then((s) => setMeName(s?.user?.name || "")).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tipo]);

  async function encaminhar() {
    if (!toUserId) { toast.error("Escolha para quem encaminhar"); return; }
    const toName = staff.find((u) => u.id === toUserId)?.name || "Profissional";
    setSaving(true);
    try {
      const payload = { tipo, id, nome, toUserId, toName, byName: meName, obs: obs.trim(), at: new Date().toISOString(), status: "PENDENTE" };
      if (pend?.entryId) {
        await fetch(`/api/listas/${pend.entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      } else {
        await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "encfila", valor: JSON.stringify(payload) }) });
      }
      await fetch(`/api/internal-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId, content: `Encaminhei o ${LABEL[tipo]} "${nome}" pra voce${obs.trim() ? ": " + obs.trim() : ""}. Precisa de atendimento.` }) });
      await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [FIELD[tipo]]: id, tipo: "ENCAMINHAMENTO", texto: `Encaminhado para ${toName}${obs.trim() ? ": " + obs.trim() : ""}`, canal: "Sistema" }) });
      toast.success(`Encaminhado para ${toName}`);
      setOpen(false); setObs(""); setToUserId("");
      window.dispatchEvent(new Event("encfila:changed"));
      await loadPend(); onChange?.();
    } catch { toast.error("Erro ao encaminhar"); } finally { setSaving(false); }
  }

  async function concluir() {
    if (!pend) return;
    try {
      await fetch(`/api/listas/${pend.entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ ...pend.data, status: "CONCLUIDO", concluidoEm: new Date().toISOString(), concluidoPor: meName }) }) });
      await fetch(`/api/interacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [FIELD[tipo]]: id, tipo: "NOTA", texto: `Atendimento concluido${meName ? " por " + meName : ""}`, canal: "Sistema" }) });
      toast.success("Atendimento concluido");
      window.dispatchEvent(new Event("encfila:changed"));
      await loadPend(); onChange?.();
    } catch { toast.error("Erro ao concluir"); }
  }

  return (
    <>
      {pend ? (
        <span className="flex items-center gap-1.5 bg-[#FEF3C7] border border-[#FCD194] text-[#92611A] px-2.5 py-1.5 rounded-lg text-xs">
          <span className="font-medium">Encaminhado p/ {pend.data?.toName}</span>
          <button onClick={concluir} className="font-semibold text-[#0F6E56] hover:underline">Concluir</button>
          <span className="text-[#cbb58a]">|</span>
          <button onClick={() => { setToUserId(""); setObs(""); setOpen(true); }} className="font-semibold text-[#0C447C] hover:underline">Reencaminhar</button>
        </span>
      ) : (
        <button onClick={() => setOpen(true)} className="bg-white border border-[#cfd8e0] text-[#0C447C] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
          <span style={{ fontSize: "13px" }}>&#8596;</span>Encaminhar
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#014D5E" }}>Encaminhar {LABEL[tipo]}: {nome}</h3>
            <label className="text-[11px] text-gray-500">Para quem</label>
            <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="w-full mt-0.5 mb-2 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
              <option value="">Selecionar...</option>
              {staff.map((u) => <option key={u.id} value={u.id}>{u.name}{u.role ? ` - ${u.role}` : ""}</option>)}
            </select>
            <label className="text-[11px] text-gray-500">Observacao (o que precisa ser feito)</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
            <div className="flex gap-2 mt-3">
              <button onClick={encaminhar} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{saving ? "..." : "Encaminhar"}</button>
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#64748b" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
