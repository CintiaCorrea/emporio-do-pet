"use client";
// Gerenciar Categorias (criar/editar/excluir + comissão-padrão da categoria) — portado
// da antiga tela Config › Serviços e Produtos pra DENTRO do catálogo (tela única).
// Fonte: /api/servicos/categorias (mesma do backend). Base44.
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { confirmDelete } from "@/lib/ui/confirmDelete";

type ComissaoBase = "VALOR_CHEIO" | "MARGEM" | "SEM_COMISSAO";
interface Categoria { id: string; nome: string; comissaoBasePadrao: ComissaoBase; ativo: boolean; _count?: { servicos: number } }
const COM_OPTS: { v: ComissaoBase; l: string }[] = [
  { v: "VALOR_CHEIO", l: "Valor cheio" },
  { v: "MARGEM", l: "Margem (Total − Custo)" },
  { v: "SEM_COMISSAO", l: "Sem comissão" },
];
const comLabel = (v: string) => COM_OPTS.find((o) => o.v === v)?.l || v;

export default function CategoriasModal({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const [cats, setCats] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [comissao, setComissao] = useState<ComissaoBase>("VALOR_CHEIO");
  const [salvando, setSalvando] = useState(false);
  const mudou = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/servicos/categorias?includeInactive=true", { cache: "no-store" });
      const d = await r.json().catch(() => []);
      setCats(Array.isArray(d) ? d : (d.itens || d.data || []));
    } catch { toast.error("Falha ao carregar categorias."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function abrirNova() { setEditId(null); setNome(""); setComissao("VALOR_CHEIO"); setFormOpen(true); }
  function abrirEdicao(c: Categoria) { setEditId(c.id); setNome(c.nome); setComissao(c.comissaoBasePadrao || "VALOR_CHEIO"); setFormOpen(true); }

  async function salvar() {
    const nm = nome.trim();
    if (!nm) { toast.error("Digite o nome da categoria."); return; }
    setSalvando(true);
    try {
      const url = editId ? `/api/servicos/categorias/${editId}` : "/api/servicos/categorias";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nm, comissaoBasePadrao: comissao, ativo: true }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || d?.error || `Erro ${r.status}`);
      toast.success(editId ? "Categoria atualizada" : "Categoria criada");
      setFormOpen(false); mudou.current = true; await load();
    } catch (e: any) { toast.error("Não consegui salvar: " + (e?.message || "erro")); }
    finally { setSalvando(false); }
  }
  async function excluir(c: Categoria) {
    if (!(await confirmDelete({ entityLabel: "categoria", itemName: c.nome }))) return;
    try {
      const r = await fetch(`/api/servicos/categorias/${c.id}`, { method: "DELETE" });
      if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.message || `Erro ${r.status}`); }
      toast.success("Categoria excluída"); mudou.current = true; await load();
    } catch (e: any) { toast.error("Não consegui excluir: " + (e?.message || "erro")); }
  }

  function fechar() { if (mudou.current) onChanged?.(); onClose(); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(1,30,36,.45)" }} onClick={fechar}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "#E8DFC8", background: "linear-gradient(180deg,#F7FCFD,#EFF9FA)" }}>
          <span className="text-sm font-bold" style={{ color: "#014D5E" }}>🏷️ Categorias</span>
          <button onClick={abrirNova} className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: "#009AAC" }}>+ Nova categoria</button>
        </div>

        {formOpen && (
          <div className="p-4 border-b" style={{ borderColor: "#F0EBE0", background: "#FBFDFD" }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#014D5E" }}>Nome</label>
                <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") salvar(); }} placeholder="ex.: Cirurgias" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#014D5E" }}>Comissão padrão</label>
                <select value={comissao} onChange={(e) => setComissao(e.target.value as ComissaoBase)} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }}>
                  {COM_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-1.5 rounded-lg text-xs text-white font-bold disabled:opacity-50" style={{ background: "#009AAC" }}>{salvando ? "Salvando…" : (editId ? "Salvar" : "Criar")}</button>
            </div>
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Carregando…</div>
          ) : cats.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma categoria ainda.</div>
          ) : cats.map((c, i) => (
            <div key={c.id} className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: i ? "1px solid #F0EBE0" : "none", opacity: c.ativo ? 1 : 0.5 }}>
              <div>
                <span className="text-sm font-semibold" style={{ color: "#014D5E" }}>{c.nome}</span>
                <div className="text-[11px]" style={{ color: "#5C6B70" }}>Comissão: {comLabel(c.comissaoBasePadrao)}{c._count ? ` · ${c._count.servicos} item(ns)` : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => abrirEdicao(c)} title="Editar" className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#E0F4F6", color: "#007B8A" }}>✏️</button>
                <button onClick={() => excluir(c)} title="Excluir" className="text-xs" style={{ color: "#c0392b" }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={fechar} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
