"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuSearch, LuEllipsisVertical, LuSparkles } from "react-icons/lu";

type FornecedorTipo = "LABORATORIO" | "PROFISSIONAL" | "PARCEIRO" | "OUTRO";
type ModeloPagamento = "LOTE_MENSAL" | "DIRETO_CLIENTE" | "REPASSE_VIA_CLINICA";
type ComissaoTipo = "PERCENTUAL" | "VALOR_FIXO" | "VARIAVEL";
type CategoriaExame =
  | "HEMATOLOGIA" | "BIOQUIMICA" | "IMAGEM" | "CITOLOGIA"
  | "MICROBIOLOGIA" | "ENDOCRINOLOGIA" | "HISTOPATOLOGIA" | "OUTROS";

interface Fornecedor {
  id: string;
  nome: string;
  tipo: FornecedorTipo;
  especialidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  contatoResponsavel?: string | null;
  modeloPagamento: ModeloPagamento;
  comissaoTipo?: ComissaoTipo | null;
  comissaoValor?: number | null;
  diaFechamentoLote?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  _count?: { exames: number };
}

interface Exame {
  id: string;
  fornecedorId: string;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  categoria: CategoriaExame;
  valorFornecedor?: number | null;
  valorClienteSugerido?: number | null;
  tempoResultadoDias?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  fornecedor?: { id: string; nome: string; tipo: FornecedorTipo } | null;
}

const TIPO_LABEL: Record<FornecedorTipo, { label: string; emoji: string; bg: string; color: string }> = {
  LABORATORIO: { label: "Laboratório", emoji: "🧪", bg: "#E0F4F6", color: "#00798A" },
  PROFISSIONAL: { label: "Profissional", emoji: "👨‍⚕️", bg: "#EEEDFE", color: "#3C3489" },
  PARCEIRO: { label: "Parceiro", emoji: "🤝", bg: "#FBF0DD", color: "#8a6313" },
  OUTRO: { label: "Outro", emoji: "📦", bg: "#F1F1F1", color: "#555" },
};

const MODELO_LABEL: Record<ModeloPagamento, string> = {
  LOTE_MENSAL: "Lote mensal",
  DIRETO_CLIENTE: "Direto ao cliente",
  REPASSE_VIA_CLINICA: "Repasse via clínica",
};

const CAT_LABEL: Record<CategoriaExame, { label: string; emoji: string; bg: string; color: string }> = {
  HEMATOLOGIA: { label: "Hematologia", emoji: "🩸", bg: "#FCEBEB", color: "#A32D2D" },
  BIOQUIMICA: { label: "Bioquímica", emoji: "⚗️", bg: "#E0F4F6", color: "#00798A" },
  IMAGEM: { label: "Imagem", emoji: "📸", bg: "#EEEDFE", color: "#3C3489" },
  CITOLOGIA: { label: "Citologia", emoji: "🔬", bg: "#FBF0DD", color: "#8a6313" },
  MICROBIOLOGIA: { label: "Microbiologia", emoji: "🦠", bg: "#DDF4E1", color: "#1E6B36" },
  ENDOCRINOLOGIA: { label: "Endocrinologia", emoji: "⚖️", bg: "#FCE9DC", color: "#9A4C0E" },
  HISTOPATOLOGIA: { label: "Histopatologia", emoji: "🧫", bg: "#EBE5F8", color: "#5A3A8C" },
  OUTROS: { label: "Outros", emoji: "📋", bg: "#F1F1F1", color: "#555" },
};

const fmtR = (v?: number | null) => v == null ? "—" : `R$ ${Number(v).toFixed(2)}`;

const EMPTY_FORN: any = {
  nome: "", tipo: "LABORATORIO", especialidade: "", telefone: "", email: "",
  contatoResponsavel: "", modeloPagamento: "LOTE_MENSAL", comissaoTipo: null,
  comissaoValor: null, diaFechamentoLote: null, ativo: true, observacoes: "",
};
const EMPTY_EX: any = {
  nome: "", codigo: "", descricao: "", categoria: "OUTROS", fornecedorId: "",
  valorFornecedor: null, valorClienteSugerido: null, tempoResultadoDias: null,
  ativo: true, observacoes: "",
};

