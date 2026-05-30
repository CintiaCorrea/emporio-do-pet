"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical, LuSparkles, LuEye } from "react-icons/lu";

type Categoria = "TRANSACIONAL" | "BOAS_VINDAS" | "EDUCATIVO" | "PROMOCIONAL" | "ANIVERSARIO" | "REENGAJAMENTO" | "OUTRO";

interface Template {
  id: string;
  nome: string;
  assunto: string;
  corpoHtml: string;
  corpoTexto?: string | null;
  categoria: Categoria;
  descricao?: string | null;
  ativo: boolean;
  ordem: number;
  vezesEnviado: number;
}
interface Variable {
  id: string;
  chave: string;
  label: string;
  descricao?: string | null;
  exemplo?: string | null;
  categoria: string;
  ordem: number;
  ativo: boolean;
}

const CAT_LABEL: Record<Categoria, { label: string; emoji: string; bg: string; color: string }> = {
  TRANSACIONAL: { label: "Transacional", emoji: "📨", bg: "#F1F1F1", color: "#6B7280" },
  BOAS_VINDAS: { label: "Boas-vindas", emoji: "👋", bg: "#F1F1F1", color: "#6B7280" },
  EDUCATIVO: { label: "Educativo", emoji: "📚", bg: "#F1F1F1", color: "#3C3489" },
  PROMOCIONAL: { label: "Promocional", emoji: "🎁", bg: "#F1F1F1", color: "#6B7280" },
  ANIVERSARIO: { label: "Aniversário", emoji: "🎂", bg: "#F1F1F1", color: "#6B7280" },
  REENGAJAMENTO: { label: "Reengajamento", emoji: "🔔", bg: "#F1F1F1", color: "#6B7280" },
  OUTRO: { label: "Outro", emoji: "📋", bg: "#F1F1F1", color: "#555" },
};

const EMPTY_TPL: any = { nome: "", assunto: "", corpoHtml: "", corpoTexto: "", categoria: "TRANSACIONAL", descricao: "", ativo: true, ordem: 0 };
const EMPTY_VAR: any = { chave: "", label: "", descricao: "", exemplo: "", categoria: "Geral", ordem: 0, ativo: true };

