"use client";
// ── ITENS VENDIDOS SEM VÍNCULO COM O CATÁLOGO ─────────────────────────────────────────────
//
// Cintia, 15/09/2026: "organize tudo de uma forma que eu possa arrumar sem perder tudo, e sem
// bagunçar o caixa, as vendas, orçamentos e os recebimentos".
//
// Esta tela escreve UMA COISA em cada linha: de que item do catálogo ela é. Valor, quantidade,
// desconto, data, recebimento e caixa não são tocados — nem lidos para recalcular. Por isso dá
// para arrumar o mês em andamento sem que nenhuma conferência de caixa passe a divergir.
//
// A lista é por NOME, e não linha a linha, porque é assim que o trabalho acontece: "Diária de
// internação" aparece 33 vezes; ela decide uma vez e as 33 são ligadas. Linha a linha seriam
// 260 decisões idênticas, e ninguém termina isso.

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import BuscaItemCatalogo from "@/components/vendas/BuscaItemCatalogo";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC", VERDE = "#0F6E56", AMBAR = "#946200";
const brl = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const primeiroDoMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function ItensSemVinculoPage() {
  usePageTitle("Itens sem vínculo", "Ligar o que foi vendido ao item do catálogo");
  const [de, setDe] = useState(primeiroDoMes());
  const [ate, setAte] = useState(hojeISO());
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState<Record<string, string>>({});
  const [escolha, setEscolha] = useState<Record<string, { id: string; nome: string }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/caixa/itens-sem-vinculo?de=${de}&ate=${ate}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Não consegui carregar a lista.");
      const d = await r.json();
      setDados(d);
      // A sugestão automática só existe quando o nome é IDÊNTICO a UM item do catálogo. Ela
      // entra pré-escolhida, mas não pré-CONFIRMADA: quem aperta o botão é a pessoa.
      const pre: Record<string, { id: string; nome: string }> = {};
      for (const it of d?.itens || []) if (it.sugestao) pre[it.chave] = it.sugestao;
      setEscolha(pre);
    } catch (e: any) {
      toast.error(e?.message || "Não consegui carregar a lista.");
      setDados({ itens: [], catalogo: [] });
    } finally { setLoading(false); }
  }, [de, ate]);

  useEffect(() => { carregar(); }, [carregar]);

  const catalogo = useMemo(() => (dados?.catalogo || []), [dados]);
  const comSugestao = useMemo(() => (dados?.itens || []).filter((i: any) => i.sugestao), [dados]);

  const ligar = async (item: any) => {
    const alvo = escolha[item.chave];
    if (!alvo) { toast.error("Escolha o item do catálogo."); return; }
    setSalvando(item.chave);
    try {
      const r = await fetch("/api/caixa/itens-sem-vinculo/ligar", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ nome: item.nome, catalogoItemId: alvo.id, de, ate }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Não consegui ligar.");
      toast.success(`${d.ligadas} linha(s) ligada(s) a ${d.item}`);
      carregar();
    } catch (e: any) { toast.error(e?.message || "Não consegui ligar."); }
    finally { setSalvando(null); }
  };

  const ligarSugeridos = async () => {
    if (!comSugestao.length) return;
    const aviso = `Ligar ${comSugestao.length} nome(s) cujo texto é IDÊNTICO a um item do catálogo?\n\nIsso não altera valor, data, venda, recebimento nem caixa — só registra de que item cada linha é.`;
    if (!confirm(aviso)) return;
    setSalvando("__lote__");
    let ok = 0;
    for (const it of comSugestao) {
      try {
        const r = await fetch("/api/caixa/itens-sem-vinculo/ligar", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ nome: it.nome, catalogoItemId: it.sugestao.id, de, ate }),
        });
        if (r.ok) ok++;
      } catch { /* segue: um nome que falha não pode parar os outros */ }
    }
    setSalvando(null);
    toast.success(`${ok} de ${comSugestao.length} nome(s) ligado(s)`);
    carregar();
  };

  const pct = dados?.percentualClassificado;

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <label className="text-[11.5px]" style={{ color: MUT }}>De</label>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="text-[12px] px-2 py-1 rounded-md border" style={{ borderColor: LINE }} />
        <label className="text-[11.5px]" style={{ color: MUT }}>até</label>
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="text-[12px] px-2 py-1 rounded-md border" style={{ borderColor: LINE }} />
        {comSugestao.length > 0 && (
          <button onClick={ligarSugeridos} disabled={!!salvando} className="ml-auto text-[12px] font-semibold px-3 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: VERDE }}>
            {salvando === "__lote__" ? "Ligando…" : `Ligar os ${comSugestao.length} de nome idêntico`}
          </button>
        )}
      </div>

      {/* O NÚMERO QUE MEDE A ARRUMAÇÃO. Cintia: "me oriente como fazer para ficar mensurável". */}
      <div className="flex gap-3 flex-wrap mb-4">
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: "#FBF9F4" }}>
          <div className="text-[10.5px] uppercase tracking-wide" style={{ color: MUT }}>Faturamento classificado</div>
          <div className="text-[19px] font-bold" style={{ color: pct != null && pct >= 95 ? VERDE : AMBAR }}>
            {pct != null ? `${String(pct).replace(".", ",")}%` : "—"}
          </div>
          <div className="text-[10.5px]" style={{ color: MUT }}>meta 95%</div>
        </div>
        <div className="rounded-lg border px-3 py-2" style={{ borderColor: LINE, background: "#FBF9F4" }}>
          <div className="text-[10.5px] uppercase tracking-wide" style={{ color: MUT }}>Sem vínculo no período</div>
          <div className="text-[19px] font-bold" style={{ color: NAVY }}>{brl(dados?.totalSemVinculo)}</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>{dados?.linhasSemVinculo ?? 0} linha(s), {dados?.itens?.length ?? 0} nome(s)</div>
        </div>
      </div>

      <div className="text-[11.5px] mb-3 rounded-lg border px-3 py-2" style={{ color: MUT, borderColor: LINE }}>
        Ligar registra <b>só</b> de que item do catálogo a linha é. Valor, quantidade, desconto, data,
        venda, recebimento e caixa não mudam — nenhuma conferência passa a divergir por causa disto.
        O nome que não existir no catálogo precisa ser cadastrado primeiro, em Catálogo.
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : !dados?.itens?.length ? (
        <div className="py-20 text-center">
          <div className="text-[15px] font-semibold" style={{ color: VERDE }}>Tudo ligado neste período. 🎉</div>
          <div className="text-[12px] mt-1" style={{ color: MUT }}>Todo item vendido diz de que item do catálogo ele é.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ background: "#F7F4EC" }}>
                {["Vendido como", "Linhas", "Valor", "Ligar ao item do catálogo", ""].map((h, i) => (
                  <th key={h || i} className="text-[11px] font-semibold px-3 py-2" style={{ color: MUT, textAlign: i === 1 || i === 2 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((it: any) => {
                const esc = escolha[it.chave];
                return (
                  <tr key={it.chave} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td className="px-3 py-2">
                      <div className="text-[13px] font-medium" style={{ color: NAVY }}>{it.nome}</div>
                      <div className="text-[10.5px]" style={{ color: MUT }}>{(it.origens || []).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2 text-[12.5px] tabular-nums" style={{ color: MUT, textAlign: "right" }}>{it.linhas}</td>
                    <td className="px-3 py-2 text-[12.5px] tabular-nums font-semibold" style={{ color: NAVY, textAlign: "right", whiteSpace: "nowrap" }}>{brl(it.valor)}</td>
                    <td className="px-3 py-2" style={{ minWidth: 260 }}>
                      {esc ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12.5px]" style={{ color: VERDE }}>✓ {esc.nome}</span>
                          <button onClick={() => setEscolha((e) => { const n = { ...e }; delete n[it.chave]; return n; })} className="text-[11px]" style={{ color: "#b23b39" }}>trocar</button>
                          {it.sugestao && <span title="O nome vendido é idêntico a este item do catálogo" className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: AMBAR, background: "#FEF3D7" }}>nome idêntico</span>}
                        </div>
                      ) : (
                        <BuscaItemCatalogo
                          value={busca[it.chave] || ""}
                          itens={catalogo as any}
                          placeholder="🔍 Buscar no catálogo…"
                          className="w-full border rounded-md px-2 py-1 text-[12.5px]"
                          inpStyle={{ borderColor: LINE }}
                          onType={(v) => setBusca((b) => ({ ...b, [it.chave]: v }))}
                          onPick={(c: any) => { setEscolha((e) => ({ ...e, [it.chave]: { id: c.id, nome: c.nome } })); setBusca((b) => ({ ...b, [it.chave]: "" })); }}
                          rotuloDe={(c: any) => c.grupo || null}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ textAlign: "right" }}>
                      <button onClick={() => ligar(it)} disabled={!esc || !!salvando} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md text-white disabled:opacity-40" style={{ background: TEAL }}>
                        {salvando === it.chave ? "…" : "Ligar"}
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
