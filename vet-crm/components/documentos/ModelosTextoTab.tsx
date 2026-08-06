"use client";
// Aba de modelos de TEXTO com editor rico (Receita e Documento usam o mesmo — só muda a
// chave da lista e o rótulo). Lista + criar + editar + excluir. Guarda em /api/listas.
import toast from "react-hot-toast";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useRef, useState } from "react";
import { usePodeEditar } from "@/lib/permissions/context";
import EditorDocumento from "@/components/documentos/EditorDocumento";

type Modelo = { id: string; nome: string; corpo: string };

export default function ModelosTextoTab({ lista, tipo }: { lista: string; tipo: "receita" | "documento" }) {
  const rotulo = tipo === "receita" ? "Receita" : "Documento";
  const podeEditar = usePodeEditar();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [novo, setNovo] = useState("");
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCorpo, setEditCorpo] = useState("");

  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      const r = await fetch(`/api/listas?lista=${lista}`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      setModelos(arr.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { id: i.id, nome: o.nome || i.valor, corpo: o.corpo || "" }; }));
    } catch {}
    jaCarregou.current = true; setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [lista]);

  const abrirEditor = (m: Modelo) => { setEditId(m.id); setEditNome(m.nome); setEditCorpo(m.corpo || ""); };

  async function addModelo() {
    const nome = novo.trim();
    if (!nome) { toast.error("Digite o nome do modelo primeiro."); return; }
    try {
      const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista, valor: JSON.stringify({ nome, corpo: "" }) }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || d?.error || `Erro ${r.status}`);
      setNovo(""); setNovoModalOpen(false); await load();
      toast.success("Modelo adicionado");
      if (d?.id) abrirEditor({ id: d.id, nome, corpo: "" });
    } catch (e: any) { toast.error("Não consegui adicionar: " + (e?.message || "erro")); }
  }
  async function remover(id: string) {
    if (!(await confirmDelete({ entityLabel: "modelo", itemName: "este modelo" }))) return;
    await fetch(`/api/listas/${id}`, { method: "DELETE" }); await load();
  }
  async function salvarEditor() {
    if (!editId) return;
    setSavingId(editId);
    try { await fetch(`/api/listas/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ nome: editNome.trim() || rotulo, corpo: editCorpo }) }) }); await load(); setEditId(null); } catch {} finally { setSavingId(null); }
  }
  async function removerEditor() {
    if (!editId) return;
    if (!(await confirmDelete({ entityLabel: "modelo", itemName: editNome }))) return;
    await fetch(`/api/listas/${editId}`, { method: "DELETE" }); setEditId(null); await load();
  }

  if (loading) return <div className="text-center text-sm text-gray-400 py-10">Carregando…</div>;

  // ---- EDITOR de um modelo ----
  if (editId) {
    return (
      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#E8DFC8", background: "linear-gradient(180deg,#F7FCFD,#EFF9FA)" }}>
          <span className="text-sm font-bold flex items-center gap-2" style={{ color: "#014D5E" }}>✏️ Editar modelo</span>
          <button onClick={() => setEditId(null)} className="text-xs font-semibold" style={{ color: "#007B8A" }}>← Voltar</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#014D5E" }}>Nome <span style={{ color: "#009AAC" }}>*</span></label>
            <input value={editNome} onChange={(e) => setEditNome(e.target.value)} disabled={!podeEditar} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#014D5E" }} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#7C8A8E" }}>Conteúdo {tipo === "receita" ? "da receita" : "do documento"}</div>
          <EditorDocumento value={editCorpo} onChange={setEditCorpo} palette preview minHeight={260} />
          {podeEditar && (
            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
              <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={removerEditor} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#f0d3d2", color: "#b23b39" }}>🗑 Excluir</button>
              <button onClick={salvarEditor} disabled={savingId === editId} className="px-5 py-2 rounded-lg text-sm text-white font-bold disabled:opacity-50" style={{ background: "#009AAC" }}>{savingId === editId ? "Salvando…" : "✔ Salvar"}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- LISTA ----
  return (
    <div className="space-y-4">
      <p className="text-xs text-[#64748b]">Modelos que aparecem no dropdown ao adicionar {tipo === "receita" ? "uma Receita" : "um Documento"} na ficha do pet. Clique em <b>Editar</b> pra abrir o editor — as variáveis (nome do pet, tutor, veterinário) são preenchidas automaticamente ao gerar.</p>
      {podeEditar && (
        <button onClick={() => { setNovo(""); setNovoModalOpen(true); }} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "#009AAC" }}>+ Novo modelo</button>
      )}
      {novoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(1,30,36,.45)" }} onClick={() => setNovoModalOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b text-sm font-bold" style={{ borderColor: "#E8DFC8", color: "#014D5E", background: "linear-gradient(180deg,#F7FCFD,#EFF9FA)" }}>Novo modelo de {rotulo.toLowerCase()}</div>
            <div className="p-5">
              <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#014D5E" }}>Nome do modelo</label>
              <input autoFocus value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addModelo(); if (e.key === "Escape") setNovoModalOpen(false); }} placeholder="ex.: Antibiótico pós-cirúrgico" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#014D5E" }} />
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#F0EBE0" }}>
              <button onClick={() => setNovoModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
              <button onClick={addModelo} className="px-5 py-2 rounded-lg text-sm text-white font-bold" style={{ background: "#009AAC" }}>Criar</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        {modelos.map((m, i) => (
          <div key={m.id} className="px-4 py-3 flex items-center justify-between" style={{ borderTop: i ? "1px solid #F0EBE0" : "none" }}>
            <span className="text-sm font-semibold" style={{ color: "#014D5E" }}>{m.nome}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => abrirEditor(m)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#E0F4F6", color: "#007B8A" }}>{podeEditar ? "Editar" : "Ver"}</button>
              {podeEditar && <button onClick={() => remover(m.id)} className="text-gray-400 hover:text-[#E24B4A] text-xs">Remover</button>}
            </div>
          </div>
        ))}
        {modelos.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhum modelo ainda. Clique em “+ Novo modelo”.</div>}
      </div>
    </div>
  );
}
