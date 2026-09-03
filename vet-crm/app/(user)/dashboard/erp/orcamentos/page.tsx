"use client";
// Vendas › Orçamentos — acompanhamento do que foi orçado e ainda não virou venda.
// Antes o orçamento só existia dentro da ficha do pet e numa lista curta do PDV: orçamento feito e
// não respondido não aparecia pra ninguém cobrar. Aqui ele tem situação (em aberto / aprovado /
// vencido / virou venda), busca e o MESMO follow-up do resto do sistema (lib/followup).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { assignFollowUpFor, loadFuRespFor, FuResp } from "@/lib/followup";

const TEAL = "#009AAC";
const NAVY = "#014D5E";
const LINE = "#E8DFC8";
const MUT = "#5C6B70";
const INK = "#374151";

const brl = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (d: any) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

type Situacao = "ABERTO" | "APROVADO" | "VENCIDO" | "VENDA";
const SIT: Record<Situacao, { lbl: string; bg: string; fg: string }> = {
  ABERTO: { lbl: "Em aberto", bg: "#FEF3C7", fg: "#92400E" },
  APROVADO: { lbl: "Aprovado", bg: "#E7F6EF", fg: "#0F6E56" },
  VENCIDO: { lbl: "Vencido", bg: "#FBE6E6", fg: "#A32D2D" },
  VENDA: { lbl: "Virou venda", bg: "#E0F4F6", fg: "#00707E" },
};

/** Situação real do orçamento: convertido > vencido (validade passou) > aprovado > em aberto. */
function situacaoDe(o: any): Situacao {
  if (o.appointmentId) return "VENDA";
  const venc = o.validade ? new Date(o.validade) : null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (venc && venc < hoje) return "VENCIDO";
  if (o.status === "APROVADO") return "APROVADO";
  return "ABERTO";
}

/** "vence em 3 dias" / "venceu há 5 dias" — o que a recepção precisa pra priorizar a cobrança. */
function prazoDe(o: any): string {
  if (!o.validade) return "sem validade";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(o.validade); venc.setHours(0, 0, 0, 0);
  const dias = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
  if (dias === 0) return "vence hoje";
  return dias > 0 ? `vence em ${dias} dia${dias > 1 ? "s" : ""}` : `venceu há ${-dias} dia${-dias > 1 ? "s" : ""}`;
}

export default function OrcamentosPage() {
  usePageTitle("Orçamentos", "Acompanhe o que foi orçado e ainda não virou venda");

  const [orcs, setOrcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"TODOS" | Situacao>("ABERTO");
  const [busca, setBusca] = useState("");
  const [convertendo, setConvertendo] = useState<string | null>(null);
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

  async function converter(o: any) {
    if (!confirm(`Converter o orçamento de ${o.tutor?.name || "cliente"} (${brl(o.valorTotal)}) em venda?\n\nEla vai para "não paga" para receber no caixa.`)) return;
    setConvertendo(o.id);
    try {
      const r = await fetch(`/api/orcamentos/${o.id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Não consegui converter."); }
      toast.success("Orçamento virou venda ✅");
      await load();
    } catch (e: any) { toast.error(e?.message || "Não consegui converter."); }
    setConvertendo(null);
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
    <div className="p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: INK }}>
          {lista.length} orçamento(s) · {brl(emAberto)} ainda não viraram venda
        </div>
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente ou pet…"
          className="text-[13px] bg-white border rounded-lg px-3 py-1.5 w-64"
          style={{ borderColor: LINE, color: INK }}
        />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {([["TODOS", "Todos"], ["ABERTO", "Em aberto"], ["APROVADO", "Aprovados"], ["VENCIDO", "Vencidos"], ["VENDA", "Viraram venda"]] as const).map(([k, l]) => (
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
          <div className="text-[12px] mt-1" style={{ color: INK }}>Orçamentos são criados na ficha do pet e no ponto de venda.</div>
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
                        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>{s.lbl}</span>
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
                          {o._sit !== "VENDA" && (
                            <button onClick={() => converter(o)} disabled={convertendo === o.id} className="text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg text-white" style={{ background: TEAL }}>
                              {convertendo === o.id ? "Convertendo…" : "Virar venda"}
                            </button>
                          )}
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
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setFuAberto(null)}>
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
