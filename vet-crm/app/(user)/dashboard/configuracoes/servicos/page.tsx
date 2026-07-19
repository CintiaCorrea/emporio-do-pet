"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuX, LuPlus, LuSearch } from "react-icons/lu";
import CsvImporter from "@/components/import/CsvImporter";

type ComissaoBase = "VALOR_CHEIO" | "MARGEM" | "SEM_COMISSAO" | "HERDAR";

interface Categoria { id: string; nome: string; comissaoBasePadrao: ComissaoBase; ativo: boolean; _count?: { servicos: number }; }
interface Servico {
  id: string; nome: string; valorPadrao?: number | null; custoPadrao?: number | null;
  comissaoBaseDefault: ComissaoBase; categoryId?: string | null; ativo: boolean;
  category?: { id: string; nome: string } | null;
}

const COM_LABEL: Record<ComissaoBase, string> = {
  VALOR_CHEIO: "Valor cheio", MARGEM: "Margem", SEM_COMISSAO: "Sem comissão", HERDAR: "Herdar",
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;
const EMPTY_S: any = { nome: "", valorPadrao: null, custoPadrao: null, comissaoBaseDefault: "HERDAR", categoryId: null, ativo: true };
const EMPTY_C: any = { nome: "", comissaoBasePadrao: "VALOR_CHEIO", ativo: true };

export default function ServicosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null); // falha REAL de carga — nunca fingir "lista vazia"
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("ALL");

  const [sModalOpen, setSModalOpen] = useState(false);
  const [sEditId, setSEditId] = useState<string | null>(null);
  const [sForm, setSForm] = useState<any>(EMPTY_S);

  const [cModalOpen, setCModalOpen] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [cForm, setCForm] = useState<any>(EMPTY_C);

  const [importOpen, setImportOpen] = useState(false);

  // "Carregando..." so na PRIMEIRA carga: nas recargas depois de uma acao os dados
  // sao trocados por baixo, sem desmontar a tela (evita o "pulo" a cada clique).
  const jaCarregou = useRef(false);

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    setErro(null);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [rC, rS] = await Promise.all([fetch(`/api/servicos/categorias${qs}`), fetch(`/api/servicos/itens${qs}`)]);

      const cRaw = await rC.text();
      const sRaw = await rS.text();
      const parse = (raw: string) => { try { return JSON.parse(raw); } catch { return raw; } };
      const cJson = parse(cRaw);
      const sJson = parse(sRaw);

      // Antes: qualquer resposta estranha virava [] e a tela dizia "Nenhum serviço" —
      // um erro de carga ficava indistinguível de catálogo vazio. Agora ela conta a verdade.
      const explica = (nome: string, r: Response, j: any, raw: string) => {
        if (!r.ok) return `${nome}: o servidor respondeu ${r.status}` + (j?.message || j?.error ? ` — ${j.message || j.error}` : "");
        if (!Array.isArray(j)) return `${nome}: resposta em formato inesperado (${raw.slice(0, 120)})`;
        return null;
      };
      const eC = explica("Categorias", rC, cJson, cRaw);
      const eS = explica("Serviços", rS, sJson, sRaw);

      setCategorias(Array.isArray(cJson) ? cJson : []);
      setServicos(Array.isArray(sJson) ? sJson : []);
      if (eC || eS) { setErro([eC, eS].filter(Boolean).join(" · ")); console.error("Falha ao carregar o catálogo:", { eC, eS }); }
    } catch (e: any) {
      setErro(`Não deu pra falar com o servidor: ${e?.message || e}`);
      console.error(e);
    }
    finally { jaCarregou.current = true; setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = servicos;
    if (filterCat === "NONE") arr = arr.filter(s => !s.categoryId);
    else if (filterCat !== "ALL") arr = arr.filter(s => s.categoryId === filterCat);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(s => s.nome.toLowerCase().includes(q));
    }
    return arr;
  }, [servicos, filterCat, search]);

  function openSNew() { setSEditId(null); setSForm({ ...EMPTY_S, categoryId: filterCat !== "ALL" && filterCat !== "NONE" ? filterCat : null }); setSModalOpen(true); }
  function openSEdit(s: Servico) { setSEditId(s.id); setSForm({ ...s }); setSModalOpen(true); }
  async function saveS() {
    try {
      const { id, createdAt, updatedAt, category, ...payload } = sForm as any;
      const url = sEditId ? `/api/servicos/itens/${sEditId}` : "/api/servicos/itens";
      const method = sEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setSModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeS(s: Servico) {
    if (!(await confirmDelete({ entityLabel: "serviço", itemName: s.nome }))) return;
    const res = await fetch(`/api/servicos/itens/${s.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }
  async function toggleS(s: Servico) {
    const res = await fetch(`/api/servicos/itens/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !s.ativo }) });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    await load();
  }

  function openCNew() { setCEditId(null); setCForm(EMPTY_C); setCModalOpen(true); }
  function openCEdit(c: Categoria) { setCEditId(c.id); setCForm({ ...c }); setCModalOpen(true); }
  async function saveC() {
    try {
      const { id, createdAt, updatedAt, _count, ...payload } = cForm as any;
      const url = cEditId ? `/api/servicos/categorias/${cEditId}` : "/api/servicos/categorias";
      const method = cEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); alert(`Erro: ${err?.message || res.status}`); return; }
      setCModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function removeC(c: Categoria) {
    if (!(await confirmDelete({ entityLabel: "categoria", itemName: c.nome }))) return;
    const res = await fetch(`/api/servicos/categorias/${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert(`Erro: ${res.status}`); return; }
    if (filterCat === c.id) setFilterCat("ALL");
    await load();
  }

  const totalSemCat = servicos.filter(s => !s.categoryId).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Serviços e Produtos</h1>
            <p className="text-sm text-gray-500">Catálogo com preço, custo e regra de comissão</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
      </div>

      {erro && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="rounded-lg border px-4 py-3 text-sm flex items-start gap-2" style={{ borderColor: "#F0C2C2", background: "#FCEBEB", color: "#8B2020" }}>
            <span>⚠️</span>
            <div>
              <b>O catálogo não carregou.</b> A lista abaixo pode estar vazia por causa disso — não porque não existam serviços.
              <div className="mt-1 text-[12px] font-mono opacity-80">{erro}</div>
              <button onClick={load} className="mt-2 underline font-medium">Tentar de novo</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={openCNew} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            <LuPlus size={14} /> Nova Categoria
          </button>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            Importar planilha
          </button>
        </div>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar serviço..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
        </div>
        <button onClick={openSNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white" style={{ background: "#009AAC" }}>
          <LuPlus size={14} /> Novo Serviço
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Preço</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Custo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Comissão</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500">Ativo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum serviço.</td></tr>}
              {filtered.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0", opacity: s.ativo ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: "#0E2244" }}>{s.nome}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">{s.category?.nome || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmtR(s.valorPadrao)}</td>
                  <td className="px-4 py-2.5 text-right hidden md:table-cell tabular-nums text-gray-500">{fmtR(s.custoPadrao)}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-500 text-xs">{COM_LABEL[s.comissaoBaseDefault]}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleS(s)} className="inline-flex items-center w-10 h-5 rounded-full transition" style={{ background: s.ativo ? "#009AAC" : "#CBD5E0" }}>
                      <span className="block w-4 h-4 rounded-full bg-white transition shadow" style={{ marginLeft: s.ativo ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openSEdit(s)} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600" title="Editar"><LuPencil size={14} /></button>
                    <button onClick={() => removeS(s)} className="p-1 hover:bg-gray-200 rounded inline-block ml-1" style={{ color: "#EF4444" }} title="Excluir"><LuX size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CATEGORIAS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterCat("ALL")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterCat === "ALL" ? "#009AAC" : "#E8DFC8",
                background: filterCat === "ALL" ? "#E0F4F6" : "white",
                color: filterCat === "ALL" ? "#009AAC" : "#4B5563",
              }}>
              Todos <span className="text-gray-400">({servicos.length})</span>
            </button>
            <button onClick={() => setFilterCat("NONE")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
              style={{
                borderColor: filterCat === "NONE" ? "#009AAC" : "#E8DFC8",
                background: filterCat === "NONE" ? "#E0F4F6" : "white",
                color: filterCat === "NONE" ? "#009AAC" : "#4B5563",
              }}>
              Sem categoria <span className="text-gray-400">({totalSemCat})</span>
            </button>
            {categorias.map(c => (
              <div key={c.id} className="inline-flex items-center gap-0.5 border rounded-lg overflow-hidden"
                style={{
                  borderColor: filterCat === c.id ? "#009AAC" : "#E8DFC8",
                  background: filterCat === c.id ? "#E0F4F6" : "white",
                  opacity: c.ativo ? 1 : 0.5,
                }}>
                <button onClick={() => setFilterCat(c.id)}
                  className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                  style={{ color: filterCat === c.id ? "#009AAC" : "#4B5563" }}>
                  {c.nome} <span className="text-gray-400">({c._count?.servicos || 0})</span>
                </button>
                <button onClick={() => openCEdit(c)} className="p-1.5 hover:bg-gray-100 border-l text-gray-600" style={{ borderColor: "#E8DFC8" }}><LuPencil size={11} /></button>
                <button onClick={() => removeC(c)} className="p-1.5 hover:bg-gray-100 border-l" style={{ borderColor: "#E8DFC8", color: "#EF4444" }}><LuX size={11} /></button>
              </div>
            ))}
            <button onClick={openCNew} className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed flex items-center gap-1.5 text-gray-500 hover:text-gray-700 hover:border-gray-400" style={{ borderColor: "#D1D5DB" }}>
              <LuPlus size={12} /> Nova categoria
            </button>
          </div>
        </div>
      </div>

      {sModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{sEditId ? "Editar serviço" : "Novo serviço"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={sForm.nome || ""} onChange={e => setSForm({ ...sForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Preço (R$)</label>
                  <input type="number" step="0.01" value={sForm.valorPadrao ?? ""} onChange={e => setSForm({ ...sForm, valorPadrao: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Custo (R$)</label>
                  <input type="number" step="0.01" value={sForm.custoPadrao ?? ""} onChange={e => setSForm({ ...sForm, custoPadrao: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria</label>
                <select value={sForm.categoryId || ""} onChange={e => setSForm({ ...sForm, categoryId: e.target.value || null })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Comissão</label>
                <select value={sForm.comissaoBaseDefault} onChange={e => setSForm({ ...sForm, comissaoBaseDefault: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {Object.entries(COM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={sForm.ativo} onChange={e => setSForm({ ...sForm, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveS} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {cModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#0E2244" }}>{cEditId ? "Editar categoria" : "Nova categoria"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={cForm.nome || ""} onChange={e => setCForm({ ...cForm, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Comissão base padrão</label>
                <select value={cForm.comissaoBasePadrao} onChange={e => setCForm({ ...cForm, comissaoBasePadrao: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  <option value="VALOR_CHEIO">Valor cheio</option>
                  <option value="MARGEM">Margem</option>
                  <option value="SEM_COMISSAO">Sem comissão</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cForm.ativo} onChange={e => setCForm({ ...cForm, ativo: e.target.checked })} /> Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</button>
              <button onClick={saveC} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Serviços" endpoint="/api/servicos/import-batch"
        exampleHint="Exporte de Base44 > Servico. Comissão: Valor cheio, Margem, Sem comissão, Herdar da categoria."
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "categoria", label: "Categoria" },
          { key: "valor_padrao", label: "Preço Venda", aliases: ["valorPadrao", "preco"], type: "number" },
          { key: "custo_padrao", label: "Custo", aliases: ["custoPadrao", "custo"], type: "number" },
          { key: "comissao_base_default", label: "Comissão Base", aliases: ["comissaoBaseDefault"] },
          { key: "ativo", label: "Ativo", type: "boolean" },
        ]}
        onSuccess={() => load()} />
    </div>
  );
}
