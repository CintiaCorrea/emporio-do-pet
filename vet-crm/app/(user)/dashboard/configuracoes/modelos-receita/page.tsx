"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const MODELOS_DEFAULT: { nome: string; corpo: string }[] = [{"nome": "Hepatopata", "corpo": "MANDAR AVIAR\nUSO ORAL:\n\n- N – acetilcisteína: 100mg/ 10kg\n- Arginina: 70mg/ 10 Kg\n- Ornitina: 60 mg/ 10 Kg\n- Taurina: 70 mg/ 10 Kg\n- Silimarina: 100mg/ 10Kg\n- Glicina: 50 mg/ 10Kg\n- Ácido lipóico: 15 – 25 mg/ 10kg\n- Extrato chá verde: 20 mg/ 10Kg"}, {"nome": "Modelo padrão com Logo", "corpo": "@USUARIO_ASSINATURA@\n@CLINICA_CIDADE@, @CLINICA_ESTADO@, @GERAL_DATA@\n@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@\n@USUARIO_CRMV@"}, {"nome": "Modelo padrão sem logo", "corpo": ""}, {"nome": "Orientação Alimentação Natural", "corpo": "- CARBOIDRATO - ARROZ PARBORIZADO OU ARROZ BRANCO, BATATA DOCE.\n- PROTEÍNA - CARNE BOVINA MAGRA SEM GORDURA, PEITO DE FRANGO, ATUM EM ÁGUA.\n- LEGUMES - ABOBRINHA, CHUCHU, VAGEM, ABÓBORA, INHAME, CENOURA.\n\n___ GRS DE CARBOIDRATO / 2 VEZES AO DIA.\n___ GRS DE PROTEÍNA / 2 VEZES AO DIA.\n___ GRS DE LEGUMES / 2 VEZES AO DIA.\nTOTAL DE ___ GRS POR REFEIÇÃO.\n\nTODOS OS INGREDIENTES DEVEM SER PESADOS COZIDOS.\nCozinhar os legumes, carboidratos e proteínas em panelas diferentes e após o preparo misturá-los."}, {"nome": "Gel Cicatrizante e Antifúngico Natural", "corpo": ""}, {"nome": "Nutracêuticos - Erliquiose", "corpo": ""}, {"nome": "Prescrição para Erliquiose", "corpo": ""}, {"nome": "Receituário de Controle Especial", "corpo": ""}, {"nome": "Spray antifúngico e bactericida", "corpo": ""}, {"nome": "Spray de Mupirocina - Alergia", "corpo": ""}, {"nome": "Tratamento Otológico", "corpo": ""}];

export default function ConfigModelosReceitaPage() {
  usePageTitle("Modelos de Receita", "Modelos que aparecem ao criar uma receita na ficha do pet");
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
    await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "receita_modelo", valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function patchModelo(id: string, nome: string, corpo: string) {
    await fetch(`/api/listas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify({ nome, corpo }) }) });
  }
  async function load() {
    if (!jaCarregou.current) setLoading(true);
    try {
      let ms = await fetchLista("receita_modelo");
      if (ms.length === 0) {
        for (const m of MODELOS_DEFAULT) await postModelo(m.nome, m.corpo);
      } else {
        for (const i of ms) {
          let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; }
          const nm = o.nome || i.valor;
          if (!o.corpo) {
            const def = MODELOS_DEFAULT.find(d => d.nome === nm);
            if (def && def.corpo) await patchModelo(i.id, nm, def.corpo);
          }
        }
      }
      ms = await fetchLista("receita_modelo");
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
  async function salvarCorpo(m: { id: string; nome: string }) {
    setSavingId(m.id);
    try { await patchModelo(m.id, m.nome, draft[m.id] || ""); await load(); } catch {} finally { setSavingId(null); }
  }
  async function remover(id: string) {
    if (!(await confirmDelete({ entityLabel: "modelo", itemName: "este modelo" }))) return;
    await fetch(`/api/listas/${id}`, { method: "DELETE" }); await load();
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <p className="text-xs text-[#64748b]">Modelos de receita que aparecem no dropdown ao adicionar uma Receita na ficha do pet. Edite o corpo de cada um — as variáveis (nome do pet, tutor, veterinário) serão preenchidas ao gerar.</p>
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Carregando...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModelo()} placeholder="Novo modelo (ex.: Antibiótico pós-cirúrgico)" className="flex-1 px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
            <button onClick={addModelo} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Adicionar</button>
          </div>
          {modelos.map((m) => (
            <div key={m.id} className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
              <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#e8edf0" }}>
                <span className="text-sm font-semibold" style={{ color: "#014D5E" }}>{m.nome}</span>
                <button onClick={() => remover(m.id)} className="text-gray-400 hover:text-[#E24B4A] text-xs">Remover</button>
              </div>
              <div className="p-3">
                <textarea value={draft[m.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))} placeholder="Corpo do modelo (texto da receita)…" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", minHeight: "80px" }} />
                <div className="mt-2 text-right">
                  <button onClick={() => salvarCorpo(m)} disabled={savingId === m.id} className="px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingId === m.id ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
