"use client";
import { useEffect, useState } from "react";
import { LuPlus, LuPill, LuCheck, LuClock, LuTrash, LuX } from "react-icons/lu";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import toast from "react-hot-toast";

type Tipo = "VACINA" | "VERMIFUGO" | "ECTOPARASITA";
const TIPO_LABEL: Record<Tipo, string> = { VACINA: "Vacina", VERMIFUGO: "Vermífugo", ECTOPARASITA: "Ectoparasita" };
const TIPOS: Tipo[] = ["VACINA", "VERMIFUGO", "ECTOPARASITA"];

interface Dose { id: string; numero: number; dataPrevista: string; status: string; dataAplicada?: string | null; lote?: string | null; fabricante?: string | null; }
interface Template { id: string; nome: string; tipo: Tipo; variante?: string | null; doses: number; intervaloDias?: number | null; reforcoMeses?: number | null; indicacaoIdade?: string | null; }
interface Aplicado { id: string; tipo: Tipo; nomeProtocolo: string; dataInicial: string; status: string; doses: Dose[]; }

function fmt(d?: string | null) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "—"; } }
function hint(t: Template) {
  const p: string[] = [];
  if (t.doses > 1) p.push(`${t.doses} doses` + (t.intervaloDias ? ` (${t.intervaloDias}d)` : ""));
  if (t.reforcoMeses) p.push(`reforço ${t.reforcoMeses === 12 ? "anual" : t.reforcoMeses + "m"}`);
  if (t.indicacaoIdade) p.push(t.indicacaoIdade);
  return p.join(" · ");
}
const DOSE_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  PENDENTE: { bg: "#fef3c7", fg: "#92400e", label: "Pendente" },
  APLICADA: { bg: "#dcfce7", fg: "#166534", label: "Aplicada" },
  CANCELADA: { bg: "#f1f5f9", fg: "#64748b", label: "Cancelada" },
  SEM_RESPOSTA: { bg: "#f1f5f9", fg: "#64748b", label: "Sem resposta" },
};

