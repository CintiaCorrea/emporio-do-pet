"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const TIPOS_DEFAULT: [string, string][] = [["CONSULTA","Consulta"],["RETORNO","Retorno"],["AVALIACAO","Avaliação"],["EMERGENCIA","Emergência"],["PROCEDIMENTO","Procedimento"],["VACINACAO","Vacinação"],["CIRURGIA","Cirurgia"],["SESSAO_FISIO","Sessão de fisio"],["OUTRO","Outro"]];
const STATUS_DEFAULT = ["Realizado","Agendado","Cancelado","Faltou"];

export default function ConfigAtendimentoPage() {
  usePageTitle("Atendimento", "Tipos e status do atendimento");
  const [tipos, setTipos] = useState<{ id: string; l: string }[]>([]);
  const [status, setStatus] = useState<{ id: string; valor: string }[]>([]);
  const [novoTipo, setNovoTipo] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchLista(lista: string) {
    const r = await fetch(`/api/listas?lista=${lista}`, { cache: "no-store" });
    const d = await r.json();
    return Array.isArray(d) ? d : (d.itens || d.data || []);
  }
  async function load() {
    setLoading(true);
    try {
      let at = await fetchLista("atendimento_tipo");
      let st = await fetchLista("atendimento_status");
      if (at.length === 0) {
        for (const [v, l] of TIPOS_DEFAULT) await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "atendimento_tipo", valor: JSON.stringify({ v, l }) }) });
        at = await fetchLista("atendimento_tipo");
      }
      if (st.length === 0) {
        for (const v of STATUS_DEFAULT) await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "atendimento_status", valor: v }) });
        st = await fetchLista("atendimento_status");
      }
      setTipos(at.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { l: i.valor }; } return { id: i.id, l: o.l || o.v || i.valor }; }));
      setStatus(st.map((i: any) => ({ id: i.id, valor: i.valor })));
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addTipo() {
    const nome = novoTipo.trim(); if (!nome) return;
    await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "atendimento_tipo", valor: JSON.stringify({ v: nome, l: nome }) }) });
    setNovoTipo(""); await load();
  }
  async function addStatus() {
    const nome = novoStatus.trim(); if (!nome) return;
    await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "atendimento_status", valor: nome }) });
    setNovoStatus(""); await load();
  }
  async function remover(id: string) {
    if (!(await confirmDelete({ entityLabel: "opção", itemName: "esta opção" }))) return;
    await fetch(`/api/listas/${id}`, { method: "DELETE" }); await load();
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <p className="text-xs text-[#64748b]">Personalize as opções que aparecem ao registrar um atendimento na ficha do pet. Valem para os próximos atendimentos.</p>
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Carregando...</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
            <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: "#e8edf0", color: "#014D5E" }}>Tipos de atendimento</div>
            <div className="p-4">
              <div className="flex flex-col gap-1.5 mb-3">
                {tipos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-[#fbfaf6] rounded-lg px-3 py-1.5 text-sm">
                    <span style={{ color: "#0E2244" }}>{t.l}</span>
                    <button onClick={() => remover(t.id)} className="text-gray-400 hover:text-[#E24B4A] text-xs">Remover</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTipo()} placeholder="Novo tipo (ex.: Banho)" className="flex-1 px-3 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                <button onClick={addTipo} className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Adicionar</button>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
            <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: "#e8edf0", color: "#014D5E" }}>Status de atendimento</div>
            <div className="p-4">
              <div className="flex flex-col gap-1.5 mb-3">
                {status.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-[#fbfaf6] rounded-lg px-3 py-1.5 text-sm">
                    <span style={{ color: "#0E2244" }}>{t.valor}</span>
                    <button onClick={() => remover(t.id)} className="text-gray-400 hover:text-[#E24B4A] text-xs">Remover</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStatus()} placeholder="Novo status (ex.: Reagendado)" className="flex-1 px-3 py-1.5 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
                <button onClick={addStatus} className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: "#009AAC" }}>Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
