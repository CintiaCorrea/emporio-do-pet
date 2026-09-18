"use client";
// A LISTA DE ORÇAMENTOS — uma só, dentro da Consulta de vendas (Cintia, 17/09/2026: "não tem
// como deixarmos tudo dentro de consulta de vendas, ao invés de ter várias abas sobre o mesmo
// assunto?"). Havia duas listas do mesmo assunto: esta tela e a busca de orçamentos da Consulta.
// Ficou esta, que é a completa (situação, prazo, contador do mês e follow-up), agora com os
// MESMOS botões da linha da venda: imprimir, enviar, editar e excluir.
//
// Acompanhamento do que foi orçado e ainda não virou venda.
// Antes o orçamento só existia dentro da ficha do pet e numa lista curta do PDV: orçamento feito e
// não respondido não aparecia pra ninguém cobrar. Aqui ele tem situação (em aberto / aprovado /
// vencido / virou venda), busca e o MESMO follow-up do resto do sistema (lib/followup).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { assignFollowUpFor, loadFuRespFor, FuResp } from "@/lib/followup";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";
import { situacaoDoOrcamento, prazoDoOrcamento, SITUACOES, ChaveSituacao } from "@/lib/situacaoDoOrcamento";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { enviarVendaNoWhats } from "@/lib/documentos/venda-pdf";

const TEAL = "#009AAC";
const NAVY = "#014D5E";
const LINE = "#E8DFC8";
const MUT = "#5C6B70";
const INK = "#374151";

// O mesmo botãozinho da linha da venda, para as duas listas ficarem iguais.
const acaoDaLinha: React.CSSProperties = {
  border: `1px solid ${LINE}`, background: "#fff", borderRadius: 7, padding: "3px 7px",
  fontSize: 13, cursor: "pointer", marginLeft: 4, lineHeight: 1.2,
};

const brl = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (d: any) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

// A SITUACAO E O PRAZO MORAM EM lib/situacaoDoOrcamento — os mesmos da aba dentro da Consulta
// de vendas. Ate 09/09/2026 cada tela tinha o seu, com nomes diferentes para a mesma coisa.
type Situacao = ChaveSituacao;
const SIT = SITUACOES;
const situacaoDe = (o: any): Situacao => situacaoDoOrcamento(o);
const prazoDe = (o: any): string => prazoDoOrcamento(o?.validade);

