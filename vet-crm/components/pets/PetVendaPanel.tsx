"use client";
import { useEffect, useMemo, useState } from "react";
import { LuPackage, LuClipboardList, LuCircleDollarSign, LuPlus, LuTrash, LuCheck, LuArrowRight, LuWallet } from "react-icons/lu";
import toast from "react-hot-toast";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ST: any = {
  RASCUNHO: { l: "Rascunho", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};
const LINHA0 = { descricao: "", servicoId: "", quantidade: 1, valorUnitario: 0, desconto: 0 };

export default function PetVendaPanel({ petId, pacotes = [], servicos = [], atendimentos = [], onNovoAtendimento, onChanged }: { petId?: string; pacotes?: { id: string; data: any }[]; servicos?: any[]; atendimentos?: any[]; onNovoAtendimento?: () => void; onChanged?: () => void }) {
  const [sub, setSub] = useState<"VENDA" | "ORC">("VENDA");
  const [orcs, setOrcs] = useState<any[]>([]);
  const [novo, setNovo] = useState(false);
  const [itens, setItens] = useState<any[]>([{ ...LINHA0 }]);
  const [validade, setValidade] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!petId) return;
    try {
      const r = await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" });
      const d = await r.json();
      setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || []));
    } catch {}
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [petId]);

  const ativos = (pacotes || []).filter((p) => (p.data?.used || 0) < (p.data?.total || 0));
  const total = itens.reduce((s, it) => s + Math.max(0, (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) - (Number(it.desconto) || 0)), 0);
  const ultima = useMemo(() => {
    const arr = (atendimentos || []).filter((a: any) => a.date).slice();
    arr.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return arr[0] || null;
  }, [atendimentos]);

  function setItem(i: number, patch: any) { setItens((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  function pick(i: number, nome: string) {
    const sv = servicos.find((x: any) => x.nome === nome);
    if (sv) setItem(i, { descricao: nome, servicoId: sv.id, valorUnitario: sv.valorPadrao ?? 0 });
    else setItem(i, { descricao: nome, servicoId: "" });
  }

  async function salvar() {
    const linhas = itens.filter((it) => it.descricao || it.servicoId);
    if (linhas.length === 0) { toast.error("Adicione ao menos um item"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, validade: validade || undefined, observacao: obs || undefined, itens: linhas }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento criado");
      setNovo(false); setItens([{ ...LINHA0 }]); setValidade(""); setObs("");
      await load();
    } catch { toast.error("Erro ao criar orçamento"); }
    setSaving(false);
  }
  async function aprovar(id: string) { try { const r = await fetch(`/api/orcamentos/${id}/aprovar`, { method: "POST" }); if (!r.ok) throw 0; toast.success("Aprovado"); await load(); } catch { toast.error("Erro ao aprovar"); } }
  async function excluir(id: string) { if (!confirm("Excluir este orçamento?")) return; try { const r = await fetch(`/api/orcamentos/${id}`, { method: "DELETE" }); if (!r.ok) throw 0; toast.success("Excluído"); await load(); } catch { toast.error("Erro ao excluir"); } }
  async function converter(id: string) {
    if (!confirm("Converter em venda? Será criado um atendimento com os itens (atribuído a você).")) return;
    try { const r = await fetch(`/api/orcamentos/${id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!r.ok) throw 0; toast.success("Convertido em venda — atendimento criado"); await load(); onChanged?.(); } catch { toast.error("Erro ao converter"); }
  }

  function Box({ title, icon, children, action }: any) {
    return (
      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#E8DFC8" }}>
          <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#0E2244" }}>{icon}{title}</span>
          {action}
        </div>
        <div className="p-3">{children}</div>
      </div>
    );
  }

  const stab = (k: "VENDA" | "ORC", l: string) => (
    <button onClick={() => setSub(k)} className="text-[11px] px-3 py-1 rounded-md font-medium transition" style={sub === k ? { background: "#009AAC", color: "#fff" } : { background: "#eef2f4", color: "#475569" }}>{l}</button>
  );

  return (
    <div className="space-y-4">
      <Box title="Venda · Orçamentos" icon={<LuClipboardList size={13} />}>
        <div className="flex gap-1 mb-3">{stab("VENDA", "Venda")}{stab("ORC", "Orçamentos")}</div>

        {sub === "VENDA" && (
          <div>
            {!ultima ? (
              <div className="text-xs text-gray-400">Nenhuma venda registrada ainda.</div>
            ) : (
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Última venda · {new Date(ultima.date).toLocaleDateString("pt-BR")}</div>
                {(ultima.treatments || []).slice(0, 8).map((t: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs py-0.5"><span className="truncate pr-2" style={{ color: "#0E2244" }}>{t.product?.name || t.descricao || "Serviço"}</span><span className="text-gray-500 shrink-0">{BRL(t.product?.price)}</span></div>
                ))}
                <div className="flex justify-between text-xs font-semibold border-t mt-1 pt-1" style={{ borderColor: "#E8DFC8" }}><span>Total</span><span style={{ color: "#0F6E56" }}>{BRL(ultima.value)}</span></div>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => onNovoAtendimento?.()} className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-md text-white" style={{ background: "#009AAC" }}><LuPlus size={11} /> Novo atendimento</button>
              <button onClick={() => toast("Pagamento — chega no módulo Caixa")} className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-md border" style={{ borderColor: "#E8DFC8", color: "#475569" }}><LuWallet size={11} /> Pagamento</button>
            </div>
          </div>
        )}

        {sub === "ORC" && (
          <div>
            <div className="flex justify-end mb-2">
              <button onClick={() => setNovo((v) => !v)} className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-md text-white" style={{ background: "#009AAC" }}><LuPlus size={11} /> Novo orçamento</button>
            </div>
            {novo && (
              <div className="mb-3 border rounded-lg p-2 space-y-2" style={{ borderColor: "#E8DFC8" }}>
                {itens.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <input list="orc-srv" value={it.descricao} onChange={(e) => pick(i, e.target.value)} placeholder="Serviço/descrição" className="col-span-6 px-1.5 py-1 border rounded text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                    <input type="number" min="1" value={it.quantidade} onChange={(e) => setItem(i, { quantidade: e.target.value })} title="Qtd" className="col-span-2 px-1 py-1 border rounded text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                    <input type="number" step="0.01" value={it.valorUnitario} onChange={(e) => setItem(i, { valorUnitario: e.target.value })} title="Valor unit." className="col-span-3 px-1 py-1 border rounded text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                    <button onClick={() => setItens((arr) => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center"><LuTrash size={12} /></button>
                  </div>
                ))}
                <datalist id="orc-srv">{(servicos || []).slice(0, 1000).map((sv: any) => <option key={sv.id} value={sv.nome} />)}</datalist>
                <button onClick={() => setItens((arr) => [...arr, { ...LINHA0 }])} className="text-[11px] flex items-center gap-1" style={{ color: "#009AAC" }}><LuPlus size={11} /> Adicionar item</button>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500">Validade</label>
                  <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="px-1 py-0.5 border rounded text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                  <span className="ml-auto text-xs font-semibold" style={{ color: "#0F6E56" }}>{BRL(total)}</span>
                </div>
                <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="w-full px-1.5 py-1 border rounded text-[11px]" style={{ borderColor: "#E8DFC8" }} />
                <div className="flex gap-2">
                  <button onClick={salvar} disabled={saving} className="px-3 py-1 rounded text-[11px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Salvar orçamento"}</button>
                  <button onClick={() => setNovo(false)} className="px-3 py-1 rounded text-[11px] border" style={{ borderColor: "#E8DFC8", color: "#475569" }}>Cancelar</button>
                </div>
              </div>
            )}
            {orcs.length === 0 ? (
              <div className="text-xs text-gray-400">Nenhum orçamento. Use “Novo orçamento” para criar.</div>
            ) : (
              <div className="space-y-2">
                {orcs.map((o) => {
                  const st = ST[o.status] || ST.RASCUNHO;
                  const convertido = !!o.appointmentId;
                  return (
                    <div key={o.id} className="border rounded-lg p-2" style={{ borderColor: "#E8DFC8" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: "#0E2244" }}>{BRL(o.valorTotal)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: st.b, color: st.c }}>{convertido ? "Vendido" : st.l}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}
                        {o.validade ? ` · vale até ${new Date(o.validade).toLocaleDateString("pt-BR")}` : ""}
                        {Array.isArray(o.itens) ? ` · ${o.itens.length} ${o.itens.length === 1 ? "item" : "itens"}` : ""}
                      </div>
                      {!convertido && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {o.status === "RASCUNHO" && <button onClick={() => aprovar(o.id)} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}><LuCheck size={10} /> Aprovar</button>}
                          {o.status === "APROVADO" && <button onClick={() => converter(o.id)} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded text-white" style={{ background: "#009AAC" }}><LuArrowRight size={10} /> Converter em venda</button>}
                          <button onClick={() => excluir(o.id)} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border" style={{ borderColor: "#f4baba", color: "#A32D2D" }}><LuTrash size={10} /> Excluir</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-2">Em cirurgia e fisio o orçamento vem primeiro; ao aprovar, vira venda com os mesmos itens.</p>
          </div>
        )}
      </Box>

      <Box title="Pacote ativo" icon={<LuPackage size={13} />}>
        {ativos.length === 0 ? (
          <div className="text-xs text-gray-400">Sem pacote ativo.</div>
        ) : (
          <div className="space-y-3">
            {ativos.map((p) => {
              const used = p.data?.used || 0, totalP = p.data?.total || 0;
              const pct = totalP ? Math.min(100, (used / totalP) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="text-xs font-medium" style={{ color: "#0E2244" }}>{p.data?.nome || "Pacote"}</div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden my-1"><div className="h-full" style={{ width: `${pct}%`, background: "#009AAC" }} /></div>
                  <div className="text-[11px] text-gray-500">{used} de {totalP} consumidas{p.data?.validade ? ` · validade ${p.data.validade}` : ""}</div>
                </div>
              );
            })}
          </div>
        )}
      </Box>

      <Box title="Crédito do pet" icon={<LuCircleDollarSign size={13} />}>
        <div className="text-xs" style={{ color: "#64748b" }}>
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1.5" style={{ background: "#fef3c7", color: "#92400e" }}>Em construção</span>
          <div>Saldo a favor <b>deste pet</b> — transferível para outro pet do mesmo tutor. Vira receita só na baixa da venda (chega com o módulo Caixa). Faturamento e fechamentos ficam no módulo Caixa.</div>
        </div>
      </Box>
    </div>
  );
}
