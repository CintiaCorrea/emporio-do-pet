"use client";
// ── RECEBIMENTOS SEM FORMA DE PAGAMENTO ───────────────────────────────────────────────────
//
// Cintia, 16/09/2026: "tem alguns recebimentos que estão entrando como Outros. O que seria esse
// outros, não são recebimentos no Nubank? Por que não aparece como nubank?"
//
// Não era o Nubank: um defeito da validação do servidor apagava a forma, e 34 dos 59 recebimentos
// de setembro foram gravados sem ela. O defeito foi corrigido; o que já estava gravado só quem
// recebeu sabe como foi pago. Esta tela é para isso: PREENCHER a forma que faltou.
//
// Valor, desconto, troco, data, caixa e venda não mudam. Recebimento que já tem forma não aparece
// aqui. "Crédito do cliente" debita o saldo, como no recebimento normal.

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import CampoValor from "@/components/comum/CampoValor";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC", VERDE = "#0F6E56", AMBAR = "#946200";
const brl = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (s: string) => new Date(s).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
const primeiroDoMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

type Linha = { forma: string; valor: number };

export default function RecebimentosSemFormaPage() {
  usePageTitle("Recebimentos sem forma", "Preencher como o cliente pagou");
  const [de, setDe] = useState(primeiroDoMes());
  const [ate, setAte] = useState(hojeISO());
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formas, setFormas] = useState<string[]>([]);
  const [edicao, setEdicao] = useState<Record<string, Linha[]>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/caixa/recebimentos-sem-forma?de=${de}&ate=${ate}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || "Não consegui carregar a lista.");
      setDados(d);
    } catch (e: any) {
      toast.error(e?.message || "Não consegui carregar a lista.");
      setDados({ total: 0, valor: 0, recebimentos: [] });
    } finally { setLoading(false); }
  }, [de, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  // As formas da casa (Vendas › Formas de recebimento), só as ativas — as mesmas do balcão.
  useEffect(() => {
    fetch("/api/listas?lista=formasrecebimento", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d?.itens || d?.data || []);
        const nomes = arr
          .map((i: any) => { try { return JSON.parse(i.valor); } catch { return null; } })
          .filter((o: any) => o && o.nome && o.ativo !== false)
          .map((o: any) => String(o.nome));
        setFormas([...new Set<string>(nomes)]);
      })
      .catch(() => setFormas([]));
  }, []);

  const entregue = (r: any) => Number(r.valorTotal || 0) + Number(r.troco || 0);
  const linhasDe = (r: any): Linha[] => edicao[r.id] || [{ forma: "", valor: entregue(r) }];
  const mudar = (r: any, idx: number, parte: Partial<Linha>) =>
    setEdicao((e) => ({ ...e, [r.id]: linhasDe(r).map((l, i) => (i === idx ? { ...l, ...parte } : l)) }));
  const dividir = (r: any) => {
    const ls = linhasDe(r);
    const soma = ls.reduce((s, l) => s + Number(l.valor || 0), 0);
    setEdicao((e) => ({ ...e, [r.id]: [...ls, { forma: "", valor: Math.max(0, Number((entregue(r) - soma).toFixed(2))) }] }));
  };
  const tirar = (r: any, idx: number) => setEdicao((e) => ({ ...e, [r.id]: linhasDe(r).filter((_, i) => i !== idx) }));

  const salvar = async (r: any) => {
    const ls = linhasDe(r);
    setSalvando(r.id);
    try {
      const res = await fetch(`/api/caixa/recebimento/${r.id}/forma`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ formas: ls }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.message || "Não consegui salvar.");
      toast.success(`Forma registrada: ${ls.map((l) => l.forma).join(" + ")}`);
      // Sai da lista na hora — ela só mostra o que ainda falta.
      setDados((dd: any) => dd ? {
        ...dd,
        total: dd.total - 1,
        valor: dd.valor - Number(r.valorTotal || 0),
        recebimentos: dd.recebimentos.filter((x: any) => x.id !== r.id),
      } : dd);
    } catch (e: any) { toast.error(e?.message || "Não consegui salvar."); }
    finally { setSalvando(null); }
  };

  const lista = useMemo(() => dados?.recebimentos || [], [dados]);

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <label className="text-[11.5px]" style={{ color: MUT }}>De</label>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="text-[12px] px-2 py-1 rounded-md border" style={{ borderColor: LINE }} />
        <label className="text-[11.5px]" style={{ color: MUT }}>até</label>
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="text-[12px] px-2 py-1 rounded-md border" style={{ borderColor: LINE }} />
        <div className="ml-auto text-[13px]" style={{ color: MUT }}>
          <b style={{ color: lista.length ? AMBAR : VERDE }}>{dados?.total ?? 0}</b> recebimento(s) sem forma · <b style={{ color: NAVY }}>{brl(dados?.valor)}</b>
        </div>
      </div>

      <div className="text-[11.5px] mb-3 rounded-lg border px-3 py-2" style={{ color: MUT, borderColor: LINE }}>
        Estes recebimentos aparecem como <b>“Outros”</b> no resumo do caixa: a forma de pagamento foi perdida por um
        defeito já corrigido. Preencha como o cliente pagou. <b>Só a forma é gravada</b> — valor, desconto, troco, data,
        caixa e venda não mudam. “Crédito do cliente” debita o saldo dele.
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : !lista.length ? (
        <div className="py-20 text-center">
          <div className="text-[15px] font-semibold" style={{ color: VERDE }}>Nenhum recebimento sem forma neste período. 🎉</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ background: "#F7F4EC" }}>
                {["Data", "Caixa", "Cliente · pet", "Recebido por", "Entregue", "Como pagou", ""].map((h, i) => (
                  <th key={h || i} className="text-[11px] font-semibold px-3 py-2" style={{ color: MUT, textAlign: i === 4 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((r: any) => {
                const ls = linhasDe(r);
                const soma = ls.reduce((s, l) => s + Number(l.valor || 0), 0);
                const fecha = Math.abs(soma - entregue(r)) <= 0.011;
                const completo = fecha && ls.every((l) => l.forma && Number(l.valor) > 0);
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${LINE}`, verticalAlign: "top" }}>
                    <td className="px-3 py-2 text-[12.5px]" style={{ color: NAVY, whiteSpace: "nowrap" }}>{dia(r.data)}</td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: MUT, whiteSpace: "nowrap" }}>
                      {r.caixa ? <>nº {r.caixa.numero}<div className="text-[10.5px]">{r.caixa.dona}</div></> : "—"}
                    </td>
                    <td className="px-3 py-2 text-[12.5px]" style={{ color: NAVY }}>
                      {r.venda?.cliente || "—"}{r.venda?.pet ? <span style={{ color: MUT }}> · {r.venda.pet}</span> : null}
                      {r.venda?.id ? (
                        <div><a href={`/dashboard/erp/consulta-vendas?venda=${r.venda.id}`} target="_blank" rel="noopener" className="text-[10.5px]" style={{ color: TEAL }}>
                          {r.venda.numero != null ? `venda #${r.venda.numero}` : "abrir venda"} ↗
                        </a></div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: MUT }}>{r.recebidoPor || "—"}</td>
                    <td className="px-3 py-2 text-[12.5px] tabular-nums font-semibold" style={{ color: NAVY, textAlign: "right", whiteSpace: "nowrap" }}>
                      {brl(entregue(r))}
                      {Number(r.troco) > 0.009 ? <div className="text-[10.5px] font-normal" style={{ color: MUT }}>troco {brl(r.troco)}</div> : null}
                      {Number(r.desconto) > 0.009 ? <div className="text-[10.5px] font-normal" style={{ color: MUT }}>desc. {brl(r.desconto)}</div> : null}
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 290 }}>
                      {ls.map((l, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 mb-1">
                          <select value={l.forma} onChange={(e) => mudar(r, idx, { forma: e.target.value })} className="text-[12.5px] border rounded-md px-2 py-1 flex-1 bg-white" style={{ borderColor: l.forma ? LINE : "#E4A5A5" }}>
                            <option value="">— forma —</option>
                            {formas.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <CampoValor valor={l.valor} onValor={(v) => mudar(r, idx, { valor: v })} style={{ width: 92, fontSize: 12.5, border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 6px", textAlign: "right" }} />
                          {ls.length > 1 && <button onClick={() => tirar(r, idx)} className="text-[12px]" style={{ color: "#b23b39" }} title="Tirar esta linha">✕</button>}
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <button onClick={() => dividir(r)} className="text-[11px]" style={{ color: TEAL }}>+ dividir em outra forma</button>
                        {!fecha && <span className="text-[10.5px]" style={{ color: "#b23b39" }}>soma {brl(soma)} ≠ {brl(entregue(r))}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2" style={{ textAlign: "right" }}>
                      <button onClick={() => salvar(r)} disabled={!completo || salvando === r.id} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-md text-white disabled:opacity-40" style={{ background: TEAL, whiteSpace: "nowrap" }}>
                        {salvando === r.id ? "…" : "Salvar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
