"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CsvImporter from "@/components/import/CsvImporter";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical, LuSparkles, LuCheck } from "react-icons/lu";

interface Category {
  id: string;
  nome: string;
  emoji?: string | null;
  ordem: number;
  ativo: boolean;
  _count?: { scripts: number };
}

interface Script {
  id: string;
  nome: string;
  conteudo: string;
  descricao?: string | null;
  variaveis: string[];
  categoryId?: string | null;
  ordem: number;
  ativo: boolean;
  vezesUsado: number;
  category?: { id: string; nome: string; emoji?: string | null } | null;
}

const EMPTY_CAT: any = { nome: "", emoji: "", ordem: 0, ativo: true };
const EMPTY_SC: any = { nome: "", conteudo: "", descricao: "", variaveis: [], categoryId: "", ordem: 0, ativo: true };

// Detecta variáveis tipo {tutor}, {pet}, etc no conteúdo
function extractVariaveis(conteudo: string): string[] {
  const matches = conteudo.match(/\{([a-z_][a-z0-9_]*)\}/gi) || [];
  return Array.from(new Set(matches.map(m => m.slice(1, -1))));
}

export default function ScriptsConfigPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT);
  const [openMenuCat, setOpenMenuCat] = useState<string | null>(null);

  const [scModalOpen, setScModalOpen] = useState(false);
  const [scEditId, setScEditId] = useState<string | null>(null);
  const [scForm, setScForm] = useState<any>(EMPTY_SC);
  const [openMenuSc, setOpenMenuSc] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [resC, resS] = await Promise.all([
        fetch(`/api/scripts/categories${qs}`),
        fetch(`/api/scripts${qs}`),
      ]);
      setCats(await resC.json());
      setScripts(await resS.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const scriptsFiltrados = useMemo(() => {
    let arr = scripts;
    if (selectedCatId) arr = arr.filter(s => s.categoryId === selectedCatId);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(s => s.nome.toLowerCase().includes(q) || s.conteudo.toLowerCase().includes(q));
    }
    return arr;
  }, [scripts, selectedCatId, search]);

  // ===== Category handlers =====
  function openCatNew() { setCatEditId(null); setCatForm(EMPTY_CAT); setCatModalOpen(true); }
  function openCatEdit(c: Category) { setCatEditId(c.id); setCatForm({ ...c }); setCatModalOpen(true); setOpenMenuCat(null); }
  async function saveCat() {
    try {
      const { id, createdAt, updatedAt, _count, scripts: _s, ...payload } = catForm as any;
      const url = catEditId ? `/api/scripts/categories/${catEditId}` : "/api/scripts/categories";
      const method = catEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setCatModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteCat(c: Category) {
    if (!confirm(`Excluir categoria "${c.nome}"? Os scripts ficam sem categoria.`)) return;
    try {
      const res = await fetch(`/api/scripts/categories/${c.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      if (selectedCatId === c.id) setSelectedCatId(null);
      setOpenMenuCat(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  // ===== Script handlers =====
  function openScNew() {
    setScEditId(null);
    setScForm({ ...EMPTY_SC, categoryId: selectedCatId || "" });
    setScModalOpen(true);
  }
  function openScEdit(s: Script) { setScEditId(s.id); setScForm({ ...s }); setScModalOpen(true); setOpenMenuSc(null); }
  async function saveSc() {
    try {
      const { id, createdAt, updatedAt, category, vezesUsado, ...payload } = scForm as any;
      payload.variaveis = extractVariaveis(payload.conteudo); // auto-detecta
      if (!payload.categoryId) payload.categoryId = null;
      const url = scEditId ? `/api/scripts/${scEditId}` : "/api/scripts";
      const method = scEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setScModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteSc(s: Script) {
    if (!confirm(`Excluir script "${s.nome}"?`)) return;
    try {
      const res = await fetch(`/api/scripts/${s.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      setOpenMenuSc(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  async function copyScript(s: Script) {
    try {
      await navigator.clipboard.writeText(s.conteudo);
      await fetch(`/api/scripts/${s.id}/use`, { method: "POST" });
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) { alert("Não consegui copiar: " + e); }
  }

  async function rodarSeed() {
    if (!confirm("Carregar pacote inicial de 8 categorias + 16 scripts padrão? Só funciona se ainda não houver scripts cadastrados.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/scripts/seed-pacote-inicial", { method: "POST" });
      const data = await res.json();
      if (data?.skipped) alert(`Pacote não carregado: ${data.message}`);
      else { alert(`✅ ${data.categoriasCriadas} categorias e ${data.scriptsCriados} scripts criados!`); await load(); }
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Scripts (Templates de Resposta)</h1>
            <p className="text-sm text-gray-600">Mensagens prontas pra recepção colar no WhatsApp. Use {`{tutor}`}, {`{pet}`} como variáveis.</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>Importar planilha</button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
          {scripts.length === 0 && !loading && (
            <button onClick={rodarSeed} disabled={seeding}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "#3C3489", color: "white", opacity: seeding ? 0.5 : 1 }}>
              <LuSparkles size={16} /> {seeding ? "Carregando…" : "Carregar pacote inicial"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Categorias */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E5DCC9" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#3C3489" }}>Categorias</div>
              <div className="text-xs text-gray-500">{cats.length} cadastradas</div>
            </div>
            <button onClick={openCatNew} className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
              style={{ background: "#3C3489", color: "white" }}>
              <LuPlus size={14} /> Adicionar
            </button>
          </div>
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            <button onClick={() => setSelectedCatId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${!selectedCatId ? "font-semibold" : ""}`}
              style={{ background: !selectedCatId ? "#F3EEFC" : "transparent", color: !selectedCatId ? "#3C3489" : "#333" }}>
              📂 Todos ({scripts.length})
            </button>
            {cats.map(c => {
              const sel = selectedCatId === c.id;
              return (
                <div key={c.id} className="relative">
                  <button onClick={() => setSelectedCatId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${sel ? "font-semibold" : ""}`}
                    style={{ background: sel ? "#F3EEFC" : "transparent", color: sel ? "#3C3489" : "#333", opacity: c.ativo ? 1 : 0.5 }}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 min-w-0">
                        <span>{c.emoji || "📌"}</span>
                        <span className="truncate">{c.nome}</span>
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">{c._count?.scripts || 0}</span>
                        <span onClick={(ev) => { ev.stopPropagation(); setOpenMenuCat(openMenuCat === c.id ? null : c.id); }}
                          className="p-1 hover:bg-gray-200 rounded">
                          <LuEllipsisVertical size={14} />
                        </span>
                      </span>
                    </div>
                  </button>
                  {openMenuCat === c.id && (
                    <div className="absolute right-2 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                      style={{ borderColor: "#E5DCC9" }}>
                      <button onClick={() => openCatEdit(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <LuPencil size={14} /> Editar
                      </button>
                      <button onClick={() => deleteCat(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: "#6B7280" }}>
                        <LuTrash size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scripts */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9" }}>
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "#E5DCC9" }}>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "#3C3489" }}>
                {selectedCatId ? cats.find(c => c.id === selectedCatId)?.nome : "Todos os scripts"}
              </div>
              <div className="text-xs text-gray-500">{scriptsFiltrados.length} scripts</div>
            </div>
            <div className="relative">
              <LuSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="pl-7 pr-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: "#E5DCC9" }} />
            </div>
            <button onClick={openScNew} className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
              style={{ background: "#3C3489", color: "white" }}>
              <LuPlus size={14} /> Adicionar
            </button>
          </div>
          <div className="p-3 max-h-[70vh] overflow-y-auto">
            {loading && <div className="text-center py-8 text-sm text-gray-500">Carregando...</div>}
            {!loading && scriptsFiltrados.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-8">Nenhum script.</div>
            )}
            <div className="space-y-3">
              {scriptsFiltrados.map(s => (
                <div key={s.id} className="relative border rounded-lg p-3 hover:shadow-sm transition"
                  style={{ borderColor: "#E5DCC9", opacity: s.ativo ? 1 : 0.5 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {s.category && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: "#3C3489" }}>
                            {s.category.emoji} {s.category.nome}
                          </span>
                        )}
                        {s.vezesUsado > 0 && <span className="text-xs text-gray-400">Usado {s.vezesUsado}×</span>}
                      </div>
                      <div className="font-medium text-sm mb-1" style={{ color: "#333" }}>{s.nome}</div>
                      <div className="text-sm whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                        {s.conteudo}
                      </div>
                      {s.variaveis.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.variaveis.map(v => (
                            <span key={v} className="text-xs px-2 py-0.5 rounded" style={{ background: "#F1F1F1", color: "#6B7280" }}>
                              {`{${v}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => copyScript(s)} title="Copiar"
                        className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                        style={{ background: copiedId === s.id ? "#22C55E" : "#3C3489", color: "white" }}>
                        {copiedId === s.id ? <><LuCheck size={12} /> Copiado!</> : "Copiar"}
                      </button>
                      <div className="relative">
                        <button onClick={() => setOpenMenuSc(openMenuSc === s.id ? null : s.id)}
                          className="w-full p-1 hover:bg-gray-100 rounded">
                          <LuEllipsisVertical size={14} className="mx-auto" />
                        </button>
                        {openMenuSc === s.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                            style={{ borderColor: "#E5DCC9" }}>
                            <button onClick={() => openScEdit(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                              <LuPencil size={14} /> Editar
                            </button>
                            <button onClick={() => deleteSc(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: "#6B7280" }}>
                              <LuTrash size={14} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Categoria */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCatModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {catEditId ? "Editar categoria" : "Nova categoria"}
            </h2>
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={catForm.nome || ""} onChange={e => setCatForm({ ...catForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Emoji</label>
                <input value={catForm.emoji || ""} onChange={e => setCatForm({ ...catForm, emoji: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-center" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={catForm.ativo} onChange={e => setCatForm({ ...catForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCatModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveCat} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Script */}
      {scModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setScModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {scEditId ? "Editar script" : "Novo script"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nome (curto, identificador) *</label>
                <input value={scForm.nome || ""} onChange={e => setScForm({ ...scForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}
                  placeholder="Ex: Confirmar agendamento" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Categoria</label>
                <select value={scForm.categoryId || ""} onChange={e => setScForm({ ...scForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Sem categoria</option>
                  {cats.filter(c => c.ativo).map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Mensagem *</label>
                <textarea value={scForm.conteudo || ""} onChange={e => setScForm({ ...scForm, conteudo: e.target.value })}
                  rows={6} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E5DCC9" }}
                  placeholder="Olá, {tutor}! Tudo bem com o {pet}?" />
                <div className="text-xs text-gray-500 mt-1">
                  Use {`{nome_da_variavel}`} para placeholders. Detectados:
                  {extractVariaveis(scForm.conteudo || "").map(v => (
                    <span key={v} className="ml-1 px-1 rounded" style={{ background: "#F1F1F1", color: "#6B7280" }}>{`{${v}}`}</span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Descrição (interna)</label>
                <input value={scForm.descricao || ""} onChange={e => setScForm({ ...scForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={scForm.ativo} onChange={e => setScForm({ ...scForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setScModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveSc} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Scripts"
        endpoint="/api/scripts/import-batch"
        exampleHint="Exporte de Base44 > Script. Variáveis tipo {tutor} {pet} são auto-detectadas se não vierem na coluna."
        fields={[{"key": "nome", "label": "Nome", "required": true}, {"key": "conteudo", "label": "Conte\u00fado", "aliases": ["corpo", "texto"], "required": true}, {"key": "categoria", "label": "Categoria"}, {"key": "descricao", "label": "Descri\u00e7\u00e3o"}, {"key": "ativo", "label": "Ativo", "type": "boolean"}]}
        onSuccess={() => load()}
      />
    </div>
  );
}
