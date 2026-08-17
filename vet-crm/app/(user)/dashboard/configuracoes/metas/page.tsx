"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuTarget } from "react-icons/lu";

type Periodicidade = "SEMANAL" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
type Medida = "VALOR" | "QUANTIDADE";

interface Meta {
  id: string;
  tipo?: string;
  periodicidade: Periodicidade;
  profissionalId?: string | null;
  servicoId?: string | null;
  dataInicio: string;
  valorMeta: number;
  valorRealizado?: number | null; // calculado no backend
  medida?: Medida; // vem do backend (lista de config)
  status?: string;
  observacoes?: string | null;
}

const PER_LABEL: Record<Periodicidade, string> = { SEMANAL: "Semanal", MENSAL: "Mensal", TRIMESTRAL: "Trimestral", SEMESTRAL: "Semestral", ANUAL: "Anual" };
const brl = (n: number) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (n: number) => `${(Number(n) || 0).toLocaleString("pt-BR")} un.`;
async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

const EMPTY = { medida: "VALOR" as Medida, profissionalId: "", servicoId: "", periodicidade: "MENSAL" as Periodicidade, dataInicio: new Date().toISOString().slice(0, 10), valorMeta: 0 };

export default function MetasPage() {
  const [list, setList] = useState<Meta[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [servicos, setServicos] = useState<{ id: string; nome: string }[]>([]);
  const [medEntry, setMedEntry] = useState<Record<string, string>>({}); // metaId → id do item na lista meta_medida
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.name])), [users]);
  const svcMap = useMemo(() => Object.fromEntries(servicos.map(s => [s.id, s.nome])), [servicos]);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [metas, us, svc, kv] = await Promise.all([
        safeJson<any[]>(await fetch("/api/metas", { cache: "no-store" }), []),
        safeJson<any>(await fetch("/api/users", { cache: "no-store" }), []),
        safeJson<any>(await fetch("/api/servicos/itens", { cache: "no-store" }), []),
        safeJson<any>(await fetch("/api/listas?lista=meta_medida", { cache: "no-store" }), []),
      ]);
      setList(Array.isArray(metas) ? metas : []);
      const usArr = Array.isArray(us) ? us : (us.users || us.data || []);
      setUsers(usArr.map((u: any) => ({ id: u.id, name: u.name || u.nome || u.email })));
      const svcArr = Array.isArray(svc) ? svc : (svc.itens || svc.data || []);
      setServicos(svcArr.map((s: any) => ({ id: s.id, nome: s.nome })).filter((s: any) => s.id && s.nome));
      const kvArr = Array.isArray(kv) ? kv : (kv.itens || kv.data || []);
      const map: Record<string, string> = {};
      for (const it of kvArr) { try { const o = JSON.parse(it.valor); if (o?.metaId) map[o.metaId] = it.id; } catch {} }
      setMedEntry(map);
    } catch (e) { console.error(e); } finally { jaCarregou.current = true; setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm({ ...EMPTY, dataInicio: new Date().toISOString().slice(0, 10) }); setModalOpen(true); }
  function openEdit(m: Meta) {
    setEditId(m.id);
    setForm({ medida: m.medida || "VALOR", profissionalId: m.profissionalId || "", servicoId: m.servicoId || "", periodicidade: m.periodicidade || "MENSAL", dataInicio: m.dataInicio ? new Date(m.dataInicio).toISOString().slice(0, 10) : "", valorMeta: m.valorMeta || 0 });
    setModalOpen(true);
  }

  async function save() {
    if (!form.dataInicio) { alert("Escolha a data de início"); return; }
    if (!(Number(form.valorMeta) > 0)) { alert("Informe o alvo (maior que zero)"); return; }
    setSaving(true);
    try {
      const tipo = form.servicoId ? "SERVICO_ESPECIFICO" : (form.profissionalId ? "FATURAMENTO_INDIVIDUAL" : "FATURAMENTO_GERAL");
      const body = {
        tipo, periodicidade: form.periodicidade,
        profissionalId: form.profissionalId || undefined,
        servicoId: form.servicoId || undefined,
        dataInicio: new Date(form.dataInicio + "T12:00:00").toISOString(),
        valorMeta: Number(form.valorMeta), status: "EM_ANDAMENTO",
      };
      const res = await fetch(editId ? `/api/metas/${editId}` : "/api/metas", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); setSaving(false); return; }
      const meta = await res.json().catch(() => ({}));
      const metaId = editId || meta?.id;
      // guarda a "medida" na lista de config (sem tocar o schema)
      if (metaId) {
        const kvBody = { valor: JSON.stringify({ metaId, medida: form.medida }) };
        const entryId = medEntry[metaId];
        if (entryId) await fetch(`/api/listas/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kvBody) });
        else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "meta_medida", ...kvBody }) });
      }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); } finally { setSaving(false); }
  }

  async function remove(m: Meta) {
    if (!(await confirmDelete({ entityLabel: "meta", itemName: metaTitulo(m) }))) return;
    await fetch(`/api/metas/${m.id}`, { method: "DELETE" });
    if (medEntry[m.id]) await fetch(`/api/listas/${medEntry[m.id]}`, { method: "DELETE" }).catch(() => {});
    await load();
  }

  function metaTitulo(m: Meta) {
    if (m.servicoId) return svcMap[m.servicoId] || "Serviço";
    return m.medida === "QUANTIDADE" ? "Vendas (quantidade)" : "Faturamento";
  }
  const fmtAlvo = (m: Meta, n: number) => (m.medida === "QUANTIDADE" ? qtd(n) : brl(n));

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-black/5"><LuArrowLeft size={18} /></Link>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "#0E2244" }}><LuTarget size={20} style={{ color: "#009AAC" }} /> Metas</h1>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#E0F4F6", color: "#00798A", border: "1px solid #009AAC" }}>🔄 atualiza sozinho pelas vendas</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Defina só o alvo — o <b>atingido é calculado sozinho</b> pelas vendas do período. Meça por <b>valor (R$)</b> ou <b>quantidade</b>, por funcionário e/ou serviço.</p>

      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-gray-500">{list.length} meta(s)</div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}><LuPlus size={14} /> Nova meta</button>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading && <div className="text-center py-10 text-gray-400 text-sm">Carregando…</div>}
        {!loading && list.length === 0 && <div className="text-center py-10 text-gray-400 text-sm border rounded-2xl" style={{ borderColor: "#E8DFC8" }}>Nenhuma meta ainda. Clique em “Nova meta”.</div>}
        {list.map(m => {
          const alvo = Number(m.valorMeta) || 0;
          const real = Number(m.valorRealizado) || 0;
          const pct = alvo > 0 ? Math.min(100, (real / alvo) * 100) : 0;
          const cor = pct >= 100 ? "#0F6E56" : (m.medida === "QUANTIDADE" ? "#6A4FB0" : "#009AAC");
          return (
            <div key={m.id} className="bg-white border rounded-2xl p-4" style={{ borderColor: "#E8DFC8" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14.5px] font-bold" style={{ color: "#014D5E" }}>{metaTitulo(m)}</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={m.medida === "QUANTIDADE" ? { background: "#EDE7FA", color: "#6A4FB0" } : { background: "#E7F6EE", color: "#0F6E56" }}>{m.medida === "QUANTIDADE" ? "nº quantidade" : "R$ valor"}</span>
                {m.profissionalId && <span className="text-[10.5px] px-2 py-0.5 rounded-full border" style={{ background: "#FBF9F4", color: "#5C6B70", borderColor: "#F0EBE0" }}>👤 {userMap[m.profissionalId] || "Funcionário"}</span>}
                <span className="text-[11px] text-gray-400 ml-auto">{PER_LABEL[m.periodicidade] || m.periodicidade} · desde {m.dataInicio ? new Date(m.dataInicio).toLocaleDateString("pt-BR") : "—"}</span>
                <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><LuPencil size={14} /></button>
                <button onClick={() => remove(m)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#EF4444" }}><LuX size={14} /></button>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#F0EBE0" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
                </div>
                <span className="text-[12.5px] tabular-nums whitespace-nowrap" style={{ color: "#33454A" }}><b style={{ color: "#014D5E" }}>{fmtAlvo(m, real)}</b> / {fmtAlvo(m, alvo)}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={pct >= 100 ? { background: "#E7F6EE", color: "#0F6E56" } : { background: "#FBF1E2", color: "#B26A00" }}>{Math.round(pct)}%</span>
              </div>
              <div className="text-[10.5px] text-gray-400 mt-1.5">🔄 calculado das vendas do período{m.servicoId ? ` · só "${svcMap[m.servicoId] || "serviço"}"` : ""}{m.profissionalId ? ` · vendas do(a) ${userMap[m.profissionalId] || "funcionário"}` : ""}</div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{editId ? "Editar meta" : "Nova meta"}</h2>

            <label className="text-xs text-gray-600">Medir por</label>
            <div className="inline-flex border rounded-lg overflow-hidden mt-1 mb-3" style={{ borderColor: "#E8DFC8" }}>
              {([["VALOR", "💰 Valor (R$)"], ["QUANTIDADE", "🔢 Quantidade"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setForm({ ...form, medida: k })} className="px-4 py-2 text-sm font-medium" style={form.medida === k ? { background: "#E0F4F6", color: "#014D5E" } : { background: "#fff", color: "#5C6B70" }}>{l}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-600">Funcionário <span className="text-gray-300">(opcional)</span></label>
                <select value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Todos (a clínica toda)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Serviço/produto <span className="text-gray-300">(opcional)</span></label>
                <select value={form.servicoId} onChange={e => setForm({ ...form, servicoId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Todos</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Período</label>
                <select value={form.periodicidade} onChange={e => setForm({ ...form, periodicidade: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(PER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">A partir de</label>
                <input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Alvo ({form.medida === "QUANTIDADE" ? "quantidade" : "em R$"})</label>
                <input type="number" value={form.valorMeta} onChange={e => setForm({ ...form, valorMeta: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} placeholder={form.medida === "QUANTIDADE" ? "ex.: 30" : "ex.: 50000"} /></div>
            </div>

            <div className="mt-3 text-[12.5px] rounded-lg px-3 py-2" style={{ background: "#E7F6EE", border: "1px dashed #0F6E56", color: "#0F6E56" }}>🔄 O <b>atingido</b> é calculado sozinho pelas vendas do período — você não digita.</div>
            <div className="mt-2 text-[12.5px] rounded-lg px-3 py-2" style={{ background: "#FBF9F4", border: "1px solid #F0EBE0", color: "#33454A" }}>
              📝 Esta meta = <b style={{ color: "#014D5E" }}>{form.medida === "QUANTIDADE" ? `vender ${form.valorMeta || 0} un.` : `faturar ${brl(form.valorMeta || 0)}`}{form.servicoId ? ` de "${svcMap[form.servicoId] || "serviço"}"` : ""}{form.profissionalId ? ` — ${userMap[form.profissionalId] || "funcionário"}` : " (clínica toda)"}</b>, por {PER_LABEL[form.periodicidade as Periodicidade].toLowerCase()}.
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{saving ? "Salvando…" : "Salvar meta"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