export default function ListaDeOrcamentos() {

  const [orcs, setOrcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"TODOS" | Situacao>("ABERTO");
  const [busca, setBusca] = useState("");
  // QUANTOS VIRARAM VENDA, POR MÊS. O orçamento transformado some (Cintia, 16/09/2026); fica o
  // contador (backend orcamentos/contador-de-orcamentos.regras).
  const [contador, setContador] = useState<{ mes: string; quantidade: number }[]>([]);
  const [profs, setProfs] = useState<{ id: string; name: string }[]>([]);
  const [fuAberto, setFuAberto] = useState<any | null>(null);
  const [fuAtual, setFuAtual] = useState<FuResp>(null);
  const [fuSalvando, setFuSalvando] = useState(false);
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const r = await fetch("/api/orcamentos", { cache: "no-store" });
      const d = await r.json();
      setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || []));
    } catch { toast.error("Não consegui carregar os orçamentos."); }
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { fetch("/api/orcamentos/contador", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then((d) => setContador(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/users", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.users || d.data || []);
        setProfs(arr.map((u: any) => ({ id: u.id, name: u.name || u.nome || u.email })));
      } catch { /* segue sem a lista */ }
    })();
  }, []);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return orcs
      .map((o) => ({ ...o, _sit: situacaoDe(o) }))
      .filter((o) => (filtro === "TODOS" ? true : o._sit === filtro))
      .filter((o) => !q || `${o.tutor?.name || ""} ${o.pet?.name || ""}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orcs, filtro, busca]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { TODOS: orcs.length, ABERTO: 0, APROVADO: 0, VENCIDO: 0, VENDA: 0 };
    for (const o of orcs) c[situacaoDe(o)]++;
    return c;
  }, [orcs]);

  const emAberto = useMemo(
    () => orcs.filter((o) => !o.appointmentId).reduce((s, o) => s + Number(o.valorTotal || 0), 0),
    [orcs],
  );


  // EXCLUIR DIRETO DA LISTA (Cintia, 17/09/2026: "Ainda não consigo deletar orçamento"). Só existia
  // dentro do carrinho da ficha, e quem está nesta tela não achava. Mesmo caminho do carrinho.
  async function excluirOrcamento(o: any) {
    if (!confirm(`Excluir o orçamento de ${o.tutor?.name || "cliente"}${o.pet?.name ? ` (${o.pet.name})` : ""}, ${brl(o.valorTotal)}?`)) return;
    try {
      const r = await fetch(`/api/orcamentos/${o.id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Não consegui excluir."); }
      setOrcs((l) => l.filter((x) => x.id !== o.id));
      toast.success("Orçamento excluído");
    } catch (e: any) { toast.error(e?.message || "Não consegui excluir."); }
  }

  // 💰 VIRAR VENDA DIRETO DA LISTA (Cintia, 18/09/2026: "transformar venda em orçamento e vice
  // versa tem que ser simples para quem está no atendimento e hoje não está sendo"). Antes só dava
  // no carrinho da ficha do pet: da lista era clicar ✏️, cair na ficha, achar a aba do orçamento e
  // só então transformar — três telas. É a mesma porta do servidor que o carrinho usa.
  const [virando, setVirando] = useState<string | null>(null);
  async function virarVenda(o: any) {
    const quem = `${o.tutor?.name || "cliente"}${o.pet?.name ? ` (${o.pet.name})` : ""}`;
    if (!confirm(`Virar venda o orçamento de ${quem}, ${brl(o.valorTotal)}?

Vira uma venda concluída, com os mesmos itens. O orçamento sai da lista.`)) return;
    setVirando(o.id);
    try {
      const r = await fetch(`/api/orcamentos/${o.id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Não consegui virar venda.");
      setOrcs((l) => l.filter((x) => x.id !== o.id));
      toast.success(d?.numeroVenda ? `Virou a venda #${d.numeroVenda} ✅` : "Orçamento virou venda ✅");
    } catch (e: any) { toast.error(e?.message || "Não consegui virar venda."); }
    finally { setVirando(null); }
  }

  // 💬 O orçamento em PDF no WhatsApp — o mesmo timbrado e o mesmo caminho da venda.
  const [enviando, setEnviando] = useState<string | null>(null);
  async function enviarOrcamento(o: any) {
    const tutorId = o.tutor?.id || o.tutorId;
    if (!tutorId) { toast.error("Orçamento sem cliente — não dá para enviar."); return; }
    setEnviando(o.id);
    const r = await enviarVendaNoWhats(
      {
        clienteId: tutorId, cliente: o.tutor?.name || "Cliente", pet: o.pet?.name || null,
        date: o.createdAt, valor: Number(o.valorTotal || 0),
        itens: (o.itens || o.items || []).map((it: any) => ({
          descricao: it.descricao ?? it.nome ?? "Item",
          quantidade: Number(it.quantidade ?? 1) || 1,
          valorUnitario: Number(it.valorUnitario ?? 0),
          valorTotal: Number(it.valorTotal ?? (Number(it.quantidade ?? 1) || 1) * Number(it.valorUnitario ?? 0)),
        })),
      },
      { rotulo: "Orçamento" },
    );
    setEnviando(null);
    if (r.ok) toast.success("Orçamento enviado no WhatsApp"); else toast.error(r.erro || "Não consegui enviar.");
  }

  async function abrirFollowUp(o: any) {
    setFuAberto(o); setFuAtual(null);
    if (o.petId) setFuAtual(await loadFuRespFor("pet", o.petId));
  }

  async function definirResponsavel(userId: string, nome: string) {
    if (!fuAberto?.petId) return;
    setFuSalvando(true);
    try {
      // MESMO motor do resto do sistema: avisa por recado, deixa rastro na interação e roteia o
      // follow-up pro "Meu painel" da pessoa.
      await assignFollowUpFor({
        kind: "pet", id: fuAberto.petId, userId, nome,
        alvoNome: fuAberto.pet?.name, fuLabel: `orçamento de ${brl(fuAberto.valorTotal)}`,
      });
      toast.success(`Follow-up com ${nome}`);
      setFuAberto(null);
    } catch { toast.error("Não consegui encaminhar."); }
    setFuSalvando(false);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: INK }}>
          {lista.length} orçamento(s) · {brl(emAberto)} em aberto
          {contador.length > 0 && (
            <span className="ml-2 text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E7F6EF", color: "#0F6E56" }}>
              {contador[0].quantidade} viraram venda em {new Date(`${contador[0].mes}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          )}
        </div>
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente ou pet…"
          className="text-[13px] bg-white border rounded-lg px-3 py-1.5 w-64"
          style={{ borderColor: LINE, color: INK }}
        />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {([["TODOS", "Todos"], ["ABERTO", "Em aberto"], ["APROVADO", "Aprovados"], ["VENCIDO", "Vencidos"]] as const).map(([k, l]) => (
          <button
            key={k} onClick={() => setFiltro(k as any)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors"
            style={filtro === k
              ? { background: TEAL, borderColor: TEAL, color: "#fff" }
              : { background: "#fff", borderColor: LINE, color: MUT }}
          >
            {l} <span className="opacity-70">{contagem[k] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm" style={{ color: INK }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: LINE }}>
          <div className="text-3xl mb-2">📄</div>
          <div className="text-sm" style={{ color: MUT }}>Nenhum orçamento nesta situação.</div>
          <div className="text-[12px] mt-1" style={{ color: INK }}>Orçamentos são criados no carrinho da ficha do pet e no ponto de venda.</div>
        </div>
      ) : (
        <div className="bg-white border rounded-[14px] overflow-hidden" style={{ borderColor: LINE }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide" style={{ color: MUT, background: "#FBF9F4" }}>
                  <th className="text-left font-medium px-4 py-2.5">Cliente / pet</th>
                  <th className="text-left font-medium px-3 py-2.5">Situação</th>
                  <th className="text-left font-medium px-3 py-2.5">Criado</th>
                  <th className="text-left font-medium px-3 py-2.5">Validade</th>
                  <th className="text-right font-medium px-3 py-2.5">Valor</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const s = SIT[o._sit as Situacao];
                  return (
                    <tr key={o.id} className="border-t" style={{ borderColor: LINE }}>
                      <td className="px-4 py-2.5">
                        <div style={{ color: NAVY, fontWeight: 500 }}>{o.tutor?.name || "Cliente"}</div>
                        <div className="text-[11.5px]" style={{ color: MUT }}>{o.pet?.name || "—"}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>{s.rotulo}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums" style={{ color: INK }}>{dia(o.createdAt)}</td>
                      <td className="px-3 py-2.5" style={{ color: INK }}>
                        <div className="tabular-nums">{dia(o.validade)}</div>
                        <div className="text-[11px]" style={{ color: o._sit === "VENCIDO" ? "#A32D2D" : MUT }}>{prazoDe(o)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: NAVY, fontWeight: 500 }}>{brl(o.valorTotal)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          {o.petId && (
                            <Link href={`/dashboard/erp/pets/${o.petId}`} className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg" style={{ background: "#F3F4F6", color: MUT }}>Ficha</Link>
                          )}
                          {o.petId && o._sit !== "VENDA" && (
                            <button onClick={() => abrirFollowUp(o)} className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg" style={{ background: "#EDE9FE", color: "#6D28D9" }}>👤 Follow-up</button>
                          )}
                          {/* A CHAVINHA: aqui o orçamento vira venda, e na linha da venda a venda
                              vira orçamento. Mesmo desenho nos dois sentidos (18/09/2026). */}
                          {o._sit !== "VENDA" && (
                            <button
                              onClick={() => virarVenda(o)}
                              disabled={virando === o.id}
                              title="O orçamento vira uma venda concluída, com os mesmos itens"
                              style={{ border: `1px solid ${TEAL}`, background: "#fff", color: TEAL, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: virando === o.id ? 0.6 : 1 }}
                            >{virando === o.id ? "…" : "💰 Virar venda"}</button>
                          )}
                          {/* OS MESMOS BOTÕES DA LINHA DA VENDA, na mesma ordem (17/09/2026). Editar
                              abre no carrinho da ficha, que é onde se monta o orçamento. */}
                          <button onClick={() => imprimirOrcamento(o)} title="Imprimir o orçamento" aria-label="Imprimir o orçamento" style={acaoDaLinha}>🖨️</button>
                          <button onClick={() => enviarOrcamento(o)} disabled={enviando === o.id} title="Enviar o orçamento em PDF no WhatsApp do cliente" aria-label="Enviar o orçamento" style={acaoDaLinha}>{enviando === o.id ? "…" : "💬"}</button>
                          {o.petId && (
                            <Link href={`/dashboard/erp/pets/${o.petId}?carrinho=orcamento`} title="Editar o orçamento no carrinho da ficha" aria-label="Editar o orçamento" style={{ ...acaoDaLinha, display: "inline-block", textDecoration: "none" }}>✏️</Link>
                          )}
                          <button onClick={() => excluirOrcamento(o)} title="Excluir o orçamento" aria-label="Excluir o orçamento" style={{ ...acaoDaLinha, color: "#A32D2D" }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Follow-up: escolhe quem acompanha (mesmo padrão da ficha/inbox) */}
      {fuAberto && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(() => setFuAberto(null))}>
          <div className="rounded-2xl shadow-xl max-w-sm w-full" style={{ background: "#FBF9F4", border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: LINE }}>
              <div>
                <h3 className="text-base font-medium" style={{ color: NAVY }}>Quem acompanha?</h3>
                <div className="text-[11.5px]" style={{ color: MUT }}>
                  {fuAberto.pet?.name || "pet"} · {brl(fuAberto.valorTotal)}
                  {fuAtual ? ` · hoje é ${fuAtual.nome}` : ""}
                </div>
              </div>
              <button onClick={() => setFuAberto(null)} className="text-lg leading-none" style={{ color: MUT }}>✕</button>
            </div>
            <div className="p-3 max-h-[50vh] overflow-y-auto flex flex-col gap-1.5">
              {profs.length === 0 && <div className="text-[12.5px] px-2 py-3" style={{ color: MUT }}>Nenhum profissional cadastrado.</div>}
              {profs.map((p) => (
                <button
                  key={p.id} disabled={fuSalvando} onClick={() => definirResponsavel(p.id, p.name)}
                  className="text-left text-[13px] px-3 py-2 rounded-lg bg-white border hover:border-[#009AAC] transition-colors"
                  style={{ borderColor: LINE, color: NAVY }}
                >
                  {p.name}{fuAtual?.userId === p.id ? " ✓" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
