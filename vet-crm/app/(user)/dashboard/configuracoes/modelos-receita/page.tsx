"use client";
import toast from "react-hot-toast";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useState, useRef } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";
import EditorDocumento from "@/components/documentos/EditorDocumento";

const MODELOS_DEFAULT: { nome: string; corpo: string }[] = [{"nome": "Hepatopata", "corpo": "MANDAR AVIAR\nUSO ORAL:\n\n- N – acetilcisteína: 100mg/ 10kg\n- Arginina: 70mg/ 10 Kg\n- Ornitina: 60 mg/ 10 Kg\n- Taurina: 70 mg/ 10 Kg\n- Silimarina: 100mg/ 10Kg\n- Glicina: 50 mg/ 10Kg\n- Ácido lipóico: 15 – 25 mg/ 10kg\n- Extrato chá verde: 20 mg/ 10Kg"}, {"nome": "Modelo padrão com Logo", "corpo": "@USUARIO_ASSINATURA@\n@CLINICA_CIDADE@, @CLINICA_ESTADO@, @GERAL_DATA@\n@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@\n@USUARIO_CRMV@"}, {"nome": "Modelo padrão sem logo", "corpo": ""}, {"nome": "Orientação Alimentação Natural", "corpo": "- CARBOIDRATO - ARROZ PARBORIZADO OU ARROZ BRANCO, BATATA DOCE.\n- PROTEÍNA - CARNE BOVINA MAGRA SEM GORDURA, PEITO DE FRANGO, ATUM EM ÁGUA.\n- LEGUMES - ABOBRINHA, CHUCHU, VAGEM, ABÓBORA, INHAME, CENOURA.\n\n___ GRS DE CARBOIDRATO / 2 VEZES AO DIA.\n___ GRS DE PROTEÍNA / 2 VEZES AO DIA.\n___ GRS DE LEGUMES / 2 VEZES AO DIA.\nTOTAL DE ___ GRS POR REFEIÇÃO.\n\nTODOS OS INGREDIENTES DEVEM SER PESADOS COZIDOS.\nCozinhar os legumes, carboidratos e proteínas em panelas diferentes e após o preparo misturá-los."}, {"nome": "Gel Cicatrizante e Antifúngico Natural", "corpo": ""}, {"nome": "Nutracêuticos - Erliquiose", "corpo": ""}, {"nome": "Prescrição para Erliquiose", "corpo": ""}, {"nome": "Receituário de Controle Especial", "corpo": ""}, {"nome": "Spray antifúngico e bactericida", "corpo": ""}, {"nome": "Spray de Mupirocina - Alergia", "corpo": ""}, {"nome": "Tratamento Otológico", "corpo": ""}];

export default function ConfigModelosReceitaPage() {
  usePageTitle("Modelos de Receita", "Modelos que aparecem ao criar uma receita na ficha do pet");
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde adicionar/salvar/remover
  const [modelos, setModelos] = useState<{ id: string; nome: string; corpo: string }[]>([]);
  const [novo, setNovo] = useState("");
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchLista(lista: string) {
    const r = await fetch(`/api/listas?lista=${lista}`, { cache: "no-store" });
    const d = await r.json();
    return Array.isArray(d) ? d : (d.itens || d.data || []);
  }
  async function postModelo(nome: string, corpo: string) {
    await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "receita_modelo", valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function patchModelo(id: string, nome: string, corpo: string) {
    await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      let ms = await fetchLista("receita_modelo");
      const corpoSeed = (nome: string) => MODELOS_DEFAULT.find((d) => d.nome === nome)?.corpo || "";
      if (ms.length === 0) {
        for (const m of MODELOS_DEFAULT) await postModelo(m.nome, m.corpo);
      } else {
        for (const i of ms) {
          let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; }
          const nm = o.nome || i.valor;
          if (!o.corpo) {
            const corpo = corpoSeed(nm);
            if (corpo) await patchModelo(i.id, nm, corpo);
          }
        }
      }
      ms = await fetchLista("receita_modelo");
      const parsed = ms.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { id: i.id, nome: o.nome || i.valor, corpo: o.corpo || "" }; });
      setModelos(parsed);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addModelo() {
    const nome = novo.trim();
    if (!nome) { toast.error("Digite o nome do modelo primeiro."); return; }
    try {
      const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "receita_modelo", valor: JSON.stringify({ nome, corpo: "" }) }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || d?.error || `Erro ${r.status}`);
      setNovo("");
      await load();
      toast.success("Modelo adicionado");
      if (d?.id) abrirEditor({ id: d.id, nome, corpo: "" });
    } catch (e: any) {
      toast.error("Não consegui adicionar: " + (e?.message || "erro"));
    }
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
    try { await patchModelo(editId, editNome.trim() || "Receita", editCorpo); await load(); setEditId(null); } catch {} finally { setSavingId(null); }
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
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#7C8A8E" }}>Conteúdo da receita</div>
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
    <div className="p-4 space-y-4">
      <p className="text-xs text-[#64748b]">Modelos que aparecem no dropdown ao adicionar uma Receita na ficha do pet. Clique em <b>Editar</b> pra abrir o editor — as variáveis (nome do pet, tutor, veterinário) são preenchidas automaticamente ao gerar.</p>
      {podeEditar && (
        <div className="flex gap-2">
          <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModelo()} placeholder="Novo modelo (ex.: Antibiótico pós-cirúrgico)" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
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
