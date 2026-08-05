"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { LuPrinter, LuExternalLink, LuCheck, LuArrowRight } from "react-icons/lu";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: any) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return ""; } };
const ST: any = {
  RASCUNHO: { l: "Rascunho", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};
const TEAL = "#009AAC", NAVY = "#014D5E", GREY2 = "#6B7280", CARD_LINE = "#EDE7D6";
const inp: any = { border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "#fff", color: NAVY };
const cardCss: any = { background: "#fff", border: `1px solid ${CARD_LINE}`, borderRadius: 12 };

export default function OrcamentosBusca() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);

  const load = useCallback(async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status && status !== "TODOS") p.set("status", status);
      if (busca.trim()) p.set("busca", busca.trim());
      const r = await fetch(`/api/orcamentos?${p.toString()}`, { cache: "no-store" });
      const d = await r.json();
      setRows(Array.isArray(d) ? d : (d.data || d.orcamentos || []));
    } catch { setRows([]); } finally { jaCarregou.current = true; setLoading(false); }
  }, [status, busca]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function aprovar(id: string) { try { const r = await fetch(`/api/orcamentos/${id}/aprovar`, { method: "POST" }); if (!r.ok) throw 0; toast.success("Aprovado"); await load(); } catch { toast.error("Erro ao aprovar"); } }
  async function converter(id: string) { try { const r = await fetch(`/api/orcamentos/${id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!r.ok) throw 0; toast.success("Convertido em venda"); await load(); } catch { toast.error("Erro ao converter"); } }

  return (
    <div>
      {/* Filtros */}
      <div style={{ ...cardCss, padding: 16 }} className="mb-4">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Busca</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} placeholder="Tutor ou pet" style={inp} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inp, minWidth: 150 }}>
              <option value="TODOS">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="APROVADO">Aprovado</option>
              <option value="RECUSADO">Recusado</option>
              <option value="EXPIRADO">Expirado</option>
            </select>
          </label>
          <button onClick={load} className="font-medium text-white" style={{ background: TEAL, borderRadius: 9, padding: "9px 18px", fontSize: 13.5 }}>🔍 Buscar</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ ...cardCss, overflow: "hidden" }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 48, color: GREY2, fontSize: 14 }}><span className="animate-pulse">⏳ Carregando orçamentos…</span></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ padding: 56, color: GREY2 }}><span style={{ fontSize: 32 }}>📄</span><span style={{ fontSize: 14 }}>Nenhum orçamento encontrado.</span></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FBF9F4" }}>
                {["Data", "Pet", "Cliente", "Itens", "Valor", "Status", ""].map((h, i) => (
                  <th key={h + i} style={{ padding: "10px 12px", fontSize: 11, color: GREY2, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".4px", textAlign: i === 4 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const st = ST[o.status] || ST.RASCUNHO;
                const convertido = !!o.appointmentId;
                const nItens = Array.isArray(o.itens) ? o.itens.length : 0;
                return (
                  <tr key={o.id} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: NAVY, whiteSpace: "nowrap" }}>{dataBR(o.createdAt)}{o.validade ? <span style={{ color: GREY2, fontSize: 11 }}> · vale {dataBR(o.validade)}</span> : null}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: NAVY, fontWeight: 600 }}>{o.pet?.name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>{o.tutor?.name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12.5, color: GREY2 }}>{nItens} {nItens === 1 ? "item" : "itens"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#0F6E56", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{BRL(o.valorTotal)}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: convertido ? "#E6F1FB" : st.b, color: convertido ? "#185FA5" : st.c }}>{convertido ? "Vendido" : st.l}</span></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <button onClick={() => imprimirOrcamento(o)} className="flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={11} /> Imprimir</button>
                        {o.pet?.id && <Link href={`/dashboard/erp/pets/${o.pet.id}`} className="flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: CARD_LINE, color: GREY2 }}><LuExternalLink size={11} /> Ficha</Link>}
                        {!convertido && o.status === "RASCUNHO" && <button onClick={() => aprovar(o.id)} className="flex items-center gap-1 px-2 py-1 rounded border text-[11px]" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}><LuCheck size={11} /> Aprovar</button>}
                        {!convertido && <button onClick={() => converter(o.id)} className="flex items-center gap-1 px-2 py-1 rounded text-white text-[11px]" style={{ background: TEAL }}><LuArrowRight size={11} /> Transformar em venda</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