export default function EmailTemplatesPage() {
  const [tpls, setTpls] = useState<Template[]>([]);
  const [vars, setVars] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");

  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState<any>(EMPTY_TPL);
  const [openMenuTpl, setOpenMenuTpl] = useState<string | null>(null);

  const [varModalOpen, setVarModalOpen] = useState(false);
  const [varEditId, setVarEditId] = useState<string | null>(null);
  const [varForm, setVarForm] = useState<any>(EMPTY_VAR);
  const [openMenuVar, setOpenMenuVar] = useState<string | null>(null);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [variavelDrawerOpen, setVariavelDrawerOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [resT, resV] = await Promise.all([
        fetch(`/api/email-templates${qs}`),
        fetch(`/api/email-templates/variables/lista${qs}`),
      ]);
      setTpls(await resT.json());
      setVars(await resV.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const tplsFiltrados = useMemo(() => {
    let arr = tpls;
    if (filterCat) arr = arr.filter(t => t.categoria === filterCat);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t => t.nome.toLowerCase().includes(q) || t.assunto.toLowerCase().includes(q));
    }
    return arr;
  }, [tpls, filterCat, search]);

  const varsGrouped = useMemo(() => {
    const groups: Record<string, Variable[]> = {};
    for (const v of vars) {
      if (!groups[v.categoria]) groups[v.categoria] = [];
      groups[v.categoria].push(v);
    }
    return groups;
  }, [vars]);

  function openTplNew() { setTplEditId(null); setTplForm(EMPTY_TPL); setTplModalOpen(true); }
  function openTplEdit(t: Template) { setTplEditId(t.id); setTplForm({ ...t }); setTplModalOpen(true); setOpenMenuTpl(null); }
  async function saveTpl() {
    try {
      const { id, createdAt, updatedAt, vezesEnviado, ...payload } = tplForm as any;
      const url = tplEditId ? `/api/email-templates/${tplEditId}` : "/api/email-templates";
      const method = tplEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setTplModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteTpl(t: Template) {
    if (!confirm(`Excluir template "${t.nome}"?`)) return;
    try {
      const res = await fetch(`/api/email-templates/${t.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      setOpenMenuTpl(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  function openVarNew() { setVarEditId(null); setVarForm(EMPTY_VAR); setVarModalOpen(true); }
  function openVarEdit(v: Variable) { setVarEditId(v.id); setVarForm({ ...v }); setVarModalOpen(true); setOpenMenuVar(null); }
  async function saveVar() {
    try {
      const { id, createdAt, updatedAt, ...payload } = varForm as any;
      const url = varEditId ? `/api/email-templates/variables/${varEditId}` : "/api/email-templates/variables";
      const method = varEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : res.status}`);
        return;
      }
      setVarModalOpen(false); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteVar(v: Variable) {
    if (!confirm(`Excluir variável "${v.label}"?`)) return;
    try {
      const res = await fetch(`/api/email-templates/variables/${v.id}`, { method: "DELETE" });
      if (!res.ok) { alert(`Erro: ${res.status}`); return; }
      setOpenMenuVar(null); await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  async function rodarSeed() {
    if (!confirm("Carregar pacote inicial de 6 templates e 18 variáveis? Só funciona se nada estiver cadastrado.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/email-templates/seed-pacote-inicial", { method: "POST" });
      const data = await res.json();
      if (data?.skipped) alert(`Pacote não carregado: ${data.message}`);
      else { alert(`✅ ${data.templatesCriados} templates e ${data.variaveisCriadas} variáveis criados!`); await load(); }
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  const preview = tpls.find(t => t.id === previewId);

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Templates de E-mail</h1>
            <p className="text-sm text-gray-600">Templates HTML pra emails transacionais e campanhas. Use {`{{tutor_nome}}`}, {`{{pet_nome}}`}, etc.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Inativos
          </label>
          <button onClick={() => setVariavelDrawerOpen(true)} className="px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9", color: "#3C3489" }}>
            Variáveis ({vars.length})
          </button>
          {tpls.length === 0 && !loading && (
            <button onClick={rodarSeed} disabled={seeding}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "#3C3489", color: "white", opacity: seeding ? 0.5 : 1 }}>
              <LuSparkles size={16} /> {seeding ? "Carregando…" : "Carregar pacote inicial"}
            </button>
          )}
          <button onClick={openTplNew} className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            style={{ background: "#3C3489", color: "white" }}>
            <LuPlus size={16} /> Novo template
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => setFilterCat("")} className={`px-3 py-1.5 rounded-lg text-xs ${!filterCat ? "font-semibold" : ""}`}
            style={{ background: !filterCat ? "#3C3489" : "#fff", color: !filterCat ? "white" : "#333", border: "1px solid #E5DCC9" }}>
            Todos ({tpls.length})
          </button>
          {(Object.keys(CAT_LABEL) as Categoria[]).map(k => {
            const v = CAT_LABEL[k];
            const c = tpls.filter(t => t.categoria === k).length;
            return (
              <button key={k} onClick={() => setFilterCat(filterCat === k ? "" : k)}
                className={`px-3 py-1.5 rounded-lg text-xs ${filterCat === k ? "font-semibold" : ""}`}
                style={{ background: filterCat === k ? v.color : v.bg, color: filterCat === k ? "white" : v.color }}>
                {v.emoji} {v.label} ({c})
              </button>
            );
          })}
          <div className="relative ml-auto">
            <LuSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="pl-7 pr-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: "#E5DCC9" }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && <div className="col-span-full text-center py-12 text-sm text-gray-500">Carregando...</div>}
          {!loading && tplsFiltrados.length === 0 && <div className="col-span-full text-center py-12 text-sm text-gray-500">Nenhum template.</div>}
          {tplsFiltrados.map(t => {
            const c = CAT_LABEL[t.categoria];
            return (
              <div key={t.id} className="relative bg-white border rounded-xl p-4 hover:shadow-sm transition"
                style={{ borderColor: "#E5DCC9", opacity: t.ativo ? 1 : 0.5 }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: c.bg, color: c.color }}>
                    {c.emoji} {c.label}
                  </span>
                  <div className="relative">
                    <button onClick={() => setOpenMenuTpl(openMenuTpl === t.id ? null : t.id)} className="p-1 hover:bg-gray-100 rounded">
                      <LuEllipsisVertical size={14} />
                    </button>
                    {openMenuTpl === t.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                        style={{ borderColor: "#E5DCC9" }}>
                        <button onClick={() => { setPreviewId(t.id); setOpenMenuTpl(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                          <LuEye size={14} /> Pré-visualizar
                        </button>
                        <button onClick={() => openTplEdit(t)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                          <LuPencil size={14} /> Editar
                        </button>
                        <button onClick={() => deleteTpl(t)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: "#6B7280" }}>
                          <LuTrash size={14} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-sm mb-1" style={{ color: "#3C3489" }}>{t.nome}</div>
                <div className="text-xs text-gray-500 mb-2 truncate">📧 {t.assunto}</div>
                {t.descricao && <div className="text-xs text-gray-600 mb-2 line-clamp-2">{t.descricao}</div>}
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => setPreviewId(t.id)} className="text-xs flex items-center gap-1" style={{ color: "#3C3489" }}>
                    <LuEye size={12} /> Visualizar
                  </button>
                  {t.vezesEnviado > 0 && <span className="text-xs text-gray-400">{t.vezesEnviado} envios</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer de Variáveis */}
      {variavelDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setVariavelDrawerOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#E5DCC9" }}>
              <h2 className="font-semibold" style={{ color: "#3C3489" }}>Biblioteca de Variáveis</h2>
              <button onClick={openVarNew} className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
                style={{ background: "#3C3489", color: "white" }}>
                <LuPlus size={12} /> Nova
              </button>
            </div>
            <div className="p-4 space-y-4">
              {Object.entries(varsGrouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold mb-2 uppercase text-gray-500">{cat}</h3>
                  <div className="space-y-1">
                    {items.map(v => (
                      <div key={v.id} className="relative flex items-center justify-between p-2 border rounded-lg" style={{ borderColor: "#E5DCC9", opacity: v.ativo ? 1 : 0.5 }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#F1F1F1", color: "#6B7280" }}>{`{{${v.chave}}}`}</code>
                            <span className="text-xs font-medium">{v.label}</span>
                          </div>
                          {v.exemplo && <div className="text-xs text-gray-500 mt-0.5">ex: {v.exemplo}</div>}
                        </div>
                        <div className="relative">
                          <button onClick={() => setOpenMenuVar(openMenuVar === v.id ? null : v.id)} className="p-1 hover:bg-gray-100 rounded">
                            <LuEllipsisVertical size={12} />
                          </button>
                          {openMenuVar === v.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[120px]"
                              style={{ borderColor: "#E5DCC9" }}>
                              <button onClick={() => openVarEdit(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2">
                                <LuPencil size={12} /> Editar
                              </button>
                              <button onClick={() => deleteVar(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" style={{ color: "#6B7280" }}>
                                <LuTrash size={12} /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Template */}
      {tplModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setTplModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {tplEditId ? "Editar template" : "Novo template"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={tplForm.nome || ""} onChange={e => setTplForm({ ...tplForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria</label>
                <select value={tplForm.categoria} onChange={e => setTplForm({ ...tplForm, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {(Object.keys(CAT_LABEL) as Categoria[]).map(k => <option key={k} value={k}>{CAT_LABEL[k].emoji} {CAT_LABEL[k].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <input value={tplForm.descricao || ""} onChange={e => setTplForm({ ...tplForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Assunto *</label>
                <input value={tplForm.assunto || ""} onChange={e => setTplForm({ ...tplForm, assunto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}
                  placeholder="Ex: Consulta de {{pet_nome}} confirmada" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Corpo HTML *</label>
                <textarea value={tplForm.corpoHtml || ""} onChange={e => setTplForm({ ...tplForm, corpoHtml: e.target.value })}
                  rows={10} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E5DCC9" }}
                  placeholder="<html>...</html>" />
                <div className="text-xs text-gray-500 mt-1">Variáveis disponíveis no painel lateral.</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Corpo texto puro (opcional, fallback)</label>
                <textarea value={tplForm.corpoTexto || ""} onChange={e => setTplForm({ ...tplForm, corpoTexto: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={tplForm.ativo} onChange={e => setTplForm({ ...tplForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setTplModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveTpl} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Variable */}
      {varModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVarModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {varEditId ? "Editar variável" : "Nova variável"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Chave (snake_case) *</label>
                <input value={varForm.chave || ""} onChange={e => setVarForm({ ...varForm, chave: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono" style={{ borderColor: "#E5DCC9" }} placeholder="tutor_nome" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Label *</label>
                <input value={varForm.label || ""} onChange={e => setVarForm({ ...varForm, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} placeholder="Nome do tutor" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria</label>
                <input value={varForm.categoria || ""} onChange={e => setVarForm({ ...varForm, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} placeholder="Tutor, Pet, Atendimento..." />
              </div>
              <div>
                <label className="text-xs text-gray-600">Exemplo</label>
                <input value={varForm.exemplo || ""} onChange={e => setVarForm({ ...varForm, exemplo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} placeholder="Cintia" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <textarea value={varForm.descricao || ""} onChange={e => setVarForm({ ...varForm, descricao: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={varForm.ativo} onChange={e => setVarForm({ ...varForm, ativo: e.target.checked })} />
                Ativa
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setVarModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveVar} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#E5DCC9" }}>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold truncate" style={{ color: "#3C3489" }}>{preview.nome}</h2>
                <div className="text-xs text-gray-500 truncate">📧 {preview.assunto}</div>
              </div>
              <button onClick={() => setPreviewId(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="overflow-y-auto p-4 bg-gray-50">
              <iframe srcDoc={preview.corpoHtml} className="w-full" style={{ minHeight: "60vh", background: "white", border: "1px solid #E5DCC9", borderRadius: 8 }} title="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