export default function PetProtocolosPanel({ petId, autoOpen, onAutoOpened, onChanged }: { petId: string; autoOpen?: boolean; onAutoOpened?: () => void; onChanged?: () => void }) {
  const [list, setList] = useState<Aplicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<any>({ tipo: "VACINA", templateId: "", dataInicial: new Date().toISOString().slice(0, 10) });
  const [doseModal, setDoseModal] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/protocolos?petId=${petId}`, { cache: "no-store" });
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { if (petId) load(); /* eslint-disable-next-line */ }, [petId]);

  async function loadTemplates(tipo: Tipo) {
    try {
      const r = await fetch(`/api/protocolos/templates?tipo=${tipo}`, { cache: "no-store" });
      const d = await r.json();
      setTemplates((Array.isArray(d) ? d : []).filter((t: Template) => (t as any).ativo !== false));
    } catch { setTemplates([]); }
  }
  async function openApply() {
    setForm({ tipo: "VACINA", templateId: "", dataInicial: new Date().toISOString().slice(0, 10) });
    await loadTemplates("VACINA");
    setApplyOpen(true);
  }
  useEffect(() => { if (autoOpen) { openApply(); onAutoOpened?.(); } /* eslint-disable-next-line */ }, [autoOpen]);

  async function changeTipo(tipo: Tipo) { setForm((f: any) => ({ ...f, tipo, templateId: "" })); await loadTemplates(tipo); }

  async function aplicar() {
    if (!form.templateId) { toast.error("Escolha o protocolo."); return; }
    if (!form.dataInicial) { toast.error("Informe a data inicial."); return; }
    try {
      const payload = { petId, tipo: form.tipo, templateId: form.templateId, dataInicial: new Date(form.dataInicial).toISOString() };
      const r = await fetch(`/api/protocolos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => null); toast.error(`Erro: ${e?.message || r.status}`); return; }
      toast.success("Protocolo aplicado — doses agendadas");
      setApplyOpen(false); await load(); onChanged?.();
    } catch (e) { toast.error(`Erro: ${e}`); }
  }
  async function removeAplicado(a: Aplicado) {
    if (!(await confirmDelete({ entityLabel: "protocolo", itemName: a.nomeProtocolo }))) return;
    const r = await fetch(`/api/protocolos/${a.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error(`Erro: ${r.status}`); return; }
    await load(); onChanged?.();
  }
  function openDose(d: Dose) { setDoseModal({ dose: d, lote: d.lote || "", fabricante: d.fabricante || "", dataAplicada: (d.dataAplicada || new Date().toISOString()).slice(0, 10), observacao: "" }); }
  async function registrarDose() {
    const m = doseModal;
    try {
      const payload = { status: "APLICADA", lote: m.lote || null, fabricante: m.fabricante || null, dataAplicada: new Date(m.dataAplicada).toISOString(), observacao: m.observacao || null };
      const r = await fetch(`/api/protocolos/doses/${m.dose.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => null); toast.error(`Erro: ${e?.message || r.status}`); return; }
      toast.success("Dose registrada");
      setDoseModal(null); await load(); onChanged?.();
    } catch (e) { toast.error(`Erro: ${e}`); }
  }

  const selTemplate = templates.find(t => t.id === form.templateId);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">Vacinas, vermífugos e ectoparasitas — ao aplicar, as doses já ficam agendadas.</div>
        <button onClick={openApply} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white shrink-0" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Aplicar protocolo
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>}
      {!loading && list.length === 0 && (
        <div className="border rounded-xl p-6 text-center" style={{ borderColor: "#E8DFC8" }}>
          <LuPill size={22} className="mx-auto mb-2 text-gray-300" />
          <div className="text-sm text-gray-500">Nenhum protocolo aplicado. Use <b>Aplicar protocolo</b> para começar.</div>
        </div>
      )}

      <div className="space-y-3">
        {list.map(a => (
          <div key={a.id} className="border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#F6FDFD" }}>
              <div>
                <div className="font-medium" style={{ color: "#0E2244" }}>{a.nomeProtocolo}</div>
                <div className="text-xs text-gray-500">{TIPO_LABEL[a.tipo]} · início {fmt(a.dataInicial)} · {a.status === "CONCLUIDO" ? "concluído" : "em andamento"}</div>
              </div>
              <button onClick={() => removeAplicado(a)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Excluir"><LuTrash size={15} /></button>
            </div>
            <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
              {a.doses.map(d => {
                const b = DOSE_BADGE[d.status] || DOSE_BADGE.PENDENTE;
                return (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {d.status === "APLICADA" ? <LuCheck size={15} className="text-green-600" /> : <LuClock size={15} className="text-amber-500" />}
                      <span className="font-medium text-gray-700">Dose {d.numero}</span>
                      <span className="text-gray-400">prevista {fmt(d.dataPrevista)}</span>
                      {d.status === "APLICADA" && d.dataAplicada && <span className="text-gray-400">· aplicada {fmt(d.dataAplicada)}{d.lote ? ` · lote ${d.lote}` : ""}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: b.bg, color: b.fg }}>{b.label}</span>
                      {d.status === "PENDENTE" && (
                        <button onClick={() => openDose(d)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ background: "#009AAC" }}>Registrar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {applyOpen && (
        <div className="mb-4">
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#0E2244" }}>Aplicar protocolo</h2>
              <button onClick={() => setApplyOpen(false)} className="p-1.5 rounded hover:bg-gray-100"><LuX size={18} /></button>
            </div>
            <div className="space-y-3">
              <label className="text-sm block">Tipo
                <select value={form.tipo} onChange={e => changeTipo(e.target.value as Tipo)} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                  {TIPOS.map(tp => <option key={tp} value={tp}>{TIPO_LABEL[tp]}</option>)}
                </select>
              </label>
              <label className="text-sm block">Protocolo
                <select value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Selecione...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome}{t.variante ? ` - ${t.variante}` : ""}</option>)}
                </select>
              </label>
              {selTemplate && <div className="text-xs text-gray-500 -mt-1">{hint(selTemplate)}</div>}
              {templates.length === 0 && <div className="text-xs text-amber-600 -mt-1">Nenhum protocolo cadastrado para este tipo. Cadastre em Configurações → Protocolos.</div>}
              <label className="text-sm block">Data inicial
                <input type="date" value={form.dataInicial} onChange={e => setForm({ ...form, dataInicial: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setApplyOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={aplicar} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#009AAC" }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {doseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDoseModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#0E2244" }}>Registrar dose {doseModal.dose.numero}</h2>
              <button onClick={() => setDoseModal(null)} className="p-1.5 rounded hover:bg-gray-100"><LuX size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Data aplicada
                <input type="date" value={doseModal.dataAplicada} onChange={e => setDoseModal({ ...doseModal, dataAplicada: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm">Lote
                <input value={doseModal.lote} onChange={e => setDoseModal({ ...doseModal, lote: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm col-span-2">Fabricante
                <input value={doseModal.fabricante} onChange={e => setDoseModal({ ...doseModal, fabricante: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm col-span-2">Observação
                <input value={doseModal.observacao} onChange={e => setDoseModal({ ...doseModal, observacao: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDoseModal(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={registrarDose} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#009AAC" }}>Confirmar aplicação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
