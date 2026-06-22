"use client";
import { LuX, LuArrowLeft } from "react-icons/lu";

export default function PetAtendimentoPanel(props: any) {
  const { pet, atd, setAtd, atdTipos, atdStatus, vets, items, servicosCat, pickServico, addItem, updItem, rmItem, saving, onSalvar, onFechar } = props;
  const sa = (patch: any) => setAtd((a: any) => ({ ...a, ...patch }));
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2">
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100" title="Voltar ao histórico"><LuArrowLeft size={18} /></button>
          <h2 className="text-base font-semibold" style={{ color: "#0E2244" }}>Novo atendimento — {pet.name}</h2>
        </div>
        <button onClick={onFechar} className="text-gray-400 hover:text-gray-600" title="Fechar"><LuX size={18} /></button>
      </div>

      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dados básicos</div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div><label className="text-gray-500">Data e hora *</label><input type="datetime-local" value={atd.date} onChange={(e) => sa({ date: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Tipo</label><select value={atd.type} onChange={(e) => sa({ type: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}>{atdTipos.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
        <div><label className="text-gray-500">Profissional responsável *</label><select value={atd.userId} onChange={(e) => sa({ userId: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}><option value="">Selecionar...</option>{vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div><label className="text-gray-500">Status</label><select value={atd.status} onChange={(e) => sa({ status: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }}>{atdStatus.map((v: any) => <option key={v} value={v}>{v}</option>)}</select></div>
        <div><label className="text-gray-500">Duração (min)</label><input type="number" value={atd.duration} onChange={(e) => sa({ duration: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
      </div>

      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Anamnese e exame</div>
      <div className="space-y-2 text-xs">
        <div><label className="text-gray-500">Motivo / queixa principal</label><input value={atd.chiefComplaint} onChange={(e) => sa({ chiefComplaint: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Anamnese</label><textarea value={atd.anamnesis} onChange={(e) => sa({ anamnesis: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Exame físico</label><textarea value={atd.physicalExam} onChange={(e) => sa({ physicalExam: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-gray-500">Peso do pet (kg)</label><input type="number" step="0.1" value={atd.petWeight} onChange={(e) => sa({ petWeight: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
          <div><label className="text-gray-500">Temperatura (°C)</label><input type="number" step="0.1" value={atd.temperature} onChange={(e) => sa({ temperature: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        </div>
        <div><label className="text-gray-500">Diagnóstico</label><textarea value={atd.diagnosis} onChange={(e) => sa({ diagnosis: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Conduta</label><textarea value={atd.conduct} onChange={(e) => sa({ conduct: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Prescrição</label><textarea value={atd.prescription} onChange={(e) => sa({ prescription: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Exames solicitados</label><textarea value={atd.examsRequested} onChange={(e) => sa({ examsRequested: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
      </div>

      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Serviços e valores</div>
      <div className="text-xs">
        <div className="hidden md:grid gap-1 text-[10px] text-gray-400 px-1 mb-1" style={{ gridTemplateColumns: "1fr 40px 64px 64px 1fr 48px 70px 22px" }}>
          <span>Serviço/descrição</span><span className="text-center">Qtd</span><span>Valor</span><span>Custo</span><span>Executado por</span><span className="text-center">Com.%</span><span className="text-right">Total</span><span></span>
        </div>
        {items.length === 0 && <p className="text-center text-gray-400 py-2">Nenhum serviço lançado.</p>}
        {items.map((it: any, i: number) => (
          <div key={i} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: "1fr 40px 64px 64px 1fr 48px 70px 22px" }}>
            <input list="srvcat-atd" value={it.descricao} onChange={(e) => { const nome = e.target.value; const sv = servicosCat.find((x: any) => x.nome === nome); if (sv) { pickServico(i, sv.id); } else { updItem(i, { descricao: nome, servicoId: "" }); } }} placeholder="Serviço..." className="px-1.5 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
            <input type="number" value={it.quantidade} onChange={(e) => updItem(i, { quantidade: e.target.value })} className="px-1 py-1 border rounded text-center" style={{ borderColor: "#E8DFC8" }} />
            <input type="number" value={it.valorUnitario} onChange={(e) => updItem(i, { valorUnitario: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
            <input type="number" value={it.custoUnitario} onChange={(e) => updItem(i, { custoUnitario: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }} />
            <select value={it.executorUserId} onChange={(e) => updItem(i, { executorUserId: e.target.value })} className="px-1 py-1 border rounded" style={{ borderColor: "#E8DFC8" }}><option value="">—</option>{vets.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            <input type="number" value={it.comissaoValor} onChange={(e) => updItem(i, { comissaoValor: e.target.value })} className="px-1 py-1 border rounded text-center" style={{ borderColor: "#E8DFC8" }} />
            <span className="text-right tabular-nums text-[11px]">{((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            <button onClick={() => rmItem(i)} className="text-gray-400 hover:text-red-500"><LuX size={12} /></button>
          </div>
        ))}
        <datalist id="srvcat-atd">{servicosCat.slice(0, 1000).map((sv: any) => <option key={sv.id} value={sv.nome} />)}</datalist>
        <button onClick={addItem} className="w-full mt-1 px-3 py-1.5 rounded-lg border border-dashed text-[11px]" style={{ borderColor: "#009AAC", color: "#00798A" }}>+ Adicionar serviço</button>
        {items.length > 0 && <div className="text-right text-sm font-medium mt-2" style={{ color: "#0E2244" }}>Total: {items.reduce((sm: number, it: any) => sm + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>}
      </div>

      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1.5">Pós-atendimento</div>
      <div className="space-y-2 text-xs">
        <div><label className="text-gray-500">Próximo retorno</label><input type="date" value={atd.nextReturnDate} onChange={(e) => sa({ nextReturnDate: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">O que verificar com o cliente (guia pro próximo toque)</label><textarea value={atd.followUpNotes} onChange={(e) => sa({ followUpNotes: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
        <div><label className="text-gray-500">Observações</label><textarea value={atd.notes} onChange={(e) => sa({ notes: e.target.value })} rows={2} className="w-full mt-0.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "#E8DFC8" }} /></div>
      </div>

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t" style={{ borderColor: "#E8DFC8" }}>
        <button onClick={onFechar} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
        <button onClick={onSalvar} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Salvar atendimento"}</button>
      </div>
    </div>
  );
}
