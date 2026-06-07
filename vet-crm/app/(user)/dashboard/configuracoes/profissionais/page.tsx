"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

type Tipo = "VETERINARIO" | "RECEPCIONISTA" | "ESTAGIARIO" | "GERENTE" | "OUTRO";

interface Profissional {
  id: string; nomeCompleto: string; nomeExibicao?: string | null; iniciais?: string | null;
  tipo: Tipo; especialidade?: string | null; crmv?: string | null; telefone?: string | null;
  email?: string | null; fotoUrl?: string | null; corAvatar?: string | null;
  comissaoPercentual?: number | null; ativo: boolean;
  user?: { id: string; role: string; email: string } | null;
}

const TIPO_LABEL: Record<Tipo, string> = {
  VETERINARIO: "Veterinário", RECEPCIONISTA: "Recepção", ESTAGIARIO: "Estagiário", GERENTE: "Gerente", OUTRO: "Outro",
};
const TIPO_DOT: Record<Tipo, string> = {
  VETERINARIO: "#009AAC", RECEPCIONISTA: "#A855F7", ESTAGIARIO: "#F59E0B", GERENTE: "#EF4444", OUTRO: "#94A3B8",
};

const EMPTY: any = { nomeCompleto: "", nomeExibicao: "", iniciais: "", tipo: "VETERINARIO", especialidade: "", crmv: "", telefone: "", email: "", comissaoPercentual: null, ativo: true, criarAcesso: false, role: "RECEPTIONIST", password: "" };

export default function ProfissionaisPage() {
  const [list, setList] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"ALL" | Tipo>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const res = await fetch(`/api/profissionais${qs}`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterTipo !== "ALL") arr = arr.filter(p => p.tipo === filterTipo);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(p => p.nomeCompleto.toLowerCase().includes(q) || (p.especialidade || "").toLowerCase().includes(q));
    }
    return arr;
  }, [list, filterTipo, search]);

  function openNew() { setEditId(null); setForm({ ...EMPTY, tipo: filterTipo !== "ALL" ? filterTipo : "VETERINARIO" }); setModalOpen(true); }
  function openEdit(p: Profissional) {
    setEditId(p.id);
    setForm({ ...p, criarAcesso: !!p.user, role: p.user?.role || "RECEPTIONIST", password: "" });
    setModalOpen(true);
  }
  async function save() {
    try {
      const { id, createdAt, updatedAt, user, ...payload } = form as any;
      if (!payload.criarAcesso) { delete payload.role; delete payload.password; }
      else if (!editId && !payload.password) { alert("Senha obrigatória ao criar acesso"); return; }
      const url = editId ? `/api/profissionais/${editId}` : "/api/profissionais";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`); return; }
      setModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function remove(p: Profissional) {
    if (!confirm(`Excluir "${p.nomeCompleto}"?`)) return;
    const res = await fetch(`/api/profissionais/${p.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleAtivo(p: Profissional) {
    const res = await fetch(`/api/profissionais/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !p.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  const counts: Record<string, number> = { ALL: list.length };
  for (const p of list) counts[p.tipo] = (counts[p.tipo] || 0) + 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Profissionais</h1>
            <p className="text-sm text-gray-500">Equipe da clínica + acessos ao sistema</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
          Importar planilha
        </button>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome/especialidade..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Profissional
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Especialidade</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Acesso</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum profissional.</td></tr>}
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: p.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TIPO_DOT[p.tipo] }} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: "#0E2244" }}>{p.nomeCompleto}</div>
                    {p.email && <div className="text-xs text-gray-400">{p.email}</div>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{TIPO_LABEL[p.tipo]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{p.especialidade || "—"}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {p.user ? <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#E0F4F6", color: "#009AAC" }}>{p.user.role}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleAtivo(p)} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: p.ativo ? "#009AAC" : "#CBD5E0" }}>
                      <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: p.ativo ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openEdit(p)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Editar"><LuPencil size={14} /></button>
                    <button onClick={() => remove(p)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir"><LuX size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">TIPOS</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "VETERINARIO", "RECEPCIONISTA", "ESTAGIARIO", "GERENTE", "OUTRO"] as const).map(k => (
              <button key={k} onClick={() => setFilterTipo(k)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
                style={{
                  borderColor: filterTipo === k ? "#009AAC" : "#E8DFC8",
                  background: filterTipo === k ? "#E0F4F6" : "white",
                  color: filterTipo === k ? "#009AAC" : "#4B5563",
                }}>
                {k === "ALL" ? "Todos" : TIPO_LABEL[k as Tipo]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{editId ? "Editar profissional" : "Novo profissional"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-600">Nome completo *</label>
                <input value={form.nomeCompleto || ""} onChange={e => setForm({ ...form, nomeCompleto: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Nome de exibição</label>
                <input value={form.nomeExibicao || ""} onChange={e => setForm({ ...form, nomeExibicao: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Iniciais</label>
                <input value={form.iniciais || ""} onChange={e => setForm({ ...form, iniciais: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} className="w-full px-3 py-2 border rounded-lg text-sm uppercase" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-600">Especialidade</label>
                <input value={form.especialidade || ""} onChange={e => setForm({ ...form, especialidade: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">CRMV</label>
                <input value={form.crmv || ""} onChange={e => setForm({ ...form, crmv: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Telefone</label>
                <input value={form.telefone || ""} onChange={e => setForm({ ...form, telefone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">E-mail</label>
                <input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
              <div><label className="text-xs text-gray-600">Comissão (%)</label>
                <input type="number" step="0.1" value={form.comissaoPercentual ?? ""} onChange={e => setForm({ ...form, comissaoPercentual: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>

              <div className="md:col-span-2 mt-2 pt-3 border-t" style={{ borderColor: "#E8DFC8" }}>
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" checked={form.criarAcesso} onChange={e => setForm({ ...form, criarAcesso: e.target.checked })} />
                  Criar acesso ao sistema
                </label>
              </div>
              {form.criarAcesso && (
                <>
                  <div><label className="text-xs text-gray-600">Papel *</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                      <option value="ADMIN">Admin</option>
                      <option value="VETERINARIAN">Veterinário</option>
                      <option value="RECEPTIONIST">Recepcionista</option>
                    </select></div>
                  <div><label className="text-xs text-gray-600">Senha {editId ? "(deixe vazio pra manter)" : "*"}</label>
                    <input type="password" value={form.password || ""} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} /></div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Profissionais" endpoint="/api/profissionais/import-batch"
        exampleHint="Exporte de Base44 > Profissional. Tipos: Veterinário, Recepcionista, Estagiário, Gerente, Outro."
        fields={[
          { key: "nomeCompleto", label: "Nome", aliases: ["nome", "nome_completo"], required: true },
          { key: "tipo", label: "Tipo" },
          { key: "especialidade", label: "Especialidade" },
          { key: "crmv", label: "CRMV" },
          { key: "telefone", label: "Telefone" },
          { key: "email", label: "Email" },
          { key: "iniciais", label: "Iniciais" },
          { key: "ativo", label: "Ativo", type: "boolean" },
        ]}
        onSuccess={() => load()} />
    </div>
  );
}
