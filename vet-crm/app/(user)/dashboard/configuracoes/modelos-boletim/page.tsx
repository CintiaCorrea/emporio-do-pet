"use client";
// [EMP-COWORK] Modelos de boletim de internação — Cintia 18/07
// Textos prontos que o vet escolhe na ficha da internação (bloco "Boletins programados"),
// pra não escrever do zero 3x por dia. Guardados em listas `modelo_boletim` (JSON {nome, texto}).

import { useEffect, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Modelo = { id: string; nome: string; texto: string };

// Sugestões prontas — a clínica pode adicionar de uma vez e depois editar do jeito dela.
const SUGERIDOS: Array<{ nome: string; texto: string }> = [
  {
    nome: "Manhã — evolução boa",
    texto:
      "Bom dia! 🌤️ Boletim do [PET] — [Nº] dia de internação.\n" +
      "Passou a noite tranquilo, dormiu bem e não apresentou vômito.\n" +
      "Aceitou bem a alimentação da manhã e já urinou.\n" +
      "Temperatura e batimentos dentro do normal, e as medicações do horário foram aplicadas certinho.\n" +
      "Seguimos observando de perto. Qualquer novidade avisamos na hora. 💙",
  },
  {
    nome: "Tarde — estável",
    texto:
      "Boa tarde! Boletim do [PET].\n" +
      "Manteve-se estável durante a manhã, mais disposto e reagindo bem quando a equipe se aproxima.\n" +
      "Aceitou o almoço e evacuou normalmente.\n" +
      "Hidratação e medicações mantidas conforme a prescrição.\n" +
      "Sem nenhuma intercorrência até aqui. 💙",
  },
  {
    nome: "Noite — antes do plantão",
    texto:
      "Boa noite! Boletim do [PET] antes do plantão noturno.\n" +
      "Teve um bom dia no geral, sem sinais de dor.\n" +
      "Jantou bem e está confortável no box.\n" +
      "A equipe do plantão acompanha de perto durante toda a madrugada.\n" +
      "Amanhã cedo mandamos notícias novas. Pode ficar tranquilo(a)! 💙",
  },
  {
    nome: "Atenção — houve piora",
    texto:
      "Boa tarde. Boletim do [PET].\n" +
      "Ele apresentou [SINTOMA], e por isso a veterinária ajustou [CONDUTA].\n" +
      "Ele segue sob observação mais próxima, monitorando [PARÂMETRO].\n" +
      "Assim que tivermos uma nova avaliação, entramos em contato.\n" +
      "Se preferir falar direto com a veterinária, é só responder aqui. 💙",
  },
];

export default function ModelosBoletimPage() {
  usePageTitle("Modelos de boletim", "Textos prontos para os boletins de internação");

  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [form, setForm] = useState<{ id: string; nome: string; texto: string }>({ id: "", nome: "", texto: "" });
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<Modelo | null>(null);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const d = await fetch("/api/listas?lista=modelo_boletim").then((r) => r.json());
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      setModelos(
        arr.map((x: any) => {
          try { const v = JSON.parse(x.valor); return { id: x.id, nome: v.nome || "(sem nome)", texto: v.texto || "" }; }
          catch { return { id: x.id, nome: "(sem nome)", texto: String(x.valor || "") }; }
        }),
      );
    } catch { setModelos([]); }
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const novo = () => setForm({ id: "", nome: "", texto: "" });

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Dê um nome ao modelo (ex.: Manhã — evolução boa)."); return; }
    if (!form.texto.trim()) { alert("Escreva o texto do modelo."); return; }
    setSalvando(true);
    try {
      const valor = JSON.stringify({ nome: form.nome.trim(), texto: form.texto.trim() });
      if (form.id) {
        await fetch(`/api/listas/${form.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      } else {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "modelo_boletim", valor }) });
      }
      novo(); load();
    } catch { alert("Erro ao salvar o modelo."); }
    finally { setSalvando(false); }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try { await fetch(`/api/listas/${excluindo.id}`, { method: "DELETE", credentials: "include" }); setExcluindo(null); load(); }
    catch { alert("Erro ao excluir."); }
  };

  const adicionarSugeridos = async () => {
    if (!confirm(`Adicionar ${SUGERIDOS.length} modelos sugeridos? Você pode editar ou excluir depois.`)) return;
    setSalvando(true);
    try {
      for (const s of SUGERIDOS) {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "modelo_boletim", valor: JSON.stringify(s) }) });
      }
      load();
    } catch { alert("Erro ao adicionar os modelos sugeridos."); }
    finally { setSalvando(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="rounded-lg px-4 py-3 mb-4 text-[12.5px]" style={{ background: "#E0F4F6", color: "#00707E" }}>
        Estes textos aparecem na ficha da internação, no bloco <b>🔔 Boletins programados</b>: o vet escolhe o modelo e o texto entra pronto, podendo ajustar antes de enviar.
        Use <b>[PET]</b> onde entra o nome do animal — o vet troca na hora.
      </div>

      {/* formulário */}
      <div className="bg-white border rounded-[13px] mb-4" style={{ borderColor: "#E8E2D6" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#F0EBE0" }}>
          <h3 className="text-[13px] font-medium text-[#014D5E]">{form.id ? "✏️ Editar modelo" : "➕ Novo modelo"}</h3>
          {form.id && <button onClick={novo} className="text-[12px] text-[#5C6B70]">Cancelar edição</button>}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Nome do modelo *</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Manhã — evolução boa" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
          </div>
          <div>
            <label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Texto do boletim *</label>
            <textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} rows={6} placeholder="Bom dia! Boletim do [PET]..." className="w-full border rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
          </div>
          <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg disabled:opacity-60">
            {salvando ? "Salvando..." : form.id ? "Salvar alterações" : "➕ Adicionar modelo"}
          </button>
        </div>
      </div>

      {/* lista */}
      <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#F0EBE0" }}>
          <h3 className="text-[13px] font-medium text-[#014D5E]">Modelos cadastrados ({modelos.length})</h3>
          {modelos.length === 0 && !loading && (
            <button onClick={adicionarSugeridos} disabled={salvando} className="text-[12px] font-medium text-[#00798A] bg-[#E0F4F6] px-3 py-1.5 rounded-lg disabled:opacity-60">✨ Adicionar modelos sugeridos</button>
          )}
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-[#374151]">Carregando...</div>
        ) : modelos.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-[13px] text-[#5C6B70] mb-1">Nenhum modelo cadastrado ainda.</div>
            <div className="text-[12px] text-[#374151]">Crie o seu acima ou comece pelos modelos sugeridos.</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
            {modelos.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1F2A2E]">{m.nome}</div>
                  <div className="text-[12px] text-[#5C6B70] mt-0.5 whitespace-pre-wrap line-clamp-3">{m.texto}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setForm({ id: m.id, nome: m.nome, texto: m.texto })} className="text-[13px] px-2 py-1" title="Editar">✏️</button>
                  <button onClick={() => setExcluindo(m)} className="text-[13px] px-2 py-1" title="Excluir">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* confirmação de exclusão */}
      {excluindo && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setExcluindo(null)}>
          <div className="rounded-2xl shadow-xl max-w-sm w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">Excluir modelo</h3>
            </div>
            <div className="p-5 text-[13px] text-[#5C6B70]">
              Excluir o modelo <b className="text-[#1F2A2E]">{excluindo.nome}</b>? Essa ação não pode ser desfeita.
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setExcluindo(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={confirmarExclusao} className="px-4 py-2 text-[13px] font-medium text-white rounded-lg" style={{ background: "#CC3366" }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
