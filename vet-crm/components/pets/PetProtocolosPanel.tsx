"use client";
import { useEffect, useMemo, useState } from "react";
import { LuPlus, LuPill, LuTrash, LuX, LuPencil } from "react-icons/lu";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import toast from "react-hot-toast";

type Tipo = "VACINA" | "VERMIFUGO" | "ECTOPARASITA" | "OUTRO";
const TIPO_LABEL: Record<string, string> = { VACINA: "Vacinas", VERMIFUGO: "Vermífugo", ECTOPARASITA: "Antipulgas", OUTRO: "Outros" };
const TIPO_EMOJI: Record<string, string> = { VACINA: "💉", VERMIFUGO: "🪱", ECTOPARASITA: "🦟", OUTRO: "💊" };
const TIPOS: Tipo[] = ["VACINA", "VERMIFUGO", "ECTOPARASITA", "OUTRO"];

interface Dose { id: string; numero: number; dataPrevista: string; status: string; dataAplicada?: string | null; lote?: string | null; fabricante?: string | null; }
interface Template { id: string; nome: string; tipo: Tipo; variante?: string | null; doses: number; intervaloDias?: number | null; reforcoMeses?: number | null; indicacaoIdade?: string | null; }
interface Aplicado { id: string; tipo: string; nomeProtocolo: string; dataInicial: string; status: string; doses: Dose[]; }

function fmt(d?: string | null) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "—"; } }
function fmtMesAno(d?: string | null) { if (!d) return ""; try { return new Date(d).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }); } catch { return ""; } }
function hint(t: Template) {
  const p: string[] = [];
  if (t.doses > 1) p.push(`${t.doses} doses` + (t.intervaloDias ? ` (${t.intervaloDias}d)` : ""));
  if (t.reforcoMeses) p.push(`reforço ${t.reforcoMeses === 12 ? "anual" : t.reforcoMeses + "m"}`);
  if (t.indicacaoIdade) p.push(t.indicacaoIdade);
  return p.join(" · ");
}
// periodicidade a partir do intervalo entre as 2 primeiras doses (SimplesVet mostra "a cada X")
function periodoLabel(a: Aplicado): string {
  const ds = (a.doses || []).slice().sort((x, y) => new Date(x.dataPrevista).getTime() - new Date(y.dataPrevista).getTime());
  if (ds.length < 2) return "";
  const dias = Math.round((new Date(ds[1].dataPrevista).getTime() - new Date(ds[0].dataPrevista).getTime()) / 86400000);
  if (dias <= 1) return "";
  if (dias <= 10) return "semanal";
  if (dias <= 20) return "quinzenal";
  if (dias <= 40) return "mensal";
  if (dias <= 100) return "trimestral";
  if (dias <= 200) return "semestral";
  if (dias <= 400) return "anual";
  return `a cada ${dias} dias`;
}
function periodoSub(a: Aplicado): string {
  const ds = (a.doses || []).slice().sort((x, y) => new Date(x.dataPrevista).getTime() - new Date(y.dataPrevista).getTime());
  let dias = 0;
  if (ds.length >= 2) dias = Math.round((new Date(ds[1].dataPrevista).getTime() - new Date(ds[0].dataPrevista).getTime()) / 86400000);
  const p = periodoLabel(a);
  const pTxt = p ? `Doses ${dias >= 350 ? "a cada 12 meses" : dias >= 28 && dias <= 40 ? "a cada 30 dias" : `${p}`}` : "Dose única";
  return `${pTxt} · iniciado em ${fmtMesAno(a.dataInicial)}`;
}
const DOSE_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  PENDENTE: { bg: "#E6F1FB", fg: "#185FA5", label: "programada" },
  APLICADA: { bg: "#E1F5EE", fg: "#0F6E56", label: "aplicada" },
  CANCELADA: { bg: "#F1EFE8", fg: "#5F5E5A", label: "cancelada" },
  SEM_RESPOSTA: { bg: "#F1EFE8", fg: "#5F5E5A", label: "sem resposta" },
};
function statusProto(a: Aplicado): { bg: string; fg: string; label: string } {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const pend = a.doses.filter((d) => d.status === "PENDENTE");
  if (pend.some((d) => new Date(d.dataPrevista) < hoje)) return { bg: "#FBEBEB", fg: "#A32D2D", label: "vencido" };
  if (pend.length) return { bg: "#E6F1FB", fg: "#185FA5", label: "programada" };
  return { bg: "#E1F5EE", fg: "#0F6E56", label: "em dia" };
}