export default function ExamesConfigPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFornId, setSelectedFornId] = useState<string | null>(null);

  // Fornecedor modal
  const [fModalOpen, setFModalOpen] = useState(false);
  const [fEditId, setFEditId] = useState<string | null>(null);
  const [fForm, setFForm] = useState<any>(EMPTY_FORN);
  const [openMenuF, setOpenMenuF] = useState<string | null>(null);

  // Exame modal
  const [eModalOpen, setEModalOpen] = useState(false);
  const [eEditId, setEEditId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<any>(EMPTY_EX);
  const [openMenuE, setOpenMenuE] = useState<string | null>(null);

  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = showInactive ? "?includeInactive=true" : "";
      const [resF, resE] = await Promise.all([
        fetch(`/api/fornecedores${qs}`),
        fetch(`/api/fornecedores/exames/lista${qs}`),
      ]);
      const fs = await resF.json();
      const es = await resE.json();
      setFornecedores(Array.isArray(fs) ? fs : []);
      setExames(Array.isArray(es) ? es : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const examesFiltrados = useMemo(() => {
    let arr = exames;
    if (selectedFornId) arr = arr.filter(e => e.fornecedorId === selectedFornId);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(e =>
        e.nome.toLowerCase().includes(s) ||
        (e.codigo || "").toLowerCase().includes(s) ||
        (e.fornecedor?.nome || "").toLowerCase().includes(s)
      );
    }
    return arr;
  }, [exames, selectedFornId, search]);

  // ===== Fornecedor handlers =====
  function openFornNew() {
    setFEditId(null);
    setFForm(EMPTY_FORN);
    setFModalOpen(true);
  }
  function openFornEdit(f: Fornecedor) {
    setFEditId(f.id);
    setFForm({ ...f });
    setFModalOpen(true);
    setOpenMenuF(null);
  }
  async function saveForn() {
    try {
      const { id, createdAt, updatedAt, exames, _count, ...payload } = fForm as any;
      const url = fEditId ? `/api/fornecedores/${fEditId}` : "/api/fornecedores";
      const method = fEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : `HTTP ${res.status}`;
        alert(`Erro: ${msg}`);
        return;
      }
      setFModalOpen(false);
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteForn(f: Fornecedor) {
    if (!confirm(`Excluir fornecedor "${f.nome}"? Todos os exames vinculados também serão removidos.`)) return;
    try {
      const res = await fetch(`/api/fornecedores/${f.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message || res.status}`);
        return;
      }
      if (selectedFornId === f.id) setSelectedFornId(null);
      setOpenMenuF(null);
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  // ===== Exame handlers =====
  function openExameNew() {
    setEEditId(null);
    setEForm({ ...EMPTY_EX, fornecedorId: selectedFornId || (fornecedores[0]?.id || "") });
    setEModalOpen(true);
  }
  function openExameEdit(e: Exame) {
    setEEditId(e.id);
    setEForm({ ...e });
    setEModalOpen(true);
    setOpenMenuE(null);
  }
  async function saveExame() {
    try {
      const { id, createdAt, updatedAt, fornecedor, ...payload } = eForm as any;
      if (!payload.fornecedorId) { alert("Selecione um fornecedor"); return; }
      const url = eEditId ? `/api/fornecedores/exames/${eEditId}` : "/api/fornecedores/exames";
      const method = eEditId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = err?.message ? (Array.isArray(err.message) ? err.message.join("\n") : err.message) : `HTTP ${res.status}`;
        alert(`Erro: ${msg}`);
        return;
      }
      setEModalOpen(false);
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }
  async function deleteExame(ex: Exame) {
    if (!confirm(`Excluir exame "${ex.nome}"?`)) return;
    try {
      const res = await fetch(`/api/fornecedores/exames/${ex.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(`Erro: ${err?.message || res.status}`);
        return;
      }
      setOpenMenuE(null);
      await load();
    } catch (e) { alert(`Erro: ${e}`); }
  }

  async function rodarSeed() {
    if (!confirm("Carregar pacote inicial de 5 fornecedores + 13 exames padrão? Só funciona se ainda não houver fornecedores cadastrados.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/fornecedores/seed-pacote-inicial", { method: "POST" });
      const data = await res.json();
      if (data?.skipped) {
        alert(`Pacote não carregado: ${data.message}`);
      } else {
        alert(`✅ ${data.fornecedoresCriados} fornecedores e ${data.examesCriados} exames criados!`);
        await load();
      }
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setSeeding(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#E5DCC9" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#3C3489" }}>Exames e Fornecedores</h1>
            <p className="text-sm text-gray-600">Catálogo de exames terceirizados + cadastro de laboratórios e parceiros</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
          {fornecedores.length === 0 && !loading && (
            <button onClick={rodarSeed} disabled={seeding}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "#3C3489", color: "white", opacity: seeding ? 0.5 : 1 }}>
              <LuSparkles size={16} /> {seeding ? "Carregando…" : "Carregar pacote inicial"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Coluna esquerda — Fornecedores */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#E5DCC9" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#3C3489" }}>Fornecedores</div>
              <div className="text-xs text-gray-500">{fornecedores.length} cadastrados</div>
            </div>
            <button onClick={openFornNew} className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
              style={{ background: "#3C3489", color: "white" }}>
              <LuPlus size={14} /> Adicionar
            </button>
          </div>
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            <button onClick={() => setSelectedFornId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${!selectedFornId ? "font-semibold" : ""}`}
              style={{ background: !selectedFornId ? "#F3EEFC" : "transparent", color: !selectedFornId ? "#3C3489" : "#333" }}>
              Todos os exames ({exames.length})
            </button>
            {fornecedores.map(f => {
              const t = TIPO_LABEL[f.tipo];
              const sel = selectedFornId === f.id;
              return (
                <div key={f.id} className="relative">
                  <button onClick={() => setSelectedFornId(f.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${sel ? "font-semibold" : ""}`}
                    style={{ background: sel ? "#F3EEFC" : "transparent", color: sel ? "#3C3489" : "#333", opacity: f.ativo ? 1 : 0.5 }}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 min-w-0">
                        <span>{t.emoji}</span>
                        <span className="truncate">{f.nome}</span>
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">{f._count?.exames || 0}</span>
                        <span onClick={(ev) => { ev.stopPropagation(); setOpenMenuF(openMenuF === f.id ? null : f.id); }}
                          className="p-1 hover:bg-gray-200 rounded">
                          <LuEllipsisVertical size={14} />
                        </span>
                      </span>
                    </div>
                  </button>
                  {openMenuF === f.id && (
                    <div className="absolute right-2 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                      style={{ borderColor: "#E5DCC9" }}>
                      <button onClick={() => openFornEdit(f)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                        <LuPencil size={14} /> Editar
                      </button>
                      <button onClick={() => deleteForn(f)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        style={{ color: "#A32D2D" }}>
                        <LuTrash size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {fornecedores.length === 0 && !loading && (
              <div className="text-center text-sm text-gray-500 py-8">
                Nenhum fornecedor.<br/>Cadastre um ou carregue o pacote inicial.
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita — Exames */}
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E5DCC9" }}>
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "#E5DCC9" }}>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "#3C3489" }}>
                {selectedFornId ? `Exames de ${fornecedores.find(f => f.id === selectedFornId)?.nome}` : "Todos os exames"}
              </div>
              <div className="text-xs text-gray-500">{examesFiltrados.length} exames</div>
            </div>
            <div className="relative">
              <LuSearch size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="pl-7 pr-3 py-1.5 text-sm border rounded-lg" style={{ borderColor: "#E5DCC9" }} />
            </div>
            <button onClick={openExameNew} disabled={fornecedores.length === 0}
              className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
              style={{ background: "#3C3489", color: "white", opacity: fornecedores.length === 0 ? 0.4 : 1 }}>
              <LuPlus size={14} /> Adicionar exame
            </button>
          </div>
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            {loading && <div className="text-center py-8 text-sm text-gray-500">Carregando...</div>}
            {!loading && examesFiltrados.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-8">Nenhum exame.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {examesFiltrados.map(ex => {
                const cat = CAT_LABEL[ex.categoria];
                return (
                  <div key={ex.id} className="relative border rounded-lg p-3 hover:shadow-sm transition"
                    style={{ borderColor: "#E5DCC9", opacity: ex.ativo ? 1 : 0.5 }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: cat.bg, color: cat.color }}>
                            {cat.emoji} {cat.label}
                          </span>
                          {ex.codigo && <span className="text-xs text-gray-400">#{ex.codigo}</span>}
                        </div>
                        <div className="font-medium text-sm" style={{ color: "#333" }}>{ex.nome}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {TIPO_LABEL[ex.fornecedor?.tipo || "OUTRO"].emoji} {ex.fornecedor?.nome}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs">
                          <span><span className="text-gray-500">Custo:</span> {fmtR(ex.valorFornecedor)}</span>
                          <span><span className="text-gray-500">Cliente:</span> <strong>{fmtR(ex.valorClienteSugerido)}</strong></span>
                          {ex.tempoResultadoDias && <span><span className="text-gray-500">⏱</span> {ex.tempoResultadoDias}d</span>}
                        </div>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button onClick={() => setOpenMenuE(openMenuE === ex.id ? null : ex.id)}
                          className="p-1 hover:bg-gray-100 rounded">
                          <LuEllipsisVertical size={14} />
                        </button>
                        {openMenuE === ex.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                            style={{ borderColor: "#E5DCC9" }}>
                            <button onClick={() => openExameEdit(ex)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                              <LuPencil size={14} /> Editar
                            </button>
                            <button onClick={() => deleteExame(ex)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              style={{ color: "#A32D2D" }}>
                              <LuTrash size={14} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Fornecedor */}
      {fModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setFModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {fEditId ? "Editar fornecedor" : "Novo fornecedor"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={fForm.nome || ""} onChange={e => setFForm({ ...fForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Tipo *</label>
                <select value={fForm.tipo} onChange={e => setFForm({ ...fForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Especialidade</label>
                <input value={fForm.especialidade || ""} onChange={e => setFForm({ ...fForm, especialidade: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Telefone</label>
                <input value={fForm.telefone || ""} onChange={e => setFForm({ ...fForm, telefone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">E-mail</label>
                <input value={fForm.email || ""} onChange={e => setFForm({ ...fForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Contato responsável</label>
                <input value={fForm.contatoResponsavel || ""} onChange={e => setFForm({ ...fForm, contatoResponsavel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Modelo de pagamento</label>
                <select value={fForm.modeloPagamento} onChange={e => setFForm({ ...fForm, modeloPagamento: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(MODELO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Dia de fechamento (1-31)</label>
                <input type="number" min={1} max={31} value={fForm.diaFechamentoLote || ""}
                  onChange={e => setFForm({ ...fForm, diaFechamentoLote: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Tipo de comissão</label>
                <select value={fForm.comissaoTipo || ""} onChange={e => setFForm({ ...fForm, comissaoTipo: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Sem comissão</option>
                  <option value="PERCENTUAL">Percentual (%)</option>
                  <option value="VALOR_FIXO">Valor fixo (R$)</option>
                  <option value="VARIAVEL">Variável</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Valor da comissão</label>
                <input type="number" step="0.01" value={fForm.comissaoValor || ""}
                  onChange={e => setFForm({ ...fForm, comissaoValor: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Observações</label>
                <textarea value={fForm.observacoes || ""} onChange={e => setFForm({ ...fForm, observacoes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={fForm.ativo} onChange={e => setFForm({ ...fForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveForn} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exame */}
      {eModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEModalOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#3C3489" }}>
              {eEditId ? "Editar exame" : "Novo exame"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Nome *</label>
                <input value={eForm.nome || ""} onChange={e => setEForm({ ...eForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Código</label>
                <input value={eForm.codigo || ""} onChange={e => setEForm({ ...eForm, codigo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Categoria *</label>
                <select value={eForm.categoria} onChange={e => setEForm({ ...eForm, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Fornecedor *</label>
                <select value={eForm.fornecedorId} onChange={e => setEForm({ ...eForm, fornecedorId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }}>
                  <option value="">Selecione...</option>
                  {fornecedores.filter(f => f.ativo).map(f => (
                    <option key={f.id} value={f.id}>{TIPO_LABEL[f.tipo].emoji} {f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Custo (fornecedor)</label>
                <input type="number" step="0.01" value={eForm.valorFornecedor ?? ""}
                  onChange={e => setEForm({ ...eForm, valorFornecedor: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Valor cliente sugerido</label>
                <input type="number" step="0.01" value={eForm.valorClienteSugerido ?? ""}
                  onChange={e => setEForm({ ...eForm, valorClienteSugerido: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Prazo (dias úteis)</label>
                <input type="number" min={0} value={eForm.tempoResultadoDias ?? ""}
                  onChange={e => setEForm({ ...eForm, tempoResultadoDias: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Descrição</label>
                <textarea value={eForm.descricao || ""} onChange={e => setEForm({ ...eForm, descricao: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Observações internas</label>
                <textarea value={eForm.observacoes || ""} onChange={e => setEForm({ ...eForm, observacoes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E5DCC9" }} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eForm.ativo} onChange={e => setEForm({ ...eForm, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
              <button onClick={saveExame} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#3C3489", color: "white" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
