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
//
// O PAINEL É O MESMO DO BALCÃO (Cintia, no mesmo dia: "nessa tela não consigo colocar
// parcelamento e nem o aut para a conciliação"). A primeira versão tinha só forma e valor — e um
// cartão sem modalidade, parcelas e AUT não casa com o extrato da operadora, que é justamente o
// motivo de preencher. Agora é o PagamentoFormas, com a mesma exigência de cartão do balcão.

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import PagamentoFormas from "@/components/financeiro/PagamentoFormas";
import { carregarFormasRecebimento, validarPagamentosCartao, type PagForma, type FormaCfg, type TaxaRow } from "@/lib/formasPagamento";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC", VERDE = "#0F6E56", AMBAR = "#946200";
const brl = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (s: string) => new Date(s).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
const primeiroDoMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const entregue = (r: any) => Number(r?.valorTotal || 0) + Number(r?.troco || 0);

export default function RecebimentosSemFormaPage() {
  usePageTitle("Recebimentos sem forma", "Preencher como o cliente pagou");
  const [de, setDe] = useState(primeiroDoMes());
  const [ate, setAte] = useState(hojeISO());
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formasList, setFormasList] = useState<string[]>([]);
  const [formasConfig, setFormasConfig] = useState<FormaCfg[]>([]);
  const [taxas, setTaxas] = useState<TaxaRow[]>([]);
  const [aberto, setAberto] = useState<any>(null);          // o recebimento sendo preenchido
  const [formas, setFormas] = useState<PagForma[]>([]);
  const [salvando, setSalvando] = useState(false);

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

  // As formas, a configuração de cada uma e as taxas: o MESMO carregador do ponto de venda e do caixa.
  useEffect(() => {
    carregarFormasRecebimento()
      .then(({ formasList: fl, formasConfig: fc, taxas: tx }) => { setFormasList(fl); setFormasConfig(fc); setTaxas(tx); })
      .catch(() => undefined);
  }, []);

  const abrir = (r: any) => {
    setAberto(r);
    setFormas([{ forma: formasList[0] || "Dinheiro", valor: Number(entregue(r).toFixed(2)) }]);
  };

  const soma = formas.reduce((s, f) => s + Number(f.valor || 0), 0);
  const fecha = aberto ? Math.abs(soma - entregue(aberto)) <= 0.011 : false;

  const salvar = async () => {
    if (!aberto) return;
    const validas = formas.filter((f) => Number(f.valor) > 0);
    if (!validas.length) { toast.error("Informe como o cliente pagou."); return; }
    if (!fecha) { toast.error(`A soma (${brl(soma)}) precisa ser igual ao que o cliente entregou (${brl(entregue(aberto))}).`); return; }
    // A mesma exigência do balcão: cartão com operadora e, na maquininha, a AUT do comprovante.
    const faltaCartao = validarPagamentosCartao(validas, formasConfig);
    if (faltaCartao) { toast.error(faltaCartao); return; }
    setSalvando(true);
    try {
      const res = await fetch(`/api/caixa/recebimento/${aberto.id}/forma`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ formas: validas }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.message || "Não consegui salvar.");
      toast.success(`Forma registrada: ${validas.map((f) => f.forma).join(" + ")}`);
      const id = aberto.id;
      setDados((dd: any) => dd ? {
        ...dd,
        total: dd.total - 1,
        valor: dd.valor - Number(aberto.valorTotal || 0),
        recebimentos: dd.recebimentos.filter((x: any) => x.id !== id),
      } : dd);
      setAberto(null);
    } catch (e: any) { toast.error(e?.message || "Não consegui salvar."); }
    finally { setSalvando(false); }
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
        defeito já corrigido. Preencha como o cliente pagou — no cartão, com modalidade, bandeira, parcelas e AUT,
        como no balcão. <b>Só a forma é gravada</b>: valor, desconto, troco, data, caixa e venda não mudam.
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : !lista.length ? (
        <div className="py-20 text-center">
          <div className="text-[15px] font-semibold" style={{ color: VERDE }}>Nenhum recebimento sem forma neste período. 🎉</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#F7F4EC" }}>
                {["Data", "Caixa", "Cliente · pet", "Recebido por", "Entregue", ""].map((h, i) => (
                  <th key={h || i} className="text-[11px] font-semibold px-3 py-2" style={{ color: MUT, textAlign: i === 4 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((r: any) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
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
                  <td className="px-3 py-2" style={{ textAlign: "right" }}>
                    <button onClick={() => abrir(r)} className="text-[12px] font-semibold px-3 py-1.5 rounded-md text-white" style={{ background: TEAL, whiteSpace: "nowrap" }}>
                      💳 Preencher
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* O PAINEL DE PAGAMENTO — o mesmo componente do ponto de venda e do caixa. */}
      {aberto && (
        <div {...fundoDeModal(() => setAberto(null))} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%", height: "100vh", overflowY: "auto", background: "#FBF9F4", borderLeft: `1px solid ${LINE}` }}>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: NAVY, fontSize: 15, fontWeight: 600 }}>💳 Como o cliente pagou</span>
              <button onClick={() => setAberto(null)} style={{ border: "none", background: "none", color: MUT, cursor: "pointer", fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 11, padding: "11px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>{aberto.venda?.cliente || "Cliente"}{aberto.venda?.pet ? ` · ${aberto.venda.pet}` : ""}</div>
                <div style={{ fontSize: 11.5, color: MUT }}>
                  {dia(aberto.data)} · caixa nº {aberto.caixa?.numero ?? "—"}{aberto.venda?.numero != null ? ` · venda #${aberto.venda.numero}` : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: MUT }}>Entregue pelo cliente</span>
                  <b style={{ fontSize: 17, color: NAVY }}>{brl(entregue(aberto))}</b>
                </div>
              </div>

              <PagamentoFormas formas={formas} onChange={setFormas} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                <span style={{ color: MUT }}>Soma das formas</span>
                <b style={{ color: fecha ? VERDE : "#b23b39" }}>{brl(soma)}{fecha ? " ✓" : ` — precisa ser ${brl(entregue(aberto))}`}</b>
              </div>

              <button onClick={salvar} disabled={salvando || !fecha} style={{ width: "100%", marginTop: 14, background: TEAL, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, padding: 12, borderRadius: 9, cursor: salvando || !fecha ? "not-allowed" : "pointer", opacity: salvando || !fecha ? 0.5 : 1 }}>
                {salvando ? "Salvando…" : "✓ Salvar forma de pagamento"}
              </button>
              <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Só a forma é gravada. Valor, data, caixa e venda não mudam.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
