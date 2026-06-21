"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";

type Tipo = "VACINA" | "VERMIFUGO" | "ECTOPARASITA";

interface Template {
  id: string;
  nome: string;
  tipo: Tipo;
  variante?: string | null;
  doses: number;
  intervaloDias?: number | null;
  reforcoMeses?: number | null;
  indicacaoIdade?: string | null;
  idadeMinDias?: number | null;
  ativo: boolean;
  ordem: number;
}

const TIPO_LABEL: Record<Tipo, string> = { VACINA: "Vacinas", VERMIFUGO: "Vermífugos", ECTOPARASITA: "Ectoparasitas" };
const TIPO_DOT: Record<Tipo, string> = { VACINA: "#009AAC", VERMIFUGO: "#A855F7", ECTOPARASITA: "#E08A1E" };
const TIPOS: Tipo[] = ["VACINA", "VERMIFUGO", "ECTOPARASITA"];

const EMPTY: any = { nome: "", tipo: "VACINA", variante: "", doses: 1, intervaloDias: "", reforcoMeses: "", indicacaoIdade: "", idadeMinDias: "", ativo: true, ordem: 0 };

function cronograma(t: Template): string {
  const partes: string[] = [];
  if (t.doses > 1) partes.push(`${t.doses} doses` + (t.intervaloDias ? ` (cada ${t.intervaloDias} dias)` : ""));
  else partes.push("dose única");
  if (t.reforcoMeses) partes.push(`reforço ${t.reforcoMeses === 12 ? "anual" : `${t.reforcoMeses} meses`}`);
  return partes.join(" · ");
}

export default function ProtocolosConfigPage() {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"ALL" | Tipo>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/protocolos/templates`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterTipo !== "ALL") arr = arr.filter(t => t.tipo === filterTipo);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t => t.nome.toLowerCase().includes(q) || (t.variante || "").toLowerCase().includes(q));
    }
    return [...arr].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  }, [list, filterTipo, search]);

  function openNew() { setEditId(null); setForm({ ...EMPTY, tipo: filterTipo !== "ALL" ? filterTipo : "VACINA" }); setModalOpen(true); }
  function openEdit(t: Template) {
    setEditId(t.id);
    setForm({ ...t, variante: t.variante ?? "", intervaloDias: t.intervaloDias ?? "", reforcoMeses: t.reforcoMeses ?? "", indicacaoIdade: t.indicacaoIdade ?? "", idadeMinDias: t.idadeMinDias ?? "" });
    setModalOpen(true);
  }

  function numOrNull(v: any) { return v === "" || v === null || v === undefined ? null : Number(v); }

  async function save() {
    if (!form.nome?.trim()) { alert("Informe o nome do protocolo."); return; }
    const payload: any = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      variante: form.variante?.trim() || null,
      doses: Number(form.doses) || 1,
      intervaloDias: numOrNull(form.intervaloDias),
      reforcoMeses: numOrNull(form.reforcoMeses),
      indicacaoIdade: form.indicacaoIdade?.trim() || null,
      idadeMinDias: numOrNull(form.idadeMinDias),
      ativo: !!form.ativo,
      ordem: Number(form.ordem) || 0,
    };
    try {
      const url = editId ? `/api/protocolos/templates/${editId}` : "/api/protocolos/templates";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(t: Template) {
    if (!(await confirmDelete({ entityLabel: "protocolo", itemName: [t.nome, t.variante].filter(Boolean).join(" - ") }))) return;
    const res = await fetch(`/api/protocolos/templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleAtivo(t: Template) {
    const res = await fetch(`/api/protocolos/templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !t.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function restaurarPadroes() {
    if (!confirm("Restaurar os protocolos padrão (catálogo do SimplesVet)? Não apaga nem altera os que você já tem — só adiciona os que faltarem.")) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/protocolos/templates/seed`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { alert(`Erro: ${data?.message || res.status}`); return; }
      alert(`Catálogo atualizado: ${data?.criados ?? 0} adicionados (total ${data?.total ?? "?"}).`);
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const t of list) counts[t.tipo] = (counts[t.tipo] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Protocolos</h1>
            <p className="text-sm text-gray-500">Padrões de vacina, vermífugo e ectoparasita — o vet escolhe na ficha e as doses se agendam sozinhas</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", ...TIPOS] as const).map(tp => (
            <button key={tp} onClick={() => setFilterTipo(tp as any)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border transition"
              style={filterTipo === tp ? { background: "#009AAC", color: "white", borderColor: "#009AAC" } : { background: "white", color: "#475569", borderColor: "#E8DFC8" }}>
              {tp === "ALL" ? "Todos" : TIPO_LABEL[tp as Tipo]} <span className="opacity-70">({tp === "ALL" ? counts.ALL : (counts[tp] || 0)})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={restaurarPadroes} disabled={seeding}
            className="px-3 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            {seeding ? "Restaurando..." : "Restaurar padrões"}
          </button>
          <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
            <LuPlus size={14} /> Novo protocolo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-3">
        <div className="relative max-w-md">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar protocolo..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Protocolo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Cronograma</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden lg:table-cell">Indicação</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-28">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhum protocolo. Use <b>Restaurar padrões</b> para trazer o catálogo do SimplesVet.
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: t.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TIPO_DOT[t.tipo] }} /></td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: "#0E2244" }}>{t.nome}{t.variante ? ` — ${t.variante}` : ""}</div>
                    <div className="text-xs text-gray-400">{TIPO_LABEL[t.tipo]}</div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-600">{cronograma(t)}</td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500">{t.indicacaoIdade || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <input type="checkbox" checked={t.ativo} onChange={() => toggleAtivo(t)} />
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar"><LuPencil size={15} /></button>
                    <button onClick={() => remove(t)} className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Excluir"><LuX size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#0E2244" }}>{editId ? "Editar protocolo" : "Novo protocolo"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded hover:bg-gray-100"><LuX size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm col-span-1">Nome*
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} placeholder="Ex: V10" />
              </label>
              <label className="text-sm col-span-1">Tipo*
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white" style={{ borderColor: "#E8DFC8" }}>
                  {TIPOS.map(tp => <option key={tp} value={tp}>{TIPO_LABEL[tp]}</option>)}
                </select>
              </label>
              <label className="text-sm col-span-2">Variante
                <input value={form.variante} onChange={e => setForm({ ...form, variante: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} placeholder="Ex: Filhote (3 x 30 dias)" />
              </label>
              <label className="text-sm">Nº de doses
                <input type="number" min={1} value={form.doses} onChange={e => setForm({ ...form, doses: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm">Intervalo (dias)
                <input type="number" min={0} value={form.intervaloDias} onChange={e => setForm({ ...form, intervaloDias: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} placeholder="entre doses" />
              </label>
              <label className="text-sm">Reforço (meses)
                <input type="number" min={0} value={form.reforcoMeses} onChange={e => setForm({ ...form, reforcoMeses: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} placeholder="12 = anual" />
              </label>
              <label className="text-sm">Idade mínima (dias)
                <input type="number" min={0} value={form.idadeMinDias} onChange={e => setForm({ ...form, idadeMinDias: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} />
              </label>
              <label className="text-sm col-span-2">Indicação de idade (texto)
                <input value={form.indicacaoIdade} onChange={e => setForm({ ...form, indicacaoIdade: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8" }} placeholder="Ex: A partir de 45 dias" />
              </label>
              <label className="text-sm flex items-center gap-2 col-span-2 mt-1">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
