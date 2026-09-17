"use client";
/* ─────────────────────────────────────────────────────────────────────────────────────────
   RECEBER VÁRIAS VENDAS NUM PAGAMENTO SÓ — a peça, não a tela.

   Nasceu dentro de app/.../erp/comandas/page.tsx. Saiu de lá em 12/09/2026 porque a Cintia
   pediu que a Consulta de vendas passasse a ser a porta única ("quero que fique somente a
   opção de consulta de vendas") — e receber é justamente o que a Consulta não sabia fazer.

   Duas telas chamando o MESMO componente, e não duas cópias: recebimento é dinheiro, e dois
   caminhos parecidos significam corrigir um e esquecer o outro. Quem chama entrega o cliente
   e as comandas; a peça cuida de escolher o caixa, das formas de pagamento, da validação de
   cartão e da chamada ao servidor.

   O servidor valida TUDO antes de gravar (caixa.service.registrarRecebimentoLote) e distribui
   da comanda mais antiga para a mais nova. A conta em si mora em recebimento-lote.regras, com
   teste — aqui não se calcula dinheiro, só se mostra e se confere.
   ───────────────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { carregarMeuCaixa, carregarMeusCaixasAbertos, carregarCaixasAbertosDeTodos, caixaParaReceber, CaixaAberto } from "@/lib/caixaAtual";
import EscolhaDoCaixa from "@/components/caixa/EscolhaDoCaixa";
import EscolhaDeQualquerCaixa from "@/components/caixa/EscolhaDeQualquerCaixa";
import { dentroDaJanelaDeAjuste } from "@/lib/janelaDeAjuste";
import AbrirMeuCaixaModal from "@/components/caixa/AbrirMeuCaixaModal";
import PagamentoFormas from "@/components/financeiro/PagamentoFormas";
import { carregarFormasRecebimento, validarPagamentosCartao, type PagForma, type FormaCfg, type TaxaRow } from "@/lib/formasPagamento";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const FORMAS_PADRAO = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Crédito do cliente"];
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const ORIGEM_LBL: Record<string, string> = {
  ATENDIMENTO: "🩺 Atendimento",
  VENDA: "🛒 Venda",
  INTERNACAO: "🏥 Internação",
};

export interface ComandaParaReceber {
  id: string;
  date?: string | null;
  pet?: string | null;
  origem?: string | null;
  numeroVenda?: number | string | null;
  aberto?: number;
  valor?: number;
}

export default function ReceberEmLoteModal({
  tutor,
  emoji,
  comandas,
  onFechar,
  onRecebido,
  ocultarValores,
  preSelecionadas,
}: {
  tutor: string;
  /** O bichinho da espécie, quando quem chama já sabe. Só enfeite do título. */
  emoji?: string;
  comandas: ComandaParaReceber[];
  onFechar: () => void;
  /** Recarregar a lista de quem chamou. Roda só quando alguma coisa foi de fato recebida. */
  onRecebido: () => void;
  /** Respeita o 👁️ da tela que chamou: na lista de comandas os valores ficam escondidos. */
  ocultarValores?: boolean;
  /**
   * Quais já nascem marcadas. Quem abre a partir de UMA venda manda só ela: as outras aparecem
   * na lista, desmarcadas, e a pessoa vê que existem sem que ninguém baixe nada sem querer.
   * Sem isto, todas vêm marcadas (que é o certo para quem abriu pelo extrato do cliente).
   */
  preSelecionadas?: string[];
}) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";
  // O ADMINISTRATIVO LANÇA EM QUALQUER CAIXA ABERTO (Cintia, 17/09/2026), sem abrir o dela. Vale
  // enquanto o servidor aceita (caixa.regras.podeLancarNoCaixa: ADMIN dentro da janela de ajuste);
  // passada a data, a tela volta sozinha para "só os seus caixas", junto com o servidor.
  const qualquerCaixa = String((session?.user as any)?.role || "").toUpperCase() === "ADMIN" && dentroDaJanelaDeAjuste();
  const [todosAbertos, setTodosAbertos] = useState<CaixaAberto[]>([]);

  // ESCOLHER O QUE BAIXAR (Cintia, 15/09/2026, com os prints do SimplesVet: "Selecione as vendas
  // que serão baixadas"). O Lucas tem 10 vendas do Chico em aberto, R$ 3.842,25 — receber tudo
  // ou nada não é como o dinheiro entra na clínica.
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set(preSelecionadas?.length ? preSelecionadas : comandas.map((c) => c.id)),
  );
  const abertoDe = (c: ComandaParaReceber) => Number(c.aberto ?? c.valor ?? 0);
  const escolhidas = useMemo(() => comandas.filter((c) => marcadas.has(c.id)), [comandas, marcadas]);
  const totalAberto = useMemo(() => escolhidas.reduce((s, c) => s + abertoDe(c), 0), [escolhidas]);
  const totalGeral = useMemo(() => comandas.reduce((s, c) => s + abertoDe(c), 0), [comandas]);
  const forasSelecao = comandas.length - escolhidas.length;

  const alternar = (id: string) => setMarcadas((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const money = (v: number) => (ocultarValores ? "R$ •••" : fmtBRL(v));

  const [caixaAberto, setCaixaAberto] = useState<string | null>(null);
  const [meusAbertos, setMeusAbertos] = useState<CaixaAberto[]>([]);
  // Sem caixa próprio não há baixa (regra da casa, 08/09/2026) — então a peça ABRE o caixa
  // aqui, em vez de mandar a pessoa para outra tela no meio do recebimento.
  const [abrirCaixaMotivo, setAbrirCaixaMotivo] = useState<string | null>(null);

  const [formasCfg, setFormasCfg] = useState<string[]>([]);
  const [formasConfig, setFormasConfig] = useState<FormaCfg[]>([]);
  const [taxas, setTaxas] = useState<TaxaRow[]>([]);
  // Abre com o total no dinheiro: é o caso mais comum e poupa digitar o valor de novo.
  const [formasLote, setFormasLote] = useState<PagForma[]>([{ forma: "Dinheiro", valor: Number(totalAberto.toFixed(2)) }]);
  const [baixando, setBaixando] = useState(false);
  // DESCONTO E OBSERVAÇÃO — só o Movimento de caixa tinha. Desde que esta virou a gaveta única
  // (16/09/2026), ficam aqui. O desconto pode ser em valor ou em %; o servidor confere pela forma
  // de pagamento (ADM sem limite; demais até o % da forma) e divide nos itens das vendas.
  const [descTipo, setDescTipo] = useState<"R$" | "%">("R$");
  const [descValor, setDescValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const desconto = useMemo(() => {
    const n = Number(String(descValor).replace(",", ".")) || 0;
    const v = descTipo === "%" ? (totalAberto * n) / 100 : n;
    return Math.max(0, Math.min(totalAberto, Math.round(v * 100) / 100));
  }, [descValor, descTipo, totalAberto]);
  const total = Math.max(0, Number((totalAberto - desconto).toFixed(2)));

  // Marcar ou desmarcar uma venda REFAZ o valor sozinho — senão a pessoa escolhe 3 de 10 e o
  // campo continua com o total das 10, que é o jeito mais fácil de receber o valor errado.
  // Só quando há UMA forma de pagamento: com o valor repartido à mão, mexer seria atropelar.
  useEffect(() => {
    setFormasLote((fs) => (fs.length === 1 ? [{ ...fs[0], valor: Number(total.toFixed(2)) }] : fs));
  }, [total]);

  useEffect(() => {
    if (!meId) return;
    // Nada vem marcado para o administrativo: cada dia tem dois caixas, e quem escolhe é ela.
    if (qualquerCaixa) { carregarCaixasAbertosDeTodos().then(setTodosAbertos); return; }
    carregarMeuCaixa(meId).then((m) => {
      // Três casos (lib/caixaAtual): o meu; ou o único aberto; ou recusa se há mais de um
      // e nenhum é meu.
      setCaixaAberto(caixaParaReceber(m).caixa?.id || null);
    });
    carregarMeusCaixasAbertos(meId).then(setMeusAbertos);
  }, [meId, qualquerCaixa]);

  useEffect(() => {
    // O mesmo carregador do ponto de venda: as formas e as taxas são as configuradas na casa.
    carregarFormasRecebimento()
      .then(({ formasConfig: fc, formasList: fl, taxas: tx }) => {
        setFormasConfig(fc);
        setTaxas(tx);
        setFormasCfg(fl);
      })
      .catch(() => {});
  }, []);

  const formasList = formasCfg.length ? formasCfg : FORMAS_PADRAO;
  const lancado = formasLote.reduce((s, f) => s + Number(f.valor || 0), 0);
  const falta = total - lancado;

  const receber = async () => {
    if (baixando) return;   // trava no primeiro clique: dinheiro não se lança duas vezes
    if (!meId) { alert("Só um instante — ainda estou identificando o seu usuário. Tente de novo em 2 segundos."); return; }
    if (!caixaAberto && qualquerCaixa) { alert("Escolha em qual caixa este recebimento entra."); return; }
    if (!caixaAberto) { setAbrirCaixaMotivo(`Para receber as vendas de ${tutor || "o cliente"}`); return; }
    if (!escolhidas.length) { alert("Marque pelo menos uma venda para receber."); return; }
    if (!confirm(`Receber ${escolhidas.length} venda(s) de ${tutor} num pagamento só? (${fmtBRL(total)}${desconto > 0.009 ? `, com ${fmtBRL(desconto)} de desconto` : ""})`)) return;
    setBaixando(true);
    try {
      // Cartão exige operadora + NSU + AUT: é o que casa a venda com a linha do extrato.
      const pendente = validarPagamentosCartao(formasLote.filter((f) => Number(f.valor) > 0), formasConfig);
      if (pendente) { alert(pendente); setBaixando(false); return; }
      const corpo: any = {
        appointmentIds: escolhidas.map((c) => c.id),
        formas: formasLote.filter((f) => Number(f.valor) > 0),
        ...(desconto > 0.009 ? { desconto } : {}),
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
      };
      const enviar = (c: any) => fetch(`/api/caixa/${caixaAberto}/recebimento-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(c),
      });
      const res = await enviar(corpo);
      const dd: any = await res.json().catch(() => ({} as any));
      // O servidor confere o desconto de TODAS antes de gravar a primeira; recusado, nada foi baixado.
      if (!res.ok) throw new Error(dd?.message || "Erro ao receber");
      if (Array.isArray(dd?.falhou) && dd.falhou.length) {
        alert(`Recebi ${dd.quitadas} de ${dd.comandas} comanda(s). Não consegui: ${dd.falhou.length}. Confira a lista antes de tentar de novo.`);
      } else {
        const resto = Number(dd?.restanteEmAberto || 0);
        alert(resto > 0.009
          ? `Recebido ${fmtBRL(dd.valorRecebido)}. Ainda em aberto: ${fmtBRL(resto)}.`
          : `Recebido ${fmtBRL(dd.valorRecebido)} — tudo quitado.${Number(dd?.troco) > 0.009 ? ` Troco: ${fmtBRL(dd.troco)}.` : ""}`);
      }
      onRecebido();
      onFechar();
    } catch (e: any) {
      alert(e?.message || "Erro ao receber as vendas.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(onFechar)}>
        <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
            <div>
              <h3 className="text-base font-medium text-[#014D5E]">{emoji ? `${emoji} ` : ""}{tutor}</h3>
              <div className="text-[11px] text-[#374151] mt-0.5">{comandas.length} venda(s) deste cliente</div>
            </div>
            <button onClick={onFechar} aria-label="Fechar" className="text-[#374151] text-lg leading-none">✕</button>
          </div>

          {/* O AVISO DIZ QUANTO O CLIENTE DEVE, e não só que existem outras vendas. No caso que
              motivou isto — 10 vendas do Chico, R$ 3.842,25 — "existem outras vendas" e "o
              cliente deve R$ 3.842,25" são conversas diferentes com quem está no balcão. */}
          {forasSelecao > 0 ? (
            <div className="mx-5 mt-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold" style={{ background: "#FDF3F2", border: "1px solid #F0C9C7", color: "#b23b3b" }}>
              Vendas em aberto {money(totalGeral)}
            </div>
          ) : null}

          <div className="px-5 py-3">
            <div className="flex items-center gap-3 pb-1.5 text-[11px]" style={{ color: "#5C6B70" }}>
              <button onClick={() => setMarcadas(new Set(comandas.map((c) => c.id)))} className="underline">Todas</button>
              <button onClick={() => setMarcadas(new Set())} className="underline">Nenhuma</button>
              <span className="ml-auto">{escolhidas.length} de {comandas.length} selecionada(s)</span>
            </div>
            {comandas.map((c) => {
              const on = marcadas.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 py-1.5 border-b last:border-b-0 text-[12.5px] cursor-pointer"
                  style={{ borderColor: "#F0EBE0", opacity: on ? 1 : 0.5 }}
                >
                  <input type="checkbox" checked={on} onChange={() => alternar(c.id)} className="flex-shrink-0" />
                  <span className="text-[#5C6B70] truncate flex-1">
                    {c.numeroVenda != null && c.numeroVenda !== "" ? `#${c.numeroVenda} · ` : ""}
                    {c.date ? `${new Date(c.date).toLocaleDateString("pt-BR")} · ` : ""}
                    {ORIGEM_LBL[String(c.origem || "")] || ORIGEM_LBL.VENDA} · {c.pet || "—"}
                  </span>
                  <span className="text-[#1F2A2E] tabular-nums flex-shrink-0">{money(abertoDe(c))}</span>
                </label>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
            <div className="flex items-center gap-2">
              <label htmlFor="desconto-gaveta" className="text-[12.5px] text-[#5C6B70] flex-1">Desconto</label>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#E8E2D6" }}>
                {(["R$", "%"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setDescTipo(t)} className="px-2 py-1 text-[11.5px] font-semibold"
                    style={{ background: descTipo === t ? "#009AAC" : "#fff", color: descTipo === t ? "#fff" : "#5C6B70" }}>{t}</button>
                ))}
              </div>
              <input id="desconto-gaveta" value={descValor} onChange={(e) => setDescValor(e.target.value)} inputMode="decimal" placeholder="0"
                className="w-20 border rounded-lg px-2 py-1 text-[12.5px] text-right tabular-nums" style={{ borderColor: "#E8E2D6" }} />
            </div>
            {desconto > 0.009 && (
              <div className="flex justify-between text-[12px] text-[#5C6B70] mt-1.5"><span>Em aberto {money(totalAberto)} − desconto</span><span className="tabular-nums">− {money(desconto)}</span></div>
            )}
            <div className="text-[10.5px] text-[#8A857A] mt-1">Até 5% no PIX e no dinheiro; nas outras formas, só o administrativo.</div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
              <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(total)}</span>
            </div>
          </div>

          {/* EM QUAL CAIXA ESTA BAIXA ENTRA. Fica FORA do `caixaAberto ?` de propósito: quando
              a pessoa não tem caixa de hoje mas tem um de outro dia reaberto, é esta faixa
              que descobre isso e destrava o recebimento. Some sozinha quando só há um caixa. */}
          <div className="px-5 pt-3">
            {qualquerCaixa ? (
              <EscolhaDeQualquerCaixa
                abertos={todosAbertos}
                dataDaVenda={escolhidas.map((c) => c.date || "").filter(Boolean).sort()[0] || null}
                valor={caixaAberto}
                onEscolher={setCaixaAberto}
              />
            ) : (
              <EscolhaDoCaixa
                meusAbertos={meusAbertos}
                dataDaVenda={comandas.map((c) => c.date || "").filter(Boolean).sort()[0] || null}
                valor={caixaAberto}
                onEscolher={setCaixaAberto}
              />
            )}
            {(() => {
              // O DIA DO DINHEIRO É O DIA DO CAIXA — a data fica à vista, mesmo com um caixa só.
              const c = (qualquerCaixa ? todosAbertos : meusAbertos).find((x) => x.id === caixaAberto);
              return c ? (
                <div className="text-[11.5px] text-[#5C6B70]">Entra no caixa nº {c.numero} de <b className="text-[#014D5E]">{new Date(c.abertura).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</b>{qualquerCaixa ? <> · {c.operadorNome}</> : null}</div>
              ) : null;
            })()}
          </div>

          {caixaAberto || qualquerCaixa ? (
            <>
              <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">
                  Como o cliente pagou — pode dividir entre formas
                </div>
                <PagamentoFormas formas={formasLote} onChange={setFormasLote} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />
                <label htmlFor="obs-gaveta" className="block text-[10.5px] text-[#374151] uppercase tracking-wide mt-3 mb-1">Observação</label>
                <textarea id="obs-gaveta" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} placeholder="Opcional"
                  className="w-full border rounded-lg px-2 py-1.5 text-[12.5px] resize-y" style={{ borderColor: "#E8E2D6" }} />
                {Math.abs(falta) < 0.01 ? (
                  <div className="mt-2 text-[12px] font-medium text-[#0F6E56]">✓ Fecha certo com o total.</div>
                ) : falta > 0 ? (
                  <div className="mt-2 text-[12px] text-[#b23b39]">Falta lançar {money(falta)} — o que sobrar em aberto continua na lista, da comanda mais nova.</div>
                ) : (
                  <div className="mt-2 text-[12px] text-[#8a6400]">Passou {money(-falta)} do total — sai como troco.</div>
                )}
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                <button onClick={onFechar} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                <button
                  onClick={receber}
                  disabled={baixando || lancado <= 0.009 || !caixaAberto}
                  title={!caixaAberto ? "Escolha o caixa acima" : undefined}
                  className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60"
                >{baixando ? "Recebendo..." : "💰 Receber num pagamento só"}</button>
              </div>
            </>
          ) : (
            <div className="px-5 py-4 border-t text-[12.5px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>
              Você não tem caixa aberto. Clique em <b>💰 Receber num pagamento só</b> para abrir o seu e seguir.
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={onFechar} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                <button onClick={receber} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg">💰 Receber num pagamento só</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {abrirCaixaMotivo !== null && (
        <AbrirMeuCaixaModal
          motivo={abrirCaixaMotivo}
          onClose={() => setAbrirCaixaMotivo(null)}
          onAberto={(c) => { setCaixaAberto(c.id); setMeusAbertos((a) => [c, ...a.filter((x) => x.id !== c.id)]); }}
        />
      )}
    </>
  );
}
