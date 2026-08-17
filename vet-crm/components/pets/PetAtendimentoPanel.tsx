"use client";
import { LuX, LuArrowLeft } from "react-icons/lu";
import { useCanSeeCost } from "@/lib/permissions/useCanSeeCost";

export default function PetAtendimentoPanel(props: any) {
  const { pet, atd, setAtd, atdTipos, atdStatus, vets, items, servicosCat, pickServico, addItem, updItem, rmItem, saving, onSalvar, onFechar } = props;
  const sa = (patch: any) => setAtd((a: any) => ({ ...a, ...patch }));
  const canSeeCost = useCanSeeCost(); // coluna Custo do atendimento só p/ ADMIN
  const gridCols = canSeeCost ? "1fr 40px 64px 64px 1fr 48px 70px 22px" : "1fr 40px 64px 1fr 48px 70px 22px";
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2">
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100" title="Voltar ao histórico"><LuArrowLeft size={18} /></button>
          <h2 className="text-base font-semibold" style={{ color: "#0E2244" }}>Novo atendimento — {pet.name}</h2>
        </div>
        <button onClick={onFechar} className="text-gray-400 hover:text-gray-600" title="Fechar"><LuX size={18} /></button>
      </div>

      {/* Atendimento = SÓ anamnese (texto livre, estilo SimplesVet). Prescrição/retorno/exames/serviços saíram. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-xs">
        <div><label className="text-gray-500">Data e hora *</label><input type="datetime-local" value={atd.date} onChange={(e) => sa({ date: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Tipo do atendimento</label><select value={atd.type} onChange={(e) => sa({ type: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}>{atdTipos.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
        <div><label className="text-gray-500">Profissional *</label><select value={atd.userId} onChange={(e) => sa({ userId: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}><option value="">Selecionar...</option>{vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
      </div>
      <div className="text-xs mb-2"><label className="text-gray-500">Resumo <span className="text-gray-300">(1 linha, opcional)</span></label><input value={atd.chiefComplaint} onChange={(e) => sa({ chiefComplaint: e.target.value })} placeholder="Ex.: Reavaliação — melhora do quadro" className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
      <div className="text-xs"><label className="text-gray-500">Atendimento</label><textarea value={atd.anamnesis} onChange={(e) => sa({ anamnesis: e.target.value })} placeholder="Escreva livremente: queixa, anamnese, exame físico, diagnóstico, conduta…" className="w-full mt-0.5 px-2 py-2 border rounded-lg" style={{ borderColor: "#E8DFC8", minHeight: 220 }} /></div>
      <p className="text-[11px] text-gray-400 mt-1.5">💊 Prescrição/receita é no box <b>Receita</b>. 🔬 Exames no box <b>Exame</b>. 🕓 Follow-up e ⚡ Sequência ficam na <b>Visão geral</b>.</p>

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t" style={{ borderColor: "#E8DFC8" }}>
        <button onClick={onFechar} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
        <button onClick={onSalvar} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "💾 Salvar atendimento"}</button>
      </div>
    </div>
  );
}