export default function PetProtocolosPanel({ petId, petNome, autoOpen, onAutoOpened, onChanged }: { petId: string; petNome?: string; autoOpen?: boolean; onAutoOpened?: () => void; onChanged?: () => void }) {
  const [list, setList] = useState<Aplicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string>("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<any>({ tipo: "VACINA", templateId: "", nomeCustom: "", intervaloDias: "30", dosesCustom: "0", dataInicial: new Date().toISOString().slice(0, 10) });
  const [doseModal, setDoseModal] = useState<any>(null);
  const [cat, setCat] = useState<{ nome: string; valor: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/products?limit=1000`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.products || d.data || d.itens || []);
        setCat(arr.map((s: any) => ({ nome: s.name || s.nome || "", valor: Number(s.price ?? s.preco ?? 0), ativo: s.ativo })).filter((x: any) => x.nome && x.ativo !== false));
      } catch {}
    })();
  }, []);
  function precoDe(nome: string): number {
    const q = String(nome || "").toLowerCase().trim();
    if (!q) return 0;
    const hit = cat.find((c) => { const n = c.nome.toLowerCase(); return n && (q.includes(n) || n.includes(q)); });
    return hit?.valor || 0;
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/protocolos?petId=${petId}`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : [];
      setList(arr);
      setSelId((cur) => (cur && arr.some((a: Aplicado) => a.id === cur)) ? cur : (arr[0]?.id || ""));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { if (petId) load(); /* eslint-disable-next-line */ }, [petId]);

  async function loadTemplates(tipo: Tipo) {
    if (tipo === "OUTRO") { setTemplates([]); return; }
    try {
      const r = await fetch(`/api/protocolos/templates?tipo=${tipo}`, { cache: "no-store" });
      const d = await r.json();
      setTemplates((Array.isArray(d) ? d : []).filter((t: Template) => (t as any).ativo !== false));
    } catch { setTemplates([]); }
  }
  async function openApply(tipo: Tipo = "VACINA") {
    setForm({ tipo, templateId: "", nomeCustom: "", intervaloDias: "30", dosesCustom: "0", dataInicial: new Date().toISOString().slice(0, 10) });
    await loadTemplates(tipo);
    setApplyOpen(true);
  }
  useEffect(() => { if (autoOpen) { openApply(); onAutoOpened?.(); } /* eslint-disable-next-line */ }, [autoOpen]);
  async function changeTipo(tipo: Tipo) { setForm((f: any) => ({ ...f, tipo, templateId: "" })); await loadTemplates(tipo); }

  async function aplicar() {
    if (!form.dataInicial) { toast.error("Informe a data inicial."); return; }
    let payload: any;
    if (form.tipo === "OUTRO") {
      if (!form.nomeCustom.trim()) { toast.error("Dê um nome ao protocolo."); return; }
      const intv = Number(form.intervaloDias);
      if (!intv || intv < 1) { toast.error("Informe de quantos em quantos dias repete."); return; }
      payload = { petId, tipo: "OUTRO", nomeProtocolo: form.nomeCustom.trim(), dataInicial: new Date(form.dataInicial).toISOString(), intervaloDias: intv, doses: Number(form.dosesCustom) || 0 };
    } else {
      if (!form.templateId) { toast.error("Escolha o protocolo."); return; }
      payload = { petId, tipo: form.tipo, templateId: form.templateId, dataInicial: new Date(form.dataInicial).toISOString() };
    }
    try {
      const r = await fetch(`/api/protocolos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => null); toast.error(`Erro: ${e?.message || r.status}`); return; }
      const criado = await r.json().catch(() => null);
      toast.success("Protocolo criado — programação gerada");
      setApplyOpen(false); if (criado?.id) setSelId(criado.id); await load(); onChanged?.();
    } catch (e) { toast.error(`Erro: ${e}`); }
  }
  async function removeAplicado(a: Aplicado) {
    if (!(await confirmDelete({ entityLabel: "protocolo", itemName: a.nomeProtocolo }))) return;
    const r = await fetch(`/api/protocolos/${a.id}`, { method: "DELETE" });
    if (!r.ok) { toast.error(`Erro: ${r.status}`); return; }
    await load(); onChanged?.();
  }
  function openDose(d: Dose, nomeProto?: string) {
    const pv = precoDe(nomeProto || "");
    setDoseModal({ dose: d, nomeProto: nomeProto || "", lote: d.lote || "", fabricante: d.fabricante || "", dataAplicada: (d.dataAplicada || new Date().toISOString()).slice(0, 10), observacao: "", lancarComanda: pv > 0, comandaValor: pv ? String(pv) : "" });
  }
  async function registrarDose() {
    const m = doseModal;
    try {
      const payload = { status: "APLICADA", lote: m.lote || null, fabricante: m.fabricante || null, dataAplicada: new Date(m.dataAplicada).toISOString(), observacao: m.observacao || null };
      const r = await fetch(`/api/protocolos/doses/${m.dose.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json().catch(() => null); toast.error(`Erro: ${e?.message || r.status}`); return; }
      if (m.lancarComanda && (Number(m.comandaValor) || 0) > 0) {
        try { window.dispatchEvent(new CustomEvent("comanda:add", { detail: { descricao: m.nomeProto || "Aplicação", valorUnitario: Number(m.comandaValor) || 0, quantidade: 1 } })); } catch {}
      }
      toast.success("Aplicação registrada");
      setDoseModal(null); await load(); onChanged?.();
    } catch (e) { toast.error(`Erro: ${e}`); }
  }

  const selTemplate = templates.find(t => t.id === form.templateId);
  const grupos = useMemo(() => TIPOS.map((tp) => ({ tp, itens: list.filter((a) => a.tipo === tp) })).filter((g) => g.itens.length), [list]);
  const sel = list.find((a) => a.id === selId) || null;
  const th = "text-left text-[10.5px] font-bold uppercase tracking-wide text-[#8A857A] px-3 py-2";
  const td = "px-3 py-2 text-[12.5px]";

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "#014D5E" }}>💉 Protocolos{petNome ? ` — ${petNome}` : ""}</h3>
        <button onClick={() => openApply()} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}><LuPlus size={14} /> Adicionar protocolo</button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: "#E8DFC8" }}>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
          {/* LISTA (esquerda) */}
          <div className="md:border-r" style={{ borderColor: "#F0EBE0" }}>
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
            ) : list.length === 0 ? (
              <div className="p-5 text-center">
                <LuPill size={20} className="mx-auto mb-2 text-gray-300" />
                <div className="text-[12.5px] text-gray-500">Nenhum protocolo. Use <b>Adicionar protocolo</b>.</div>
              </div>
            ) : (
              <div className="p-3">
                {grupos.map((g) => (
                  <div key={g.tp}>
                    <div className="text-[10.5px] uppercase tracking-wide text-[#8A857A] font-semibold flex items-center gap-1.5 mt-2.5 mb-1.5 px-1">{TIPO_EMOJI[g.tp]} {TIPO_LABEL[g.tp]}</div>
                    {g.itens.map((a) => {
                      const st = statusProto(a); const on = a.id === selId;
                      return (
                        <button key={a.id} onClick={() => { setSelId(a.id); setApplyOpen(false); }} className="w-full text-left border rounded-[10px] px-2.5 py-2 mb-1.5" style={{ borderColor: on ? "#009AAC" : "#F0EBE0", background: on ? "#F0FBFC" : "#fff" }}>
                          <div className="text-[12.5px] font-semibold text-[#1F2A2E] truncate">{a.nomeProtocolo}</div>
                          <div className="text-[11px] text-[#5C6B70] mt-0.5 flex items-center justify-between gap-2">
                            <span>{periodoLabel(a) || "dose única"}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DETALHE / FORM (direita) */}
          <div className="p-4 min-w-0">
            {applyOpen ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[14px] font-semibold" style={{ color: "#014D5E" }}>Adicionar protocolo</h4>
                  <button onClick={() => setApplyOpen(false)} className="p-1 text-gray-400"><LuX size={17} /></button>
                </div>
                <div className="space-y-3 max-w-md">
                  <label className="text-sm block">Tipo
                    <select value={form.tipo} onChange={e => changeTipo(e.target.value as Tipo)} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                      {TIPOS.map(tp => <option key={tp} value={tp}>{TIPO_EMOJI[tp]} {TIPO_LABEL[tp]}</option>)}
                    </select>
                  </label>
                  {form.tipo === "OUTRO" ? (
                    <>
                      <label className="text-sm block">Nome do medicamento / protocolo
                        <input value={form.nomeCustom} onChange={e => setForm({ ...form, nomeCustom: e.target.value })} placeholder="Ex.: Condroprotetor, Ozônioterapia…" className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm block">Repetir a cada (dias)
                          <input type="number" min={1} value={form.intervaloDias} onChange={e => setForm({ ...form, intervaloDias: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
                          <span className="text-[11px] text-gray-400">30=mensal · 15=quinzenal · 90=trimestral</span>
                        </label>
                        <label className="text-sm block">Nº de doses
                          <select value={form.dosesCustom} onChange={e => setForm({ ...form, dosesCustom: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                            <option value="0">Indeterminado (contínuo)</option>
                            {[1, 2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} doses</option>)}
                          </select>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-sm block">Protocolo
                        <select value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                          <option value="">Selecione...</option>
                          {templates.map(t => <option key={t.id} value={t.id}>{t.nome}{t.variante ? ` - ${t.variante}` : ""}</option>)}
                        </select>
                      </label>
                      {selTemplate && <div className="text-xs text-gray-500 -mt-1">{hint(selTemplate)}</div>}
                      {templates.length === 0 && <div className="text-xs text-amber-600 -mt-1">Nenhum protocolo cadastrado p/ este tipo. Cadastre em Configurações → Protocolos, ou use <b>Outros</b>.</div>}
                    </>
                  )}
                  <label className="text-sm block">Data inicial
                    <input type="date" value={form.dataInicial} onChange={e => setForm({ ...form, dataInicial: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
                  </label>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setApplyOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
                    <button onClick={aplicar} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#009AAC" }}>Salvar protocolo</button>
                  </div>
                </div>
              </div>
            ) : sel ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: "#014D5E" }}>{sel.nomeProtocolo}</div>
                    <div className="text-[11.5px] text-[#8A857A] mt-0.5">{periodoSub(sel)}</div>
                  </div>
                  <button onClick={() => removeAplicado(sel)} className="p-1.5 rounded hover:bg-red-50 text-red-500 shrink-0" title="Excluir protocolo"><LuTrash size={15} /></button>
                </div>
                <div className="overflow-x-auto mt-3">
                  <table className="w-full border-collapse">
                    <thead><tr style={{ borderBottom: "1px solid #E8DFC8" }}>
                      <th className={th}>Programação</th><th className={th}>Aplicação</th><th className={th}>Laboratório</th><th className={th}>Lote</th><th className={th}>Status</th><th className={th}></th>
                    </tr></thead>
                    <tbody>
                      {sel.doses.slice().sort((a, b) => new Date(a.dataPrevista).getTime() - new Date(b.dataPrevista).getTime()).map((d) => {
                        const b = DOSE_BADGE[d.status] || DOSE_BADGE.PENDENTE; const aplicada = d.status === "APLICADA";
                        return (
                          <tr key={d.id} style={{ borderBottom: "1px solid #F0EBE0" }}>
                            <td className={td + " whitespace-nowrap font-medium"} style={{ color: "#0E2244" }}>{fmt(d.dataPrevista)}</td>
                            <td className={td + " whitespace-nowrap"} style={{ color: aplicada ? "#0F6E56" : "#9aa0a8" }}>{aplicada ? fmt(d.dataAplicada) : "—"}</td>
                            <td className={td} style={{ color: d.fabricante ? "#5C6B70" : "#c9c6bd" }}>{d.fabricante || "—"}</td>
                            <td className={td + " tabular-nums"} style={{ color: d.lote ? "#5C6B70" : "#c9c6bd" }}>{d.lote || "—"}</td>
                            <td className={td}><span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: b.bg, color: b.fg }}>{b.label}</span></td>
                            <td className={td + " text-right whitespace-nowrap"}>
                              {aplicada
                                ? <button onClick={() => openDose(d, sel.nomeProtocolo)} className="text-[#009AAC] p-1" title="Editar aplicação"><LuPencil size={13} /></button>
                                : <button onClick={() => openDose(d, sel.nomeProtocolo)} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ background: "#009AAC" }}>Registrar</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="text-[11.5px] text-[#8A857A] mt-3">Ao registrar a <b>aplicação</b> (com laboratório e lote), a dose entra no prontuário e dispara o lembrete de WhatsApp da próxima automaticamente.</div>
              </div>
            ) : (
              <div className="text-center text-[12.5px] text-gray-400 py-10">Selecione um protocolo à esquerda, ou clique em <b>Adicionar protocolo</b>.</div>
            )}
          </div>
        </div>
      </div>

      {doseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDoseModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#0E2244" }}>Registrar aplicação — dose {doseModal.dose.numero}</h2>
              <button onClick={() => setDoseModal(null)} className="p-1.5 rounded hover:bg-gray-100"><LuX size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Data da aplicação
                <input type="date" value={doseModal.dataAplicada} onChange={e => setDoseModal({ ...doseModal, dataAplicada: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm">Lote
                <input value={doseModal.lote} onChange={e => setDoseModal({ ...doseModal, lote: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm col-span-2">Laboratório / Fabricante
                <input value={doseModal.fabricante} onChange={e => setDoseModal({ ...doseModal, fabricante: e.target.value })} placeholder="Ex.: Zoetis, MSD…" className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm col-span-2">Observação
                <input value={doseModal.observacao} onChange={e => setDoseModal({ ...doseModal, observacao: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <div className="col-span-2 flex items-center gap-2 mt-1 rounded-lg px-3 py-2" style={{ background: "#F0FBFC", border: "1px solid #cfeef1" }}>
                <input id="lancarComanda" type="checkbox" checked={!!doseModal.lancarComanda} onChange={e => setDoseModal({ ...doseModal, lancarComanda: e.target.checked })} />
                <label htmlFor="lancarComanda" className="text-[13px] font-medium cursor-pointer" style={{ color: "#014D5E" }}>🛒 Lançar na comanda</label>
                <input type="number" step="0.01" value={doseModal.comandaValor} onChange={e => setDoseModal({ ...doseModal, comandaValor: e.target.value })} placeholder="R$ 0,00" disabled={!doseModal.lancarComanda} className="ml-auto w-24 px-2 py-1 border rounded-lg text-right text-[13px] disabled:opacity-50" style={{ borderColor: "#E8DFC8" }} />
              </div>
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
