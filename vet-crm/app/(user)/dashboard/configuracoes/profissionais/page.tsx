"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CsvImporter from "@/components/import/CsvImporter";
import { LuArrowLeft, LuPlus, LuPencil, LuTrash, LuUser, LuSearch, LuEllipsisVertical } from "react-icons/lu";

type TipoProfissional = "VETERINARIO" | "RECEPCIONISTA" | "ESTAGIARIO" | "GERENTE" | "OUTRO";

interface Profissional {
  id: string;
  nomeCompleto: string;
  nomeExibicao?: string | null;
  iniciais?: string | null;
  tipo: TipoProfissional;
  especialidade?: string | null;
  crmv?: string | null;
  telefone?: string | null;
  email?: string | null;
  fotoUrl?: string | null;
  corAvatar?: string | null;
  comissaoPercentual?: number | null;
  userId?: string | null;
  dataInicio?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  user?: { id: string; name: string; email: string; role: string } | null;
}

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrador", color: "#6B7280", bg: "#F1F1F1" },
  VETERINARIAN: { label: "Veterinário(a)", color: "#0C447C", bg: "#E6F1FB" },
  RECEPTIONIST: { label: "Recepção", color: "#8A5A0F", bg: "#FCE5C8" },
};

const TIPO_LABEL: Record<TipoProfissional, { label: string; color: string; bg: string }> = {
  VETERINARIO: { label: "Veterinário", color: "#0F6E56", bg: "#E1F5EE" },
  RECEPCIONISTA: { label: "Recepção", color: "#185FA5", bg: "#E6F1FB" },
  ESTAGIARIO: { label: "Estagiário", color: "#6B7280", bg: "#F1F1F1" },
  GERENTE: { label: "Gerente", color: "#009AAC", bg: "#F1F1F1" },
  OUTRO: { label: "Outro", color: "#5F5E5A", bg: "#f0e8d4" },
};

const getInitials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "??";
};

const EMPTY_FORM: any = {
  nomeCompleto: "",
  tipo: "VETERINARIO",
  ativo: true,
  criarAcesso: false,
  role: "RECEPTIONIST",
  password: "",
};

