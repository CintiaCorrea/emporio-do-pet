"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { LuPrinter, LuExternalLink, LuCheck, LuArrowRight, LuTrash2, LuSend } from "react-icons/lu";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { textoDoOrcamento } from "@/lib/textoDoOrcamento";

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
// O BOTAO-ICONE da lista de orcamentos. Quadrado, mesma altura para todos, para a coluna de
// acoes ficar alinhada de linha em linha em vez de cada uma com uma largura.
const icone = (cor: string): any => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 8, border: `1px solid ${CARD_LINE}`,
  background: "#fff", color: cor, cursor: "pointer", flex: "0 0 auto",
});

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
  /**
   * EXCLUIR o orcamento. Pergunta antes, e diz de quem e: numa lista de dez linhas parecidas,
   * "tem certeza?" sem nome e um convite a apagar a errada.
   */
  async function excluir(o: any) {
    const quem = [o.pet?.name, o.tutor?.name].filter(Boolean).join(" · ") || "este orçamento";
    if (!confirm(`Excluir o orçamento de ${quem} (${BRL(o.valorTotal)})? Não dá para desfazer.`)) return;
    try {
      const r = await fetch(`/api/orcamentos/${o.id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json().catch(() => ({} as any)); throw new Error(e?.message || "Erro ao excluir"); }
      toast.success("Orçamento excluído");
      await load();
    } catch (e: any) { toast.error(e?.message || "Erro ao excluir o orçamento"); }
  }

  /**
   * ENVIAR pelo WhatsApp. O texto vem do nucleo (lib/textoDoOrcamento), o mesmo que a ficha do
   * pet usa — dois textos parecidos seriam dois orcamentos diferentes saindo da mesma clinica.
   */
  const [enviando, setEnviando] = useState<string | null>(null);
  async function enviarWhats(o: any) {
    const tutorId = o.tutor?.id || o.tutorId;
    if (!tutorId) { toast.error("Orçamento sem cliente — não dá para enviar."); return; }
    setEnviando(o.id);
    try {
      const r = await fetch(`/api/whatsapp/enviar-documentos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId, petNome: o.pet?.name || "",
          texto: textoDoOrcamento({
            petNome: o.pet?.name, tutorNome: o.tutor?.name, data: o.createdAt,
            itens: o.itens || o.items || [], total: o.valorTotal, observacao: o.observacao,
          }),
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("Orçamento enviado no WhatsApp");
    } catch { toast.error("Não consegui enviar. Confira o número do tutor."); }
    finally { setEnviando(null); }
  }

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
                      {/* SO OS ICONES (Cintia, 08/09/2026: "pode deixar somente os ícones, não
                          precisa estar escrito"). Cada um leva `title`: sem o texto, o nome da
                          acao passa a viver ali — e um botao que apaga precisa se anunciar. */}
                      <div className="flex flex-wrap gap-1 justify-end">
                        <button onClick={() => imprimirOrcamento(o)} title="Imprimir o orçamento" aria-label="Imprimir o orçamento" style={icone("#0C447C")}><LuPrinter size={14} /></button>
                        <button onClick={() => enviarWhats(o)} disabled={enviando === o.id} title="Enviar o orçamento pelo WhatsApp do cliente" aria-label="Enviar pelo WhatsApp" style={{ ...icone("#0F6E56"), opacity: enviando === o.id ? .45 : 1 }}><LuSend size={14} /></button>
                        {o.pet?.id && <Link href={`/dashboard/erp/pets/${o.pet.id}`} title="Abrir a ficha do pet" aria-label="Abrir a ficha do pet" style={icone(GREY2)}><LuExternalLink size={14} /></Link>}
                        {!convertido && o.status === "RASCUNHO" && <button onClick={() => aprovar(o.id)} title="Aprovar o orçamento" aria-label="Aprovar o orçamento" style={icone("#0F6E56")}><LuCheck size={14} /></button>}
                        {!convertido && <button onClick={() => converter(o.id)} title="Transformar em venda" aria-label="Transformar em venda" style={{ ...icone("#fff"), background: TEAL, borderColor: TEAL }}><LuArrowRight size={14} /></button>}
                        <button onClick={() => excluir(o)} title="Excluir o orçamento" aria-label="Excluir o orçamento" style={icone("#A32D2D")}><LuTrash2 size={14} /></button>
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
