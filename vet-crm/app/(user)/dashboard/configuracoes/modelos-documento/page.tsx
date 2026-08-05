"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";
import { MODELOS_SIMPLESVET } from "@/lib/documentos/modelos-simplesvet";
import EditorDocumento from "@/components/documentos/EditorDocumento";

const MODELOS_DEFAULT: { nome: string; corpo: string }[] = [
  { nome: "Atestado de saúde", corpo: "" },
  { nome: "Atestado de vacinação", corpo: "" },
  { nome: "Atividades Map", corpo: "" },
  { nome: "Avaliação Fisioterapêutica", corpo: "" },
  { nome: "Declaração", corpo: "" },
  { nome: "Encaminhamento", corpo: "" },
  { nome: "Ficha Resumida", corpo: "" },
  { nome: "Guia de trânsito", corpo: "" },
  { nome: "Laudo Veterinário", corpo: "" },
  { nome: "Orientações Pós Operatórias", corpo: "" },
  { nome: "Receituário de Controle Especial", corpo: "" },
  { nome: "Termo de Internação e Tratamento", corpo: "" },
];

export default function ConfigModelosDocumentoPage() {
  usePageTitle("Modelos de Documento", "Modelos que aparecem ao criar um documento na ficha do pet");
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde adicionar/salvar/remover
  const [modelos, setModelos] = useState<{ id: string; nome: string; corpo: string }[]>([]);
  const [novo, setNovo] = useState("");
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  async function fetchLista(lista: string) {
    const r = await fetch(`/api/listas?lista=${lista}`, { cache: "no-store" });
    const d = await r.json();
    return Array.isArray(d) ? d : (d.itens || d.data || []);
  }
  async function postModelo(nome: string, corpo: string) {
    await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "documento_modelo", valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function patchModelo(id: string, nome: string, corpo: string) {
    await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      let ms = await fetchLista("documento_modelo");
      // Corpo a semear por nome: prioriza o texto importado do SimplesVet, senão o default.
      const importados = new Map(MODELOS_SIMPLESVET.map((m) => [m.nome, m.corpo]));
      const corpoSeed = (nome: string) => importados.get(nome) || MODELOS_DEFAULT.find((d) => d.nome === nome)?.corpo || "";
      if (ms.length === 0) {
        for (const m of MODELOS_DEFAULT) await postModelo(m.nome, corpoSeed(m.nome));
        for (const m of MODELOS_SIMPLESVET) if (!MODELOS_DEFAULT.some((d) => d.nome === m.nome)) await postModelo(m.nome, m.corpo);
      } else {
        const existentes = new Set<string>();
        for (const i of ms) {
          let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; }
          const nm = o.nome || i.valor;
          existentes.add(nm);
          if (!o.corpo) {
            const corpo = corpoSeed(nm);
            if (corpo) await patchModelo(i.id, nm, corpo);
          }
        }
        // Modelos importados que ainda não existem no sistema → cria já preenchido.
        for (const m of MODELOS_SIMPLESVET) if (!existentes.has(m.nome)) await postModelo(m.nome, m.corpo);
      }
      ms = await fetchLista("documento_modelo");
      const parsed = ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { id: i.id, nome: o.nome || i.valor, corpo: o.corpo || "" }; });
      setModelos(parsed);
      setDraft(Object.fromEntries(parsed.map((m: any) => [m.id, m.corpo])));
    } catch {}
    jaCarregou.current = true; setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addModelo() {
    const nome = novo.trim(); if (!nome) return;
    await postModelo(nome, ""); setNovo(""); await load();
  }
  async function remover(id: string) {
    if (!(await confirmDelete({ entityLabel: "modelo", itemName: "este modelo" }))) return;
    await fetch(`/api/listas/${id}`, { method: "DELETE" }); await load();
  }

  // edição de um modelo (tela do editor)
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCorpo, setEditCorpo] = useState("");
  function abrirEditor(m: { id: string; nome: string; corpo: string }) {
    setEditId(m.id); setEditNome(m.nome); setEditCorpo(m.corpo || "");
  }
  async function salvarEditor() {
    if (!editId) return;
    setSavingId(editId);
    try { await patchModelo(editId, editNome.trim() || "Documento", editCorpo); await load(); setEditId(null); } catch {} finally { setSavingId(null); }
  }
  async function removerEditor() {
    if (!editId) return;
    if (!(await confirmDelete({ entityLabel: "modelo", itemName: editNome }))) return;
    await fetch(`/api/listas/${editId}`, { method: "DELETE" }); setEditId(null); await load();
  }

  if (loading) return <div className="text-center text-sm text-gray-400 py-10">Carregando...</div>;

  // ---- Tela do EDITOR (um modelo) ----
  if (editId) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
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
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#7C8A8E" }}>Conteúdo do documento</div>
            <EditorDocumento value={editCorpo} onChange={setEditCorpo} palette preview minHeight={260} />
            {podeEditar && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
                <button onClick={removerEditor} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#f0d3d2", color: "#b23b39" }}>🗑 Excluir</button>
                <button onClick={salvarEditor} disabled={savingId === editId} className="px-5 py-2 rounded-lg text-sm text-white font-bold disabled:opacity-50" style={{ background: "#009AAC" }}>{savingId === editId ? "Salvando..." : "✔ Salvar"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Tela da LISTA ----
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <p className="text-xs text-[#64748b]">Modelos que aparecem no dropdown ao adicionar um Documento na ficha do pet. Clique em <b>Editar</b> pra abrir o editor — as variáveis (nome do pet, tutor, veterinário) são preenchidas automaticamente ao gerar.</p>
      {podeEditar && (
        <div className="flex gap-2">
          <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModelo()} placeholder="Novo modelo (ex.: Atestado de óbito)" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
          <button onClick={addModelo} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Adicionar</button>
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
        {modelos.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhum modelo ainda.</div>}
      </div>
    </div>
  );
}