export default function ProfissionaisConfigPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [items, setItems] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [menuOpenId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profissionais?includeInactive=${showInactive}`);
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : (data?.data || []));
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);

  const filtered = useMemo(() => {
    let arr = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((p) =>
        p.nomeCompleto?.toLowerCase().includes(q) ||
        p.especialidade?.toLowerCase().includes(q) ||
        p.crmv?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [items, search]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Profissional) => {
    setEditingId(p.id);
    setForm({ ...p, criarAcesso: !!p.user, role: p.user?.role || "RECEPTIONIST", password: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nomeCompleto?.trim()) {
      alert("Nome é obrigatório.");
      return;
    }
    if (form.criarAcesso && !form.email) {
      alert("Email é obrigatório quando 'Tem acesso ao sistema' está marcado.");
      return;
    }
    if (form.criarAcesso && !editingId && !form.password) {
      alert("Senha é obrigatória ao criar um novo acesso.");
      return;
    }
    setSaving(true);
    try {
      // Sanear payload: remover campos do response que não vão no DTO
      const { id, createdAt, updatedAt, user, ...payload } = form as any;
      const url = editingId ? `/api/profissionais/${editingId}` : "/api/profissionais";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const body = await r.json();
          if (body?.message) {
            msg += `: ${Array.isArray(body.message) ? body.message.join(", ") : body.message}`;
          } else {
            msg += `: ${JSON.stringify(body).substring(0, 200)}`;
          }
        } catch { /* not json */ }
        console.error("Save failed:", r.status, msg);
        alert("Erro ao salvar — " + msg);
        return;
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar: " + (e?.message || "Erro de rede"));
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Profissional) => {
    if (!confirm(`Excluir ${p.nomeCompleto}? Essa ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`/api/profissionais/${p.id}`, { method: "DELETE" });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        alert(`Erro ao excluir (HTTP ${r.status}): ${body.substring(0, 200)}`);
        return;
      }
      load();
    } catch (e: any) {
      alert("Erro ao excluir: " + (e?.message || "Erro de rede"));
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/configuracoes" className="text-[#5F5E5A] hover:text-[#0E2244]">
          <LuArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl text-[#0E2244] font-medium">Profissionais — Equipe e Acesso</h1>
          <p className="text-sm text-[#888780]">Equipe da clínica e acessos ao sistema</p>
        </div>
        <button onClick={openNew} className="bg-[#009AAC] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <LuPlus className="w-3.5 h-3.5" />Adicionar Profissional
        </button>
      </header>

      <div className="flex gap-2 mb-3 items-center">
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B4B2A9]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 border border-[#e8e1d2] rounded-lg text-sm bg-white" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inativos
        </label>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e1d2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e8e1d2] text-[11px] text-[#888780] font-medium">
              <th className="text-left py-2.5 px-3">Profissional</th>
              <th className="text-left py-2.5 px-3">Tipo</th>
              <th className="text-left py-2.5 px-3">Especialidade</th>
              <th className="text-left py-2.5 px-3">CRMV</th>
              <th className="text-left py-2.5 px-3">Comissão</th>
              <th className="text-left py-2.5 px-3">Acesso ao sistema</th>
              <th className="text-left py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">
                Nenhum profissional cadastrado. Clique em <b>+ Adicionar Profissional</b>.
              </td></tr>
            ) : filtered.map((p) => {
              const tipo = TIPO_LABEL[p.tipo];
              return (
                <tr key={p.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium text-white"
                           style={{ background: p.corAvatar || "#009AAC" }}>
                        {p.iniciais || getInitials(p.nomeCompleto)}
                      </div>
                      <div>
                        <div className="text-[#0E2244] font-medium">{p.nomeExibicao || p.nomeCompleto}</div>
                        <div className="text-[10px] text-[#888780]">{p.email || p.telefone || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span style={{ background: tipo.bg, color: tipo.color }}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {tipo.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#4d5a66]">{p.especialidade || "—"}</td>
                  <td className="py-2.5 px-3 text-[#4d5a66]">{p.crmv || "—"}</td>
                  <td className="py-2.5 px-3 text-[#4d5a66]">{p.comissaoPercentual ? `${p.comissaoPercentual}%` : "—"}</td>
                  <td className="py-2.5 px-3">
                    {p.user ? (
                      <div className="flex flex-col gap-0.5">
                        <span style={{ background: ROLE_LABEL[p.user.role]?.bg || "#f0e8d4", color: ROLE_LABEL[p.user.role]?.color || "#5F5E5A" }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block w-fit">
                          ✓ {ROLE_LABEL[p.user.role]?.label || p.user.role}
                        </span>
                        <span className="text-[10px] text-[#888780]">{p.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#B4B2A9]">Sem acesso</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.ativo ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#f0e8d4] text-[#5F5E5A]"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 relative">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                        className="p-1.5 text-[#5F5E5A] hover:bg-[#f0e8d4] rounded transition"
                        title="Ações">
                        <LuEllipsisVertical className="w-4 h-4" />
                      </button>
                      {menuOpenId === p.id && (
                        <div onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 bg-white border border-[#e8e1d2] rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                          <button onClick={() => { openEdit(p); setMenuOpenId(null); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-[#0E2244] hover:bg-[#fdfaee] flex items-center gap-2">
                            <LuPencil className="w-3.5 h-3.5" />Editar
                          </button>
                          <button onClick={() => { handleDelete(p); setMenuOpenId(null); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2">
                            <LuTrash className="w-3.5 h-3.5" />Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base text-[#0E2244] font-medium">
                {editingId ? "Editar profissional" : "Adicionar profissional"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#5F5E5A] text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Nome completo *</label>
                <input value={form.nomeCompleto || ""} onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Nome de exibição</label>
                <input value={form.nomeExibicao || ""} onChange={(e) => setForm({ ...form, nomeExibicao: e.target.value })}
                  placeholder="Dra. Vivian"
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Iniciais</label>
                <input value={form.iniciais || ""} onChange={(e) => setForm({ ...form, iniciais: e.target.value.toUpperCase().substring(0,2) })}
                  maxLength={2} placeholder="VC"
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Tipo *</label>
                <select value={form.tipo || "VETERINARIO"} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoProfissional })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]">
                  <option value="VETERINARIO">Veterinário</option>
                  <option value="RECEPCIONISTA">Recepção</option>
                  <option value="ESTAGIARIO">Estagiário</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Especialidade</label>
                <input value={form.especialidade || ""} onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                  placeholder="Fisioterapia, Med. Integrativa..."
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">CRMV</label>
                <input value={form.crmv || ""} onChange={(e) => setForm({ ...form, crmv: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Telefone</label>
                <input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Email</label>
                <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Cor do avatar</label>
                <input type="color" value={form.corAvatar || "#009AAC"} onChange={(e) => setForm({ ...form, corAvatar: e.target.value })}
                  className="w-full h-10 border border-[#e8e1d2] rounded-lg cursor-pointer" />
              </div>
              <div>
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Comissão (%)</label>
                <input type="number" step="0.1" value={form.comissaoPercentual || ""} onChange={(e) => setForm({ ...form, comissaoPercentual: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Observações</label>
                <textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC] resize-none" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                <label htmlFor="ativo" className="text-sm text-[#0E2244]">Ativo (aparece nos dropdowns da clínica)</label>
              </div>

              {/* Acesso ao sistema */}
              <div className="col-span-2 mt-2 pt-3 border-t border-[#e8e1d2]">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="criarAcesso" checked={!!form.criarAcesso}
                    onChange={(e) => setForm({ ...form, criarAcesso: e.target.checked })} />
                  <label htmlFor="criarAcesso" className="text-sm text-[#0E2244] font-medium">Tem acesso ao sistema (login)</label>
                </div>
                {form.criarAcesso && (
                  <div className="grid grid-cols-2 gap-3 bg-[#fdfaee] border border-[#e8e1d2] rounded-lg p-3">
                    <div className="col-span-2">
                      <p className="text-[10px] text-[#888780] mb-2">
                        ⚠ Email obrigatório acima. {editingId ? "Para trocar a senha, preencha o campo abaixo." : "Defina a senha inicial."}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">Papel no sistema</label>
                      <select value={form.role || "RECEPTIONIST"} onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm bg-white focus:outline-none focus:border-[#009AAC]">
                        <option value="ADMIN">Administrador</option>
                        <option value="VETERINARIAN">Veterinário(a)</option>
                        <option value="RECEPTIONIST">Recepção</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#5F5E5A] mb-1 font-medium">
                        Senha {editingId && <span className="text-[#888780]">(deixe vazio pra manter)</span>}
                      </label>
                      <input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={editingId ? "Nova senha (opcional)" : "Senha inicial"}
                        className="w-full px-3 py-2 border border-[#e8e1d2] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs text-[#5F5E5A]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="bg-[#009AAC] text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Botão Importar planilha (FAB) */}
      <button
        onClick={() => setImportOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-3 rounded-full text-sm shadow-md hover:shadow-lg transition"
        style={{ background: "#009AAC", color: "white" }}
        title="Importar planilha"
      >
        Importar planilha
      </button>
      <CsvImporter
        open={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Profissionais"
        endpoint="/api/profissionais/import-batch"
        exampleHint="Exporte do Base44 a tabela de Profissionais. Tipos aceitos: Veterinário, Recepcionista, Estagiário, Gerente, Outro."
        fields={[{"key": "nomeCompleto", "label": "Nome", "aliases": ["nome", "nome_completo"], "required": true}, {"key": "tipo", "label": "Tipo"}, {"key": "especialidade", "label": "Especialidade"}, {"key": "crmv", "label": "CRMV"}, {"key": "telefone", "label": "Telefone"}, {"key": "email", "label": "Email"}, {"key": "comissaoPercentual", "label": "Comiss\u00e3o %", "aliases": ["comissao_percentual", "comissao"], "type": "number"}, {"key": "ativo", "label": "Ativo", "type": "boolean"}]}
        onSuccess={() => load()}
      />
    </div>
  );
}
